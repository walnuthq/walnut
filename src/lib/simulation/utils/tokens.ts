import { ethers } from 'ethers';
import { TokenInfo, TokenTransfers, TokenTransfer } from '../types/simulate';
import { logger } from '../logger';

const ERC20_ABI = [
	'function balanceOf(address) view returns (uint256)',
	'function symbol() view returns (string)',
	'function name() view returns (string)',
	'function decimals() view returns (uint8)'
];

// ERC-20 Transfer event signature: Transfer(address,address,uint256)
const TRANSFER_EVENT_SIGNATURE =
	'0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// ERC-20 transfer function signature: transfer(address,uint256)
const TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';

/**
 * Get ERC-20 token information (symbol, name, decimals)
 */
export async function getTokenInfo(
	provider: ethers.JsonRpcProvider,
	address: string
): Promise<TokenInfo | undefined> {
	try {
		const contract = new ethers.Contract(address, ERC20_ABI, provider);
		const [symbol, name, decimals] = await Promise.all([
			contract.symbol().catch(() => null),
			contract.name().catch(() => null),
			contract.decimals().catch(() => null)
		]);

		// If at least one field is available, it's likely an ERC-20 token
		if (symbol || name || decimals !== null) {
			return {
				symbol: symbol || undefined,
				name: name || undefined,
				decimals: decimals !== null ? Number(decimals) : undefined
			};
		}
	} catch {
		// Not an ERC-20 token or failed to fetch
	}
	return undefined;
}

/**
 * Check if an address is an ERC-20 token by checking for basic ERC-20 functions
 */
export async function isERC20Token(
	provider: ethers.JsonRpcProvider,
	address: string
): Promise<boolean> {
	try {
		const contract = new ethers.Contract(address, ERC20_ABI, provider);
		// Try to call balanceOf with zero address - if it works, it's likely ERC-20
		await contract.balanceOf('0x0000000000000000000000000000000000000000');
		return true;
	} catch {
		return false;
	}
}

/**
 * Extract ERC-20 token addresses from a list of addresses
 * Checks if each address implements basic ERC-20 functions
 */
export async function extractERC20TokenAddresses(
	provider: ethers.JsonRpcProvider,
	addresses: string[]
): Promise<string[]> {
	const tokenAddresses: string[] = [];

	// Check each address in parallel
	const checks = await Promise.all(
		addresses.map(async (addr) => {
			const isToken = await isERC20Token(provider, addr);
			return { addr, isToken };
		})
	);

	for (const { addr, isToken } of checks) {
		if (isToken) {
			tokenAddresses.push(addr.toLowerCase());
		}
	}

	logger.info({ tokenAddresses, total: addresses.length }, 'Extracted ERC-20 token addresses.');

	return tokenAddresses;
}

/**
 * Collect token balances for multiple addresses and tokens
 */
export async function collectTokenBalances(
	provider: ethers.JsonRpcProvider,
	addresses: string[],
	tokenAddresses: string[]
): Promise<Record<string, Record<string, string>>> {
	const res: Record<string, Record<string, string>> = {};

	for (const token of tokenAddresses) {
		const contract = new ethers.Contract(token, ERC20_ABI, provider);
		res[token] = {};

		for (const addr of addresses) {
			try {
				const bal = await contract.balanceOf(addr);
				res[token][addr] = bal.toString();
			} catch {
				res[token][addr] = '0';
			}
		}
	}

	return res;
}

/**
 * Extract token transfers from receipt logs
 */
