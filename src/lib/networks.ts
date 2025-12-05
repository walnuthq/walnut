import { getRpcUrlForTenantChain, getSupportedNetworks } from './get-supported-networks';
import { AuthType } from './types';
import { NetworkNotSupportedError, RpcUrlNotFoundError } from './errors';

export enum ChainKey {
	OP_MAIN = 'OP_MAIN',
	OP_SEPOLIA = 'OP_SEPOLIA',
	POWERLOOM_DEVNET = 'POWERLOOM_DEVNET',
	POWERLOOM_MAINNET = 'POWERLOOM_MAINNET',
	ARBITRUM_ONE = 'ARBITRUM_ONE',
	ARBITRUM_SEPOLIA = 'ARBITRUM_SEPOLIA',
	CITREA_TESTNET = 'CITREA_TESTNET'
}

export type ChainMeta = {
	key: ChainKey;
	displayName: string;
	chainId: number;
	// Name of the env var that holds the RPC URL (do NOT put the URL here)
	rpcEnvVar: string;
	// Optional explorer API base env var name (Blockscout/Etherscan-compatible)
	explorerApiEnvVar?: string;
	// 'blockscout_v2' -> /api/v2/transactions/:hash
	// 'etherscan_proxy' -> /api?module=proxy&action=eth_getTransactionByHash&txhash=:hash
	explorerType?: 'blockscout_v2' | 'etherscan_proxy';
	// Preferred verification method for contracts
	verificationType: 'sourcify' | 'blockscout';
	// Provider label for better rpc identification
	label: string;
	// Whether this network is publicly accessible without authentication
	isPublic?: boolean;
};

export const CHAINS_META: Record<ChainKey, ChainMeta> = {
	[ChainKey.OP_MAIN]: {
		key: ChainKey.OP_MAIN,
		displayName: 'OP Mainnet',
		chainId: 10,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_OP_MAIN',
		verificationType: 'sourcify',
		label: 'Optimism Mainnet Alchemy RPC',
		isPublic: true
	},
	[ChainKey.OP_SEPOLIA]: {
		key: ChainKey.OP_SEPOLIA,
		displayName: 'OP Sepolia',
		chainId: 11155420,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_OP_SEPOLIA',
		verificationType: 'sourcify',
		label: 'Optimism Sepolia Alchemy RPC',
		isPublic: true
	},
	[ChainKey.POWERLOOM_DEVNET]: {
		key: ChainKey.POWERLOOM_DEVNET,
		displayName: 'PowerLoom Devnet',
		chainId: 11167,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_POWERLOOM_DEVNET',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_POWERLOOM_DEVNET',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'PowerLoom Devnet RPC'
	},
	[ChainKey.POWERLOOM_MAINNET]: {
		key: ChainKey.POWERLOOM_MAINNET,
		displayName: 'PowerLoom Mainnet',
		chainId: 7865,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_POWERLOOM_MAINNET',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_POWERLOOM_MAINNET',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'PowerLoom Mainnet RPC'
	},
	[ChainKey.ARBITRUM_ONE]: {
		key: ChainKey.ARBITRUM_ONE,
		displayName: 'Arbitrum One',
		chainId: 42161,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_ARBITRUM_ONE',
		verificationType: 'sourcify',
		label: 'Arbitrum One RPC',
		isPublic: true
	},
	[ChainKey.ARBITRUM_SEPOLIA]: {
		key: ChainKey.ARBITRUM_SEPOLIA,
		displayName: 'Arbitrum Sepolia',
		chainId: 421614,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_ARBITRUM_SEPOLIA',
		verificationType: 'sourcify',
		label: 'Arbitrum Sepolia RPC',
		isPublic: true
	},
	[ChainKey.CITREA_TESTNET]: {
		key: ChainKey.CITREA_TESTNET,
		displayName: 'Citrea Testnet',
		chainId: 5115,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_CITREA_TESTNET',
		explorerApiEnvVar: 'NEXT_PUBLIC_EXPLORER_API_CITREA_TESTNET',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout',
		label: 'Citrea Testnet RPC',
		isPublic: true
	}
};

