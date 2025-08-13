import { NextResponse, type NextRequest } from 'next/server';
import { createPublicClient, http, type Hash, type Address, type Hex, getAddress } from 'viem';
import { uniqBy } from 'lodash';

import createTracingClient, { flattenTraceCall } from '@/app/api/v1/tracing-client';
import fetchContract from '@/app/api/v1/fetch-contract';
import walnutCli from '@/app/api/v1/walnut-cli';
import traceCallResponseToTransactionSimulationResult from '@/app/api/v1/simulate-transaction/convert-response';
import debugCallResponseToTransactionSimulationResult from '@/app/api/v1/debug-transaction/convert-response';
import { type Contract } from '@/app/api/v1/types';
import { compileContracts } from '@/app/api/v1/utils/contract-compiler';
import {
	verifyDebugDirectories,
	logCompilationStatus
} from '@/app/api/v1/utils/debug-directory-utils';
import { createCompilationSummary } from '@/app/api/v1/utils/compilation-status-utils';

type WithTxHash = {
	tx_hash: Hash;
	chain_id?: string;
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
		let rpcUrl: string;
		if (withTxHash?.chain_id) {
			try {
				const { getRpcUrlForChainSafe } = require('@/lib/networks');
				rpcUrl = getRpcUrlForChainSafe(withTxHash.chain_id, process.env.NEXT_PUBLIC_RPC_URL);
			} catch (e) {
				console.warn('Failed to resolve chain_id, using fallback RPC:', withTxHash.chain_id);
				rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;
			}
		} else {
			rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;
		}
		return { rpcUrl, txHash: withTxHash.tx_hash, chainId: withTxHash?.chain_id };
	}
	if (withCalldata) {
		let rpcUrl: string;
		if (withCalldata?.chain_id) {
			try {
				const { getRpcUrlForChainSafe } = require('@/lib/networks');
				rpcUrl = getRpcUrlForChainSafe(withCalldata.chain_id, process.env.NEXT_PUBLIC_RPC_URL);
			} catch (e) {
				console.warn('Failed to resolve chain_id, using fallback RPC:', withCalldata.chain_id);
				rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;
			}
		} else {
			rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;
		}
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
						transactionIndex: parameters.transactionIndexInBlock ?? 0
				  },
			parameters.txHash
				? tracingClient.traceTransaction({
						transactionHash: parameters.txHash,
						tracer: 'callTracer'
				  })
				: tracingClient.traceCall({
						from: parameters.senderAddress,
						to: parameters.to,
						data: parameters.calldata,
						blockNrOrHash: parameters.blockNumber
							? `0x${parameters.blockNumber.toString(16)}`
							: 'latest',
						tracer: 'callTracer'
				  })
		]);

		if (!transaction.to && traceResult && traceResult.type !== 'CREATE') {
			throw new Error(
				'ERROR: eth_getTransactionByHash failed - missing to address and not a CREATE transaction'
			);
		}
		if (!traceResult) {
			throw new Error('ERROR: debug_traceTransaction/debug_traceCall failed');
		}

		// FETCH CONTRACTS
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

		// there's no need to refetch every sources and recompile everything as it was done in the
		// /simulate-transaction endpoint
		const tmp = `/tmp/${parameters.txHash ?? parameters.calldata.slice(0, 128)}`;

		// Use the utility module for contract compilation
		const { compiled, ethdebugDirs, cwd, compilationErrors } = await compileContracts(
			verifiedContracts,
			tmp
		);

		const debugVerification = await verifyDebugDirectories(ethdebugDirs);

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
