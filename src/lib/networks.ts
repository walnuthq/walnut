import { getRpcUrlForTenantChain, getSupportedNetworks } from './get-supported-networks';
import { AuthType, ChainId, ChainMeta } from './types';
import { NetworkNotSupportedError, RpcUrlNotFoundError } from './errors';

// Re-export ChainId for convenience
export { ChainId } from './types';

export const CHAINS_META: Record<ChainId, ChainMeta> = {
	[ChainId.ETH_MAIN]: {
		key: ChainId.ETH_MAIN,
		displayName: 'Ethereum Mainnet',
		chainId: 1,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_ETH_MAIN',
		verificationType: 'sourcify',
		label: 'Ethereum Mainnet RPC',
		isPublic: true
	},
	[ChainId.ETH_SEPOLIA]: {
		key: ChainId.ETH_SEPOLIA,
		displayName: 'Ethereum Sepolia',
		chainId: 11155111,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_ETH_SEPOLIA',
		verificationType: 'sourcify',
		label: 'Ethereum Sepolia RPC',
		isPublic: true
	},
	[ChainId.SN_MAIN]: {
		key: ChainId.SN_MAIN,
		displayName: 'Starknet Mainnet',
		chainId: 23448594291968334,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_SN_MAIN',
		verificationType: 'sourcify',
		label: 'Starknet Mainnet RPC',
		isPublic: true
	},
	[ChainId.SN_SEPOLIA]: {
		key: ChainId.SN_SEPOLIA,
		displayName: 'Starknet Sepolia',
		chainId: 1536727068981429685,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_SN_SEPOLIA',
		verificationType: 'sourcify',
		label: 'Starknet Sepolia RPC',
		isPublic: true
	},
	[ChainId.OP_MAIN]: {
		key: ChainId.OP_MAIN,
		displayName: 'OP Mainnet',
		chainId: 10,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_OP_MAIN',
		verificationType: 'sourcify',
		label: 'Optimism Mainnet Alchemy RPC',
		isPublic: true
	},
	[ChainId.OP_SEPOLIA]: {
		key: ChainId.OP_SEPOLIA,
		displayName: 'OP Sepolia',
		chainId: 11155420,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_OP_SEPOLIA',
		verificationType: 'sourcify',
		label: 'Optimism Sepolia Alchemy RPC',
		isPublic: true
	},
	[ChainId.POWERLOOM_DEVNET]: {
		key: ChainId.POWERLOOM_DEVNET,
		displayName: 'PowerLoom Devnet',
		chainId: 11167,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_POWERLOOM_DEVNET',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_POWERLOOM_DEVNET',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'PowerLoom Devnet RPC'
	},
	[ChainId.POWERLOOM_MAINNET]: {
		key: ChainId.POWERLOOM_MAINNET,
		displayName: 'PowerLoom Mainnet',
		chainId: 7865,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_POWERLOOM_MAINNET',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_POWERLOOM_MAINNET',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'PowerLoom Mainnet RPC'
	},
	[ChainId.ARBITRUM_ONE]: {
		key: ChainId.ARBITRUM_ONE,
		displayName: 'Arbitrum One',
		chainId: 42161,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_ARBITRUM_ONE',
		verificationType: 'sourcify',
		label: 'Arbitrum One RPC',
		isPublic: true
	},
	[ChainId.ARBITRUM_SEPOLIA]: {
		key: ChainId.ARBITRUM_SEPOLIA,
		displayName: 'Arbitrum Sepolia',
		chainId: 421614,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_ARBITRUM_SEPOLIA',
		verificationType: 'sourcify',
		label: 'Arbitrum Sepolia RPC',
		isPublic: true
	},
	[ChainId.CITREA_TESTNET]: {
		key: ChainId.CITREA_TESTNET,
		displayName: 'Citrea Testnet',
		chainId: 5115,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_CITREA_TESTNET',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_CITREA_TESTNET',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'Citrea Testnet RPC',
		isPublic: true
	},
	[ChainId.UNICHAIN_MAINNET]: {
		key: ChainId.UNICHAIN_MAINNET,
		displayName: 'Unichain Mainnet',
		chainId: 130,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_UNICHAIN_MAINNET',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_UNICHAIN_MAINNET',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'Unichain Mainnet RPC',
		isPublic: true
	},
	[ChainId.UNICHAIN_TESTNET]: {
		key: ChainId.UNICHAIN_TESTNET,
		displayName: 'Unichain Sepolia',
		chainId: 1301,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_UNICHAIN_TESTNET',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_UNICHAIN_TESTNET',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'Unichain Sepolia RPC',
		isPublic: true
	},
	[ChainId.BOB_MAINNET]: {
		key: ChainId.BOB_MAINNET,
		displayName: 'Bob Mainnet',
		chainId: 60808,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_BOB_MAINNET',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_BOB_MAINNET',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'Bob Mainnet RPC',
		isPublic: true
	},
	[ChainId.BOB_SEPOLIA]: {
		key: ChainId.BOB_SEPOLIA,
		displayName: 'Bob Sepolia',
		chainId: 808813,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_BOB_SEPOLIA',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_BOB_SEPOLIA',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'Bob Sepolia RPC',
		isPublic: true
	}
};

