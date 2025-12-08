/**
 * Centralized Error Handling System
 *
 * This module provides custom error classes
 */

import { CHAINS_META, getChainIdByNumber } from '@/lib/networks';
import { ChainId } from './types';

import { getSupportedNetworks } from '@/lib/get-supported-networks';
import type { AuthType } from '@/lib/types';

/**
 * Gets a user-friendly label for a chain
 * @param chainId - Chain ID as string or number
 * @param session - Optional session to check tenant networks
 * @returns Chain label
 */
function getChainLabel(chainId: string | number, session?: AuthType['session'] | null): string {
	console.log('getChainLabel called with chainId:', chainId, 'session:', !!session);

	// Convert to number for consistent lookups
	const chainIdNumber = typeof chainId === 'number' ? chainId : parseInt(chainId, 10);

	// For string chainId, first check if it's a known ChainId (fastest O(1) lookup)
	// Use label for static networks (more descriptive with RPC provider info)
	if (typeof chainId === 'string' && chainId in ChainId) {
		return (
			CHAINS_META[chainId as ChainId]?.label ||
			CHAINS_META[chainId as ChainId]?.displayName ||
			chainId
		);
	}

	// Check tenant networks - these take priority as they're user-specific
	// getSupportedNetworks returns both static networks (with label) and tenant networks
	if (session) {
		const tenantNetworks = getSupportedNetworks(session);
		console.log(
			'Checking tenant networks:',
			tenantNetworks.map((n) => ({
				key: n.key,
				chainId: n.chainId,
				displayName: n.displayName,
				label: n.label
			}))
		);
		const tenantNetwork = tenantNetworks.find((n) =>
			typeof chainId === 'string'
				? n.key === chainId || n.chainId.toString() === chainId
				: n.chainId === chainId
		);
		if (tenantNetwork) {
			// Prefer label (more descriptive) over displayName
			const networkLabel = tenantNetwork.label || tenantNetwork.displayName;
			console.log('Found tenant network:', networkLabel);
			return networkLabel;
		}
	}

	// Check static CHAINS_META by numeric chainId and return label (more descriptive)
	if (!isNaN(chainIdNumber)) {
		const chainKey = getChainIdByNumber(chainIdNumber);
		if (chainKey) {
			const label = CHAINS_META[chainKey]?.label || CHAINS_META[chainKey]?.displayName;
			if (label) {
				console.log('Found in CHAINS_META:', label);
				return label;
			}
		}
	}

	// Final fallback: try to format nicely, or return "Chain X" for numbers
	if (typeof chainId === 'string') {
		// Try to convert string keys to display names (e.g., "OP_MAIN" -> "OP Main")
		const formatted = chainId
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');
		console.log('Using formatted fallback:', formatted);
		return formatted;
	}

	const fallback = `Chain ${chainId}`;
	console.log('Using numeric fallback:', fallback);
	return fallback;
}

/**
 * Sanitizes RPC error messages to remove sensitive URLs
 * Used to prevent exposing RPC endpoints to users
 */
