import { rm, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { createPublicClient, http, type Hash, type Address, type Hex, getAddress } from 'viem';
import { type Metadata } from '@ethereum-sourcify/lib-sourcify';
import { uniqBy } from 'lodash';

import createTracingClient, { flattenTraceCall } from '@/app/api/v1/tracing-client';
import fetchContract from '@/app/api/v1/fetch-contract';
import solc from '@/app/api/v1/solc';
import walnutCli from '@/app/api/v1/walnut-cli';
import traceCallResponseToTransactionSimulationResult from '@/app/api/v1/simulate-transaction/convert-response';
import debugCallResponseToTransactionSimulationResult from '@/app/api/v1/debug-transaction/convert-response';
import { type Contract } from '@/app/api/v1/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type WithTxHash = {
	rpc_url: string;
	tx_hash: Hash;
};

type WithCalldata = {
	rpc_url: string;
	chain_id: string;
	block_number: number;
	block_timestamp: number;
	nonce: number;
	sender_address: string;
	calldata: string[];
	transaction_version: number;
	transaction_type: string;
	transaction_index_in_block: number | null;
	total_transactions_in_block: number | null;
	transaction_hash: string | null;
};

const getParameters = ({
	WithTxHash: withTxHash,
	WithCalldata: withCalldata
}: {
	WithTxHash: WithTxHash;
	WithCalldata: WithCalldata;
}) => {
	if (withTxHash) {
		return { rpcUrl: withTxHash.rpc_url, txHash: withTxHash.tx_hash };
	}
	if (withCalldata) {
		return {
			rpcUrl: withCalldata.rpc_url,
			chainId: withCalldata.chain_id,
			blockNumber: withCalldata.block_number ? BigInt(withCalldata.block_number) : undefined,
			blockTimestamp: withCalldata.block_timestamp,
			nonce: withCalldata.nonce,
			senderAddress: withCalldata.sender_address as Address,
			to: withCalldata.calldata[0] as Address,
			calldata: withCalldata.calldata[1] as Hex,
			transactionVersion: withCalldata.transaction_version,
			transactionType: withCalldata.transaction_type,
			transactionIndexInBlock: withCalldata.transaction_index_in_block,
			totalTransactionsInBlock: withCalldata.total_transactions_in_block,
			transactionHash: withCalldata.transaction_hash
		};
	}
	throw new Error('Invalid body');
};

