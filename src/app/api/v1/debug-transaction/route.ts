import { NextResponse, type NextRequest } from 'next/server';
import { type Hash, type Address, type Hex, getAddress } from 'viem';
import walnutCli from '@/app/api/v1/walnut-cli';
import traceCallResponseToTransactionSimulationResult from '@/app/api/v1/simulate-transaction/convert-response';
import debugCallResponseToTransactionSimulationResult from '@/app/api/v1/debug-transaction/convert-response';
import {
	processTransactionRequest,
	cleanupOldTempDirs
} from '@/app/api/v1/utils/transaction-processing';
import { getRpcUrlForChainSafe } from '@/lib/networks';

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
	WithCalldata: withCalldata
}: {
	WithTxHash: WithTxHash;
	WithCalldata: WithCalldata;
}) => {
	if (withTxHash) {
		// Validate chain_id is not undefined
		if (!withTxHash.chain_id) {
			throw new Error(
				'chain_id is required for debug transaction. Every chain must have a valid RPC URL with debug options.'
			);
		}

		const rpcUrl = getRpcUrlForChainSafe(withTxHash.chain_id);
		return { rpcUrl, txHash: withTxHash.tx_hash, chainId: withTxHash.chain_id };
	}
	if (withCalldata) {
		// Validate chain_id is not undefined
		if (!withCalldata.chain_id) {
			throw new Error(
				'chain_id is required for debug calldata. Every chain must have a valid RPC URL with debug options.'
			);
		}

		const rpcUrl = getRpcUrlForChainSafe(withCalldata.chain_id);
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
	throw new Error('Invalid body');
};

export const POST = async (request: NextRequest) => {
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

		const body = await request.json();
		const parameters = getParameters(body);

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

		try {
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
			// Handle walnut-cli errors with limited logging to avoid call traces
			console.error('Error running walnut-cli:', e?.message || String(e));
			return NextResponse.json(
				{
					error: 'Failed to run walnut-cli',
					details: e?.message || 'Unknown walnut-cli error'
				},
				{ status: 500 }
			);
		}
	} catch (err: any) {
		// Handle SourcifyABILoader errors specifically to avoid logging full call traces
		if (
			err?.message?.includes('SourcifyABILoaderError') ||
			err?.message?.includes('SourcifyABILoader')
		) {
			console.error('SOURCIFY ABI LOADER ERROR:', err.message);
			return NextResponse.json(
				{
					error: 'Failed to load contract ABI from Sourcify',
					details: 'Contract verification or ABI loading failed'
				},
				{ status: 400 }
			);
		}

		// Handle other errors with limited logging
		console.error('DEBUG TRANSACTION ERROR:', err?.message || String(err));

		// Don't log the full error object to avoid call traces
		if (err?.stack) {
			console.error('Error stack trace available (not logged for brevity)');
		}

		return NextResponse.json(
			{
				error: err?.message || 'Unknown error occurred during debug transaction processing'
			},
			{ status: 400 }
		);
	}
};