export function extractTokenTransfers(receipt: any): TokenTransfers {
	const transfers: TokenTransfers = {};

	if (!receipt || !receipt.logs || !Array.isArray(receipt.logs)) {
		return transfers;
	}

	for (const log of receipt.logs) {
		// Check if this is a Transfer event
		// topics[0] should be the Transfer event signature
		if (
			log.topics &&
			log.topics.length >= 3 &&
			log.topics[0]?.toLowerCase() === TRANSFER_EVENT_SIGNATURE.toLowerCase()
		) {
			try {
				const tokenAddress = log.address.toLowerCase();
				const fromAddr = '0x' + log.topics[1].slice(-40).toLowerCase();
				const toAddr = '0x' + log.topics[2].slice(-40).toLowerCase();

				// Amount is in data field (uint256)
				let amount = '0';
				if (log.data && log.data !== '0x') {
					// Remove 0x prefix and parse as BigInt
					amount = BigInt(log.data).toString();
				}

				// Check if this is a burn (to address is 0x0)
				const isBurn = toAddr === '0x0' || toAddr === '0x0000000000000000000000000000000000000000';

				if (!transfers[tokenAddress]) {
					transfers[tokenAddress] = {
						transfers: []
					};
				}

				transfers[tokenAddress].transfers.push({
					from: fromAddr,
					to: toAddr,
					amount,
					type: isBurn ? 'burn' : 'transfer'
				});
			} catch (e) {
				logger.warn({ log, error: e }, 'Failed to parse Transfer event');
			}
		}
	}

	return transfers;
}

/**
 * Extract token transfers from trace logs (from debug_traceCall)
 * Handles different trace structures from callTracer
 */