export const POST = async (request: NextRequest) => {
	const body = await request.json();
	const parameters = getParameters(body);

	const publicClient = createPublicClient({ transport: http(parameters.rpcUrl) });
	const tracingClient = createTracingClient(parameters.rpcUrl);
	const [chainId, transaction, traceResult] = await Promise.all([
		parameters.chainId ? Number(parameters.chainId) : publicClient.getChainId(),
		parameters.txHash
			? publicClient.getTransaction({ hash: parameters.txHash })
			: {
					to: parameters.to,
					blockNumber: parameters.blockNumber,
					nonce: parameters.nonce,
					from: parameters.senderAddress,
					transactionIndex: 0
			  },
		parameters.txHash
			? tracingClient.traceTransaction({
					transactionHash: parameters.txHash,
					tracer: 'callTracer'
					// tracerConfig: { withLog: true }
			  })
			: tracingClient.traceCall({
					from: parameters.senderAddress,
					to: parameters.to,
					data: parameters.calldata,
					blockNrOrHash: parameters.blockNumber
						? `0x${parameters.blockNumber.toString(16)}`
						: 'latest',
					//txIndex: '0x0', //options.txIndex ?? 0,
					tracer: 'callTracer'
					// tracerConfig: { withLog: true }
			  })
	]);
	if (!transaction.to && traceResult && traceResult.type !== 'CREATE') {
		throw new Error(
			'ERROR: eth_getTransactionByHash failed - missing to address and not a CREATE transaction'
		);
	}
	if (!traceResult) {
		throw new Error('ERROR: debug_traceTransaction/debug_traceCall failed');
	}
	// FETCH CONTRACTS
	const flattenedTraceTransactionResult = uniqBy(flattenTraceCall(traceResult), 'to');
	const [{ timestamp, transactions }, sourcifyContracts] = await Promise.all([
		publicClient.getBlock({ blockNumber: transaction.blockNumber }),
		Promise.allSettled(
			flattenedTraceTransactionResult
				.filter(({ type }) => type === 'CALL' || type === 'DELEGATECALL')
				.map(({ to }) => fetchContract(to, publicClient, chainId))
		)
	]);

	// Filter out failed contract fetches and get only verified contracts
	const verifiedContracts = sourcifyContracts
		.filter(
			(result): result is PromiseFulfilledResult<Contract> =>
				result.status === 'fulfilled' && result.value.verified
		)
		.map((result) => result.value);

	const allContracts = sourcifyContracts
		.filter((result): result is PromiseFulfilledResult<Contract> => result.status === 'fulfilled')
		.map((result) => result.value);

	// there's no need to refetch every sources and recompile everything as it was done in the
	// /simulate-transaction endpoint
	const tmp = `/tmp/${parameters.txHash ?? parameters.calldata.slice(0, 128)}`;

	let ethdebugDirs: string[] = [];
	let cwd = process.env.PWD;
	let compilationFailed = false;

	// Try to compile all verified contracts
	if (verifiedContracts.length > 0) {
		try {
			await Promise.all(
				verifiedContracts.map(async (contract) => {
					const metadataFile = contract.sources.find((source) =>
						source.path?.endsWith('metadata.json')
					);
					if (!metadataFile) {
						throw new Error(`No metadata found for ${contract.address}`);
					}

					const metadata = JSON.parse(metadataFile.content) as Metadata;
					const [compilationTarget] = Object.keys(metadata.settings.compilationTarget);
					await Promise.all(
						contract.sources
							.filter((source) => source.path)
							.map(async (source) => {
								const filename = `${tmp}/${contract.address}/${source.path}`;
								const parentDirectory = dirname(filename);
								await mkdir(parentDirectory, { recursive: true });
								return writeFile(filename, source.content);
							})
					);
					// ugly fix to make sure we wait until all files are written on disk
					await sleep(400);
					await solc({ compilationTarget, cwd: `${tmp}/${contract.address}` });
					console.log(`Successfully compiled ${contract.address}`);
				})
			);

			// If all compilations succeeded, set up ethdebugDirs
			if (verifiedContracts.length === 1) {
				ethdebugDirs = [`${tmp}/${verifiedContracts[0].address}/debug`];
				cwd = `${tmp}/${verifiedContracts[0].address}`;
			} else if (verifiedContracts.length > 1) {
				ethdebugDirs = verifiedContracts.map((contract) =>
					contract.name
						? `${contract.address}:${contract.name}:${tmp}/${contract.address}/debug`
						: `${contract.address}:${tmp}/${contract.address}/debug`
				);
				cwd = `${tmp}/${verifiedContracts[0].address}`;
			}
		} catch (error) {
			console.error('Compilation failed for one or more contracts:', error);
			console.log('Treating all contracts as unverified due to compilation failure');
			compilationFailed = true;
			// Keep ethdebugDirs empty and cwd as process.env.PWD
		}
	}

	// RUN WALNUT-CLI
	const { traceCall, steps, contracts, status, error } = await walnutCli({
		command: parameters.txHash ? 'trace' : 'simulate',
		txHash: parameters.txHash,
		to: transaction.to || undefined,
		calldata: parameters.calldata,
		from: parameters.senderAddress,
		blockNumber: parameters.blockNumber,
		rpcUrl: parameters.rpcUrl,
		ethdebugDirs,
		cwd
	});
	const { l2TransactionData } = traceCallResponseToTransactionSimulationResult({
		status: status === 'reverted' ? 'REVERTED' : 'SUCCEEDED',
		error: error ?? '',
		traceCall,
		contracts,
		sourcifyContracts: allContracts,
		//
		chainId,
		blockNumber: transaction.blockNumber ?? BigInt(0),
		timestamp,
		nonce: transaction.nonce ?? 0,
		from: getAddress(transaction.from),
		type: traceResult.type || 'INVOKE',
		transactionIndex: transaction.transactionIndex,
		transactions,
		txHash: parameters.txHash
	});
	if (!l2TransactionData) {
		throw new Error('ERROR: traceCallResponseToTransactionSimulationResult failed');
	}
	const response = debugCallResponseToTransactionSimulationResult({
		traceCall,
		steps,
		contracts,
		sourcifyContracts: allContracts,
		contractCallsMap: l2TransactionData.simulationResult.contractCallsMap,
		functionCallsMap: l2TransactionData.simulationResult.functionCallsMap,
		txHash: parameters.txHash ?? ''
	});
	return NextResponse.json(response);
};