function sanitizeRpcMessage(message: string): string {
	// Remove RPC URLs (keep the rest of the message)
	return message
		.replace(/https?:\/\/[^\s'"}\]]+/g, '[RPC]')
		.replace(/\s+/g, ' ')
		.trim();
}

export class WalnutError extends Error {
	public readonly code: string;
	public readonly statusCode: number;
	public readonly userMessage: string;
	public readonly details?: string;
	public readonly context?: Record<string, any>;

	constructor(
		message: string,
		code: string,
		statusCode: number,
		userMessage: string,
		details?: string,
		context?: Record<string, any>
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.statusCode = statusCode;
		this.userMessage = userMessage;
		this.details = details;
		this.context = context;
		Error.captureStackTrace(this, this.constructor);
	}

	toJSON() {
		return {
			error: this.userMessage,
			code: this.code,
			details: this.details,
			...(this.context && { context: this.context })
		};
	}
}

export class NetworkNotSupportedError extends WalnutError {
	constructor(
		chainId?: string | number,
		availableNetworks?: string[],
		session?: AuthType['session'] | null
	) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : 'Unknown';
		const chainInfo = chainId ? ` (${chainLabel})` : '';
		const availableInfo = availableNetworks?.length
			? `\n\nAvailable networks: ${availableNetworks.join(', ')}`
			: '';

		super(
			`Network not supported: ${chainId}`,
			'NETWORK_NOT_SUPPORTED',
			400,
			`The network${chainInfo} is not supported. Please select a supported network.`,
			`This network is not configured in the system.${availableInfo}`,
			{ chainId, chainLabel, availableNetworks }
		);
	}
}

export class ChainIdRequiredError extends WalnutError {
	constructor(operation?: string) {
		const operationInfo = operation ? ` for ${operation}` : '';

		super(
			`chain_id is required${operationInfo}`,
			'CHAIN_ID_REQUIRED',
			400,
			`Network is required${operationInfo}.`,
			'Please provide a valid chainId parameter.',
			{ operation }
		);
	}
}

export class RpcUrlNotFoundError extends WalnutError {
	constructor(chainId: string | number, session?: AuthType['session'] | null) {
		const chainLabel = getChainLabel(chainId, session);

		super(
			`No RPC URL found for chain ${chainId}`,
			'RPC_URL_NOT_FOUND',
			400,
			`No RPC URL configured for ${chainLabel}.`,
			'This network requires a valid RPC URL with debug capabilities.',
			{ chainId, chainLabel }
		);
	}
}

export class RpcConnectionError extends WalnutError {
	constructor(
		chainId?: string | number,
		originalError?: any,
		session?: AuthType['session'] | null
	) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : 'the network';

		super(
			`Failed to connect to ${chainLabel}`,
			'RPC_CONNECTION_ERROR',
			503,
			`Unable to connect to ${chainLabel}.`,
			'The RPC endpoint is unreachable or not responding. Please check your network connection and RPC configuration.',
			{ chainId, chainLabel, originalError: originalError?.message }
		);
	}
}

export class DebugCapabilityNotSupportedError extends WalnutError {
	constructor(chainId?: string | number, method?: string, session?: AuthType['session'] | null) {
		console.log('DebugCapabilityNotSupportedError - chainId:', chainId, 'session:', !!session);
		const chainLabel = chainId ? getChainLabel(chainId, session) : 'this network';
		console.log('DebugCapabilityNotSupportedError - chainLabel:', chainLabel);
		const methodInfo = method ? ` (${method})` : '';

		super(
			`Debug capabilities not supported on ${chainLabel}`,
			'DEBUG_NOT_SUPPORTED',
			400,
			`Debug data is not available on ${chainLabel}. Please check that your RPC endpoint has debug support enabled.`,
			`The RPC endpoint does not support debug methods${methodInfo}. Required methods: debug_traceTransaction and debug_traceCall.`,
			{ chainId, chainLabel, method }
		);
	}
}

export class TransactionNotFoundError extends WalnutError {
	constructor(txHash: string, chainId?: string | number, session?: AuthType['session'] | null) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : 'the specified network';

		super(
			`Transaction ${txHash} not found on ${chainLabel}`,
			'TRANSACTION_NOT_FOUND',
			404,
			`Transaction ${txHash} not found on ${chainLabel}.`,
			`The transaction does not exist on ${chainLabel}.`,
			{ txHash, chainId, chainLabel }
		);
	}
}

export class InvalidTransactionParametersError extends WalnutError {
	constructor(missingParams: string[], details?: string) {
		super(
			'Invalid transaction parameters',
			'INVALID_TRANSACTION_PARAMS',
			400,
			'Missing or invalid transaction parameters.',
			details ||
				`The following parameters are required: ${missingParams.join(
					', '
				)}. Please provide all required parameters.`,
			{ missingParams }
		);
	}
}

