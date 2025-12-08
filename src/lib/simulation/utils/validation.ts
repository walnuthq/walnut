import { ethers } from 'ethers';
import { logger } from '../logger';

/**
 * Normalize and validate transaction data field
 * @param data - Raw transaction data (hex string)
 * @returns Normalized and validated hex string
 * @throws Error if data format is invalid
 */
export function normalizeAndValidateTransactionData(data: string): string {
	// Normalize data using ethers.hexlify to ensure proper format
	let cleanData: string;
	try {
		if (!data || data === '0x' || data === '') {
			cleanData = '0x';
		} else {
			// Use hexlify to normalize the hex string
			// This will ensure proper formatting and catch any invalid hex
			cleanData = ethers.hexlify(data);
		}
	} catch (error) {
		throw new Error(`Invalid data format: ${data}. Error: ${error}`);
	}

	// Validate hex string format (double check)
	if (cleanData !== '0x' && !/^0x[0-9a-fA-F]*$/.test(cleanData)) {
		throw new Error(`Invalid data format after normalization: ${cleanData}`);
	}

	// Ensure even length (hex pairs) - hex strings must have even number of characters after 0x
	if (cleanData !== '0x' && cleanData.length % 2 !== 0) {
		throw new Error(`Invalid data length (must be even): ${cleanData}`);
	}

	// Ensure data doesn't exceed reasonable length (prevent malformed data)
	// Typical function call data is 4 bytes (function selector) + 32 bytes per parameter
	// Max reasonable length for a single call would be around 2000 bytes (4000 hex chars)
	if (cleanData.length > 4000) {
		logger.warn(
			{
				dataLength: cleanData.length,
				dataPreview: cleanData.substring(0, 100)
			},
			'Data is unusually long, may be malformed'
		);
		// Don't throw, but log warning
	}

	return cleanData;
}
