import { CHAINS_META, getEnabledChainIds, PUBLIC_NETWORKS } from './networks';
import { ChainId, AuthType, ChainMeta } from './types';

export function getSupportedNetworks(session: AuthType['session']): ChainMeta[] {
	// Get enabled networks (those with RPC URLs configured)
	const enabledNetworkKeys = getEnabledChainIds();
	const enabledNetworks = enabledNetworkKeys.map((key) => CHAINS_META[key]);

	const staticNetworks = [...enabledNetworks];

	// Map all tenant networks from session
	const tenantNetworks: ChainMeta[] =
		session?.tenantNetworks?.map((network) => {
			// Key = DISPLAY_NAME in CAPS with underscores (fallback to tenantName)
			const base = (network.displayName || network.tenantName).toUpperCase();
			const tenantChainKey = base.replace(/[^A-Z0-9]+/g, '_') as ChainId;

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
	chainKey: ChainId,
	session: AuthType['session']
): string | undefined {
	// Find network by key and return direct RPC URL if present (tenant networks)
	const meta = getSupportedNetworks(session).find((n) => n.key === chainKey);
	if (meta && typeof meta.rpcEnvVar === 'string' && meta.rpcEnvVar.startsWith('http')) {
		return meta.rpcEnvVar;
	}
	return undefined;
}
