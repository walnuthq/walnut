import {
	createPublicClient,
	http,
	type GetTransactionErrorType,
	type Hash,
	isAddress,
	type Address
} from 'viem';
import { type NextRequest, NextResponse } from 'next/server';
import { type SearchDataResponse, type SearchData, AuthType, ChainId } from '@/lib/types';
import { CHAINS_META, PUBLIC_NETWORKS, resolveChainId } from '@/lib/networks';
import { getSupportedNetworks } from '@/lib/get-supported-networks';
import { fetchTxFromExplorer } from '@/lib/explorer';
import { getServerSession } from '@/lib/auth-server';
import { getRpcUrlForChainOptimized } from '@/lib/public-network-utils';

type Pair = { key?: string; rpcUrl: string };

/**
 * Function to search transactions and contracts across multiple networks
 * TODO: mairjamijailovic think we do not need both GET and POST 
 */
async function searchTransactionsAndContracts(
	pairs: Pair[],
	hashAsHash: Hash,
	hashAsAddress: Address | undefined,
	authSession: AuthType['session'] | null
): Promise<{ transactions: SearchData[]; contracts: SearchData[] }> {
	// Search transactions in parallel - RPC and explorer run concurrently
	const transactionPromises = pairs.map(
		async ({ rpcUrl, key }): Promise<SearchData | undefined> => {
			const client = createPublicClient({ transport: http(rpcUrl) });

			// Run RPC and explorer in parallel for faster results
			const rpcPromise = (async () => {
				try {
					const transaction = await client.getTransaction({ hash: hashAsHash });
					let resolvedChainId: string;
					if (key) {
						resolvedChainId = key;
					} else {
						const numeric = await client.getChainId();
						const chainKey = resolveChainId(numeric, authSession);
						resolvedChainId = chainKey || numeric.toString();
					}
					return {
						source: { chainId: resolvedChainId, rpcUrl: undefined },
						hash: transaction.hash
					};
				} catch (error) {
					return undefined;
				}
			})();

			// Explorer fallback - only if we have a key, run in parallel with RPC
			const explorerPromise = key
				? (async () => {
						try {
							const explorer = await fetchTxFromExplorer(key, hashAsHash);
							if (explorer?.found) {
								return {
									source: { chainId: key, rpcUrl: undefined },
									hash: hashAsHash
								};
							}
							return undefined;
						} catch (error) {
							return undefined;
						}
				  })()
				: Promise.resolve(undefined);

			// Race between RPC and explorer - return first successful result
			const [rpcResult, explorerResult] = await Promise.allSettled([rpcPromise, explorerPromise]);

			if (rpcResult.status === 'fulfilled' && rpcResult.value) {
				return rpcResult.value;
			}
			if (explorerResult.status === 'fulfilled' && explorerResult.value) {
				return explorerResult.value;
			}

			return undefined;
		}
	);

	// Use allSettled to avoid one slow network blocking others
	const transactionResults = await Promise.allSettled(transactionPromises);
	const transactions: SearchData[] = transactionResults
		.map((result) => (result.status === 'fulfilled' ? result.value : undefined))
		.filter((tx): tx is SearchData => tx !== undefined);

	// Search contracts in parallel
	const contracts: SearchData[] = hashAsAddress
		? (
				await Promise.allSettled(
					pairs.map(async ({ rpcUrl, key }): Promise<SearchData | undefined> => {
						const client = createPublicClient({ transport: http(rpcUrl) });
						try {
							const bytecode = await client.getCode({ address: hashAsAddress });
							if (bytecode && bytecode !== '0x') {
								let resolvedChainId: string;
								if (key) {
									resolvedChainId = key;
								} else {
									const numeric = await client.getChainId();
									const chainKey = resolveChainId(numeric, authSession);
									resolvedChainId = chainKey || numeric.toString();
								}
								return {
									source: { chainId: resolvedChainId, rpcUrl: undefined },
									hash: hashAsAddress
								};
							}
						} catch (error) {
							// Ignore errors silently
						}
						return undefined;
					})
				)
		  )
				.map((result) => (result.status === 'fulfilled' ? result.value : undefined))
				.filter((contract): contract is SearchData => contract !== undefined)
		: [];

	return { transactions, contracts };
}

