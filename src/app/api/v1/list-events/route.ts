import { NextRequest, NextResponse } from 'next/server';
import { soldbListEvents } from '@/app/api/v1/soldb';
import { getRpcUrlForChainOptimized } from '@/lib/public-network-utils';
import { getServerSession } from '@/lib/auth-server';

export const POST = async (request: NextRequest) => {
	try {
		const { txHash, chainId } = await request.json();

		if (!txHash) {
			return NextResponse.json({ error: 'Transaction hash is required' }, { status: 400 });
		}

		if (!chainId) {
			return NextResponse.json({ error: 'Chain ID is required' }, { status: 400 });
		}

		const authSession = await getServerSession();
		const rpcUrl = getRpcUrlForChainOptimized(chainId, authSession?.session || null);

		const events = await soldbListEvents({
			txHash,
			rpcUrl,
			ethdebugDirs: [], // Add ethdebugDirs if needed
			cwd: process.env.PWD
		});

		return NextResponse.json({ events });
	} catch (err: any) {
		console.error('Error fetching events:', err);
		return NextResponse.json(
			{
				error: 'Failed to fetch events',
				details: err?.message || 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
