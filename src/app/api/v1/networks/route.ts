import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';
import { getSupportedNetworks } from '@/lib/get-supported-networks';

export const GET = async (_request: NextRequest) => {
	const authSession = await getServerSession();

	// Get supported networks (static + tenant if logged in)
	const supported = getSupportedNetworks(authSession?.session || null);
	const networks = supported
		.map((n) => {
			const rpcUrl = n.rpcEnvVar.startsWith('http')
				? n.rpcEnvVar
				: (process.env[n.rpcEnvVar] as string | undefined);
			if (!rpcUrl) return undefined;
			return {
				networkName: n.key,
				displayName: n.displayName,
				rpcUrl,
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