/**
 * Automatically generate PUBLIC_NETWORKS from CHAINS_META
 * Networks with isPublic: true are included
 */
export const PUBLIC_NETWORKS: ChainId[] = Object.values(CHAINS_META)
	.filter((meta) => meta.isPublic === true)
	.map((meta) => meta.key);

/**
 * Checks if a chain identifier (key or numeric ID) is a public network
 * @param chainIdentifier - Chain ID as string key or numeric ID
 * @returns true if the chain is a public network
 */
export function isPublicNetwork(chainIdentifier: string | number): boolean {
	// Check if it's a public network key
	if (typeof chainIdentifier === 'string') {
		if (PUBLIC_NETWORKS.includes(chainIdentifier as ChainId)) {
			return true;
		}
	}

	// Check if the numeric chain ID matches any public network
	const chainIdNumber =
		typeof chainIdentifier === 'number' ? chainIdentifier : Number(chainIdentifier);
	if (!isNaN(chainIdNumber)) {
		return PUBLIC_NETWORKS.some((key) => CHAINS_META[key].chainId === chainIdNumber);
	}

	return false;
}

/**
 * Automatically generate mapChainIdToChainId from CHAINS_META
 * This eliminates the need to manually maintain this mapping
 */
export function mapChainIdToChainId(chainId: string): ChainId | undefined {
	const chainKey = chainId.toUpperCase() as ChainId;
	if (chainKey in CHAINS_META) {
		return chainKey;
	}
	return undefined;
}

/**
 * Gets all chain keys that have RPC URLs configured
 * A chain is enabled if it has a valid RPC URL in environment variables
 */
export function getEnabledChainIds(): ChainId[] {
	return Object.values(CHAINS_META)
		.filter((meta) => {
			const rpcEnvVar = meta.rpcEnvVar;
			// If it's already a URL, it's configured
			if (rpcEnvVar?.startsWith('http://') || rpcEnvVar?.startsWith('https://')) {
				return true;
			}
			// Otherwise check if env var is set
			const rpcUrl = (process.env as any)[rpcEnvVar] as string | undefined;
			return rpcUrl !== undefined && rpcUrl.trim() !== '';
		})
		.map((meta) => meta.key);
}

export function getRpcUrlForChain(key: ChainId): string | undefined {
	const meta = CHAINS_META[key];
	const val = meta.rpcEnvVar;
	// If someone mistakenly set a URL here, just return it
	if (val?.startsWith('http://') || val?.startsWith('https://')) return val;
	const rpc = (process.env as any)[val] as string | undefined;
	return rpc?.trim();
}

export function getDisplayNameForChain(key: ChainId): string {
	return CHAINS_META[key]?.displayName ?? key;
}

export function getLabelForChain(key: ChainId): string {
	return CHAINS_META[key]?.label ?? key;
}

export function getLabelForChainIdNumber(chainIdNumber: number): string {
	const chainKey = getChainIdByNumber(chainIdNumber);
	if (chainKey) {
		return getLabelForChain(chainKey);
	}
	// Fallback for unmapped chain IDs
	return `Chain ${chainIdNumber}`;
}

