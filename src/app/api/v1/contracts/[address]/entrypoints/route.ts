import { NextRequest, NextResponse } from 'next/server';
import { getRpcUrlForChainSafe } from '@/lib/networks';
import { createPublicClient, http } from 'viem';
import fetchContract from '@/app/api/v1/fetch-contract';
import { type Contract } from '@/app/api/v1/types';
import { mapChainIdStringToNumber } from '@/lib/utils';

export const GET = async (
	request: NextRequest,
	{ params: { address } }: { params: { address: string } }
) => {
	try {
		const chainId = request.nextUrl.searchParams.get('chain_id');

		if (!chainId) {
			return NextResponse.json({ error: 'chain_id is required' }, { status: 400 });
		}

		// Get RPC URL for the chain
		const rpcUrl = getRpcUrlForChainSafe(chainId);
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
			return NextResponse.json({ error: `Unsupported chain ID: ${chainId}` }, { status: 400 });
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
		console.error('Error fetching contract entrypoints:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch contract entrypoints', details: error.message },
			{ status: 500 }
		);
	}
};
