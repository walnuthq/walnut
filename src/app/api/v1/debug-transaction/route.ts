import { NextResponse, type NextRequest } from 'next/server';
import { type Hash, type Address, type Hex, getAddress } from 'viem';
import soldb from '@/app/api/v1/soldb';
import traceCallResponseToTransactionSimulationResult from '@/app/api/v1/simulate-transaction/convert-response';
import debugCallResponseToTransactionSimulationResult from '@/app/api/v1/debug-transaction/convert-response';
import {
	processTransactionRequest,
	cleanupOldTempDirs
} from '@/app/api/v1/utils/transaction-processing';
import { getServerSession } from '@/lib/auth-server';
import { AuthType } from '@/lib/types';
import { checkPublicNetworkRequest, getRpcUrlForChainOptimized } from '@/lib/public-network-utils';
import {
	wrapError,
	WalnutError,
	ChainIdRequiredError,
	AuthenticationRequiredError,
	sanitizeErrorMessage
} from '@/lib/errors';

type WithTxHash = {
	tx_hash: Hash;
	chain_id: string;
};

type WithCalldata = {
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
			throw new ChainIdRequiredError('debug transaction');
		}

		// Use optimized RPC URL resolution
		const rpcUrl = getRpcUrlForChainOptimized(withTxHash.chain_id, session);

		return { rpcUrl, txHash: withTxHash.tx_hash, chainId: withTxHash.chain_id };
	}
	if (withCalldata) {
		// Validate chain_id is not undefined
		if (!withCalldata.chain_id) {
			throw new ChainIdRequiredError('debug calldata');
		}

		// Use optimized RPC URL resolution
		const rpcUrl = getRpcUrlForChainOptimized(withCalldata.chain_id, session);

		return {
			rpcUrl,
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
	throw new WalnutError(
		'Invalid body',
		'INVALID_REQUEST_BODY',
		400,
		'Invalid request body',
		'Request must contain either transaction hash or calldata.'
	);
};

export const POST = async (request: NextRequest) => {
	// Check if request is for a public network (this also parses the body)
	const { isPublicNetworkRequest, body } = await checkPublicNetworkRequest(request);

	// Get chainId from the nested structure
	const chainId = body?.WithCalldata?.chain_id || body?.WithTxHash?.chain_id;

	if (!chainId) {
		const chainIdError = new ChainIdRequiredError('transaction debugging');
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
			transactionIndexInBlock: parameters.transactionIndexInBlock ?? undefined,
			totalTransactionsInBlock: parameters.totalTransactionsInBlock ?? undefined
		});

		try {
			// Calculate txIndex: prioritize explicitly provided transactionIndexInBlock,
			// then use last position in block when count is known, otherwise fallback to transaction's index
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
				// Fallback to transaction's index if available (only when transaction count is unknown)
				txIndex = transaction.transactionIndex;
			}

			const soldbResult = await soldb({
				command: parameters.txHash ? 'trace' : 'simulate',
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
				txIndex
			});

			const { traceCall, steps, contracts, status, error } = soldbResult;
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
				type: 'INVOKE',
				transactionIndex: transaction.transactionIndex,
				transactions: [transactions.toString()], // Convert bigint to string array
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
		} catch (e: any) {
			const wrappedError = wrapError(e, chainId, session);

			// Sanitize error message for logging
			const sanitizedMessage = sanitizeErrorMessage(wrappedError.message);
			console.error('Error running soldb:', sanitizedMessage);

			return NextResponse.json(wrappedError.toJSON(), { status: wrappedError.statusCode });
		}
	} catch (err: any) {
		const wrappedError = wrapError(err, undefined, session);

		// Sanitize error message for logging
		const sanitizedMessage = sanitizeErrorMessage(wrappedError.message);
		// Return structured error response
		return NextResponse.json(wrappedError.toJSON(), { status: wrappedError.statusCode });
	}
};
