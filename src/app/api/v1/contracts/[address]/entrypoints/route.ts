import { NextRequest, NextResponse } from 'next/server';
import { getRpcUrlForChainSafe } from '@/lib/networks';
import { createPublicClient, http } from 'viem';
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

export const GET = async (
	request: NextRequest,
	{ params }: { params: Promise<{ address: string }> }
) => {
	// Get chainId early for better error messages
	const chainId = request.nextUrl.searchParams.get('chain_id');

	const authSession = await getServerSession();
	if (!authSession) {
		const authError = new AuthenticationRequiredError(chainId || undefined, null);
		return NextResponse.json(authError.toJSON(), { status: authError.statusCode });
	}

	const session = authSession.session; // Extract the session object

	const { address } = await params;
	try {
		if (!chainId) {
			const chainIdError = new ChainIdRequiredError('entrypoint retrieval');
			return NextResponse.json(chainIdError.toJSON(), { status: chainIdError.statusCode });
		}

		// Get RPC URL for the chain
		const rpcUrl = getRpcUrlForChainSafe(chainId, session);
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
		const entrypoints = functions.map((func: any) => ({
			name: func.name,
			selector:
				func.selector ||
				'0x' +
					(func.name
						? // Calculate selector if not present
						  require('crypto')
								.createHash('sha3-256')
								.update(
									func.name +
										'(' +
										(func.inputs || []).map((input: any) => input.type).join(',') +
										')'
								)
								.digest('hex')
								.slice(0, 8)
						: '00000000'),
			inputs: func.inputs || [],
			outputs: func.outputs || [],
			stateMutability: func.stateMutability || 'nonpayable'
		}));

		return NextResponse.json({
			address: contractAddress,
			chainId,
			abi,
			entrypoints,
			contractName: contract.name,
			verified: contract.verified,
			verificationSource: contract.verificationSource
		});
	} catch (error: any) {
		// Wrap error into structured error
		const wrappedError = wrapError(error);
		console.error('Error fetching contract entrypoints:', wrappedError.message);
		return NextResponse.json(wrappedError.toJSON(), { status: wrappedError.statusCode });
	}
};
