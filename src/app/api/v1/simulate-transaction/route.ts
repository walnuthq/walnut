import { NextResponse, type NextRequest } from 'next/server';
import { type Hash, type Address, type Hex, getAddress } from 'viem';
import soldb from '@/app/api/v1/soldb';
import traceCallResponseToTransactionSimulationResult from '@/app/api/v1/simulate-transaction/convert-response';
import { getRpcUrlForChainSafe, getDisplayNameForChainIdNumber } from '@/lib/networks';
import { createCompilationSummary } from '@/app/api/v1/utils/compilation-status-utils';
import {
	processTransactionRequest,
	cleanupOldTempDirs
} from '@/app/api/v1/utils/transaction-processing';
import {
	sanitizeError,
	isDebugTraceCallError,
	isSourcifyABILoaderError
} from '@/lib/utils/error-sanitization';
import { getServerSession } from '@/lib/auth-server';
import { AuthType } from '@/lib/types';
import { checkPublicNetworkRequest, getRpcUrlForChainOptimized } from '@/lib/public-network-utils';

type WithTxHash = {
	tx_hash: Hash;
	chain_id: string;
};

type WithCalldata = {
	sender_address: string;
	calldata: string[];
	block_number: number | undefined;
	transaction_version: number;
	nonce: number | undefined;
	chain_id: string;
};

const getParameters = ({
	WithTxHash: withTxHash,
	WithCalldata: withCalldata,
	session
}: {
	WithTxHash: WithTxHash;
	WithCalldata: WithCalldata;
	session: AuthType['session'] | null;
}) => {
	if (withTxHash) {
		// Validate chain_id is not undefined
		if (!withTxHash.chain_id) {
			throw new Error(
				'chain_id is required for transaction simulation. Every chain must have a valid RPC URL with debug options.'
			);
		}

		// Use optimized RPC URL resolution
		const rpcUrl = getRpcUrlForChainOptimized(withTxHash.chain_id, session);

		return { rpcUrl, txHash: withTxHash.tx_hash, chainId: withTxHash.chain_id };
	}
	if (withCalldata) {
		// Validate chain_id is not undefined
		if (!withCalldata.chain_id) {
			throw new Error(
				'chain_id is required for calldata simulation. Every chain must have a valid RPC URL with debug options.'
			);
		}

		// Use optimized RPC URL resolution
		const rpcUrl = getRpcUrlForChainOptimized(withCalldata.chain_id, session);

		return {
			rpcUrl,
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
	const authSession = await getServerSession();

	// Check if request is for a public network
	const { isPublicNetworkRequest, body } = await checkPublicNetworkRequest(request);

	// Require authentication only for non-public network requests
	if (!authSession && !isPublicNetworkRequest) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
	}

	const session = authSession?.session;

	try {
		// Periodic cleanup (every 10th request or based on time)
		const shouldCleanup = Math.random() < 0.1; // 10% chance
		if (shouldCleanup) {
			// Run cleanup in background, don't wait for it
			cleanupOldTempDirs(3).catch(
				(
					error // Clean dirs older than 3 minutes
				) => console.warn('Background cleanup failed:', error?.message)
			);
		}

		const parameters = getParameters({ ...body, session });

		// Use shared transaction processing utility
		const {
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
		} = await processTransactionRequest({
			rpcUrl: parameters.rpcUrl,
			txHash: parameters.txHash,
			to: parameters.to,
			calldata: parameters.calldata,
			from: parameters.senderAddress,
			blockNumber: parameters.blockNumber,
			nonce: parameters.nonce,
			chainId: parameters.chainId
		});

		let walnutCliResult;
		try {
			const walnutParams = {
				command: (parameters.txHash ? 'trace' : 'simulate') as 'trace' | 'simulate',
				txHash: parameters.txHash,
				to: transaction.to || undefined,
				calldata: parameters.calldata,
				from: parameters.senderAddress,
				blockNumber: parameters.blockNumber,
				rpcUrl: parameters.rpcUrl,
				ethdebugDirs,
				cwd
			};

			walnutCliResult = await soldb(walnutParams);
		} catch (walnutError: any) {
			console.error(
				`SOLDB failed. Compilation errors prevented debug data: ${compilationErrors.join(
					'; '
				)}. Execution error: ${walnutError?.message || String(walnutError)}`
			);
			// If we have compilation errors, include them in the error message
			if (compilationErrors.length > 0) {
				const errorMsg = `SOLDB execution failed: ${walnutError?.message || String(walnutError)}`;
				return NextResponse.json({ error: errorMsg }, { status: 400 });
			}

			throw walnutError; // Re-throw if it's not related to compilation
		}

		const { traceCall, steps, contracts, status, error } = walnutCliResult;

		// Create compilation summary for frontend
		const compilationSummary = createCompilationSummary(
			verifiedContracts,
			compiled,
			compilationErrors
		);

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
			transactions: [transactions.toString()], // Convert bigint to string array
			txHash: parameters.txHash,
			compilationSummary
		});
		// anvil.kill();
		return NextResponse.json(response);
	} catch (err: any) {
		// Handle SourcifyABILoader errors specifically to avoid logging full call traces
		if (isSourcifyABILoaderError(err)) {
			console.error('SOURCIFY ABI LOADER ERROR:', err.message);
			return NextResponse.json(
				{
					error: 'Failed to load contract ABI from Sourcify',
					details: 'Contract verification or ABI loading failed'
				},
				{ status: 400 }
			);
		}

		// Handle debug_traceCall method not supported errors
		if (isDebugTraceCallError(err)) {
			// Sanitize the error message to remove API keys and sensitive data
			const sanitizedError = sanitizeError(err);
			console.error('SIMULATE TRANSACTION ERROR:', sanitizedError.message);
			return NextResponse.json(
				{
					error: sanitizedError.message,
					details: 'The RPC endpoint does not support debug_traceCall method'
				},
				{ status: 400 }
			);
		}

		// Handle other errors with limited logging - sanitize error message
		const sanitizedError = sanitizeError(err);
		console.error('SIMULATE TRANSACTION ERROR:', sanitizedError.message);

		// Don't log the full error object to avoid call traces
		if (err?.stack) {
			console.error('Error stack trace available (not logged for brevity)');
		}

		return NextResponse.json(
			{
				error: sanitizedError.message || 'Unknown error occurred during transaction simulation'
			},
			{ status: 400 }
		);
	}
};
