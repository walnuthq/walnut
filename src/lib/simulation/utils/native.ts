import { ethers } from 'ethers';

/**
 * Collect native ETH balances for multiple addresses
 */
export async function collectEthBalances(
	provider: ethers.JsonRpcProvider,
	addresses: string[]
): Promise<Record<string, bigint>> {
	const out: Record<string, bigint> = {};
	for (const addr of addresses) {
		try {
			out[addr] = await provider.getBalance(addr);
		} catch {
			out[addr] = 0n;
		}
	}
	return out;
}

/**
 * Calculate ETH balance differences (after - before)
 */
export function calculateEthDiffs(
	before: Record<string, bigint>,
	after: Record<string, bigint>,
	addresses: string[]
): Record<string, string> {
	const ethDiff: Record<string, string> = {};
	for (const addr of addresses) {
		const beforeBal = before[addr] || 0n;
		const afterBal = after[addr] || 0n;
		const diff = afterBal - beforeBal;
		if (diff !== 0n) {
			ethDiff[addr] = diff.toString();
		}
	}
	return ethDiff;
}
