import { ChainId } from '@/lib/types';
import { fetchApi } from '@/lib/utils';
import { DebuggerPayload, DebuggerInfo } from '@/lib/debugger';

export async function debugTransactionByData(
	debuggerPayload: DebuggerPayload
): Promise<DebuggerInfo> {
	const a = await fetchApi<DebuggerInfo>(`/v1/debug-transaction`, {
		method: 'POST',
		data: {
			WithCalldata: {
				rpc_url: process.env.NEXT_PUBLIC_RPC_URL,
				chain_id: debuggerPayload.chainId ?? null,
				block_number: debuggerPayload.blockNumber ?? null,
				block_timestamp: debuggerPayload.blockTimestamp,
				nonce: debuggerPayload.nonce,
				sender_address: debuggerPayload.senderAddress,
				calldata: debuggerPayload.calldata,
				transaction_version: debuggerPayload.transactionVersion,
				transaction_type: debuggerPayload.transactionType,
				transaction_index_in_block: debuggerPayload.transactionIndexInBlock ?? null,
				total_transactions_in_block: debuggerPayload.totalTransactionsInBlock ?? null,
				transaction_hash: debuggerPayload.l2TxHash ?? null
			}
		},
		renameToCamelCase: true
	});
	return a;
}

export async function debugCustomNetworkTransactionByHash({
	rpcUrl,
	txHash,
	skipTracking
}: {
	rpcUrl: string;
	txHash: string;
	skipTracking?: boolean;
}): Promise<DebuggerInfo> {
	return await fetchApi<DebuggerInfo>(`/v1/debug-transaction`, {
		method: 'POST',
		renameToCamelCase: true,
		data: {
			WithTxHash: {
				rpc_url: rpcUrl,
				tx_hash: txHash
			}
		},
		queryParams: skipTracking ? { skip_tracking: 'true' } : undefined
	});
}
