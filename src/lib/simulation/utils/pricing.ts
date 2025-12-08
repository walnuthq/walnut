import { logger } from '../logger';

interface CoinMarketCapResponse {
	data: {
		[symbol: string]: {
			id: number;
			name: string;
			symbol: string;
			quote: {
				USD: {
					price: number;
					[key: string]: any;
				};
			};
			[key: string]: any;
		};
	};
	status: {
		error_code: number;
		error_message: string | null;
		[key: string]: any;
	};
}

/**
 * Get token prices from CoinMarketCap API using symbols
 * @param tokenSymbolMap Map of tokenAddress -> symbol
 * @returns Map of tokenAddress -> price
 */
export async function getTokenPricesFromCoinMarketCap(
	tokenSymbolMap: Record<string, string>
): Promise<Record<string, number>> {
	const prices: Record<string, number> = {};
	const apiKey = process.env.CMC_PRO_API_KEY;

	if (!apiKey) {
		logger.warn('CMC_PRO_API_KEY not found in environment variables');
		return prices;
	}

	// Filter out tokens without symbols
	const tokensWithSymbols = Object.entries(tokenSymbolMap).filter(
		([_, symbol]) => symbol && symbol.trim() !== ''
	);

	if (tokensWithSymbols.length === 0) {
		logger.info('No tokens with symbols to fetch from CoinMarketCap');
		return prices;
	}

	// Extract unique symbols
	const symbols = Array.from(new Set(tokensWithSymbols.map(([_, symbol]) => symbol.toUpperCase())));

	try {
		// Build URL with symbols as comma-separated list
		const symbolsParam = symbols.join(',');
		const url = new URL('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest');
		url.searchParams.append('symbol', symbolsParam);
		url.searchParams.append('convert', 'USD');

		logger.info(
			{ symbolCount: symbols.length, symbols },
			'Fetching token prices from CoinMarketCap'
		);

		const response = await fetch(url.toString(), {
			headers: {
				'X-CMC_PRO_API_KEY': apiKey,
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			logger.warn(
				{ status: response.status, statusText: response.statusText },
				'Failed to fetch token prices from CoinMarketCap'
			);
			return prices;
		}

		const data: CoinMarketCapResponse = await response.json();

		// Check for API errors
		if (data.status.error_code !== 0) {
			logger.warn(
				{
					errorCode: data.status.error_code,
					errorMessage: data.status.error_message
				},
				'CoinMarketCap API returned an error'
			);
			return prices;
		}

		// Map prices back to token addresses using symbols
		logger.info(
			{
				availableSymbolsInResponse: Object.keys(data.data),
				requestedSymbols: symbols
			},
			'CoinMarketCap response symbols'
		);

		for (const [tokenAddress, symbol] of tokensWithSymbols) {
			const symbolUpper = symbol.toUpperCase();
			const tokenData = data.data[symbolUpper];

			if (tokenData && tokenData.quote?.USD?.price) {
				const price = tokenData.quote.USD.price;
				if (price > 0) {
					prices[tokenAddress.toLowerCase()] = price;
					logger.info(
						{
							tokenAddress,
							tokenAddressLower: tokenAddress.toLowerCase(),
							symbol,
							symbolUpper,
							price
						},
						'Got price from CoinMarketCap'
					);
				} else {
					logger.warn(
						{ tokenAddress, symbol, symbolUpper, price },
						'Price is 0 or negative from CoinMarketCap'
					);
				}
			} else {
				logger.warn(
					{
						tokenAddress,
						symbol,
						symbolUpper,
						availableSymbols: Object.keys(data.data),
						tokenDataExists: !!tokenData,
						hasQuote: !!tokenData?.quote,
						hasUSD: !!tokenData?.quote?.USD,
						hasPrice: !!tokenData?.quote?.USD?.price
					},
					'Token not found in CoinMarketCap response or missing price'
				);
			}
		}

		logger.info(
			{
				requestedCount: tokensWithSymbols.length,
				foundCount: Object.keys(prices).length
			},
			'Fetched token prices from CoinMarketCap'
		);
	} catch (error) {
		logger.error(
			{ error, tokenCount: tokensWithSymbols.length },
			'Error fetching token prices from CoinMarketCap'
		);
	}

	return prices;
}

/**
 * Calculate USD value from token amount and price
 */
export function calculateUSDValue(amount: string, decimals: number, pricePerToken: number): number {
	try {
		const amountBigInt = BigInt(amount);
		const decimalsMultiplier = BigInt(10) ** BigInt(decimals);
		const amountDecimal = Number(amountBigInt) / Number(decimalsMultiplier);
		return amountDecimal * pricePerToken;
	} catch (error) {
		logger.warn({ error, amount, decimals, pricePerToken }, 'Error calculating USD value');
		return 0;
	}
}
