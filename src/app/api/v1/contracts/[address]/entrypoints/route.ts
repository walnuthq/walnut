import { NextRequest, NextResponse } from 'next/server';
import { getRpcUrlForChainSafe, isPublicNetwork } from '@/lib/networks';
import { createPublicClient, http, toFunctionSelector } from 'viem';
import fetchContract from '@/app/api/v1/fetch-contract';
import { type Contract } from '@/app/api/v1/types';
import { mapChainIdStringToNumber } from '@/lib/utils';
import { getServerSession } from '@/lib/auth-server';
import {
	wrapError,
	ChainIdRequiredError,
	AuthenticationRequiredError,
	NetworkNotSupportedError
} from '@/lib/errors';
import { checkPublicNetworkRequest, getRpcUrlForChainOptimized } from '@/lib/public-network-utils';

export const GET = async (
	request: NextRequest,
	{ params }: { params: Promise<{ address: string }> }
) => {
	// Get chainId early for better error messages
	const chainId = request.nextUrl.searchParams.get('chain_id');
	const rpcUrlsParam = request.nextUrl.searchParams.get('rpc_urls');

	// Check if it's a public network request
	const isPublicNetworkRequest = chainId ? isPublicNetwork(chainId) : false;

	const authSession = await getServerSession();
	const session = authSession?.session || null;

	// Allow access without authentication for public networks or when rpc_urls are provided
	const isPublic = chainId ? checkPublicNetworkRequest(request) : false;
	const hasRpcUrls = !!rpcUrlsParam;

	if (!authSession && !isPublic && !hasRpcUrls) {
		const authError = new AuthenticationRequiredError(chainId || undefined, null);
		return NextResponse.json(authError.toJSON(), { status: authError.statusCode });
	}

	const { address } = await params;
	try {
		if (!chainId) {
			const chainIdError = new ChainIdRequiredError('entrypoint retrieval');
			return NextResponse.json(chainIdError.toJSON(), { status: chainIdError.statusCode });
		}

		// Get RPC URL for the chain (works for both public and private networks)
		const rpcUrl = getRpcUrlForChainOptimized(chainId, session);
		const publicClient = createPublicClient({ transport: http(rpcUrl) });
		const contractAddress = address as `0x${string}`;

		// Get contract bytecode to verify it exists
		const bytecode = await publicClient.getCode({ address: contractAddress });
		if (!bytecode || bytecode === '0x') {
			return NextResponse.json({ error: 'Contract not found or has no bytecode' }, { status: 404 });
		}

		// Convert chain ID string to number
		console.log('Input chainId:', chainId);
		const chainIdNumber = mapChainIdStringToNumber(chainId);
		console.log('Mapped chainIdNumber:', chainIdNumber);
		if (!chainIdNumber) {
			const networkError = new NetworkNotSupportedError(chainId);
			return NextResponse.json(networkError.toJSON(), { status: networkError.statusCode });
		}

		// Fetch contract data directly
		const contract: Contract = await fetchContract(contractAddress, publicClient, chainIdNumber);

		// Extract ABI and function information
		const abi = contract.abi || [];
		const functions = abi.filter((item: any) => item.type === 'function');

		// Create entrypoints response
		const entry_point_datas = functions.map((func: any) => {
			// Calculate function selector using viem
			let selector = '0x00000000';
			if (func.name) {
				try {
					// Build function signature: name(type1,type2,...)
					const signature =
						func.name +
						'(' +
						(func.inputs || [])
							.map((input: any) => {
								return input.type;
							})
							.join(',') +
						')';
					selector = toFunctionSelector(signature);
				} catch (error) {
					console.warn(`Failed to calculate selector for ${func.name}:`, error);
				}
			}

			// Format inputs
			const formattedInputs = (func.inputs || []).map((input: any) => {
				const inputData: any = {
					name: input.name || '',
					type: input.type
				};

				return inputData;
			});

			// Format outputs
			const formattedOutputs = (func.outputs || []).map((output: any) => {
				const outputData: any = {
					type: output.type
				};

				return outputData;
			});

			return [
				selector,
				{
					name: func.name || '',
					inputs: formattedInputs,
					outputs: formattedOutputs,
					state_mutability: func.stateMutability || 'nonpayable'
				}
			];
		});

		return NextResponse.json({
			entry_point_datas
		});
	} catch (error: any) {
		// Wrap error into structured error
		const wrappedError = wrapError(error);
		console.error('Error fetching contract entrypoints:', wrappedError.message);
		return NextResponse.json(wrappedError.toJSON(), { status: wrappedError.statusCode });
	}
};
