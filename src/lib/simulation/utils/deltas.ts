import {
	EthDiff,
	TokenDiff,
	AssetChange,
	AssetSwap,
	TokenDeltaSummary,
	TouchedAddress,
	TokenTransfers
} from '../types/simulate';

/**
 * Calculate token balance differences (after - before)
 */
export function calculateTokenDiffs(
	before: Record<string, Record<string, string>>,
	after: Record<string, Record<string, string>>,
	tokenAddresses: string[],
	addresses: string[]
): TokenDiff {
	const tokenDiff: TokenDiff = {};
	for (const token of tokenAddresses) {
		tokenDiff[token] = {};
		for (const addr of addresses) {
			const beforeBal = before[token]?.[addr] || '0';
			const afterBal = after[token]?.[addr] || '0';
			const diff = BigInt(afterBal) - BigInt(beforeBal);
			if (diff !== 0n) {
				tokenDiff[token][addr] = diff.toString();
			}
		}
	}
	return tokenDiff;
}

/**
 * Analyze asset changes and categorize into input/output assets
 *
 * Note: ETH delta includes both value sent/received AND gas fees
 * For the sender, delta = -(value + gas fees)
 * For the receiver, delta = +value
 */
export function analyzeAssetChanges(
	from: string,
	ethDiff: EthDiff,
	tokenDiff: TokenDiff
): AssetSwap {
	const inputAssets: AssetChange[] = [];
	const outputAssets: AssetChange[] = [];

	// Analyze ETH changes
	for (const [address, delta] of Object.entries(ethDiff)) {
		const deltaBigInt = BigInt(delta);
		if (deltaBigInt === 0n) continue;

		const assetChange: AssetChange = {
			address,
			type: 'ETH',
			delta
		};

		if (deltaBigInt < 0n) {
			// Sent ETH (negative delta = value sent + gas fees)
			inputAssets.push(assetChange);
		} else {
			// Received ETH (positive delta = value received)
			outputAssets.push(assetChange);
		}
	}

	// Analyze token changes
	for (const [tokenAddress, addressDeltas] of Object.entries(tokenDiff)) {
		for (const [address, delta] of Object.entries(addressDeltas)) {
			const deltaBigInt = BigInt(delta);
			if (deltaBigInt === 0n) continue;

			const assetChange: AssetChange = {
				address,
				type: 'ERC20',
				tokenAddress,
				delta
			};

			if (deltaBigInt < 0n) {
				// Sent tokens (negative delta)
				inputAssets.push(assetChange);
			} else {
				// Received tokens (positive delta)
				outputAssets.push(assetChange);
			}
		}
	}

	return { inputAssets, outputAssets };
}

/**
 * Calculate token delta summary per token and per EOA account
 * Uses tokenDiff (actual balance changes) as source of truth
 * This is more accurate than using Transfer events alone
 */
export function calculateTokenDeltaSummary(
	touchedAddresses: TouchedAddress[],
	tokenTransfers: TokenTransfers,
	tokenDiff: TokenDiff
): TokenDeltaSummary[] {
	const summaries: TokenDeltaSummary[] = [];

	// Create maps for quick lookup:
	// 1. Set of EOA addresses (normalized to lowercase)
	const eoaAddresses = new Set(
		touchedAddresses.filter((addr) => addr.type === 'EOA').map((addr) => addr.address.toLowerCase())
	);

	// 2. Map from lowercase address to original address format
	const addressFormatMap = new Map<string, string>();
	for (const addr of touchedAddresses) {
		const lower = addr.address.toLowerCase();
		if (!addressFormatMap.has(lower)) {
			addressFormatMap.set(lower, addr.address);
		}
	}

	// Process each token from tokenDiff (source of truth - actual balance changes)
	for (const [tokenAddress, addressDeltas] of Object.entries(tokenDiff)) {
		// Skip tokens with no changes
		if (Object.keys(addressDeltas).length === 0) {
			continue;
		}

		// Extract EOA deltas and calculate total
		const eoaDeltas: Record<string, string> = {};
		let totalDelta = 0n;

		for (const [address, deltaStr] of Object.entries(addressDeltas)) {
			const addressLower = address.toLowerCase();
			const delta = BigInt(deltaStr);

			// Skip zero deltas
			if (delta === 0n) {
				continue;
			}

			// Only include EOA addresses in eoaDeltas
			if (eoaAddresses.has(addressLower)) {
				// Use original address format from touchedAddresses if available,
				// otherwise use the address as-is from tokenDiff
				const originalAddress = addressFormatMap.get(addressLower) || address;
				eoaDeltas[originalAddress] = deltaStr;
				totalDelta += delta;
			}
		}

		// Include token if it has any changes (even if no EOA deltas, for completeness)
		summaries.push({
			tokenAddress,
			totalDelta: totalDelta.toString(),
			eoaDeltas
		});
	}

	return summaries;
}
