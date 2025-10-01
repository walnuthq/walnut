import { getRpcUrlForTenantChain, getSupportedNetworks } from './get-supported-networks';
import { AuthType, ChainMeta } from './types';

export enum ChainKey {
	OP_MAIN = 'OP_MAIN',
	OP_SEPOLIA = 'OP_SEPOLIA',
	POWERLOOM_DEVNET = 'POWERLOOM_DEVNET',
	POWERLOOM_MAINNET = 'POWERLOOM_MAINNET',
	ARBITRUM_ONE = 'ARBITRUM_ONE'
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
};

export const CHAINS_META: Record<ChainKey, ChainMeta> = {
	[ChainKey.OP_MAIN]: {
		key: ChainKey.OP_MAIN,
		displayName: 'OP Mainnet',
		chainId: 10,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_OP_MAIN',
		verificationType: 'sourcify',
		label: 'Optimism Mainnet Alchemy RPC'
	},
	[ChainKey.OP_SEPOLIA]: {
		key: ChainKey.OP_SEPOLIA,
		displayName: 'OP Sepolia',
		chainId: 11155420,
		rpcEnvVar: 'NEXT_PUBLIC_RPC_OP_SEPOLIA',
		verificationType: 'sourcify',
		label: 'Optimism Sepolia Alchemy RPC'
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
		rpcEnvVar: '',
		explorerApiEnvVar: '',
		explorerType: 'blockscout_v2',
		verificationType: 'blockscout'
	}
};

export function getEnabledChainKeys(): ChainKey[] {
	const list = process.env.NEXT_PUBLIC_CHAINS;
	if (!list) return [];
	return list
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((k) => k.toUpperCase())
		.map((k) => k as ChainKey)
		.filter((k) => Object.prototype.hasOwnProperty.call(CHAINS_META, k));
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

export function mapChainIdToChainKey(chainId: string): ChainKey | undefined {
	const mapping: Record<string, ChainKey> = {
		OP_MAIN: ChainKey.OP_MAIN,
		OP_SEPOLIA: ChainKey.OP_SEPOLIA,
		POWERLOOM_DEVNET: ChainKey.POWERLOOM_DEVNET,
		POWERLOOM_MAINNET: ChainKey.POWERLOOM_MAINNET
	};
	return mapping[chainId];
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
		throw new Error(`Invalid chain identifier: ${chainIdentifier}`);
	}

	const tenantRpcUrl = getRpcUrlForTenantChain(chainKey, session);
	if (tenantRpcUrl) {
		return tenantRpcUrl;
	}

	const rpcUrl = getRpcUrlForChain(chainKey);
	if (!rpcUrl) {
		throw new Error(
			`No RPC URL found for chain ${chainKey}. Every chain must have a valid RPC URL with debug options.`
		);
	}

	return rpcUrl;
}
