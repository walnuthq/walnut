import { NextResponse, type NextRequest } from 'next/server';
import { type Hash, createPublicClient, http, type Address, type Hex, getAddress } from 'viem';
import { uniqBy } from 'lodash';

import createTracingClient, { flattenTraceCall } from '@/app/api/v1/tracing-client';
import fetchContract from '@/app/api/v1/fetch-contract';
import walnutCli from '@/app/api/v1/walnut-cli';
import traceCallResponseToTransactionSimulationResult from '@/app/api/v1/simulate-transaction/convert-response';
import debugCallResponseToTransactionSimulationResult from '@/app/api/v1/debug-transaction/convert-response';
import debuggerInfo from '@/app/api/v1/debug-transaction/debugger-info.json';

type WithTxHash = {
	rpc_url: string;
	tx_hash: Hash;
};

type WithCalldata = {
	rpc_url: string;
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
		return { rpcUrl: withTxHash.rpc_url, txHash: withTxHash.tx_hash };
	}
	if (withCalldata) {
		return {
			rpcUrl: withCalldata.rpc_url,
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
	const body = await request.json();
	const parameters = getParameters(body);

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
	if (!transaction.to) {
		throw new Error('ERROR: eth_getTransactionByHash failed');
	}
	if (!traceResult) {
		throw new Error('ERROR: debug_traceTransaction/debug_traceCall failed');
	}
	// FETCH CONTRACTS
	const flattenedTraceTransactionResult = uniqBy(flattenTraceCall(traceResult), 'to');
	const [{ timestamp, transactions }, sourcifyContracts] = await Promise.all([
		publicClient.getBlock({ blockNumber: transaction.blockNumber }),
		Promise.all(
			flattenedTraceTransactionResult
				.filter(({ type }) => type === 'CALL')
				.map(({ to }) => fetchContract(to, publicClient, chainId))
		)
	]);
	// there's no need to refetch every sources and recompile everything as it was done in the
	// /simulate-transaction endpoint
	const tmp = `/tmp/${parameters.txHash ?? parameters.calldata.slice(0, 128)}`;
	// RUN WALNUT-CLI
	const { traceCall, steps, contracts } = await walnutCli({
		command: parameters.txHash ? 'trace' : 'simulate',
		txHash: parameters.txHash,
		to: parameters.to,
		calldata: parameters.calldata,
		from: parameters.senderAddress,
		blockNumber: parameters.blockNumber,
		rpcUrl: parameters.rpcUrl,
		cwd: `${tmp}/${sourcifyContracts[0].address}`
	});
	const contractNames = sourcifyContracts.reduce(
		(previousValue, currentValue) => ({
			...previousValue,
			[currentValue.address]: currentValue.name
		}),
		{}
	);
	const { l2TransactionData } = traceCallResponseToTransactionSimulationResult({
		traceCall,
		contracts,
		contractNames,
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
	if (!l2TransactionData) {
		throw new Error('ERROR: traceCallResponseToTransactionSimulationResult failed');
	}
	const response = debugCallResponseToTransactionSimulationResult({
		traceCall,
		steps,
		contracts,
		sourcifyContracts,
		contractCallsMap: l2TransactionData.simulationResult.contractCallsMap,
		functionCallsMap: l2TransactionData.simulationResult.functionCallsMap,
		txHash: parameters.txHash ?? ''
	});
	return NextResponse.json(response);
	//return NextResponse.json(debuggerInfo);
};