export function extractTokenTransfersFromTrace(trace: any): TokenTransfers {
	const transfers: TokenTransfers = {};

	// DEBUG: Log the entire trace structure to see what we're working with
	logger.info(
		{
			traceType: typeof trace,
			traceIsArray: Array.isArray(trace),
			traceKeys: trace ? Object.keys(trace) : [],
			hasLogs: trace?.logs ? 'yes' : 'no',
			logsType: typeof trace?.logs,
			logsIsArray: Array.isArray(trace?.logs),
			logsLength: Array.isArray(trace?.logs) ? trace.logs.length : 0,
			hasCalls: trace?.calls ? 'yes' : 'no',
			callsIsArray: Array.isArray(trace?.calls),
			callsLength: Array.isArray(trace?.calls) ? trace.calls.length : 0,
			traceString: trace ? JSON.stringify(trace, null, 2).substring(0, 5000) : 'null'
		},
		'=== TRACE STRUCTURE DEBUG ==='
	);

	// DEBUG: Log all logs found in trace
	if (trace?.logs && Array.isArray(trace.logs)) {
		logger.info(
			{
				logsCount: trace.logs.length,
				logs: trace.logs.map((log: any, index: number) => ({
					index,
					logType: typeof log,
					logKeys: log ? Object.keys(log) : [],
					hasTopics: log?.topics ? 'yes' : 'no',
					topicsLength: Array.isArray(log?.topics) ? log.topics.length : 0,
					hasRaw: log?.raw ? 'yes' : 'no',
					rawKeys: log?.raw ? Object.keys(log.raw) : [],
					hasAddress: log?.address ? 'yes' : 'no',
					address: log?.address,
					rawAddress: log?.raw?.address,
					firstTopic: log?.topics?.[0],
					rawFirstTopic: log?.raw?.topics?.[0],
					logString: JSON.stringify(log, null, 2)
				}))
			},
			'=== ALL LOGS IN TRACE ==='
		);
	}

	// First, try to find logs in the trace structure
	// Some tracers return logs at different levels
	function findLogsInNode(node: any, depth: number = 0): any[] {
		if (!node || depth > 10) return []; // Prevent infinite recursion

		const foundLogs: any[] = [];

		// Check direct logs property
		if (node.logs && Array.isArray(node.logs)) {
			foundLogs.push(...node.logs);
		}

		// Check if node itself is a log array
		if (Array.isArray(node) && node.length > 0 && node[0]?.topics) {
			foundLogs.push(...node);
		}

		// Recursively search in nested structures
		if (node.calls && Array.isArray(node.calls)) {
			for (const call of node.calls) {
				foundLogs.push(...findLogsInNode(call, depth + 1));
			}
		}

		// Check other possible nested structures
		for (const key in node) {
			if (key !== 'logs' && key !== 'calls' && typeof node[key] === 'object') {
				const nestedLogs = findLogsInNode(node[key], depth + 1);
				foundLogs.push(...nestedLogs);
			}
		}

		return foundLogs;
	}

	function extractFromNode(node: any) {
		if (!node) return;

		// Check logs in this node - handle different formats
		let logs: any[] = [];

		// Format 1: node.logs array (most common)
		if (node.logs && Array.isArray(node.logs)) {
			logs = node.logs;
		}

		for (const log of logs) {
			// Check if this is a Transfer event
			// Handle different log formats
			let topics: string[] | undefined;
			let logAddress: string | undefined;
			let logData: string | undefined;

			// Format 1: Standard log format with topics array
			if (log.topics && Array.isArray(log.topics)) {
				topics = log.topics;
				logAddress = log.address;
				logData = log.data;
			}
			// Format 2: Raw log format (from some tracers)
			else if (log.raw && log.raw.topics) {
				topics = log.raw.topics;
				logAddress = log.raw.address;
				logData = log.raw.data;
			}
			// Format 3: Direct topics/address/data fields
			else if (log.topics || log.address) {
				topics = log.topics;
				logAddress = log.address;
				logData = log.data;
			}

			if (
				topics &&
				topics.length >= 3 &&
				topics[0]?.toLowerCase() === TRANSFER_EVENT_SIGNATURE.toLowerCase()
			) {
				try {
					const tokenAddress = (logAddress || '').toLowerCase();
					if (!tokenAddress) {
						logger.warn({ log }, 'Transfer event missing token address');
						continue;
					}

					// Extract from address from topics[1] (32 bytes, last 20 bytes are address)
					const fromTopic = topics[1];
					if (!fromTopic || fromTopic.length < 42) {
						logger.warn({ log, topic: fromTopic }, 'Invalid from topic in Transfer event');
						continue;
					}
					const fromAddr = '0x' + fromTopic.slice(-40).toLowerCase();

					// Extract to address from topics[2] (32 bytes, last 20 bytes are address)
					const toTopic = topics[2];
					if (!toTopic || toTopic.length < 42) {
						logger.warn({ log, topic: toTopic }, 'Invalid to topic in Transfer event');
						continue;
					}
					const toAddr = '0x' + toTopic.slice(-40).toLowerCase();

					// Amount is in data field (uint256)
					let amount = '0';
					if (logData && logData !== '0x' && logData.length >= 2) {
						try {
							amount = BigInt(logData).toString();
						} catch (e) {
							logger.warn({ logData, error: e }, 'Failed to parse amount from log data');
							continue;
						}
					}

					// Check if this is a burn (to address is 0x0)
					const isBurn =
						toAddr === '0x0' || toAddr === '0x0000000000000000000000000000000000000000';

					if (!transfers[tokenAddress]) {
						transfers[tokenAddress] = {
							transfers: []
						};
					}

					transfers[tokenAddress].transfers.push({
						from: fromAddr,
						to: toAddr,
						amount,
						type: isBurn ? 'burn' : 'transfer'
					});

					logger.debug(
						{
							tokenAddress,
							from: fromAddr,
							to: toAddr,
							amount,
							type: isBurn ? 'burn' : 'transfer'
						},
						'Extracted token transfer from trace'
					);
				} catch (e) {
					logger.warn({ log, error: e }, 'Failed to parse Transfer event from trace');
				}
			}
		}

		// Recursively check nested calls
		if (node.calls && Array.isArray(node.calls)) {
			node.calls.forEach(extractFromNode);
		}
	}

	// First try standard extraction
	extractFromNode(trace);

	// If no transfers found, try comprehensive search
	if (Object.keys(transfers).length === 0) {
		logger.debug('No transfers found with standard extraction, trying comprehensive search');
		const allLogs = findLogsInNode(trace);
		logger.debug({ logCount: allLogs.length }, 'Found logs in trace structure');

		// Process all found logs
		for (const log of allLogs) {
			let topics: string[] | undefined;
			let logAddress: string | undefined;
			let logData: string | undefined;

			// Handle different log formats
			if (log.topics && Array.isArray(log.topics)) {
				topics = log.topics;
				logAddress = log.address;
				logData = log.data;
			} else if (log.raw && log.raw.topics) {
				topics = log.raw.topics;
				logAddress = log.raw.address;
				logData = log.raw.data;
			}

			if (
				topics &&
				topics.length >= 3 &&
				topics[0]?.toLowerCase() === TRANSFER_EVENT_SIGNATURE.toLowerCase()
			) {
				try {
					const tokenAddress = (logAddress || '').toLowerCase();
					if (!tokenAddress) continue;

					const fromTopic = topics[1];
					if (!fromTopic || fromTopic.length < 42) continue;
					const fromAddr = '0x' + fromTopic.slice(-40).toLowerCase();

					const toTopic = topics[2];
					if (!toTopic || toTopic.length < 42) continue;
					const toAddr = '0x' + toTopic.slice(-40).toLowerCase();

					let amount = '0';
					if (logData && logData !== '0x' && logData.length >= 2) {
						try {
							amount = BigInt(logData).toString();
						} catch (e) {
							continue;
						}
					}

					const isBurn =
						toAddr === '0x0' || toAddr === '0x0000000000000000000000000000000000000000';

					if (!transfers[tokenAddress]) {
						transfers[tokenAddress] = {
							transfers: []
						};
					}

					transfers[tokenAddress].transfers.push({
						from: fromAddr,
						to: toAddr,
						amount,
						type: isBurn ? 'burn' : 'transfer'
					});
				} catch (e) {
					// Silently continue - we already tried this in the main extraction
				}
			}
		}
	}

	logger.info(
		{
			transferCount: Object.keys(transfers).length,
			totalTransfers: Object.values(transfers).reduce(
				(sum, tokenData) => sum + tokenData.transfers.length,
				0
			)
		},
		'Extracted token transfers from trace'
	);

	return transfers;
}