/**
 * Automatically generate PUBLIC_NETWORKS from CHAINS_META
 * Networks with isPublic: true are included
 */
export const PUBLIC_NETWORKS: ChainKey[] = Object.values(CHAINS_META)
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
		if (PUBLIC_NETWORKS.includes(chainIdentifier as ChainKey)) {
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
 * Automatically generate mapChainIdToChainKey from CHAINS_META
 * This eliminates the need to manually maintain this mapping
 */
export function mapChainIdToChainKey(chainId: string): ChainKey | undefined {
	const chainKey = chainId.toUpperCase() as ChainKey;
	if (chainKey in CHAINS_META) {
		return chainKey;
	}
	return undefined;
}

/**
 * Gets all chain keys that have RPC URLs configured
 * A chain is enabled if it has a valid RPC URL in environment variables
 */
export function getEnabledChainKeys(): ChainKey[] {
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

export function getRpcUrlForChain(key: ChainKey): string | undefined {
	const meta = CHAINS_META[key];
	const val = meta.rpcEnvVar;
	// If someone mistakenly set a URL here, just return it
	if (val?.startsWith('http://') || val?.startsWith('https://')) return val;
	const rpc = (process.env as any)[val] as string | undefined;
	return rpc?.trim();
}

export function getDisplayNameForChain(key: ChainKey): string {
	return CHAINS_META[key]?.displayName ?? key;
}

export function getLabelForChain(key: ChainKey): string {
	return CHAINS_META[key]?.label ?? key;
}

export function getLabelForChainIdNumber(chainIdNumber: number): string {
	const chainKey = getChainKeyByNumber(chainIdNumber);
	if (chainKey) {
		return getLabelForChain(chainKey);
	}
	// Fallback for unmapped chain IDs
	return `Chain ${chainIdNumber}`;
}

export function getDisplayNameForChainId(chainId: string): string {
	const chainKey = mapChainIdToChainKey(chainId);
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
	const chainKey = getChainKeyByNumber(chainIdNumber);
	if (chainKey) {
		return getDisplayNameForChain(chainKey);
	}
	// Fallback for unmapped chain IDs
	return chainIdNumber.toString();
}

export function getExplorerApiForChain(
	key: ChainKey
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

export function getVerificationTypeForChain(key: ChainKey): 'sourcify' | 'blockscout' {
	return CHAINS_META[key]?.verificationType ?? 'sourcify';
}

export function getChainKeyByNumber(chainIdNumber: number): ChainKey | undefined {
	const meta = Object.values(CHAINS_META).find((m) => m.chainId === chainIdNumber);
	return meta?.key;
}

/**
 * Safely resolves a chain identifier to a ChainKey enum value
 * @param chainIdentifier - Can be a chain ID number, string representation, or ChainKey enum value
 * @returns The resolved ChainKey or undefined if not found
 */
export function resolveChainKey(
	chainIdentifier: string | number | ChainKey,
	session: AuthType['session']
): ChainKey | undefined {
	const allSupportedNetworks = getSupportedNetworks(session);
	const foundBySupported = allSupportedNetworks.find(
		(n) => n.key === chainIdentifier || n.chainId === Number(chainIdentifier)
	);
	if (foundBySupported) {
		return foundBySupported.key;
	}

	// If it's already a ChainKey enum value, return it
	if (Object.values(ChainKey).includes(chainIdentifier as ChainKey)) {
		return chainIdentifier as ChainKey;
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
	if (Object.values(ChainKey).includes(upperKey as ChainKey)) {
		return upperKey as ChainKey;
	}

	return undefined;
}

/**
 * Gets the RPC URL for a chain identifier, throws error if not found
 * @param chainIdentifier - Can be a chain ID number, string representation, or ChainKey enum value
 * @returns The RPC URL for the chain
 * @throws Error if no RPC URL is found for the chain
 */
export function getRpcUrlForChainSafe(
	chainIdentifier: string | number | ChainKey,
	session: AuthType['session']
): string {
	const chainKey = resolveChainKey(chainIdentifier, session);
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
