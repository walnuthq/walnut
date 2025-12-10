import { ChainId, getExplorerApiForChain } from '@/lib/networks';

export async function fetchTxFromExplorer(
	chainKey: string,
	hash: string
): Promise<{ found: boolean } | undefined> {
	const cfg = getExplorerApiForChain(chainKey as ChainId);
	if (!cfg) return undefined;
	const { baseUrl, type } = cfg;
	try {
		if (type === 'blockscout_v2') {
			const res = await fetch(`${baseUrl}/api/v2/transactions/${hash}`);
			if (res.ok) {
				const json = await res.json();
				// Blockscout v2 returns object with hash if found
				if (json && (json.hash === hash || json.transaction_hash === hash)) return { found: true };
				// Some installations return 200 with error in JSON; treat missing hash as not found
				return { found: false };
			}
			if (res.status === 404) return { found: false };
		} else if (type === 'etherscan_proxy') {
			const url = `${baseUrl}/api?module=proxy&action=eth_getTransactionByHash&txhash=${hash}`;
			const res = await fetch(url);
			if (res.ok) {
				const json = await res.json();
				if (json?.result?.hash?.toLowerCase() === hash.toLowerCase()) return { found: true };
				return { found: false };
			}
		}
	} catch (_) {
		// ignore explorer failures, fallback will handle
	}
	return { found: false };
}