export const GET = async (
	request: NextRequest,
	{ params }: { params: Promise<{ hash: string }> }
) => {
	const authSession = await getServerSession();

	// Check if request is for a public network
	const chainsParam = request.nextUrl.searchParams.get('chains');
	const isPublicNetworkRequest = chainsParam
		? chainsParam.split(',').some((chain) => PUBLIC_NETWORKS.includes(chain.trim() as ChainId))
		: true; // If no chains specified, allow public access to check all networks

	// Require authentication only for non-public network requests
	if (!authSession && !isPublicNetworkRequest) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
	}

	const { hash } = await params;
	const hashAsHash = hash as Hash;
	const hashAsAddress = isAddress(hash) ? (hash as Address) : undefined;

	// Prefer chain keys sent via ?chains=KEY1,KEY2; fallback to rpc_urls; default to all enabled.
	let pairs: Pair[] = [];
	if (chainsParam) {
		const keys = chainsParam
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const built: Pair[] = [];
		for (const k of keys) {
			try {
				const url = getRpcUrlForChainOptimized(k, authSession?.session || null);
				built.push({ key: k, rpcUrl: url });
			} catch (error) {
				console.warn(
					`Skipping chain ${k}: ${error instanceof Error ? error.message : 'No RPC URL available'}`
				);
				continue;
			}
		}
		pairs = built;
	} else {
		const rpcParam = request.nextUrl.searchParams.get('rpc_urls');
		if (rpcParam) {
			const rpcUrls = rpcParam
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			const built: Pair[] = [];
			for (const url of rpcUrls) built.push({ rpcUrl: url });
			pairs = built;
		}
	}

	// Get supported networks - only public networks if no authentication
	const supportedNetworks = authSession
		? getSupportedNetworks(authSession.session)
		: PUBLIC_NETWORKS.map((key) => CHAINS_META[key]).filter(Boolean);

	for (const network of supportedNetworks) {
		try {
			const rpcUrl = network.rpcEnvVar.startsWith('http')
				? network.rpcEnvVar
				: (process.env[network.rpcEnvVar] as string | undefined);

			if (rpcUrl) {
				// Avoid adding duplicate RPCs if they were already added via chainsParam or rpcParam
				if (!pairs.some((p) => p.rpcUrl === rpcUrl)) {
					pairs.push({ key: network.key, rpcUrl: rpcUrl });
				}
			} else {
				console.warn(`RPC URL for chain ${network.key} is not configured.`);
			}
		} catch (error) {
			console.warn(
				`Skipping network ${network.key}: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
			continue;
		}
	}

	const { transactions, contracts } = await searchTransactionsAndContracts(
		pairs,
		hashAsHash,
		hashAsAddress,
		authSession?.session || null
	);

	const response: SearchDataResponse = {
		transactions,
		classes: [],
		contracts
	};
	return NextResponse.json(response);
};

export const POST = async (
	request: NextRequest,
	{ params }: { params: Promise<{ hash: string }> }
) => {
	const authSession = await getServerSession();
	if (!authSession) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { hash } = await params;
	const hashAsHash = hash as Hash;
	const hashAsAddress = isAddress(hash) ? (hash as Address) : undefined;
	try {
		const body = (await request.json()) as { chains?: string[] } | undefined;
		const chains = (body?.chains ?? []).map((c) => c.trim()).filter(Boolean);

		let pairs: Pair[] = [];
		if (chains.length > 0) {
			const built: Pair[] = [];
			for (const k of chains) {
				try {
					const url = getRpcUrlForChainOptimized(k, authSession.session);
					built.push({ key: k, rpcUrl: url });
				} catch (error) {
					console.warn(
						`Skipping chain ${k}: ${
							error instanceof Error ? error.message : 'No RPC URL available'
						}`
					);
					continue;
				}
			}
			pairs = built;
		} else {
			const supportedNetworks = getSupportedNetworks(authSession.session);
			for (const network of supportedNetworks) {
				try {
					const rpcUrl = network.rpcEnvVar.startsWith('http')
						? network.rpcEnvVar
						: (process.env[network.rpcEnvVar] as string | undefined);

					if (rpcUrl) {
						if (!pairs.some((p) => p.rpcUrl === rpcUrl)) {
							pairs.push({ key: network.key, rpcUrl: rpcUrl });
						}
					} else {
						console.warn(`RPC URL for chain ${network.key} is not configured.`);
					}
				} catch (error) {
					console.warn(
						`Skipping network ${network.key}: ${
							error instanceof Error ? error.message : 'Unknown error'
						}`
					);
					continue;
				}
			}
		}

		const { transactions, contracts } = await searchTransactionsAndContracts(
			pairs,
			hashAsHash,
			hashAsAddress,
			authSession.session
		);

		const response: SearchDataResponse = {
			transactions,
			classes: [],
			contracts
		};
		return NextResponse.json(response);
	} catch (e) {
		return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
	}
};
