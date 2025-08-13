import { rm } from 'node:fs/promises';
import { NextResponse, type NextRequest } from 'next/server';
import { createPublicClient, http, type Hash, type Address, type Hex, getAddress } from 'viem';
import { uniqBy } from 'lodash';

// import { spawnAnvil } from '@/app/api/v1/anvil';
import createTracingClient, { flattenTraceCall } from '@/app/api/v1/tracing-client';
import fetchContract from '@/app/api/v1/fetch-contract';
import walnutCli from '@/app/api/v1/walnut-cli';
import traceCallResponseToTransactionSimulationResult from '@/app/api/v1/simulate-transaction/convert-response';
import { type Contract } from '@/app/api/v1/types';
import { mapChainIdStringToNumber } from '@/lib/utils';
import { getRpcUrlForChainSafe } from '@/lib/networks';
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
	sender_address: string;
	calldata: string[];
	block_number: number | undefined;
	transaction_version: number;
	nonce: number | undefined;
	chain_id: string | undefined;
};

const getParameters = ({
	WithTxHash: withTxHash,
	WithCalldata: withCalldata
}: {
	WithTxHash: WithTxHash;
	WithCalldata: WithCalldata;
}) => {
	if (withTxHash) {
		// Prefer chain-based RPC resolution if provided
		let rpcUrl: string;
		if (withTxHash?.chain_id) {
			try {
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
		if (withCalldata.chain_id) {
			try {
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
	try {
		const body = await request.json();
		const parameters = getParameters(body);
		// console.log('/simulate-transaction parameters', parameters);
		// SPAWN ANVIL
		// console.log('SPAWNING ANVIL');
		// const anvil = await spawnAnvil({ rpcUrl, txHash });
		// console.log('ANVIL STARTED');
		// FETCH TRACE CALL
		// Avoid leaking RPC URL in logs
		console.log('FETCHING TRACE CALL {}', {
			...parameters,
			rpcUrl: parameters.rpcUrl
		});
		const publicClient = createPublicClient({ transport: http(parameters.rpcUrl) });
		const tracingClient = createTracingClient(parameters.rpcUrl);
		const [chainId, transaction, traceResult] = await Promise.all([
			parameters.chainId
				? mapChainIdStringToNumber(parameters.chainId) || publicClient.getChainId()
				: publicClient.getChainId(),
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
		// console.log('TRACE CALL FETCHED');
		// console.log({ chainId });
		// console.log(transaction.to);
		// console.log(traceResult);
		if (!transaction.to && traceResult && traceResult.type !== 'CREATE') {
			throw new Error(
				'ERROR: eth_getTransactionByHash failed - missing to address and not a CREATE transaction'
			);
		}
		if (!traceResult) {
			throw new Error('ERROR: debug_traceTransaction/debug_traceCall failed');
		}
		// contracts should be verified first
		// forge verify-contract --rpc-url $RPC_URL --compiler-version 0.8.30 --via-ir $CONTRACT_ADDRESS examples/TestContract.sol:TestContract
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

		// COPY SOURCES TO /TMP AND COMPILE ONLY VERIFIED CONTRACTS
		const tmp = `/tmp/${parameters.txHash ?? parameters.calldata.slice(0, 128)}`;
		await rm(tmp, { recursive: true, force: true });

		// Use the utility module for contract compilation
		const { compiled, ethdebugDirs, cwd, compilationErrors } = await compileContracts(
			verifiedContracts,
			tmp
		);

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

			walnutCliResult = await walnutCli(walnutParams);
		} catch (walnutError: any) {
			// Handle walnut-cli errors with limited logging to avoid call traces
			console.error('WALNUT-CLI execution failed:', walnutError?.message || String(walnutError));

			// If we have compilation errors, include them in the error message
			if (compilationErrors.length > 0) {
				const errorMsg = `WALNUT-CLI failed. Compilation errors prevented debug data: ${compilationErrors.join(
					'; '
				)}. Execution error: ${walnutError?.message || String(walnutError)}`;
				return NextResponse.json({ error: errorMsg }, { status: 400 });
			}

			// Don't log the full error object to avoid call traces
			if (walnutError?.stack) {
				console.error('Walnut-cli error stack trace available (not logged for brevity)');
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
			transactions,
			txHash: parameters.txHash,
			compilationSummary
		});
		// anvil.kill();
		return NextResponse.json(response);
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
		console.error('SIMULATE TRANSACTION ERROR:', err?.message || String(err));

		// Don't log the full error object to avoid call traces
		if (err?.stack) {
			console.error('Error stack trace available (not logged for brevity)');
		}

		return NextResponse.json(
			{
				error: err?.message || 'Unknown error occurred during transaction simulation'
			},
			{ status: 400 }
		);
	}
};