/**
 * Extract token transfers from transaction input data
 * Fallback when trace logs are not available
 * Handles direct ERC-20 transfer calls: transfer(address,uint256)
 */
export function extractTokenTransfersFromInput(
	to: string | undefined,
	data: string,
	from: string
): TokenTransfers {
	const transfers: TokenTransfers = {};

	if (!to || !data || data.length < 10) {
		return transfers;
	}

	// Check if this is a transfer call
	const functionSignature = data.slice(0, 10).toLowerCase();
	if (functionSignature !== TRANSFER_FUNCTION_SIGNATURE.toLowerCase()) {
		return transfers;
	}

	try {
		// Parse transfer(address,uint256) parameters
		// data format: 0xa9059cbb + 32 bytes (to address) + 32 bytes (amount)
		if (data.length !== 138) {
			// 2 (0x) + 8 (function sig) + 64 (to address) + 64 (amount) = 138
			logger.warn(
				{ dataLength: data.length, expectedLength: 138 },
				'Invalid transfer call data length'
			);
			return transfers;
		}

		// Extract to address (bytes 10-73, but we need last 20 bytes of the 32-byte word)
		const toAddressHex = '0x' + data.slice(34, 74).toLowerCase();
		const toAddress = toAddressHex.toLowerCase();

		// Extract amount (bytes 74-138)
		const amountHex = '0x' + data.slice(74, 138);
		const amount = BigInt(amountHex).toString();

		if (amount === '0') {
			return transfers;
		}

		const tokenAddress = to.toLowerCase();

		if (!transfers[tokenAddress]) {
			transfers[tokenAddress] = {
				transfers: []
			};
		}

		transfers[tokenAddress].transfers.push({
			from: from.toLowerCase(),
			to: toAddress,
			amount,
			type: 'transfer'
		});

		logger.info(
			{
				tokenAddress,
				from: from.toLowerCase(),
				to: toAddress,
				amount
			},
			'Extracted token transfer from transaction input data'
		);
	} catch (e) {
		logger.warn(
			{ to, data, from, error: e },
			'Failed to parse transfer from transaction input data'
		);
	}

	return transfers;
}

/**
 * Enrich token transfers with token information
 */
export async function enrichTokenTransfersWithInfo(
	provider: ethers.JsonRpcProvider,
	tokenTransfers: TokenTransfers
): Promise<void> {
	const tokenAddresses = Object.keys(tokenTransfers);
	for (const tokenAddr of tokenAddresses) {
		const tokenInfo = await getTokenInfo(provider, tokenAddr);
		if (tokenInfo) {
			tokenTransfers[tokenAddr].tokenInfo = tokenInfo;
		}
	}
}
