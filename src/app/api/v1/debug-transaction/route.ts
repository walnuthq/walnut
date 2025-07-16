import { NextResponse, type NextRequest } from 'next/server';
import { type Hash, createPublicClient, http } from 'viem';

import walnutCli from '@/app/api/v1/walnut-cli';
import debugCallResponseToTransactionSimulationResult from '@/app/api/v1/debug-transaction/convert-response';

export const POST = async (request: NextRequest) => {
	const body = await request.json();
	/* const {
		chain_id: chainId,
		block_number: blockNumber,
		block_timestamp: blockTimestamp,
		nonce,
		sender_address: senderAddress,
		calldata,
		transaction_version: transactionVersion,
		transaction_type: transactionType,
		transaction_index_in_block: transactionIndexInBlock,
		total_transactions_in_block: totalTransactionsInBlock,
		transaction_hash: transactionHash
	} = body as {
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
	console.log({
		chainId,
		blockNumber,
		blockTimestamp,
		nonce,
		senderAddress,
		calldata,
		transactionVersion,
		transactionType,
		transactionIndexInBlock,
		totalTransactionsInBlock,
		transactionHash
	}); */
	const {
		WithTxHash: { rpc_url: rpcUrl, tx_hash: txHash }
	} = body as {
		WithTxHash: {
			rpc_url: string;
			tx_hash: Hash;
		};
	};
	// hack to get the contract address, as we support only single contract calls atm
	const publicClient = createPublicClient({ transport: http(rpcUrl) });
	const { to } = await publicClient.getTransaction({ hash: txHash });
	// there's no need to refetch every sources and recompile everything as it was done in the
	// /simulate-transaction endpoint
	const tmp = `/tmp/${txHash}`;
	// RUN WALNUT-CLI
	const { traceCall, steps, contracts } = await walnutCli(rpcUrl, txHash, `${tmp}/${to}`);
	const response = debugCallResponseToTransactionSimulationResult({ traceCall, steps, contracts });
	return NextResponse.json(response);
};
