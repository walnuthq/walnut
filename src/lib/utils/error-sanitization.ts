/**
 * Sanitizes error messages to remove sensitive information
 */

/**
 * Sanitizes error messages to remove URLs and API keys
 * @param error - The error object to sanitize
 * @returns A sanitized error with URLs and API keys removed
 */
export const sanitizeError = (error: any): Error => {
	if (!error) return new Error('Unknown error occurred');

	let message = error.message || String(error);

	// Remove any URL (http or https) - this will catch RPC URLs with API keys
	message = message.replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]');

	// Remove very long alphanumeric strings that look like API keys (40+ chars)
	message = message.replace(/[a-zA-Z0-9]{40,}/g, '[REDACTED_KEY]');

	// Remove request body details that might contain sensitive data
	message = message.replace(/Request body: \{[^}]*\}/g, 'Request body: [REDACTED]');

	// Remove specific viem error details that might contain sensitive information
	message = message.replace(/URL: [^\s]+/g, 'URL: [REDACTED]');
	message = message.replace(/Version: [^\s]+/g, 'Version: [REDACTED]');

	return new Error(message);
};

/**
 * Checks if an error is related to debug_traceCall method
 * @param error - The error to check
 * @returns True if the error is about debug_traceCall
 */
export const isDebugTraceCallError = (error: any): boolean => {
	return error?.message?.includes('debug_traceCall');
};

/**
 * Checks if an error is related to Sourcify ABI loader
 * @param error - The error to check
 * @returns True if the error is about Sourcify ABI loader
 */
export const isSourcifyABILoaderError = (error: any): boolean => {
	return (
		error?.message?.includes('SourcifyABILoaderError') ||
		error?.message?.includes('SourcifyABILoader')
	);
};
