import { SimulateRequest, SimulateResponse, AssetChangeDetailed } from '../types/simulate';
import { logger } from '../logger';
import {
	startAnvilFork,
	createSnapshot,
	revertSnapshot,
	executePreviousTransactions
} from '../utils/anvil';
import {
	collectTouchedAddressesFromTrace,
	extractTransferAddressesFromTrace,
	buildTouchedAddresses
} from '../utils/addresses';
import {
	collectTokenBalances,
	extractTokenTransfers,
	extractTokenTransfersFromTrace,
	extractTokenTransfersFromInput,
	enrichTokenTransfersWithInfo,
	extractERC20TokenAddresses
} from '../utils/tokens';
import { collectEthBalances, calculateEthDiffs } from '../utils/native';
import {
	calculateTokenDiffs,
	analyzeAssetChanges,
	calculateTokenDeltaSummary
} from '../utils/deltas';
import { getTokenPricesFromCoinMarketCap, calculateUSDValue } from '../utils/pricing';
import { normalizeAndValidateTransactionData } from '../utils/validation';

export async function simulateTx(params: SimulateRequest): Promise<SimulateResponse> {
	const {
		rpcForkUrl,
		blockNumber,
		from,
		to,
		value = '0x0',
		data = '0x',
		transactionIndex
	} = params;

	// 1) Start anvil fork
	// If transactionIndex > 0, we need to fork from blockNumber - 1 because:
	// - We want the state at the END of the previous block (before blockNumber starts)
	// - Then we'll execute transactions 0 to transactionIndex-1 to get the exact state
	// - before the transaction we want to simulate
	// If we forked from blockNumber directly, all transactions in that block would
	// already be executed, and we wouldn't have the correct pre-transaction state
	const forkBlockNumber =
		transactionIndex !== undefined && transactionIndex > 0 ? blockNumber - 1 : blockNumber;

	const { anvil, provider } = await startAnvilFork(rpcForkUrl, blockNumber, forkBlockNumber);

	try {
		// 2) If transactionIndex is provided, execute all previous transactions in the block
		if (transactionIndex !== undefined && transactionIndex > 0) {
			logger.info({ blockNumber, transactionIndex }, 'Executing previous transactions in block...');
			await executePreviousTransactions(provider, rpcForkUrl, blockNumber, transactionIndex);
		}

		// 3) Create snapshot (after executing previous transactions if needed)
		const snapshotId = await createSnapshot(provider);

		// 4) Collect trace
		// Normalize and validate call parameters for debug_traceCall
		const normalizedValue = value && value !== '0x0' ? value : '0x0';
		const cleanData = normalizeAndValidateTransactionData(data);

		logger.debug(
			{
				dataLength: cleanData.length,
				dataPreview: cleanData.substring(0, 100),
				from,
				to,
				value: normalizedValue
			},
			'Preparing debug_traceCall'
		);

		// Build call object - only include 'to' if it's provided
		const call: any = {
			from: from.toLowerCase(),
			value: normalizedValue,
			data: cleanData
		};

		if (to) {
			call.to = to.toLowerCase();
		}

		const trace = await provider.send('debug_traceCall', [
			call,
			'latest',
			{
				tracer: 'callTracer',
				tracerConfig: {
					withLog: true,
					// Enable state diff to see balance changes
					stateDiff: true
				}
			}
		]);

		// Log trace structure for debugging
		logger.debug(
			{
				traceKeys: trace ? Object.keys(trace) : [],
				hasLogs: trace?.logs ? 'yes' : 'no',
				logsType: Array.isArray(trace?.logs) ? 'array' : typeof trace?.logs,
				logsLength: Array.isArray(trace?.logs) ? trace.logs.length : 0,
				hasCalls: trace?.calls ? 'yes' : 'no',
				callsType: Array.isArray(trace?.calls) ? 'array' : typeof trace?.calls,
				tracePreview: trace ? JSON.stringify(trace, null, 2).substring(0, 2000) : 'null'
			},
			'Trace structure from debug_traceCall'
		);

		// Collect touched addresses from trace
		const touched = collectTouchedAddressesFromTrace(trace);

		// Also add from and to addresses explicitly
		touched.add(from.toLowerCase());
		if (to) touched.add(to.toLowerCase());

		const addresses = Array.from(touched);

		logger.info({ addresses }, 'Collected touched addresses.');

		// 5) Extract ERC-20 token addresses from touched addresses
		// Check which addresses are ERC-20 tokens by verifying they have basic ERC-20 functions
		const tokenAddresses = await extractERC20TokenAddresses(provider, addresses);

		// 6) ETH balances before (use all touched addresses to ensure we capture to address)
		// These are balances AFTER all previous transactions (0 to transactionIndex-1) have been executed,
		// but BEFORE the transaction we're simulating (transactionIndex).
		// This is the correct pre-transaction state.
		const beforeEth = await collectEthBalances(provider, addresses);

		// 7) Token balances pre-state
		// Note: We use 'addresses' here (before transaction execution)
		// Transfer event addresses will be added to 'allAddresses' after execution
		// These are balances AFTER all previous transactions (0 to transactionIndex-1) have been executed,
		// but BEFORE the transaction we're simulating (transactionIndex).
		const beforeTokens = await collectTokenBalances(provider, addresses, tokenAddresses);

		// 8) Extract Transfer event addresses from trace logs
		// This captures all addresses involved in token transfers (from/to in Transfer events)
		extractTransferAddressesFromTrace(trace, touched);

		// Update addresses array with all found addresses (including Transfer event addresses)
		const allAddresses = Array.from(touched);

		// Ensure to address is included (might have been missed)
		if (to && !allAddresses.includes(to.toLowerCase())) {
			allAddresses.push(to.toLowerCase());
		}

		// Log all addresses including those from Transfer events
		logger.info(
			{
				addressesBefore: addresses.length,
				addressesAfter: allAddresses.length,
				newAddresses: allAddresses.filter((addr) => !addresses.includes(addr))
			},
			'Addresses after extracting Transfer events from trace'
		);

		// 9) Extract token transfers from trace first (needed for calculating after balances)
		let tokenTransfers = extractTokenTransfersFromTrace(trace);

		// Fallback: If no transfers found in trace, try extracting from transaction input data
		// This handles cases where callTracer doesn't include logs properly
		if (Object.keys(tokenTransfers).length === 0) {
			logger.info(
				{ to, data, from },
				'No transfers found in trace, trying to extract from input data'
			);
			const transfersFromInput = extractTokenTransfersFromInput(to, data, from);

			// Merge transfers from input (they should not conflict)
			for (const [tokenAddress, tokenData] of Object.entries(transfersFromInput)) {
				if (!tokenTransfers[tokenAddress]) {
					tokenTransfers[tokenAddress] = { transfers: [] };
				}
				tokenTransfers[tokenAddress].transfers.push(...tokenData.transfers);
			}
		}

		await enrichTokenTransfersWithInfo(provider, tokenTransfers);

		// 9b) Calculate after state from trace and before state
		// Since debug_traceCall doesn't change state, we calculate after balances
		// by applying the changes we see in tokenTransfers
		// Now use allAddresses which includes Transfer event addresses
		// Also need to ensure beforeTokens includes balances for new addresses (set to 0)
		const beforeTokensComplete: Record<string, Record<string, string>> = {
			...beforeTokens
		};
		for (const token of tokenAddresses) {
			if (!beforeTokensComplete[token]) {
				beforeTokensComplete[token] = {};
			}
			for (const addr of allAddresses) {
				if (!beforeTokensComplete[token][addr]) {
					beforeTokensComplete[token][addr] = '0';
				}
			}
		}

		// Calculate after balances by applying token transfers to before balances
		// For ETH, we'll need to calculate from value sent/received
		// For tokens, we apply transfers
		const afterTokens: Record<string, Record<string, string>> = {};
		for (const token of tokenAddresses) {
			afterTokens[token] = { ...beforeTokensComplete[token] };
		}

		// Apply token transfers to calculate after balances
		for (const [tokenAddress, tokenData] of Object.entries(tokenTransfers)) {
			if (!afterTokens[tokenAddress]) {
				afterTokens[tokenAddress] = {};
			}
			for (const transfer of tokenData.transfers) {
				// Subtract from sender
				const fromBefore = BigInt(afterTokens[tokenAddress][transfer.from] || '0');
				afterTokens[tokenAddress][transfer.from] = (
					fromBefore - BigInt(transfer.amount)
				).toString();

				// Add to receiver (if not burn)
				if (transfer.type !== 'burn' && transfer.to) {
					const toBefore = BigInt(afterTokens[tokenAddress][transfer.to] || '0');
					afterTokens[tokenAddress][transfer.to] = (toBefore + BigInt(transfer.amount)).toString();
				}
			}
		}

		// For ETH, calculate from value and gas (we'll estimate)
		// This is approximate since we don't have exact gas cost from trace
		const afterEth: Record<string, bigint> = { ...beforeEth };
		const valueBigInt = BigInt(value || '0x0');
		if (valueBigInt > 0n && to) {
			const toLower = to.toLowerCase();
			afterEth[toLower] = (afterEth[toLower] || 0n) + valueBigInt;
			afterEth[from.toLowerCase()] = (afterEth[from.toLowerCase()] || 0n) - valueBigInt;
		}

		// 10) Calculate diffs
		// Merge beforeEth with missing addresses (set to 0n if not present)
		const beforeEthComplete: Record<string, bigint> = { ...beforeEth };
		for (const addr of allAddresses) {
			if (!beforeEthComplete[addr]) {
				beforeEthComplete[addr] = 0n;
			}
		}

		const ethDiff = calculateEthDiffs(beforeEthComplete, afterEth, allAddresses);
		const tokenDiff = calculateTokenDiffs(
			beforeTokensComplete,
			afterTokens,
			tokenAddresses,
			allAddresses
		);

		// 11) Token transfers already extracted above, just log them
		logger.info({ tokenTransfers }, 'Token transfers extracted from trace.');

		// Build token address -> symbol map for CoinMarketCap
		const tokenSymbolMap: Record<string, string> = {};
		for (const [tokenAddress, tokenData] of Object.entries(tokenTransfers)) {
			const symbol = tokenData.tokenInfo?.symbol;
			if (symbol && symbol.trim() !== '') {
				tokenSymbolMap[tokenAddress.toLowerCase()] = symbol;
			}
		}

		// Get token prices from CoinMarketCap API (using symbols)
		let tokenPrices: Record<string, number> = {};
		if (Object.keys(tokenSymbolMap).length > 0) {
			logger.info(
				{
					tokenSymbolMap,
					symbolCount: Object.keys(tokenSymbolMap).length
				},
				'Requesting prices from CoinMarketCap'
			);
			tokenPrices = await getTokenPricesFromCoinMarketCap(tokenSymbolMap);
			logger.info(
				{
					tokenPrices,
					tokenCount: Object.keys(tokenPrices).length,
					requestedCount: Object.keys(tokenSymbolMap).length,
					tokenSymbolMap
				},
				'Token prices fetched from CoinMarketCap'
			);
		}
		// Log token balances BEFORE transaction with USD values
		const beforeBalancesFormatted: string[] = [];
		for (const [token, addrBalances] of Object.entries(beforeTokensComplete)) {
			const tokenInfo = tokenTransfers[token]?.tokenInfo;
			const decimals = tokenInfo?.decimals ?? 18;
			const price = tokenPrices[token.toLowerCase()];

			for (const [address, balance] of Object.entries(addrBalances)) {
				let usdValue = '';
				if (price) {
					const usd = calculateUSDValue(balance, decimals, price);
					usdValue = ` ($${usd.toFixed(2)})`;
				}

				// beforeBalancesFormatted.push(
				//   `PRE: Adresa ${address} ima ${balance} tokena ${token}${usdValue} u bloku ${blockNumber}${
				//     transactionIndex !== undefined
				//       ? ` (pre transakcije index ${transactionIndex})`
				//       : ""
				//   }`
				// );
			}
		}
		logger.info(
			{
				blockNumber,
				transactionIndex,
				balances: beforeBalancesFormatted
			},
			'Token balances BEFORE transaction'
		);

		// Log token balances AFTER transaction with USD values
		const afterBalancesFormatted: string[] = [];
		for (const [token, addrBalances] of Object.entries(afterTokens)) {
			const tokenInfo = tokenTransfers[token]?.tokenInfo;
			const decimals = tokenInfo?.decimals ?? 18;
			const price = tokenPrices[token.toLowerCase()];

			for (const [address, balance] of Object.entries(addrBalances)) {
				let usdValue = '';
				if (price) {
					const usd = calculateUSDValue(balance, decimals, price);
					usdValue = ` ($${usd.toFixed(2)})`;
				}

				afterBalancesFormatted.push(
					`POSLE: Adresa ${address} ima ${balance} tokena ${token}${usdValue} u bloku ${blockNumber}${
						transactionIndex !== undefined ? ` (posle transakcije index ${transactionIndex})` : ''
					}`
				);
			}
		}
		logger.info(
			{
				blockNumber,
				transactionIndex,
				balances: afterBalancesFormatted
			},
			'Token balances AFTER transaction'
		);

		// 12) Build touched addresses with type and token info
		const touchedAddressesWithInfo = await buildTouchedAddresses(
			provider,
			allAddresses,
			tokenTransfers
		);

		logger.info({ touchedAddressesWithInfo }, 'Touched addresses with info.');

		// 13) Calculate token delta summary (per token and per EOA)
		// Use tokenDiff as source of truth (actual balance changes)
		const tokenDeltaSummary = calculateTokenDeltaSummary(
			touchedAddressesWithInfo,
			tokenTransfers,
			tokenDiff
		);

		logger.info(
			{
				tokenDeltaSummary,
				tokenDiffKeys: Object.keys(tokenDiff),
				tokenDiffSize: Object.keys(tokenDiff).length
			},
			'Token delta summary calculated.'
		);

		// 14) Analyze asset changes (old format for logging)
		const assetSwap = analyzeAssetChanges(from, ethDiff, tokenDiff);

		logger.info(
			{
				assetSwap,
				ethDiff,
				tokenDiffKeys: Object.keys(tokenDiff),
				ethDiffKeys: Object.keys(ethDiff)
			},
			'Asset swap analysis complete.'
		);

		// 14b) Transform tokenTransfers to assetChanges format
		const assetChanges: AssetChangeDetailed[] = [];
		for (const [tokenAddress, tokenData] of Object.entries(tokenTransfers)) {
			const tokenInfo = tokenData.tokenInfo;
			const decimals = tokenInfo?.decimals ?? 18;
			const tokenAddressLower = tokenAddress.toLowerCase();
			const price = tokenPrices[tokenAddressLower] || 0;

			// Debug logging for price lookup
			if (!price) {
				logger.warn(
					{
						tokenAddress,
						tokenAddressLower,
						symbol: tokenInfo?.symbol,
						availablePrices: Object.keys(tokenPrices),
						tokenPrices
					},
					'No price found for token in assetChanges'
				);
			} else {
				logger.debug(
					{
						tokenAddress,
						symbol: tokenInfo?.symbol,
						price
					},
					'Using price for token in assetChanges'
				);
			}

			for (const transfer of tokenData.transfers) {
				const rawAmount = transfer.amount;
				const amountBigInt = BigInt(rawAmount);
				const decimalsMultiplier = BigInt(10) ** BigInt(decimals);
				const amountDecimal = Number(amountBigInt) / Number(decimalsMultiplier);
				// Format amount with natural precision (remove trailing zeros)
				// Use toFixed with max decimals, then remove trailing zeros
				const formattedAmount = amountDecimal.toFixed(decimals).replace(/\.?0+$/, '');

				// Calculate USD value
				const dollarValue = price ? calculateUSDValue(rawAmount, decimals, price).toFixed(2) : '0';

				// Get before balances
				const fromBeforeBalance = beforeTokensComplete[tokenAddress]?.[transfer.from] || '0';
				const toBeforeBalance = transfer.to
					? beforeTokensComplete[tokenAddress]?.[transfer.to] || '0'
					: '0';

				// Convert to hex strings
				const fromBeforeBalanceHex = '0x' + BigInt(fromBeforeBalance).toString(16);
				const toBeforeBalanceHex = '0x' + BigInt(toBeforeBalance).toString(16);

				// Calculate token info dollar value (unit price per token from price provider)
				const tokenDollarValue = price ? price.toFixed(8) : '0';

				const isBurn = transfer.type === 'burn';
				const assetChange: AssetChangeDetailed = {
					token_info: {
						standard: 'ERC20',
						type: 'Fungible',
						contract_address: tokenAddress,
						symbol: tokenInfo?.symbol,
						name: tokenInfo?.name,
						decimals: decimals,
						dollar_value: tokenDollarValue
					},
					type: isBurn ? 'Burn' : 'Transfer',
					from: transfer.from,
					amount: formattedAmount,
					raw_amount: rawAmount,
					dollar_value: dollarValue,
					from_before_balance: fromBeforeBalanceHex,
					to_before_balance: toBeforeBalanceHex
				};

				// Only include 'to' for Transfer (not Burn)
				if (!isBurn && transfer.to) {
					assetChange.to = transfer.to;
				}

				assetChanges.push(assetChange);
			}
		}

		// 15) Revert snapshot
		await revertSnapshot(provider, snapshotId);

		// Determine transaction status from trace
		// If trace has error field, transaction was reverted
		const status: 'SUCCESS' | 'REVERTED' = trace.error ? 'REVERTED' : 'SUCCESS';

		// Calculate gas info from trace
		// Trace has gasUsed field at the root level
		const traceAny = trace as any;
		const gasUsed = traceAny.gasUsed?.toString() || traceAny.gas?.toString() || '0';

		// For gas price, we need to estimate or use default
		// Since we don't have actual transaction, we'll use a reasonable estimate
		// or get it from the block
		let effectiveGasPrice = '0';
		try {
			const block = await provider.getBlock('latest');
			if (block && block.baseFeePerGas) {
				// Use baseFeePerGas + 1 gwei as estimate for EIP-1559
				effectiveGasPrice = (block.baseFeePerGas + BigInt('1000000000')).toString();
			} else {
				// Fallback to 1 gwei
				effectiveGasPrice = '1000000000';
			}
		} catch (error) {
			logger.warn({ error }, 'Could not get block for gas price, using default');
			effectiveGasPrice = '1000000000'; // 1 gwei
		}

		const totalCost = (BigInt(gasUsed) * BigInt(effectiveGasPrice)).toString();

		const gasInfo = {
			gasUsed,
			totalCost,
			effectiveGasPrice
			// Note: We don't have gasPrice, maxFeePerGas, maxPriorityFeePerGas from trace
			// These would need to come from the original transaction or be estimated
		};

		logger.info(
			{
				status,
				gasInfo,
				tokenTransfersCount: Object.keys(tokenTransfers).length,
				assetChangesCount: assetChanges.length
			},
			'Simulation complete.'
		);

		return {
			status,
			gasInfo,
			tokenTransfers,
			assetChanges
		};
	} catch (error) {
		logger.error({ error }, 'Error during simulation');
		throw error;
	} finally {
		// 13) Stop anvil (always cleanup)
		try {
			anvil.kill();
			logger.info('Anvil process killed');
		} catch (killError) {
			logger.warn({ killError }, 'Error killing anvil process');
		}
	}
}
