import { createPublicClient, http, type Hash, type Address, type Hex, getAddress } from 'viem';
import { uniqBy } from 'lodash';
import { type Contract } from '@/app/api/v1/types';
import { mapChainIdStringToNumber } from '@/lib/utils';
import createTracingClient, { flattenTraceCall } from '@/app/api/v1/tracing-client';
import fetchContract from '@/app/api/v1/fetch-contract';
import { compileContracts } from '@/app/api/v1/utils/contract-compiler';
import { rm } from 'node:fs/promises';

export interface TransactionProcessingResult {
	chainId: number;
	transaction: any;
	traceResult: any;
	verifiedContracts: Contract[];
	allContracts: Contract[];
	compiled: Array<{ address: Address; name?: string }>;
	ethdebugDirs: string[];
	cwd: string;
	compilationErrors: string[];
	timestamp: bigint;
	transactions: bigint;
}

export interface TransactionParameters {
	rpcUrl: string;
	txHash?: Hash;
	to?: Address;
	calldata?: Hex;
	from?: Address;
	blockNumber?: bigint;
	nonce?: number;
	chainId?: string;
}

/**
 * Fetches transaction and trace data from the blockchain
 */
export const fetchTransactionAndTrace = async (
	parameters: TransactionParameters,
	publicClient: any,
	tracingClient: any
) => {
	const [chainId, transaction, traceResult] = await Promise.all([
		parameters.chainId
			? mapChainIdStringToNumber(parameters.chainId) || publicClient.getChainId()
			: publicClient.getChainId(),
		parameters.txHash
			? publicClient.getTransaction({ hash: parameters.txHash })
			: {
					to: parameters.to,
					blockNumber: parameters.blockNumber,
					nonce: parameters.nonce,
					from: parameters.from,
					transactionIndex: 0
			  },
		parameters.txHash
			? tracingClient.traceTransaction({
					transactionHash: parameters.txHash,
					tracer: 'callTracer'
			  })
			: tracingClient.traceCall({
					from: parameters.from,
					to: parameters.to,
					data: parameters.calldata,
					blockNrOrHash: parameters.blockNumber
						? `0x${parameters.blockNumber.toString(16)}`
						: 'latest',
					tracer: 'callTracer'
			  })
	]);

	// Validate transaction and trace result
	if (!transaction.to && traceResult && traceResult.type !== 'CREATE') {
		throw new Error(
			'ERROR: eth_getTransactionByHash failed - missing to address and not a CREATE transaction'
		);
	}
	if (!traceResult) {
		throw new Error('ERROR: debug_traceTransaction/debug_traceCall failed');
	}

	return { chainId, transaction, traceResult };
};

/**
 * Fetches contracts from Sourcify and validates them
 */
export const fetchContracts = async (
	transaction: any,
	traceResult: any,
	publicClient: any,
	chainId: number
) => {
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

	return { verifiedContracts, allContracts, timestamp, transactions };
};

/**
 * Compiles contracts and prepares debug directories
 */
export const compileContractsForDebug = async (
	verifiedContracts: Contract[],
	parameters: TransactionParameters
) => {
	const tmp = `/tmp/${parameters.txHash ?? parameters.calldata?.slice(0, 128)}`;
	await rm(tmp, { recursive: true, force: true });

	const { compiled, ethdebugDirs, cwd, compilationErrors } = await compileContracts(
		verifiedContracts,
		tmp
	);

	return { compiled, ethdebugDirs, cwd, compilationErrors, tmp };
};

/**
 * Main function that processes transaction request and returns all necessary data
 */
export const processTransactionRequest = async (
	parameters: TransactionParameters
): Promise<TransactionProcessingResult> => {
	// Validate that chain_id is provided
	if (!parameters.chainId) {
		throw new Error(
			'chain_id is required. Every chain must have a valid RPC URL with debug options.'
		);
	}

	// Validate that RPC URL is provided and valid
	if (!parameters.rpcUrl) {
		throw new Error(
			`RPC URL is required for chain ${parameters.chainId}. Every chain must have a valid RPC URL with debug options.`
		);
	}

	// Create clients
	const publicClient = createPublicClient({ transport: http(parameters.rpcUrl) });
	const tracingClient = createTracingClient(parameters.rpcUrl);

	// Fetch transaction and trace
	const { chainId, transaction, traceResult } = await fetchTransactionAndTrace(
		parameters,
		publicClient,
		tracingClient
	);

	// Fetch contracts
	const { verifiedContracts, allContracts, timestamp, transactions } = await fetchContracts(
		transaction,
		traceResult,
		publicClient,
		chainId
	);

	// Compile contracts
	const { compiled, ethdebugDirs, cwd, compilationErrors } = await compileContractsForDebug(
		verifiedContracts,
		parameters
	);

	return {
		chainId,
		transaction,
		traceResult,
		verifiedContracts,
		allContracts,
		compiled,
		ethdebugDirs,
		cwd,
		compilationErrors,
		timestamp,
		transactions
	};
};
