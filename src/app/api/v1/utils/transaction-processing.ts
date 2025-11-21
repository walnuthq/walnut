import { createPublicClient, http, type Hash, type Address, type Hex, getAddress } from 'viem';
import { uniqBy } from 'lodash';
import { type Contract } from '@/app/api/v1/types';
import { mapChainIdStringToNumber } from '@/lib/utils';
import createTracingClient, { flattenTraceCall } from '@/app/api/v1/tracing-client';
import fetchContract from '@/app/api/v1/fetch-contract';
import { compileContracts } from '@/app/api/v1/utils/contract-compiler';
import { rm } from 'node:fs/promises';
import { wrapError } from '@/lib/errors';

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
	session?: any;
	value?: string;
}

/**
 * Wraps viem client calls with error handling and sanitization
 */
const safeViemCall = async <T>(
	callFn: () => Promise<T>,
	operation: string,
	chainId?: number,
	session?: any
): Promise<T> => {
	try {
		return await callFn();
	} catch (error: any) {
		// Wrap the error into a structured error with session
		const wrappedError = wrapError(error, chainId, session);
		throw wrappedError;
	}
};

/**
 * Fetches transaction and trace data from the blockchain
 */
export const fetchTransactionAndTrace = async (
	parameters: TransactionParameters,
	publicClient: any,
	tracingClient: any
) => {
	// Get chainId first to use in error messages
	const chainId = parameters.chainId
		? mapChainIdStringToNumber(parameters.chainId) ||
		  (await safeViemCall(
				() => publicClient.getChainId(),
				'getChainId',
				undefined,
				parameters.session
		  ))
		: await safeViemCall(
				() => publicClient.getChainId(),
				'getChainId',
				undefined,
				parameters.session
		  );

	const [transaction, traceResult] = await Promise.all([
		parameters.txHash
			? safeViemCall(
					() => publicClient.getTransaction({ hash: parameters.txHash }),
					'getTransaction',
					chainId as number,
					parameters.session
			  )
			: {
					to: parameters.to,
					blockNumber: parameters.blockNumber,
					nonce: parameters.nonce,
					from: parameters.from,
					transactionIndex: 0
			  },
		parameters.txHash
			? safeViemCall(
					() =>
						tracingClient.traceTransaction({
							transactionHash: parameters.txHash,
							tracer: 'callTracer'
						}),
					'traceTransaction',
					chainId as number,
					parameters.session
			  )
			: safeViemCall(
					() =>
						tracingClient.traceCall({
							from: parameters.from,
							to: parameters.to,
							data: parameters.calldata,
							blockNrOrHash: parameters.blockNumber
								? `0x${parameters.blockNumber.toString(16)}`
								: 'latest',
							tracer: 'callTracer'
						}),
					'traceCall',
					chainId as number,
					parameters.session
			  )
	]);

	// Validate transaction and trace result
	const tx = transaction as any; // Type assertion for transaction object
	if (!tx.to && traceResult && (traceResult as any).type !== 'CREATE') {
		throw new Error(
			'ERROR: eth_getTransactionByHash failed - missing to address and not a CREATE transaction'
		);
	}
	if (!traceResult) {
		throw new Error('ERROR: debug_traceTransaction/debug_traceCall failed');
	}

	return { chainId: chainId as number, transaction: tx, traceResult };
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
	// Generate unique temp directory with timestamp and random suffix
	const timestamp = Date.now();
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	const baseName = parameters.txHash ?? parameters.calldata?.slice(0, 128);
	const tmp = `/tmp/walnut_${baseName}_${timestamp}_${randomSuffix}`;

	// Ensure clean start - this should always succeed since directory is unique
	try {
		await rm(tmp, { recursive: true, force: true });
	} catch (error: any) {
		console.warn(`Unexpected error removing unique temp dir ${tmp}:`, error.message);
	}

	const { compiled, ethdebugDirs, cwd, compilationErrors } = await compileContracts(
		verifiedContracts,
		tmp
	);

	return { compiled, ethdebugDirs, cwd, compilationErrors, tmp };
};

/**
 * Cleanup old temporary directories to prevent disk space issues
 */
export const cleanupOldTempDirs = async (maxAgeMinutes = 60) => {
	const tempDir = '/tmp';
	try {
		const { readdir, stat, rm } = await import('node:fs/promises');
		const files = await readdir(tempDir);

		const walnutDirs = files.filter(
			(file) => file.startsWith('walnut_') && file.includes('_') && file.split('_').length >= 3
		);

		let cleanedCount = 0;
		for (const dir of walnutDirs) {
			const dirPath = `${tempDir}/${dir}`;
			try {
				const stats = await stat(dirPath);
				const age = Date.now() - stats.mtime.getTime();
				const maxAge = maxAgeMinutes * 60 * 1000;
				const ageMinutes = Math.round(age / 1000 / 60);

				if (age > maxAge) {
					await rm(dirPath, { recursive: true, force: true });
					cleanedCount++;
					console.log(`🧹 Cleaned up old temp dir: ${dir} (age: ${ageMinutes}min)`);
				}
			} catch (error: any) {
				// Ignore cleanup errors for individual directories
				console.warn(`⚠️ Failed to cleanup ${dir}:`, error?.message);
			}
		}

		if (cleanedCount > 0) {
			console.log(`🧹 Cleanup completed: removed ${cleanedCount} old temp directories`);
		}
	} catch (error: any) {
		console.error('❌ Failed to cleanup temp directories:', error?.message);
	}
};

// Global cleanup interval (runs every 30 minutes)
let cleanupInterval: NodeJS.Timeout | null = null;

export const startCleanupScheduler = () => {
	if (cleanupInterval) return; // Already started

	cleanupInterval = setInterval(async () => {
		try {
			await cleanupOldTempDirs(3); // Clean dirs older than 3 minutes
		} catch (error: any) {
			console.error('❌ Scheduled cleanup failed:', error?.message);
		}
	}, 3 * 60 * 1000); // Every 3 minutes

	console.log('🕐 Cleanup scheduler started (every 3 minutes)');
};

export const stopCleanupScheduler = () => {
	if (cleanupInterval) {
		clearInterval(cleanupInterval);
		cleanupInterval = null;
		console.log('🛑 Temp directory cleanup scheduler stopped');
	}
};

// Manual cleanup function that can be called from API endpoints
export const triggerManualCleanup = async () => {
	try {
		console.log('🧹 Manual cleanup triggered');
		await cleanupOldTempDirs(3); // Clean dirs older than 3 minutes
		return { success: true, message: 'Manual cleanup completed' };
	} catch (error: any) {
		console.error('❌ Manual cleanup failed:', error?.message);
		return { success: false, error: error?.message };
	}
};

// Auto-start cleanup when module loads (in all environments)
// This ensures cleanup runs even in .local environment
// You can disable it by setting DISABLE_CLEANUP=true in .env.local
if (process.env.DISABLE_CLEANUP !== 'true') {
	startCleanupScheduler();
}

/**
 * Main function that processes transaction request and returns all necessary data
 */
export const processTransactionRequest = async (
	parameters: TransactionParameters
): Promise<TransactionProcessingResult> => {
	const { ChainIdRequiredError, RpcUrlNotFoundError } = await import('@/lib/errors');

	if (!parameters.chainId) {
		throw new ChainIdRequiredError();
	}

	if (!parameters.rpcUrl) {
		throw new RpcUrlNotFoundError(parameters.chainId, parameters.session);
	}

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