export function getDisplayNameForChainId(chainId: string): string {
	const chainKey = mapChainIdToChainId(chainId);
	if (chainKey) {
		return getDisplayNameForChain(chainKey);
	}
	// Fallback for unmapped chain IDs (like Starknet chains)
	return chainId;
}

/**
 * Gets the display name for a chain ID number
 * @param chainIdNumber - The numeric chain ID
 * @returns The display name for the chain or the chain ID as string if not found
 */
export function getDisplayNameForChainIdNumber(chainIdNumber: number): string {
	const chainKey = getChainIdByNumber(chainIdNumber);
	if (chainKey) {
		return getDisplayNameForChain(chainKey);
	}
	// Fallback for unmapped chain IDs
	return chainIdNumber.toString();
}

export function getExplorerApiForChain(
	key: ChainId
): { baseUrl: string; type: NonNullable<ChainMeta['explorerType']> } | undefined {
	const meta = CHAINS_META[key];
	if (!meta?.explorerApiEnvVar || !meta?.explorerType) return undefined;
	const varName = meta.explorerApiEnvVar;
	const baseUrl =
		varName?.startsWith('http://') || varName?.startsWith('https://')
			? varName
			: ((process.env as any)[varName] as string | undefined);
	if (!baseUrl) return undefined;
	return { baseUrl: baseUrl.replace(/\/$/, ''), type: meta.explorerType };
}

export function getVerificationTypeForChain(key: ChainId): 'sourcify' | 'blockscout' {
	return CHAINS_META[key]?.verificationType ?? 'sourcify';
}

export function getChainIdByNumber(chainIdNumber: number): ChainId | undefined {
	const meta = Object.values(CHAINS_META).find((m) => m.chainId === chainIdNumber);
	return meta?.key;
}

/**
 * Safely resolves a chain identifier to a ChainId enum value
 * @param chainIdentifier - Can be a chain ID number, string representation, or ChainId enum value
 * @returns The resolved ChainId or undefined if not found
 */
export function resolveChainId(
	chainIdentifier: string | number | ChainId,
	session: AuthType['session']
): ChainId | undefined {
	const allSupportedNetworks = getSupportedNetworks(session);
	const foundBySupported = allSupportedNetworks.find(
		(n) => n.key === chainIdentifier || n.chainId === Number(chainIdentifier)
	);
	if (foundBySupported) {
		return foundBySupported.key;
	}

	// If it's already a ChainId enum value, return it
	if (Object.values(ChainId).includes(chainIdentifier as ChainId)) {
		return chainIdentifier as ChainId;
	}

	// If it's a number or numeric string, try to find by chain ID
	if (typeof chainIdentifier === 'number' || !isNaN(Number(chainIdentifier))) {
		const chainIdNumber =
			typeof chainIdentifier === 'string' ? parseInt(chainIdentifier, 10) : chainIdentifier;
		const meta = Object.values(CHAINS_META).find((m) => m.chainId === chainIdNumber);
		return meta?.key;
	}

	// If it's a string, try to find by key (case-insensitive)
	const upperKey = String(chainIdentifier).toUpperCase(); // Explicitly cast to string before toUpperCase
	if (Object.values(ChainId).includes(upperKey as ChainId)) {
		return upperKey as ChainId;
	}

	return undefined;
}

/**
 * Gets the RPC URL for a chain identifier, throws error if not found
 * @param chainIdentifier - Can be a chain ID number, string representation, or ChainId enum value
 * @returns The RPC URL for the chain
 * @throws Error if no RPC URL is found for the chain
 */
export function getRpcUrlForChainSafe(
	chainIdentifier: string | number | ChainId,
	session: AuthType['session']
): string {
	const chainKey = resolveChainId(chainIdentifier, session);
	if (!chainKey) {
		throw new NetworkNotSupportedError(chainIdentifier);
	}

	const tenantRpcUrl = getRpcUrlForTenantChain(chainKey, session);
	if (tenantRpcUrl) {
		return tenantRpcUrl;
	}

	const rpcUrl = getRpcUrlForChain(chainKey);
	if (!rpcUrl) {
		throw new RpcUrlNotFoundError(chainKey, session);
	}

	return rpcUrl;
}
