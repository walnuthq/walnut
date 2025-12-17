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
	wrapError,
	WalnutError,
	ChainIdRequiredError,
	AuthenticationRequiredError,
	sanitizeErrorMessage
} from '@/lib/errors';
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
	value?: string;
	transaction_index_in_block?: number | null;
	total_transactions_in_block?: number | null;
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
			throw new ChainIdRequiredError('transaction simulation');
		}

		// Use optimized RPC URL resolution
		const rpcUrl = getRpcUrlForChainOptimized(withTxHash.chain_id, session);

		return { rpcUrl, txHash: withTxHash.tx_hash, chainId: withTxHash.chain_id };
	}
	if (withCalldata) {
		if (!withCalldata.chain_id) {
			throw new ChainIdRequiredError('simulation');
		}

		// Use optimized RPC URL resolution
		const rpcUrl = getRpcUrlForChainOptimized(withCalldata.chain_id, session);

		// Normalize addresses to lowercase for soldb compatibility
		const normalizedSenderAddress = (
			withCalldata.sender_address as string
		).toLowerCase() as Address;
		const normalizedTo = (withCalldata.calldata[1] as string).toLowerCase() as Address;

		return {
			rpcUrl,
			senderAddress: normalizedSenderAddress,
			to: normalizedTo,
			calldata: withCalldata.calldata[4] as Hex,
			blockNumber: withCalldata.block_number ? BigInt(withCalldata.block_number) : undefined,
			nonce: withCalldata.nonce,
			chainId: withCalldata.chain_id,
			value: withCalldata.value,
			transactionIndexInBlock: withCalldata.transaction_index_in_block ?? undefined,
			totalTransactionsInBlock: withCalldata.total_transactions_in_block ?? undefined
		};
	}
	throw new WalnutError(
		'Invalid body',
		'INVALID_REQUEST_BODY',
		400,
		'Invalid request body',
		'Request must contain either transaction hash or calldata.'
	);
};

export const POST = async (request: NextRequest) => {
	const { isPublicNetworkRequest, body } = await checkPublicNetworkRequest(request);

	const chainId = body?.WithCalldata?.chain_id || body?.WithTxHash?.chain_id;
	if (!chainId) {
		const chainIdError = new ChainIdRequiredError('transaction simulation');
		return NextResponse.json(chainIdError.toJSON(), { status: chainIdError.statusCode });
	}

	const authSession = await getServerSession();

	// Require authentication only for non-public network requests
	if (!authSession && !isPublicNetworkRequest) {
		const authError = new AuthenticationRequiredError(chainId, null);
		return NextResponse.json(authError.toJSON(), { status: authError.statusCode });
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
			chainId: parameters.chainId,
			session,
			transactionIndexInBlock: parameters.transactionIndexInBlock,
			totalTransactionsInBlock: parameters.totalTransactionsInBlock
		});

		let walnutCliResult;
		try {
			let txIndex: number | undefined = undefined;
			if (
				parameters.transactionIndexInBlock !== undefined &&
				parameters.transactionIndexInBlock !== null
			) {
				// Use explicitly provided transactionIndexInBlock for precise simulation
				txIndex = parameters.transactionIndexInBlock;
			} else if (transactions && transactions > 0) {
				// Prioritize using last position in block when transactionIndexInBlock is not explicitly provided
				// This ensures we don't use a default value of 0 when we know there are more transactions
				txIndex = Number(transactions) - 1;
			} else if (
				transaction.transactionIndex !== undefined &&
				transaction.transactionIndex !== null
			) {
				// Fallback to transaction's index if available (only when transactions count is unknown)
				txIndex = transaction.transactionIndex;
			}

			const walnutParams = {
				command: (parameters.txHash ? 'trace' : 'simulate') as 'trace' | 'simulate',
				txHash: parameters.txHash,
				to: transaction.to || undefined,
				calldata: parameters.calldata,
				from: parameters.senderAddress,
				// Only pass blockNumber if it was explicitly provided in parameters
				// If not provided, soldb will use latest block automatically
				blockNumber: parameters.blockNumber,
				rpcUrl: parameters.rpcUrl,
				ethdebugDirs,
				cwd,
				chainId,
				session,
				value: parameters.value,
				txIndex
			};

			walnutCliResult = await soldb(walnutParams);
		} catch (walnutError: any) {
			const wrappedError = wrapError(walnutError, chainId, session);

			// Sanitize the error message for logging
			const sanitizedMessage = sanitizeErrorMessage(wrappedError.message);
			console.error(
				`SOLDB failed. Compilation errors: ${compilationErrors.join(
					'; '
				)}. Error: ${sanitizedMessage}`
			);

			// If we have compilation errors, include them in the error message
			if (compilationErrors.length > 0) {
				return NextResponse.json(wrappedError.toJSON(), { status: wrappedError.statusCode });
			}

			throw wrappedError; // Re-throw if it's not related to compilation
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
			transactions:
				transactions !== undefined && transactions !== null ? [transactions.toString()] : [],
			txHash: parameters.txHash,
			compilationSummary
		});
		// anvil.kill();
		return NextResponse.json(response);
	} catch (err: any) {
		const wrappedError = wrapError(err, undefined, session);

		// Sanitize error message for logging
		const sanitizedMessage = sanitizeErrorMessage(wrappedError.message);
		console.error('SIMULATE TRANSACTION ERROR:', sanitizedMessage);

		// Return structured error response
		return NextResponse.json(wrappedError.toJSON(), { status: wrappedError.statusCode });
	}
};