export class CalldataMissingError extends WalnutError {
	constructor() {
		super(
			'Calldata is required',
			'CALLDATA_MISSING',
			400,
			'Transaction calldata is required.',
			'Please provide valid calldata for the transaction simulation.',
			{}
		);
	}
}

export class CalldataInvalidError extends WalnutError {
	constructor(reason?: string) {
		super(
			'Invalid calldata format',
			'CALLDATA_INVALID',
			400,
			'The provided calldata is invalid.',
			reason ||
				'Calldata must be a valid hex string or array format. Please check the format and try again.',
			{ reason }
		);
	}
}

export class SoldbNotInstalledError extends WalnutError {
	constructor(chainId?: string | number, session?: AuthType['session'] | null) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const chainInfo = chainLabel ? ` on ${chainLabel}` : '';

		super(
			'soldb executable not found',
			'SOLDB_NOT_INSTALLED',
			500,
			`Debug tool is not running${chainInfo}.`,
			'The soldb debugging tool is not installed or not accessible.',
			{ chainId, chainLabel }
		);
	}
}

export class SoldbExecutionError extends WalnutError {
	constructor(
		message: string,
		chainId?: string | number,
		details?: string,
		session?: AuthType['session'] | null,
		errorType?: string,
		errorContext?: Record<string, any>,
		statusCode: number = 500
	) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const chainInfo = chainLabel ? ` on ${chainLabel}` : '';
		// Sanitize message to remove RPC URLs before showing to user
		const sanitizedDetails = sanitizeRpcMessage(details || message);

		super(
			`Soldb execution failed${chainInfo}: ${message}`,
			'SOLDB_EXECUTION_ERROR',
			statusCode,
			`Debug execution failed${chainInfo}.`,
			sanitizedDetails,
			{
				chainId,
				chainLabel,
				originalMessage: sanitizeRpcMessage(message),
				...(errorType && { errorType }),
				...(errorContext && Object.keys(errorContext).length > 0 && { errorContext })
			}
		);
	}
}

/**
 * RPC error with specific error code - maps RPC codes to appropriate HTTP status
 */
export class RpcError extends WalnutError {
	public readonly rpcCode: number;

	constructor(
		rpcCode: number,
		message: string,
		chainId?: string | number,
		session?: AuthType['session'] | null,
		context?: Record<string, any>
	) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const chainInfo = chainLabel ? ` on ${chainLabel}` : '';
		const httpStatus = mapRpcCodeToHttpStatus(rpcCode, message);
		// Sanitize message to remove RPC URLs before showing to user
		const sanitizedMessage = sanitizeRpcMessage(message);

		super(
			`RPC error ${rpcCode}${chainInfo}: ${message}`,
			'RPC_ERROR',
			httpStatus,
			`Transaction failed${chainInfo}: ${sanitizedMessage}`,
			sanitizedMessage,
			{
				chainId,
				chainLabel,
				rpcCode,
				...context
			}
		);
		this.rpcCode = rpcCode;
	}
}

/**
 * Insufficient funds error - when sender doesn't have enough balance
 */
export class InsufficientFundsError extends WalnutError {
	constructor(
		address: string,
		available: string,
		required: string,
		chainId?: string | number,
		session?: AuthType['session'] | null
	) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const chainInfo = chainLabel ? ` on ${chainLabel}` : '';

		super(
			`Insufficient funds for address ${address}${chainInfo}`,
			'INSUFFICIENT_FUNDS',
			400,
			`Insufficient funds${chainInfo}. The sender address does not have enough balance.`,
			`Address ${address} has ${available} but needs ${required}.`,
			{
				chainId,
				chainLabel,
				address,
				available,
				required
			}
		);
	}
}

/**
 * Execution reverted error - when transaction reverts during execution
 */
