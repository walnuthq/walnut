import { ethers } from 'ethers';
import { TouchedAddress, TokenInfo } from '../types/simulate';
import { getTokenInfo } from './tokens';

/**
 * Check if an address is a contract (has code) or EOA
 */
export async function isContract(
	provider: ethers.JsonRpcProvider,
	address: string
): Promise<boolean> {
	try {
		const code = await provider.getCode(address);
		return code !== '0x' && code !== '0x0';
	} catch {
		return false;
	}
}

/**
 * Collect all touched addresses from trace recursively
 */
export function collectTouchedAddressesFromTrace(trace: any): Set<string> {
	const touched = new Set<string>();

	function collect(node: any) {
		if (!node) return;

		// Collect from and to addresses
		if (node.from) touched.add(node.from.toLowerCase());
		if (node.to) touched.add(node.to.toLowerCase());

		// Collect addresses from logs
		if (node.logs && Array.isArray(node.logs)) {
			for (const log of node.logs) {
				if (log.address) touched.add(log.address.toLowerCase());
			}
		}

		// Collect addresses from nested calls
		if (node.calls && Array.isArray(node.calls)) {
			node.calls.forEach(collect);
		}

		// Also check for other potential address fields
		if (node.address) touched.add(node.address.toLowerCase());
		if (node.contractAddress) touched.add(node.contractAddress.toLowerCase());
	}

	collect(trace);
	return touched;
}

/**
 * Extract from/to addresses from Transfer events in trace logs
 * This helps capture token recipients/senders that might not be directly called
 */
export function extractTransferAddressesFromTrace(trace: any, touched: Set<string>): void {
	const TRANSFER_EVENT_SIGNATURE =
		'0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

	function extractFromNode(node: any) {
		if (!node) return;

		// Check logs in this node
		if (node.logs && Array.isArray(node.logs)) {
			for (const log of node.logs) {
				// Extract from/to addresses from Transfer events
				if (
					log.topics &&
					log.topics.length >= 3 &&
					log.topics[0]?.toLowerCase() === TRANSFER_EVENT_SIGNATURE.toLowerCase()
				) {
					try {
						// Extract from address (topics[1] is 32 bytes, last 20 bytes are the address)
						const fromAddr = '0x' + log.topics[1].slice(-40).toLowerCase();
						touched.add(fromAddr);

						// Extract to address (topics[2] is 32 bytes, last 20 bytes are the address)
						const toAddr = '0x' + log.topics[2].slice(-40).toLowerCase();
						// Don't add zero address (burn)
						if (toAddr !== '0x0' && toAddr !== '0x0000000000000000000000000000000000000000') {
							touched.add(toAddr);
						}
					} catch (e) {
						// Ignore parsing errors
					}
				}
			}
		}

		// Recursively check nested calls
		if (node.calls && Array.isArray(node.calls)) {
			node.calls.forEach(extractFromNode);
		}
	}

	extractFromNode(trace);
}

/**
 * Collect token contract addresses from receipt logs
 * Also collects from/to addresses from Transfer events
 */
export function collectTokenAddressesFromReceiptLogs(receipt: any, touched: Set<string>): void {
	if (!receipt || !receipt.logs || !Array.isArray(receipt.logs)) {
		return;
	}

	const TRANSFER_EVENT_SIGNATURE =
		'0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

	for (const log of receipt.logs) {
		// Collect token contract address
		if (log.address) {
			touched.add(log.address.toLowerCase());
		}

		// Extract from/to addresses from Transfer events
		// Transfer(address,address,uint256) - topics[0] = event signature, topics[1] = from, topics[2] = to
		if (
			log.topics &&
			log.topics.length >= 3 &&
			log.topics[0]?.toLowerCase() === TRANSFER_EVENT_SIGNATURE.toLowerCase()
		) {
			try {
				// Extract from address (topics[1] is 32 bytes, last 20 bytes are the address)
				const fromAddr = '0x' + log.topics[1].slice(-40).toLowerCase();
				touched.add(fromAddr);

				// Extract to address (topics[2] is 32 bytes, last 20 bytes are the address)
				const toAddr = '0x' + log.topics[2].slice(-40).toLowerCase();
				// Don't add zero address (burn)
				if (toAddr !== '0x0' && toAddr !== '0x0000000000000000000000000000000000000000') {
					touched.add(toAddr);
				}
			} catch (e) {
				// Ignore parsing errors
			}
		}
	}
}

/**
 * Build touched addresses with type and token info
 */
export async function buildTouchedAddresses(
	provider: ethers.JsonRpcProvider,
	addresses: string[],
	tokenTransfers: Record<string, any>
): Promise<TouchedAddress[]> {
	return Promise.all(
		addresses.map(async (addr) => {
			const isContractAddr = await isContract(provider, addr);
			let tokenInfo: TokenInfo | undefined;

			// Check if this address is in tokenTransfers (it's an ERC-20 token)
			if (tokenTransfers[addr]?.tokenInfo) {
				tokenInfo = tokenTransfers[addr].tokenInfo;
			} else if (isContractAddr) {
				// Try to fetch token info even if not in transfers
				tokenInfo = await getTokenInfo(provider, addr);
			}

			return {
				address: addr,
				type: isContractAddr ? 'Contract' : 'EOA',
				tokenInfo
			};
		})
	);
}
