import { ChainKey, CHAINS_META, getEnabledChainKeys } from './networks';
import { AuthType, ChainMeta } from './types';

export function getSupportedNetworks(session: AuthType['session']): ChainMeta[] {
	const staticNetworks = getEnabledChainKeys().map((key) => CHAINS_META[key]);

	// Map all tenant networks from session
	const tenantNetworks: ChainMeta[] =
		session?.tenantNetworks?.map((network) => {
			// Key = DISPLAY_NAME in CAPS with underscores (fallback to tenantName)
			const base = (network.displayName || network.tenantName).toUpperCase();
			const tenantChainKey = base.replace(/[^A-Z0-9]+/g, '_') as ChainKey;

			return {
				key: tenantChainKey,
				displayName: network.displayName,
				chainId: network.chainId,
				rpcEnvVar: network.rpcUrl, // Direktno koristimo RPC URL iz baze
				verificationType: 'blockscout' as const,
				label: network.displayName // For tenant networks, label is same as displayName
			};
		}) || [];

	console.log('tenantNetworks:', tenantNetworks);

	return [...staticNetworks, ...tenantNetworks];
}

export function getRpcUrlForTenantChain(
	chainKey: ChainKey,
	session: AuthType['session']
): string | undefined {
	// Find network by key and return direct RPC URL if present (tenant networks)
	const meta = getSupportedNetworks(session).find((n) => n.key === chainKey);
	if (meta && typeof meta.rpcEnvVar === 'string' && meta.rpcEnvVar.startsWith('http')) {
		return meta.rpcEnvVar;
	}
	return undefined;
}
