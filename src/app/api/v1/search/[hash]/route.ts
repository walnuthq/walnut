import { createPublicClient, http, type GetTransactionErrorType, type Hash } from 'viem';
import { type NextRequest, NextResponse } from 'next/server';
import { type SearchDataResponse, type SearchData } from '@/lib/types';
import { mapChainIdNumberToEnum } from '@/lib/utils';
import { getEnabledChainKeys, getRpcUrlForChainSafe } from '@/lib/networks';
import { fetchTxFromExplorer } from '@/lib/explorer';

export const GET = async (
	request: NextRequest,
	{ params: { hash } }: { params: { hash: Hash } }
) => {
	// Prefer chain keys sent via ?chains=KEY1,KEY2; fallback to rpc_urls; default to all enabled.
	type Pair = { key?: string; rpcUrl: string };
	let pairs: Pair[] = [];

	const chainsParam = request.nextUrl.searchParams.get('chains');
	if (chainsParam) {
		const keys = chainsParam
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const built: Pair[] = [];
		for (const k of keys) {
			try {
				const url = getRpcUrlForChainSafe(k);
				built.push({ key: k, rpcUrl: url });
			} catch (error) {
				console.warn(
					`Skipping chain ${k}: ${error instanceof Error ? error.message : 'No RPC URL available'}`
				);
				continue;
			}
		}
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

	if (pairs.length === 0) {
		const keys = getEnabledChainKeys();
		const built: Pair[] = [];
		for (const k of keys) {
			try {
				const url = getRpcUrlForChainSafe(k);
				built.push({ key: String(k), rpcUrl: url });
			} catch (error) {
				console.warn(
					`Skipping chain ${k}: ${error instanceof Error ? error.message : 'No RPC URL available'}`
				);
				continue;
			}
		}
		pairs = built;
	}

	const transactions: (SearchData | undefined)[] = await Promise.all(
		pairs.map(async ({ rpcUrl, key }) => {
			const client = createPublicClient({ transport: http(rpcUrl) });
			try {
				const transaction = await client.getTransaction({ hash });
				let chainIdString = key;
				if (!chainIdString) {
					const numeric = await client.getChainId();
					chainIdString = mapChainIdNumberToEnum(numeric) || numeric.toString();
				}
				return {
					source: { chainId: chainIdString, rpcUrl: undefined },
					hash: transaction.hash
				};
			} catch (error) {
				// RPC miss → try explorer fallback for chains with explorer configured
				if (key) {
					const explorer = await fetchTxFromExplorer(key, hash);
					if (explorer?.found) {
						return {
							source: { chainId: key, rpcUrl: undefined },
							hash
						};
					}
				}
				const { name, message } = error as GetTransactionErrorType;
				console.error(name, message);
			}
		})
	);
	const response: SearchDataResponse = {
		transactions: transactions.filter((transaction: SearchData | undefined) => !!transaction),
		classes: [],
		contracts: []
	};
	return NextResponse.json(response);
};

export const POST = async (
	request: NextRequest,
	{ params: { hash } }: { params: { hash: Hash } }
) => {
	try {
		const body = (await request.json()) as { chains?: string[] } | undefined;
		const chains = (body?.chains ?? []).map((c) => c.trim()).filter(Boolean);

		// Build rpc list from chains; if empty, fallback to enabled keys
		type Pair = { key?: string; rpcUrl: string };
		let pairs: Pair[] = [];
		if (chains.length > 0) {
			const built: Pair[] = [];
			for (const k of chains) {
				try {
					const url = getRpcUrlForChainSafe(k);
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
			const keys = getEnabledChainKeys();
			const built: Pair[] = [];
			for (const k of keys) {
				try {
					const url = getRpcUrlForChainSafe(k);
					built.push({ key: String(k), rpcUrl: url });
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
		}

		const transactions: (SearchData | undefined)[] = await Promise.all(
			pairs.map(async ({ rpcUrl, key }) => {
				const client = createPublicClient({ transport: http(rpcUrl) });
				try {
					const transaction = await client.getTransaction({ hash });
					let chainIdString = key;
					if (!chainIdString) {
						const numeric = await client.getChainId();
						chainIdString = mapChainIdNumberToEnum(numeric) || numeric.toString();
					}
					return {
						source: { chainId: chainIdString, rpcUrl: undefined },
						hash: transaction.hash
					};
				} catch (error) {
					if (key) {
						const explorer = await fetchTxFromExplorer(key, hash);
						if (explorer?.found) {
							return {
								source: { chainId: key, rpcUrl: undefined },
								hash
							};
						}
					}
					const { name, message } = error as GetTransactionErrorType;
					console.error(name, message);
				}
			})
		);

		const response: SearchDataResponse = {
			transactions: transactions.filter((transaction: SearchData | undefined) => !!transaction),
			classes: [],
			contracts: []
		};
		return NextResponse.json(response);
	} catch (e) {
		return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
	}
};