export class ExecutionRevertedError extends WalnutError {
	constructor(reason?: string, chainId?: string | number, session?: AuthType['session'] | null) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const chainInfo = chainLabel ? ` on ${chainLabel}` : '';
		const reasonInfo = reason ? `: ${reason}` : '';

		super(
			`Execution reverted${chainInfo}${reasonInfo}`,
			'EXECUTION_REVERTED',
			400,
			`Transaction execution reverted${chainInfo}.`,
			reason || 'The transaction was reverted during execution.',
			{
				chainId,
				chainLabel,
				reason
			}
		);
	}
}

/**
 * Gas estimation failed error
 */
export class GasEstimationError extends WalnutError {
	constructor(reason?: string, chainId?: string | number, session?: AuthType['session'] | null) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const chainInfo = chainLabel ? ` on ${chainLabel}` : '';

		super(
			`Gas estimation failed${chainInfo}`,
			'GAS_ESTIMATION_FAILED',
			400,
			`Unable to estimate gas${chainInfo}.`,
			reason || 'Gas estimation failed. The transaction may be invalid or would revert.',
			{
				chainId,
				chainLabel,
				reason
			}
		);
	}
}

/**
 * Nonce too low error
 */
export class NonceTooLowError extends WalnutError {
	constructor(
		address: string,
		providedNonce?: number,
		expectedNonce?: number,
		chainId?: string | number,
		session?: AuthType['session'] | null
	) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const chainInfo = chainLabel ? ` on ${chainLabel}` : '';

		super(
			`Nonce too low for address ${address}${chainInfo}`,
			'NONCE_TOO_LOW',
			400,
			`Transaction nonce is too low${chainInfo}.`,
			providedNonce !== undefined && expectedNonce !== undefined
				? `Provided nonce ${providedNonce}, but expected at least ${expectedNonce}.`
				: 'The transaction nonce is lower than the current account nonce.',
			{
				chainId,
				chainLabel,
				address,
				providedNonce,
				expectedNonce
			}
		);
	}
}

/**
 * Maps RPC error codes to appropriate HTTP status codes
 */
function mapRpcCodeToHttpStatus(rpcCode: number, message: string): number {
	// Standard JSON-RPC error codes
	// https://www.jsonrpc.org/specification#error_object
	// -32700: Parse error
	// -32600: Invalid Request
	// -32601: Method not found
	// -32602: Invalid params
	// -32603: Internal error

	// Ethereum specific codes (typically -32000 to -32099)
	// These are server errors but often indicate client-side issues

	const lowerMessage = message.toLowerCase();

	// Check message content for specific error types
	if (lowerMessage.includes('insufficient funds')) {
		return 400; // Bad Request - user doesn't have enough funds
	}
	if (lowerMessage.includes('nonce too low') || lowerMessage.includes('nonce is too low')) {
		return 400; // Bad Request - invalid nonce
	}
	if (lowerMessage.includes('execution reverted') || lowerMessage.includes('revert')) {
		return 400; // Bad Request - transaction would revert
	}
	if (
		lowerMessage.includes('gas') &&
		(lowerMessage.includes('low') || lowerMessage.includes('limit'))
	) {
		return 400; // Bad Request - gas issues
	}
	if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
		return 504; // Gateway Timeout
	}
	if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
		return 429; // Too Many Requests
	}
	if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
		return 404; // Not Found
	}

	// Map by RPC code
	switch (rpcCode) {
		case -32700: // Parse error
		case -32600: // Invalid Request
		case -32602: // Invalid params
			return 400;
		case -32601: // Method not found
			return 501; // Not Implemented
		case -32603: // Internal error
			return 500;
		default:
			// For -32000 range (execution errors), check if it's client or server error
			if (rpcCode >= -32099 && rpcCode <= -32000) {
				// Most execution errors in this range are client-side issues
				return 400;
			}
			return 500; // Default to server error
	}
}

