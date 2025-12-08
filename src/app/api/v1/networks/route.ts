import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';
import { getSupportedNetworks } from '@/lib/get-supported-networks';
import { CHAINS_META, PUBLIC_NETWORKS } from '@/lib/networks';

export const GET = async (_request: NextRequest) => {
	const authSession = await getServerSession();

	// Get supported networks (static + tenant if logged in)
	// This already includes all public networks, even if RPC URL is not configured
	const supported = getSupportedNetworks(authSession?.session || null);

	const networks = supported
		.map((n) => {
			const rpcUrl = n.rpcEnvVar.startsWith('http')
				? n.rpcEnvVar
				: (process.env[n.rpcEnvVar] as string | undefined);
			// Include all public networks, even if RPC URL is not configured
			// For public networks without RPC, use empty string (will be handled by frontend)
			if (!rpcUrl && !n.isPublic) return undefined;
			return {
				networkName: n.key,
				displayName: n.displayName,
				rpcUrl: rpcUrl || '',
				chainId: n.chainId
			};
		})
		.filter(Boolean) as {
		networkName: string;
		displayName: string;
		rpcUrl: string;
		chainId: number;
	}[];

	// Deduplicate networks by networkName to prevent duplicates
	const uniqueNetworks = networks.filter(
		(network, index, self) => index === self.findIndex((n) => n.networkName === network.networkName)
	);

	return NextResponse.json({ networks: uniqueNetworks });
};
