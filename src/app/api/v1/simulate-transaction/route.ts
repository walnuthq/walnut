import { rm, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { createPublicClient, http, type Hash, type Address, type Hex, getAddress } from 'viem';
import { type Metadata } from '@ethereum-sourcify/lib-sourcify';
import { uniqBy } from 'lodash';

// import { spawnAnvil } from '@/app/api/v1/anvil';
import createTracingClient, { flattenTraceCall } from '@/app/api/v1/tracing-client';
import fetchContract from '@/app/api/v1/fetch-contract';
import solc from '@/app/api/v1/solc';
import walnutCli from '@/app/api/v1/walnut-cli';
import traceCallResponseToTransactionSimulationResult from '@/app/api/v1/simulate-transaction/convert-response';
import { type Contract } from '@/app/api/v1/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type WithTxHash = {
	rpc_url: string;
	tx_hash: Hash;
};

type WithCalldata = {
	sender_address: string;
	calldata: string[];
	block_number: number | undefined;
	transaction_version: number;
	nonce: number | undefined;
	rpc_url: string;
	chain_id: string | undefined;
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
			senderAddress: withCalldata.sender_address as Address,
			to: withCalldata.calldata[1] as Address,
			calldata: withCalldata.calldata[4] as Hex,
			blockNumber: withCalldata.block_number ? BigInt(withCalldata.block_number) : undefined,
			nonce: withCalldata.nonce,
			chainId: withCalldata.chain_id
		};
	}
	throw new Error('Invalid body');
};

export const POST = async (request: NextRequest) => {
	try {
		const body = await request.json();
		const parameters = getParameters(body);
		// console.log('/simulate-transaction parameters', parameters);
		// SPAWN ANVIL
		// console.log('SPAWNING ANVIL');
		// const anvil = await spawnAnvil({ rpcUrl, txHash });
		// console.log('ANVIL STARTED');
		// FETCH TRACE CALL
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
		// console.log('TRACE CALL FETCHED');
		// console.log({ chainId });
		// console.log(transaction.to);
		// console.log(traceResult);
		if (!transaction.to) {
			throw new Error('ERROR: eth_getTransactionByHash failed');
		}
		if (!traceResult) {
			throw new Error('ERROR: debug_traceTransaction/debug_traceCall failed');
		}
		// contracts should be verified first
		// forge verify-contract --rpc-url $RPC_URL --compiler-version 0.8.30 --via-ir $CONTRACT_ADDRESS examples/TestContract.sol:TestContract
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

		// COPY SOURCES TO /TMP AND COMPILE ONLY VERIFIED CONTRACTS
		const tmp = `/tmp/${parameters.txHash ?? parameters.calldata.slice(0, 128)}`;
		await rm(tmp, { recursive: true, force: true });
		await Promise.all(
			verifiedContracts.map(async (contract) => {
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
							const filename = `${tmp}/${contract.address}/${source.path}`;
							const parentDirectory = dirname(filename);
							await mkdir(parentDirectory, { recursive: true });
							return writeFile(filename, source.content);
						})
				);
				// ugly fix to make sure we wait until all files are written on disk
				await sleep(400);
				await solc({ compilationTarget, cwd: `${tmp}/${contract.address}` });
				// ugly fix to make sure we wait until solc outputs debug dir for walnut-cli to catchup
				// await sleep(400);
			})
		);
		// RUN WALNUT-CLI
		let ethdebugDirs: string[] = [];
		let cwd = process.env.PWD;
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

		const { traceCall, steps, contracts, status, error } = await walnutCli({
			command: parameters.txHash ? 'trace' : 'simulate',
			txHash: parameters.txHash,
			to: parameters.to,
			calldata: parameters.calldata,
			from: parameters.senderAddress,
			blockNumber: parameters.blockNumber,
			rpcUrl: parameters.rpcUrl,
			ethdebugDirs,
			cwd
		});
		const response = traceCallResponseToTransactionSimulationResult({
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
			type: 'INVOKE',
			transactionIndex: transaction.transactionIndex,
			transactions,
			txHash: parameters.txHash
		});
		// anvil.kill();
		return NextResponse.json(response);
	} catch (err: any) {
		return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 400 });
	}
};