export class SoldbTimeoutError extends WalnutError {
	constructor(chainId?: string | number, session?: AuthType['session'] | null) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const chainInfo = chainLabel ? ` on ${chainLabel}` : '';
		const userMessage = `Transaction execution timed out${chainInfo}.`;

		super(`Execution timeout${chainInfo}`, 'SOLDB_TIMEOUT', 504, userMessage, userMessage, {
			chainId,
			chainLabel
		});
	}
}

export class ContractCompilationError extends WalnutError {
	constructor(errors: string[], chainId?: string | number) {
		super(
			'Contract compilation failed',
			'COMPILATION_ERROR',
			400,
			'Unable to compile contract source code.',
			`Compilation failed with ${errors.length} error(s):\n${errors.slice(0, 3).join('\n')}${
				errors.length > 3 ? '\n...' : ''
			}`,
			{ chainId, errors }
		);
	}
}

export class SourceCodeNotFoundError extends WalnutError {
	constructor(
		contractAddress: string,
		chainId?: string | number,
		session?: AuthType['session'] | null
	) {
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const chainInfo = chainLabel ? ` on ${chainLabel}` : '';

		super(
			`Source code not found for ${contractAddress}`,
			'SOURCE_CODE_NOT_FOUND',
			404,
			`Contract source code not available${chainInfo}.`,
			`The contract at ${contractAddress} is not verified${chainInfo}. Debug information requires verified contract source code.`,
			{ contractAddress, chainId, chainLabel }
		);
	}
}

export class AuthenticationRequiredError extends WalnutError {
	constructor(chainId?: string | number, session?: AuthType['session'] | null) {
		console.log('chainId:', chainId);
		const chainLabel = chainId ? getChainLabel(chainId, session) : null;
		const networkInfo = chainLabel ? ` for ${chainLabel}` : '';
		console.log('networkInfo:', networkInfo);
		super(
			`Authentication required${networkInfo}`,
			'AUTH_REQUIRED',
			401,
			`Authentication is required${networkInfo}.`,
			'Please sign in to access this feature.',
			{ chainId, chainLabel }
		);
	}
}

export class UnauthorizedError extends WalnutError {
	constructor(resource?: string) {
		const resourceInfo = resource ? ` to ${resource}` : '';

		super(
			`Unauthorized access${resourceInfo}`,
			'UNAUTHORIZED',
			403,
			`You don't have permission to access this resource${resourceInfo}.`,
			'Please contact us if you believe you should have access to this resource.',
			{ resource }
		);
	}
}

export class InvalidRequestBodyError extends WalnutError {
	constructor(details?: string) {
		super(
			'Invalid request body',
			'INVALID_REQUEST_BODY',
			400,
			'The request body is invalid.',
			details || 'Please check the request format and ensure all required fields are present.',
			{}
		);
	}
}

export class InvalidParameterError extends WalnutError {
	constructor(paramName: string, expectedFormat?: string) {
		super(
			`Invalid parameter: ${paramName}`,
			'INVALID_PARAMETER',
			400,
			`The parameter "${paramName}" is invalid.`,
			expectedFormat || `Please provide a valid value for ${paramName}.`,
			{ paramName, expectedFormat }
		);
	}
}

// ============================================================================
// Error Detection Utilities
// ============================================================================

/**
 * Detects if an error is a soldb ENOENT error (executable not found)
 */
export function isSoldbNotInstalledError(error: any): boolean {
	if (!error) return false;
	const message = error.message || String(error);
	const code = error.code;

	return (
		code === 'ENOENT' ||
		message.includes('spawn soldb ENOENT') ||
		message.includes('soldb: command not found') ||
		message.includes('cannot find soldb')
	);
}

/**
 * Detects if an error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
	if (!error) return false;
	const message = error.message || String(error);
	const stdout = error.stdout || '';

	return message.includes('timeout') || message.includes('ETIMEDOUT') || stdout.includes('timeout');
}

/**
 * Detects if an error is a connection error
 */
