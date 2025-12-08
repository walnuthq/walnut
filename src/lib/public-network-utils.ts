import { CHAINS_META, getRpcUrlForChain, getRpcUrlForChainSafe, PUBLIC_NETWORKS } from './networks';
import { ChainId, AuthType } from './types';
import { getSupportedNetworks } from './get-supported-networks';
import { NextResponse } from 'next/server';
import {
	NetworkNotSupportedError,
	RpcUrlNotFoundError,
	AuthenticationRequiredError
} from './errors';

export interface PublicNetworkCheckResult {
	isPublicNetworkRequest: boolean;
	body: any;
}

/**
 * Checks if a request is for a public network by examining the request body
 * @param request - The NextRequest object
 * @returns Object containing whether it's a public network request and the parsed body
 */
export async function checkPublicNetworkRequest(
	request: Request
): Promise<PublicNetworkCheckResult> {
	let body: any;
	let isPublicNetworkRequest = false;

	try {
		body = await request.json();
		const chainId = body.WithTxHash?.chain_id || body.WithCalldata?.chain_id;

		if (chainId) {
			// Check if the chain_id is a public network key or numeric ID
			const isPublicKey = PUBLIC_NETWORKS.includes(chainId as ChainId);
			const isPublicNumericId = PUBLIC_NETWORKS.some(
				(key) => CHAINS_META[key].chainId === Number(chainId)
			);
			isPublicNetworkRequest = isPublicKey || isPublicNumericId;
		}
	} catch (error) {
		// If we can't parse the body, we'll require authentication
		console.warn('Could not parse request body to check for public network:', error);
	}

	return { isPublicNetworkRequest, body };
}

/**
 * Gets the error message for unauthorized requests
 * @returns Error message with list of public networks
 */
export function getUnauthorizedErrorMessage(): string {
	return `Authentication required for this network. Public networks: ${PUBLIC_NETWORKS.join(', ')}`;
}

/**
 * Creates a redirect response to login page for unauthorized requests
 * @param request - The incoming request to get the base URL
 * @returns NextResponse redirect to login page
 */
export function createLoginRedirect(request: Request): NextResponse {
	const url = new URL(request.url);
	const baseUrl = url.origin;
	const loginUrl = `${baseUrl}/login`;

	return NextResponse.redirect(loginUrl, { status: 302 });
}

/**
 * Resolves chain key from chain identifier (string or number) with session support for tenant networks
 * @param chainIdentifier - Chain ID as string or number
 * @param session - Optional authentication session for tenant networks
 * @returns ChainId if found, undefined otherwise
 */
export function resolveChainIdFromIdentifier(
	chainIdentifier: string | number,
	session: AuthType['session'] | null = null
): ChainId | undefined {
	// If we have a session, use getSupportedNetworks to include tenant networks
	if (session) {
		const allSupportedNetworks = getSupportedNetworks(session);
		const foundBySupported = allSupportedNetworks.find(
			(n) => n.key === chainIdentifier || n.chainId === Number(chainIdentifier)
		);
		if (foundBySupported) {
			return foundBySupported.key;
		}
	}

	// Check if it's already a chain key
	if (Object.values(ChainId).includes(chainIdentifier as ChainId)) {
		return chainIdentifier as ChainId;
	}

	// Try to find by numeric chain ID in static networks
	const chainIdNumber = Number(chainIdentifier);
	return Object.values(ChainId).find((key) => CHAINS_META[key].chainId === chainIdNumber);
}

/**
 * Gets RPC URL for a chain with optimized logic for public vs private networks
 * @param chainIdentifier - Chain ID as string or number
 * @param session - Optional authentication session
 * @returns RPC URL for the chain
 * @throws Error if no RPC URL is found or authentication is required
 */
export function getRpcUrlForChainOptimized(
	chainIdentifier: string | number,
	session: AuthType['session'] | null
): string {
	const chainKey = resolveChainIdFromIdentifier(chainIdentifier, session);

	if (!chainKey) {
		throw new NetworkNotSupportedError(chainIdentifier);
	}

	// Check if it's a public network
	if (PUBLIC_NETWORKS.includes(chainKey)) {
		// Public network - use direct RPC URL
		const directRpcUrl = getRpcUrlForChain(chainKey);
		if (!directRpcUrl) {
			throw new RpcUrlNotFoundError(chainKey, session);
		}
		return directRpcUrl;
	} else if (session) {
		// Non-public network - require session
		return getRpcUrlForChainSafe(chainIdentifier, session);
	} else {
		throw new AuthenticationRequiredError(chainIdentifier, session);
	}
}
