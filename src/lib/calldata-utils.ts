import { decodeFunctionData, encodeFunctionData, getAbiItem, type AbiFunction } from 'viem';

export interface FunctionArgument {
	name: string;
	type: string;
	value: any;
}

export interface DecodedCalldata {
	functionName: string;
	args: any[];
	argsWithTypes: FunctionArgument[];
	rawCalldata: string;
	abiDecodeError?: boolean;
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
			`/api/v1/contracts/${contractAddress}/entrypoints?chain_id=${chainId}`,
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
			`https://sourcify.dev/server/v2/contract/${chainId}/${contractAddress}?fields=abi`,
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
		console.warn('Error fetching ABI from Sourcify:', error);
		return null;
	}
}

/**
 * Fetches function signatures from 4byte.directory for a given selector
 */
export async function fetch4ByteSignatures(selector: string): Promise<string[]> {
	try {
		const response = await fetch(
			`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`,
			{
				headers: {
					accept: 'application/json'
				}
			}
		);

		if (!response.ok) {
			console.warn(`Failed to fetch from 4byte.directory: ${response.status}`);
			return [];
		}

		const data = await response.json();
		// Return array of text signatures, e.g., ["transfer(address,uint256)", "transfer(address,uint256)"]
		return data.results?.map((r: any) => r.text_signature) || [];
	} catch (error) {
		console.warn('Error fetching from 4byte.directory:', error);
		return [];
	}
}

/**
 * Attempts to decode calldata without ABI using 4byte.directory
 */
async function decodeWithout4Byte(calldata: string): Promise<DecodedCalldata | null> {
	try {
		// Extract selector (first 4 bytes)
		const selector = calldata.slice(0, 10); // 0x + 8 hex chars

		console.log('DECODING WITHOUT ABI: Fetching signatures for selector', selector);

		// Fetch possible signatures from 4byte.directory
		const signatures = await fetch4ByteSignatures(selector);

		if (signatures.length === 0) {
			console.log('DECODING WITHOUT ABI: No signatures found');
			return null;
		}

		console.log('DECODING WITHOUT ABI: Found signatures:', signatures);

		// Try each signature until one works
		for (const signature of signatures) {
			try {
				// Create a minimal ABI with just this function signature
				// Parse signature: "functionName(type1,type2,...)"
				const match = signature.match(/^([^(]+)\(([^)]*)\)$/);
				if (!match) continue;

				const functionName = match[1];
				const inputTypes = match[2] ? match[2].split(',').map((t) => t.trim()) : [];

				// Create minimal ABI
				const minimalAbi = [
					{
						type: 'function',
						name: functionName,
						inputs: inputTypes.map((type, index) => ({
							name: `arg${index}`,
							type
						}))
					}
				];

				// Try to decode with this signature
				const decoded = decodeFunctionData({
					abi: minimalAbi,
					data: calldata as `0x${string}`
				});

				if (!decoded.args) continue;

				// Success! Build argsWithTypes
				const decodedArgs = Array.from(decoded.args);
				const argsWithTypes: FunctionArgument[] = inputTypes.map((type, index) => ({
					name: `arg${index}`,
					type,
					value: decodedArgs[index]
				}));

				console.log('DECODING WITHOUT ABI: Successfully decoded with signature:', signature);

				return {
					functionName,
					args: decodedArgs,
					argsWithTypes,
					rawCalldata: calldata
				};
			} catch (error) {
				// This signature didn't work, try the next one
				continue;
			}
		}

		console.log('DECODING WITHOUT ABI: Could not decode with any signature');
		return null;
	} catch (error) {
		console.error('Error decoding without ABI:', error);
		return null;
	}
}

/**
 * Decodes calldata using viem's decodeFunctionData
 * @param calldata - Raw calldata string (0x...)
 * @param contractAddress - Contract address (optional, for logging)
 * @param abi - ABI array for decoding (optional - will use 4byte.directory if not provided)
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

		// Track if ABI decoding was attempted and failed
		let abiDecodeFailed = false;

		// If we have ABI, use viem's decodeFunctionData
		if (abi && abi.length > 0) {
			try {
				const { functionName, args } = decodeFunctionData({
					abi,
					data: calldata as `0x${string}`
				});

				// Find the function in ABI to get argument types and names
				const abiFunction = getAbiItem({
					abi,
					name: functionName
				}) as AbiFunction | undefined;

				// Build argsWithTypes array with name, type, and value for each argument
				const argsWithTypes: FunctionArgument[] = [];
				if (abiFunction && abiFunction.inputs) {
					abiFunction.inputs.forEach((input, index) => {
						argsWithTypes.push({
							name: input.name || `arg${index}`,
							type: input.type,
							value: args[index]
						});
					});
				} else {
					// Fallback: if we can't find the function in ABI, just use args without types
					args.forEach((arg, index) => {
						argsWithTypes.push({
							name: `arg${index}`,
							type: 'unknown',
							value: arg
						});
					});
				}

				return {
					functionName,
					args,
					argsWithTypes,
					rawCalldata: calldata
				};
			} catch (error) {
				console.warn('Failed to decode with ABI:', error);
				abiDecodeFailed = true;
			}
		}

		// If no ABI or ABI decoding failed, try 4byte.directory
		console.log('DECODING WITHOUT ABI: Attempting to decode using 4byte.directory');
		const decoded = await decodeWithout4Byte(calldata);
		if (decoded) {
			return {
				...decoded,
				abiDecodeError: abiDecodeFailed
			};
		}

		// Fallback: return basic info without ABI
		return {
			functionName: 'Unknown',
			args: [],
			argsWithTypes: [],
			rawCalldata: calldata,
			abiDecodeError: abiDecodeFailed
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