export function isConnectionError(error: any): boolean {
	if (!error) return false;
	const message = error.message || String(error);
	const stdout = error.stdout || '';

	return (
		message.includes('ECONNREFUSED') ||
		message.includes('ENOTFOUND') ||
		message.includes('connect ETIMEDOUT') ||
		message.includes('Failed to connect') ||
		message.toLowerCase().includes('connection') ||
		stdout.includes('connect')
	);
}

/**
 * Detects if an error is a transaction not found error
 */
export function isTransactionNotFoundError(error: any): boolean {
	if (!error) return false;
	const message = error.message || String(error);

	return (
		message.includes('transaction not found') ||
		message.includes('Transaction not found') ||
		message.includes('TransactionNotFoundError') ||
		message.includes('could not be found')
	);
}

/**
 * Detects if an error is a debug capability not supported error
 */
export function isDebugNotSupportedError(error: any): boolean {
	if (!error) return false;
	const message = error.message || String(error);

	return (
		message.includes('debug_traceTransaction') ||
		message.includes('debug_traceCall') ||
		(message.includes('debug') && message.includes('not supported')) ||
		message.includes('method not found')
	);
}

/**
 * Detects if an error is related to missing chain_id
 */
export function isChainIdRequiredError(error: any): boolean {
	if (!error) return false;
	const message = error.message || String(error);

	return message.includes('chain_id is required') || message.includes('chainId is required');
}

/**
 * Detects if an error is about invalid or missing calldata
 */
export function isCalldataError(error: any): boolean {
	if (!error) return false;
	const message = error.message || String(error);

	return (
		message.toLowerCase().includes('calldata') &&
		(message.includes('invalid') || message.includes('missing') || message.includes('required'))
	);
}

/**
 * Detects if an error is a Sourcify ABI loader error
 */
export function isSourcifyError(error: any): boolean {
	if (!error) return false;
	const message = error.message || String(error);

	return (
		message.includes('SourcifyABILoaderError') ||
		message.includes('SourcifyABILoader') ||
		message.includes('Sourcify')
	);
}

/**
 * Extracts RPC error code and message from error
 * Returns null if not an RPC error
 */
