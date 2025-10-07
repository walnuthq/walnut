import { ChainKey, CHAINS_META, getEnabledChainKeys } from './networks';
import { AuthType, ChainMeta } from './types';

export function getSupportedNetworks(session: AuthType['session']): ChainMeta[] {
	const staticNetworks = getEnabledChainKeys().map((key) => CHAINS_META[key]);

	const tenantNetworks: ChainMeta[] =
		(session?.tenant?.rpcUrls
			.map((rpcUrl: string, index: number) => {
				const tenantChainKey = `TENANT_${session.tenant?.name.toUpperCase()}` as ChainKey;
				const tenantDisplayName = `${session.tenant?.name}`;
				const chainId = session.tenant?.chainIds[index];

				if (typeof chainId === 'undefined') {
					console.warn(`ChainId not found for tenant RPC URL at index ${index}. Skipping.`);
					return null; // Skip this network if chainId is not defined
				}

				return {
					key: tenantChainKey,
					displayName: tenantDisplayName,
					chainId: chainId,
					rpcEnvVar: rpcUrl,
					verificationType: 'blockscout'
				};
			})
			.filter(Boolean) as ChainMeta[]) || [];

	return [...staticNetworks, ...tenantNetworks];
}

export function getRpcUrlForTenantChain(
	chainKey: ChainKey,
	session: AuthType['session']
): string | undefined {
	// Assume tenant chainKeys are in the format TENANT_TENANTNAME_INDEX
	if (chainKey.startsWith('TENANT_')) {
		const meta = getSupportedNetworks(session).find((n) => n.key === chainKey);
		if (meta && meta.rpcEnvVar.startsWith('http')) {
			return meta.rpcEnvVar;
		}
	}
	return undefined;
}
