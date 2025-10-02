import { decodeFunctionData, encodeFunctionData } from 'viem';

export interface DecodedCalldata {
	functionName: string;
	args: any[];
	rawCalldata: string;
}

export interface CalldataDecoder {
	decode: (
		calldata: string,
		contractAddress?: string,
		abi?: any[]
	) => Promise<DecodedCalldata | null>;
	encode: (
		decoded: DecodedCalldata,
		contractAddress?: string,
		abi?: any[]
	) => Promise<string | null>;
}

/**
 * Fetches ABI from internal API (which uses soldb response)
 */
export async function fetchABIFromInternalAPI(
	contractAddress: string,
	chainId: string
): Promise<any[] | null> {
	try {
		const response = await fetch(
			`/api/v1/contracts/${contractAddress}/entrypoints?chain_id=OP_SEPOLIA`,
			{
				headers: {
					accept: 'application/json'
				}
			}
		);

		if (!response.ok) {
			console.warn(
				`Failed to fetch ABI for ${contractAddress} on chain ${chainId}: ${response.status}`
			);
			return null;
		}

		const data = await response.json();
		return data.abi || null;
	} catch (error) {
		console.warn('Error fetching ABI from internal API:', error);
		return null;
	}
}

/**
 * Fetches ABI from Sourcify for a given contract address and chain (fallback)
 */
export async function fetchABIFromSourcify(
	contractAddress: string,
	chainId: string
): Promise<any[] | null> {
	try {
		// Use Sourcify API v2 which is more reliable
		const response = await fetch(
			`https://sourcify.dev/server/v2/contract/OP_SEPOLIA/${contractAddress}?fields=abi`,
			{
				headers: {
					accept: 'application/json'
				}
			}
		);

		console.log('response', response);
		if (!response.ok) {
			console.warn(
				`Failed to fetch ABI for ${contractAddress} on chain ${chainId}: ${response.status}`
			);
			return null;
		}

		const data = await response.json();
		return data.abi || null;
	} catch (error) {
		console.warn('Error fetching ABI from Sourcify:', error);
		return null;
	}
}

/**
 * Decodes calldata using viem's decodeFunctionData
 * @param calldata - Raw calldata string (0x...)
 * @param contractAddress - Contract address (optional, for logging)
 * @param abi - ABI array for decoding
 * @returns Decoded calldata object or null if decoding fails
 */
export async function decodeCalldata(
	calldata: string,
	contractAddress?: string,
	abi?: any[]
): Promise<DecodedCalldata | null> {
	try {
		if (!calldata || !calldata.startsWith('0x')) {
			return null;
		}

		// If we have ABI, use viem's decodeFunctionData
		if (abi && abi.length > 0) {
			try {
				const { functionName, args } = decodeFunctionData({
					abi,
					data: calldata as `0x${string}`
				});

				return {
					functionName,
					args,
					rawCalldata: calldata
				};
			} catch (error) {
				console.warn('Failed to decode with ABI:', error);
			}
		}

		// Fallback: return basic info without ABI
		return {
			functionName: 'Unknown',
			args: [],
			rawCalldata: calldata
		};
	} catch (error) {
		console.error('Error decoding calldata:', error);
		return null;
	}
}

/**
 * Encodes decoded calldata back to raw format using viem's encodeFunctionData
 * @param decoded - Decoded calldata object
 * @param contractAddress - Contract address (optional, for logging)
 * @param abi - ABI array for encoding
 * @returns Encoded calldata string or null if encoding fails
 */
export async function encodeCalldata(
	decoded: DecodedCalldata,
	contractAddress?: string,
	abi?: any[]
): Promise<string | null> {
	try {
		if (!decoded || !decoded.functionName) {
			return decoded?.rawCalldata || null;
		}

		// If we have ABI, use viem's encodeFunctionData
		if (abi && abi.length > 0) {
			try {
				const data = encodeFunctionData({
					abi,
					functionName: decoded.functionName,
					args: decoded.args
				});

				return data;
			} catch (error) {
				console.warn('Failed to encode with ABI:', error);
			}
		}

		// Fallback: return original calldata if we can't encode
		return decoded.rawCalldata;
	} catch (error) {
		console.error('Error encoding calldata:', error);
		return decoded?.rawCalldata || null;
	}
}

/**
 * Creates a calldata decoder instance
 */
export function createCalldataDecoder(): CalldataDecoder {
	return {
		decode: decodeCalldata,
		encode: encodeCalldata
	};
}
