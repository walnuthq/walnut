import { ChainId } from '@/lib/types';
import { fetchApi } from '@/lib/utils';
import { SimulationPayloadWithCalldata, TransactionSimulationResult } from '@/lib/simulation';

export async function simulateTransactionByData(
	simulationPayload: SimulationPayloadWithCalldata,
	skipTracking?: boolean
): Promise<TransactionSimulationResult> {
	const a = await fetchApi<TransactionSimulationResult>(`/v1/simulate-transaction`, {
		method: 'POST',
		data: {
			WithCalldata: {
				sender_address: simulationPayload.senderAddress,
				calldata: simulationPayload.calldata,
				block_number: simulationPayload.blockNumber,
				transaction_version: simulationPayload.transactionVersion,
				nonce: simulationPayload.nonce,
				chain_id: simulationPayload.chainId
			}
		},
		renameToCamelCase: true,
		queryParams: skipTracking ? { skip_tracking: 'true' } : undefined
	});
	return a;
}

export async function simulateTransactionByHash({
	chainId,
	txHash,
	skipTracking
}: {
	chainId: ChainId;
	txHash: string;
	skipTracking?: boolean;
}): Promise<TransactionSimulationResult> {
	const a = await fetchApi<TransactionSimulationResult>(
		`/v1/${chainId}/simulate-transaction/${txHash}`,
		{
			renameToCamelCase: true,
			queryParams: skipTracking ? { skip_tracking: 'true' } : undefined
		}
	);
	return a;
}

export async function simulateCustomNetworkTransactionByHash({
	rpcUrl,
	txHash,
	skipTracking
}: {
	rpcUrl: string;
	txHash: string;
	skipTracking?: boolean;
}): Promise<TransactionSimulationResult> {
	return await fetchApi<TransactionSimulationResult>(`/v1/simulate-transaction`, {
		method: 'POST',
		renameToCamelCase: true,
		data: {
			WithTxHash: {
				tx_hash: txHash
			}
		},
		queryParams: skipTracking ? { skip_tracking: 'true' } : undefined
	});
}
