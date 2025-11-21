import {
	createPublicClient,
	http,
	type GetTransactionErrorType,
	type Hash,
	isAddress,
	type Address
} from 'viem';
import { type NextRequest, NextResponse } from 'next/server';
import { type SearchDataResponse, type SearchData, AuthType } from '@/lib/types';
import { mapChainIdNumberToEnum } from '@/lib/utils';
import { ChainKey, CHAINS_META } from '@/lib/networks';
import { getSupportedNetworks } from '@/lib/get-supported-networks';
import { fetchTxFromExplorer } from '@/lib/explorer';
import { getServerSession } from '@/lib/auth-server';
import { checkPublicNetworkRequest, getRpcUrlForChainOptimized } from '@/lib/public-network-utils';

export const GET = async (
	request: NextRequest,
	{ params }: { params: Promise<{ hash: string }> }
) => {
	const authSession = await getServerSession();

	// Check if request is for a public network
	const chainsParam = request.nextUrl.searchParams.get('chains');
	const isPublicNetworkRequest = chainsParam
		? chainsParam.split(',').some((chain) => ['OP_SEPOLIA', 'OP_MAIN'].includes(chain.trim()))
		: true; // If no chains specified, allow public access to check all networks

	// Require authentication only for non-public network requests
	if (!authSession && !isPublicNetworkRequest) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
	}

	const { hash } = await params;
	const hashAsHash = hash as Hash;
	const hashAsAddress = isAddress(hash) ? (hash as Address) : undefined;
	// Prefer chain keys sent via ?chains=KEY1,KEY2; fallback to rpc_urls; default to all enabled.
	type Pair = { key?: string; rpcUrl: string };
	let pairs: Pair[] = [];
	if (chainsParam) {
		const keys = chainsParam
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const built: Pair[] = [];
		for (const k of keys) {
			try {
				// Use optimized RPC URL resolution
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
		: ['OP_SEPOLIA', 'OP_MAIN'].map((key) => CHAINS_META[key as ChainKey]).filter(Boolean);

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

	const transactions: (SearchData | undefined)[] = await Promise.all(
		pairs.map(async ({ rpcUrl, key }) => {
			const client = createPublicClient({ transport: http(rpcUrl) });
			try {
				const transaction = await client.getTransaction({ hash: hashAsHash });
				let resolvedChainId: string;
				if (key) {
					resolvedChainId = key;
				} else {
					const numeric = await client.getChainId();
					resolvedChainId = mapChainIdNumberToEnum(numeric) || numeric.toString();
				}
				return {
					source: { chainId: resolvedChainId, rpcUrl: undefined },
					hash: transaction.hash
				};
			} catch (error) {
				// RPC miss → try explorer fallback for chains with explorer configured
				if (key) {
					const explorer = await fetchTxFromExplorer(key, hashAsHash);
					if (explorer?.found) {
						return {
							source: { chainId: key, rpcUrl: undefined },
							hash: hashAsHash
						};
					}
				}
				const { name, message } = error as GetTransactionErrorType;
				console.error(name, message);
			}
		})
	);
	const contracts: (SearchData | undefined)[] =
		hashAsAddress
			? await Promise.all(
					pairs.map(async ({ rpcUrl, key }) => {
						const client = createPublicClient({ transport: http(rpcUrl) });
						try {
							const bytecode = await client.getCode({ address: hashAsAddress });
							if (bytecode && bytecode !== '0x') {
								let resolvedChainId: string;
								if (key) {
									resolvedChainId = key;
								} else {
									const numeric = await client.getChainId();
									resolvedChainId = mapChainIdNumberToEnum(numeric) || numeric.toString();
								}
								return {
									source: { chainId: resolvedChainId, rpcUrl: undefined },
									hash: hashAsAddress
								};
							}
						} catch (error) {
							console.error('getCode error', error);
						}
					})
			  )
			: [];

	const response: SearchDataResponse = {
		transactions: transactions.filter((transaction: SearchData | undefined) => !!transaction),
		classes: [],
		contracts: contracts.filter((contract: SearchData | undefined) => !!contract)
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

		type Pair = { key?: string; rpcUrl: string };
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

		const transactions: (SearchData | undefined)[] = await Promise.all(
			pairs.map(async ({ rpcUrl, key }) => {
				const client = createPublicClient({ transport: http(rpcUrl) });
				try {
					const transaction = await client.getTransaction({ hash: hashAsHash });
					let resolvedChainId: string;
					if (key) {
						resolvedChainId = key;
					} else {
						const numeric = await client.getChainId();
						resolvedChainId = mapChainIdNumberToEnum(numeric) || numeric.toString();
					}
					return {
						source: { chainId: resolvedChainId, rpcUrl: undefined },
						hash: transaction.hash
					};
				} catch (error) {
					if (key) {
						const explorer = await fetchTxFromExplorer(key, hashAsHash);
						if (explorer?.found) {
							return {
								source: { chainId: key, rpcUrl: undefined },
								hash: hashAsHash
							};
						}
					}
					const { name, message } = error as GetTransactionErrorType;
					console.error(name, message);
				}
			})
		);

		const contracts: (SearchData | undefined)[] =
			hashAsAddress && pairs.length > 0
				? await Promise.all(
						pairs.map(async ({ rpcUrl, key }) => {
							const client = createPublicClient({ transport: http(rpcUrl) });
							try {
								const bytecode = await client.getCode({ address: hashAsAddress });
								if (bytecode && bytecode !== '0x') {
									let resolvedChainId: string;
									if (key) {
										resolvedChainId = key;
									} else {
										const numeric = await client.getChainId();
										resolvedChainId = mapChainIdNumberToEnum(numeric) || numeric.toString();
									}
									return {
										source: { chainId: resolvedChainId, rpcUrl: undefined },
										hash: hashAsAddress
									};
								}
							} catch (error) {
								console.error('getCode error', error);
							}
						})
				  )
				: [];

		const response: SearchDataResponse = {
			transactions: transactions.filter((transaction: SearchData | undefined) => !!transaction),
			classes: [],
			contracts: contracts.filter((contract: SearchData | undefined) => !!contract)
		};
		return NextResponse.json(response);
	} catch (e) {
		return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
	}
};
