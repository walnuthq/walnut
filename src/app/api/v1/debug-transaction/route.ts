import { NextResponse, type NextRequest } from 'next/server';
import { type Hash, createPublicClient, http } from 'viem';

import walnutCli from '@/app/api/v1/walnut-cli';
import debugCallResponseToTransactionSimulationResult from '@/app/api/v1/debug-transaction/convert-response';
import fetchContract from '@/app/api/v1/fetch-contract';

export const POST = async (request: NextRequest) => {
	const body = await request.json();
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

	// Fetch contract sources for each contract address in contracts as we need file paths for the debugger
	const contractAddresses = Object.keys(contracts);
	const chainId = await publicClient.getChainId();
	const contractSourcesArr = await Promise.all(
		contractAddresses.map(async (address) => {
			const contract = await fetchContract(address as `0x${string}`, publicClient, chainId);
			// Filter only sources with defined path
			const filteredSources = (contract.sources as Array<{ path?: string; content: string }>)
				.filter((source) => typeof source.path === 'string')
				.map((source) => ({ path: source.path as string, content: source.content }));
			return { address, sources: filteredSources };
		})
	);
	const contractSourcesMap: Record<string, Array<{ path: string; content: string }>> = {};
	for (const { address, sources } of contractSourcesArr) {
		contractSourcesMap[address] = sources;
	}

	const response = debugCallResponseToTransactionSimulationResult({
		traceCall,
		steps,
		contracts,
		txHash,
		contractSourcesMap
	});

	return NextResponse.json(response);
};