export function extractRpcError(error: any): { code: number; message: string } | null {
	if (!error) return null;

	const rawMessage = error.message || error.stdout || String(error);

	// Try to find JSON-like RPC error in the message
	// Pattern: {'code': -32000, 'message': '...'} or {"code": -32000, "message": "..."}
	const jsonPatterns = [
		/\{['"]?code['"]?:\s*(-?\d+),\s*['"]?message['"]?:\s*['"]([^'"]+)['"]\}/,
		/\{['"]code['"]:\s*(-?\d+),\s*['"]message['"]:\s*['"]([^'"]+)['"]\}/
	];

	for (const pattern of jsonPatterns) {
		const match = rawMessage.match(pattern);
		if (match) {
			return {
				code: parseInt(match[1], 10),
				message: match[2]
			};
		}
	}

	// Try to parse as JSON object
	try {
		// Sometimes the error message itself is a JSON string
		const parsed = JSON.parse(rawMessage);
		if (parsed.code !== undefined && parsed.message) {
			return { code: parsed.code, message: parsed.message };
		}
		if (parsed.error?.code !== undefined && parsed.error?.message) {
			return { code: parsed.error.code, message: parsed.error.message };
		}
	} catch {
		// Not JSON
	}

	return null;
}

/**
 * Detects if an error is an insufficient funds error
 */
export function isInsufficientFundsError(error: any): boolean {
	if (!error) return false;
	const message = (error.message || error.stdout || String(error)).toLowerCase();

	return (
		message.includes('insufficient funds') ||
		message.includes('insufficient balance') ||
		(message.includes('have') && message.includes('want') && message.includes('address'))
	);
}

/**
 * Extracts insufficient funds details from error message
 */
export function extractInsufficientFundsDetails(error: any): {
	address?: string;
	available?: string;
	required?: string;
} | null {
	if (!error) return null;
	const message = error.message || error.stdout || String(error);

	// Pattern: "address 0x... have 123 want 456"
	const addressMatch = message.match(/address\s+(0x[a-fA-F0-9]+)/i);
	const haveMatch = message.match(/have\s+(\d+)/i);
	const wantMatch = message.match(/want\s+(\d+)/i);

	if (addressMatch || haveMatch || wantMatch) {
		return {
			address: addressMatch?.[1],
			available: haveMatch?.[1],
			required: wantMatch?.[1]
		};
	}

	return null;
}

/**
 * Detects if an error is an execution reverted error
 */
export function isExecutionRevertedError(error: any): boolean {
	if (!error) return false;
	const message = (error.message || error.stdout || String(error)).toLowerCase();

	return (
		message.includes('execution reverted') ||
		message.includes('revert') ||
		message.includes('vm exception') ||
		message.includes('evmrevert')
	);
}

/**
 * Extracts revert reason from error message
 */
export function extractRevertReason(error: any): string | null {
	if (!error) return null;
	const message = error.message || error.stdout || String(error);

	// Pattern: "execution reverted: <reason>"
	const match = message.match(/(?:execution reverted|revert)(?:ed)?[:\s]+(.+?)(?:\s*$|\s*\{)/i);
	return match?.[1]?.trim() || null;
}

/**
 * Detects if an error is a nonce error
 */
export function isNonceError(error: any): boolean {
	if (!error) return false;
	const message = (error.message || error.stdout || String(error)).toLowerCase();

	return (
		message.includes('nonce too low') ||
		message.includes('nonce is too low') ||
		message.includes('nonce too high') ||
		message.includes('invalid nonce')
	);
}

/**
 * Detects if an error is a gas-related error
 */
export function isGasError(error: any): boolean {
	if (!error) return false;
	const message = (error.message || error.stdout || String(error)).toLowerCase();

	return (
		(message.includes('gas') &&
			(message.includes('low') ||
				message.includes('limit') ||
				message.includes('exceeded') ||
				message.includes('required'))) ||
		message.includes('out of gas') ||
		message.includes('intrinsic gas too low')
	);
}

// ============================================================================
// Error Wrapping and Conversion Utilities
// ============================================================================

/**
 * Wraps a generic error into an appropriate WalnutError based on its characteristics
 */
export function wrapError(
	error: any,
	chainId?: string | number,
	session?: AuthType['session'] | null
): WalnutError {
	if (error instanceof WalnutError) {
		return error;
	}

	// Detect specific error types and wrap accordingly
	if (isSoldbNotInstalledError(error)) {
		return new SoldbNotInstalledError(chainId, session);
	}

	if (isTimeoutError(error)) {
		return new SoldbTimeoutError(chainId, session);
	}

	if (isConnectionError(error)) {
		return new RpcConnectionError(chainId, error, session);
	}

	if (isTransactionNotFoundError(error)) {
		const txHash = extractTransactionHash(error);
		return new TransactionNotFoundError(txHash || 'unknown', chainId, session);
	}

	if (isDebugNotSupportedError(error)) {
		const method = extractDebugMethod(error);
		return new DebugCapabilityNotSupportedError(chainId, method || undefined, session);
	}

	if (isChainIdRequiredError(error)) {
		return new ChainIdRequiredError();
	}

	if (isCalldataError(error)) {
		if (error.message?.includes('missing') || error.message?.includes('required')) {
			return new CalldataMissingError();
		}
		return new CalldataInvalidError(error.message);
	}

	if (isSourcifyError(error)) {
		return new SourceCodeNotFoundError('unknown', chainId, session);
	}

	// Check for specific RPC/execution errors with appropriate status codes
	if (isInsufficientFundsError(error)) {
		const details = extractInsufficientFundsDetails(error);
		return new InsufficientFundsError(
			details?.address || 'unknown',
			details?.available || 'unknown',
			details?.required || 'unknown',
			chainId,
			session
		);
	}

	if (isExecutionRevertedError(error)) {
		const reason = extractRevertReason(error);
		return new ExecutionRevertedError(reason || undefined, chainId, session);
	}

	if (isNonceError(error)) {
		return new NonceTooLowError('unknown', undefined, undefined, chainId, session);
	}

	if (isGasError(error)) {
		const message = error.message || error.stdout || String(error);
		return new GasEstimationError(message, chainId, session);
	}

	// Check for generic RPC error with code
	const rpcError = extractRpcError(error);
	if (rpcError) {
		return new RpcError(rpcError.code, rpcError.message, chainId, session);
	}

	// Generic soldb execution error - determine status code from message
	if (error.message?.includes('soldb') || error.stdout) {
		const message = error.stdout?.trim() || error.message;
		const statusCode = determineStatusCodeFromMessage(message);
		return new SoldbExecutionError(
			message,
			chainId,
			undefined,
			session,
			undefined,
			undefined,
			statusCode
		);
	}

	// Fallback: return a generic WalnutError
	return new WalnutError(
		error.message || String(error),
		'UNKNOWN_ERROR',
		500,
		'An unexpected error occurred.',
		error.message || String(error),
		{ chainId, originalError: error }
	);
}

/**
 * Determines appropriate HTTP status code based on error message content
 */
function determineStatusCodeFromMessage(message: string): number {
	const lowerMessage = message.toLowerCase();

	// Client errors (4xx)
	if (lowerMessage.includes('insufficient funds')) return 400;
	if (lowerMessage.includes('nonce')) return 400;
	if (lowerMessage.includes('revert')) return 400;
	if (lowerMessage.includes('invalid')) return 400;
	if (lowerMessage.includes('not found')) return 404;
	if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) return 403;
	if (lowerMessage.includes('rate limit')) return 429;

	// Server errors (5xx)
	if (lowerMessage.includes('timeout')) return 504;
	if (lowerMessage.includes('unavailable')) return 503;

	// Default to 500 for unknown errors
	return 500;
}

/**
 * Extracts transaction hash from error message if present
 */
function extractTransactionHash(error: any): string | null {
	const message = error.message || String(error);
	// Look for hex strings that look like transaction hashes (0x followed by 64 hex chars)
	const match = message.match(/0x[a-fA-F0-9]{64}/);
	return match ? match[0] : null;
}

/**
 * Extracts debug method name from error message if present
 */
function extractDebugMethod(error: any): string | null {
	const message = error.message || String(error);
	if (message.includes('debug_traceTransaction')) return 'debug_traceTransaction';
	if (message.includes('debug_traceCall')) return 'debug_traceCall';
	return null;
}

/**
 * Extracts network label from RPC URL if possible
 */
function extractNetworkLabelFromUrl(url: string): string {
	// Check for common RPC providers and networks
	if (url.includes('optimism') || url.includes('op-')) {
		if (url.includes('sepolia')) return CHAINS_META[ChainId.OP_SEPOLIA].displayName;
		if (url.includes('mainnet')) return CHAINS_META[ChainId.OP_MAIN].displayName;
	}

	// If we can't identify, return generic label
	return 'Unknown Network';
}

/**
 * Sanitizes sensitive information from error messages (RPC URLs, API keys)
 * Replaces URLs with network labels or tenant display names
 */
export function sanitizeErrorMessage(message: string): string {
	// Replace URLs with network labels
	message = message.replace(/https?:\/\/[^\s]+/g, (url) => {
		return extractNetworkLabelFromUrl(url);
	});

	// Clean up multiple spaces and trim
	message = message.replace(/\s+/g, ' ').trim();

	return message;
}

/**
 * Converts a WalnutError to a JSON response object
 */
export function errorToResponse(error: WalnutError) {
	return {
		statusCode: error.statusCode,
		body: error.toJSON()
	};
}
