import { rm, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { createPublicClient, http, type Hash } from 'viem';
import { type Metadata } from '@ethereum-sourcify/lib-sourcify';
import { whatsabi } from '@shazow/whatsabi';
import { uniqBy } from 'lodash';

import { spawnAnvil } from '@/app/api/v1/anvil';
import createTracingClient, { flattenTraceCall } from '@/app/api/v1/tracing-client';
import fetchContract from '@/app/api/v1/fetch-contract';
import solc from '@/app/api/v1/solc';
import walnutCli from '@/app/api/v1/walnut-cli';
import traceCallResponseToTransactionSimulationResult from '@/app/api/v1/simulate-transaction/convert-response';
import { CallType, EntryPointType, type TransactionSimulationResult } from '@/lib/simulation';
import traceCallResponse from '@/app/api/v1/simulate-transaction/trace-call-response.json';
import { TraceCallResponse } from '@/app/api/v1/types';

export const POST = async (request: NextRequest) => {
	const body = await request.json();
	const {
		WithTxHash: { rpc_url: rpcUrl, tx_hash: txHash }
	} = body as {
		WithTxHash: {
			rpc_url: string;
			tx_hash: Hash;
		};
	};
	// SPAWN ANVIL
	/* console.log('SPAWNING ANVIL');
	const anvil = await spawnAnvil({ rpcUrl, txHash });
	console.log('ANVIL STARTED'); */
	// FETCH TRACE CALL
	console.log('FETCHING TRACE CALL');
	const tracingClient = createTracingClient();
	const [
		chainId,
		{ to, blockNumber, nonce, from, type, transactionIndex },
		traceTransactionResult
	] = await Promise.all([
		tracingClient.getChainId(),
		tracingClient.getTransaction({ hash: txHash }),
		tracingClient.traceTransaction({
			transactionHash: txHash,
			tracer: 'callTracer'
		})
	]);
	console.log('TRACE CALL FETCHED');
	console.log({ chainId });
	console.log({ to });
	console.log(traceTransactionResult);
	if (!to) {
		throw new Error('ERROR: eth_getTransactionByHash failed');
	}
	if (!traceTransactionResult) {
		throw new Error('ERROR: debug_traceTransaction failed');
	}
	// contracts should be verified first
	// forge verify-contract --rpc-url $RPC_URL --compiler-version 0.8.30 --via-ir $CONTRACT_ADDRESS examples/TestContract.sol:TestContract
	// FETCH CONTRACTS
	const flattenedTraceTransactionResult = uniqBy(flattenTraceCall(traceTransactionResult), 'to');
	const publicClient = createPublicClient({ transport: http(rpcUrl) });
	const [{ timestamp, transactions }, sourcifyContracts] = await Promise.all([
		publicClient.getBlock({ blockNumber }),
		Promise.all(
			flattenedTraceTransactionResult
				.filter(({ type, to }) => type === 'CALL' && to)
				.map(({ to }) => fetchContract(to!, publicClient, chainId))
		)
	]);
	// COPY SOURCES TO /TMP AND COMPILE EVERY CONTRACTS
	const tmp = `/tmp/${txHash}`;
	await rm(tmp, { recursive: true, force: true });
	await Promise.all(
		sourcifyContracts.map(async (contract) => {
			const metadataFile = contract.sources.find((source) =>
				source.path?.endsWith('metadata.json')
			);
			if (!metadataFile) {
				throw new Error('ERROR: metadata not found');
			}
			const metadata = JSON.parse(metadataFile.content) as Metadata;
			const [compilationTarget] = Object.keys(metadata.settings.compilationTarget);
			await Promise.all(
				contract.sources
					.filter((source) => source.path)
					.map(async (source) => {
						const path = whatsabi.loaders.SourcifyABILoader.stripPathPrefix(`/${source.path}`);
						const filename = `${tmp}/${contract.address}/${path}`;
						const parentDirectory = dirname(filename);
						await mkdir(parentDirectory, { recursive: true });
						return writeFile(filename, source.content);
					})
			);
			await solc(compilationTarget, `${tmp}/${contract.address}`);
		})
	);
	// RUN WALNUT-CLI
	const { traceCall, steps, contracts } = await walnutCli(
		rpcUrl,
		txHash,
		`${tmp}/${sourcifyContracts[0].address}`
	);
	// const { traceCall, abis } = traceCallResponse as unknown as TraceCallResponse;
	const contractNames = sourcifyContracts.reduce(
		(previousValue, currentValue) => ({
			...previousValue,
			[currentValue.address]: currentValue.name
		}),
		{}
	);
	const response = traceCallResponseToTransactionSimulationResult({
		traceCall,
		contracts,
		contractNames,
		chainId: 1,
		blockNumber: BigInt(0),
		timestamp: BigInt(Math.floor(Date.now() / 1000)),
		nonce: 1,
		from: '0x',
		type: '',
		transactionIndex: 0,
		transactions: ['0x'],
		txHash: '0x'
	});
	// anvil.kill();
	return NextResponse.json(response);
};
