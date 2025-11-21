import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, getAddress, http, isAddress, type Address } from 'viem';
import { getServerSession } from '@/lib/auth-server';
import { getSupportedNetworks } from '@/lib/get-supported-networks';
import { SOURCIFY_URL } from '@/lib/config';
import type { ChainMeta } from '@/lib/types';

type RpcContext = {
	rpcUrl: string;
	label: string;
	chainId?: number;
	key?: string;
};

interface SourcifyResult {
	match: string;
	chainId: string;
	address: string;
}

interface SourcifyResponse {
	results: SourcifyResult[];
}

type NetworkMatch = RpcContext & { hasCode: boolean };

type VerificationResult = {
	verified: boolean;
	solidityVersion?: string;
};

export const dynamic = 'force-dynamic';

export const GET = async (
	request: NextRequest,
	{ params }: { params: Promise<{ address: string }> }
) => {
	try {
		const { address } = await params;

		if (!address || !isAddress(address)) {
			return NextResponse.json({ error: 'Invalid contract address provided' }, { status: 400 });
		}

		const checksumAddress = getAddress(address as `0x${string}`);
		const includeSourceCode = request.nextUrl.searchParams.get('include_source_code') === 'true';
		const rpcUrlsParam = request.nextUrl.searchParams.get('rpc_urls');

		const authSession = await getServerSession();
		const supportedNetworks = getSupportedNetworks(authSession?.session || null);

		const rpcContexts = buildRpcContexts(rpcUrlsParam, supportedNetworks);
		const matchedNetworks = await detectNetworks(checksumAddress, rpcContexts);
		const verification = await checkSourcifyVerification(checksumAddress);

		return NextResponse.json({
			verified: verification.verified,
			deployed_sources: matchedNetworks.map((network) => ({
				chain_id: network.key ?? network.chainId?.toString(),
				rpc_url: network.rpcUrl,
				value: network.label
			})),
			solidity_version: verification.solidityVersion ?? '',
			class_hash: checksumAddress,
			source_code: includeSourceCode ? {} : undefined
		});
	} catch (error: any) {
		return NextResponse.json(
			{ error: error?.message ?? 'Failed to fetch contract information' },
			{ status: 500 }
		);
	}
};

function buildRpcContexts(param: string | null, networks: ChainMeta[]): RpcContext[] {
	const contexts: RpcContext[] = [];
	const seen = new Set<string>();

	const addContext = (rpcUrl?: string, network?: ChainMeta) => {
		if (!rpcUrl || seen.has(rpcUrl)) return;
		contexts.push({
			rpcUrl,
			label: network?.displayName ?? rpcUrl,
			chainId: network?.chainId,
			key: network?.key
		});
		seen.add(rpcUrl);
	};

	const rpcUrlsFromParam =
		param
			?.split(',')
			.map((value) => decodeURIComponent(value.trim()))
			.filter(Boolean) ?? [];

	if (rpcUrlsFromParam.length === 0) {
		for (const network of networks) {
			addContext(resolveRpcUrl(network.rpcEnvVar), network);
		}
	} else {
		for (const rpcUrl of rpcUrlsFromParam) {
			const matchingNetwork = networks.find((network) => {
				const resolved = resolveRpcUrl(network.rpcEnvVar);
				return resolved === rpcUrl;
			});
			addContext(rpcUrl, matchingNetwork);
		}
	}

	return contexts;
}

function resolveRpcUrl(value?: string): string | undefined {
	if (!value) return undefined;
	if (value.startsWith('http://') || value.startsWith('https://')) return value;
	const envValue = process.env[value];
	return envValue?.trim();
}

async function detectNetworks(address: Address, networks: RpcContext[]): Promise<NetworkMatch[]> {
	const results = await Promise.all(
		networks.map(async (network) => {
			try {
				const client = createPublicClient({
					transport: http(network.rpcUrl)
				});
				const bytecode = await client.getCode({ address });
				if (bytecode && bytecode !== '0x') {
					return { ...network, hasCode: true };
				}
			} catch (error) {
				console.warn(`[contracts] Failed checking ${address} on ${network.label}:`, error);
			}
			return { ...network, hasCode: false };
		})
	);

	return results.filter((result) => result.hasCode);
}

async function checkSourcifyVerification(address: Address): Promise<VerificationResult> {
	const url = `https://sourcify.dev/server/v2/contract/all-chains/${address}`;

	try {
		const response = await fetch(url, {
			headers: { Accept: 'application/json' },
			cache: 'no-store'
		});

		if (!response.ok) {
			return { verified: false };
		}

		const data = (await response.json()) as SourcifyResponse;

		if (!data.results || data.results.length === 0) {
			return { verified: false };
		}

		const hasMatch = data.results.some(
			(result) =>
				result.match === 'match' ||
				result.match === 'exact_match' ||
				result.match === 'partial_match'
		);

		return { verified: hasMatch };
	} catch (error) {
		console.warn(`[contracts] Sourcify check failed for ${address}:`, error);
		return { verified: false };
	}
}
