import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';
import {
	type RawWalnutTraceCall,
	type WalnutTraceCall,
	type RawDebugCallResponse,
	type DebugCallResponse
} from '@/app/api/v1/types';
import { type Hash, type Hex, type Address } from 'viem';
import {
	wrapError,
	isSoldbNotInstalledError,
	isTimeoutError,
	isConnectionError,
	SoldbTimeoutError,
	RpcConnectionError,
	SoldbExecutionError,
	sanitizeErrorMessage
} from '@/lib/errors';
import type { AuthType } from '@/lib/types';

const execFile = promisify(execFileCb);

const rawWalnutTraceCallToWalnutTraceCall = (
	rawWalnutTraceCall: RawWalnutTraceCall
): WalnutTraceCall => ({
	...rawWalnutTraceCall,
	// FIXME soldb returns output as a string without 0x prefix
	output: rawWalnutTraceCall.output
		? rawWalnutTraceCall.output.startsWith('0x')
			? rawWalnutTraceCall.output
			: `0x${rawWalnutTraceCall.output}`
		: '0x',
	isRevertedFrame: rawWalnutTraceCall.isRevertedFrame ?? false,
	logs: rawWalnutTraceCall.logs ?? [],
	calls: rawWalnutTraceCall.calls?.map(rawWalnutTraceCallToWalnutTraceCall) ?? []
});

const rawDebugCallResponseToDebugCallResponse = (
	rawDebugCallResponse: RawDebugCallResponse
): DebugCallResponse => ({
	...rawDebugCallResponse,
	traceCall: rawWalnutTraceCallToWalnutTraceCall(rawDebugCallResponse.traceCall)
});

const soldb = async ({
	command,
	txHash,
	to,
	calldata,
	from,
	blockNumber,
	rpcUrl,
	ethdebugDirs,
	cwd,
	chainId,
	session,
	value,
	txIndex
}: {
	command: 'trace' | 'simulate';
	txHash?: Hash;
	to?: Address;
	calldata?: Hex;
	from?: Address;
	blockNumber?: bigint;
	rpcUrl: string;
	ethdebugDirs?: string[];
	cwd?: string;
	chainId?: number;
	session?: AuthType['session'] | null;
	value?: string;
	txIndex?: number;
}): Promise<DebugCallResponse> => {
	const args =
		command === 'trace'
			? ['trace', txHash!]
			: ['simulate', to!, '--raw-data', calldata!, '--from', from!];
	if (command === 'simulate' && blockNumber) {
		args.push('--block', blockNumber.toString());
	}
	if (command === 'simulate' && txIndex !== undefined && txIndex !== null) {
		args.push('--tx-index', txIndex.toString());
	}
	if (command === 'simulate' && value && value.trim() !== '') {
		// Format value: if it's a decimal number (contains dot) and doesn't end with 'ether', add 'ether' suffix
		let formattedValue = value.trim();
		if (
			/^[0-9]*\.[0-9]+$/.test(formattedValue) &&
			!formattedValue.toLowerCase().endsWith('ether')
		) {
			formattedValue = `${formattedValue}ether`;
		}
		args.push('--value', formattedValue);
	}

	const fullCommand = [
		'soldb',
		...args,
		...(ethdebugDirs?.flatMap((dir) => ['--ethdebug-dir', dir]) ?? []),
		'--rpc',
		rpcUrl,
		'--json'
	];

	console.log('Executing soldb command:', fullCommand.join(' '));
	if (cwd) {
		console.log('Working directory:', cwd);
	}

	try {
		const { stdout } = await execFile(
			'soldb',
			[
				...args,
				...(ethdebugDirs?.flatMap((dir) => ['--ethdebug-dir', dir]) ?? []),
				'--rpc',
				rpcUrl,
				'--json'
			],
			{
				cwd,
				maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large traces
			}
		);
		const rawDebugCallResponse = JSON.parse(stdout) as RawDebugCallResponse;
		return rawDebugCallResponseToDebugCallResponse(rawDebugCallResponse);
	} catch (err: any) {
		// Sanitize error message for logging
		const sanitizedMessage = sanitizeErrorMessage(err.message || String(err));
		console.error('soldb error:', sanitizedMessage);

		// Check if soldb is not installed
		if (isSoldbNotInstalledError(err)) {
			throw wrapError(err, chainId, session);
		}

		// Check if this is a timeout error
		if (isTimeoutError(err)) {
			throw new SoldbTimeoutError(chainId, session);
		}

		// Check if this is a connection error
		if (isConnectionError(err)) {
			throw new RpcConnectionError(chainId, err, session);
		}

		// Extract the actual error message from soldb
		let errorMessage = '';
		let errorDetails: string | undefined = undefined;

		if (err.stdout) {
			errorMessage = err.stdout.trim();
		} else if (err.message) {
			errorMessage = err.message;
		} else {
			errorMessage = 'Unknown error occurred';
		}

		// Try to parse JSON response and extract relevant fields from uniform error format
		let errorType: string | undefined = undefined;
		let errorContext: Record<string, any> = {};

		try {
			const jsonResponse = JSON.parse(errorMessage);

			// Check for uniform error format: { soldbFailed, error: { message, type, ... } }
			if (jsonResponse.error && typeof jsonResponse.error === 'object') {
				// Use error.message as the main message (clean original message)
				if (jsonResponse.error.message) {
					errorMessage = jsonResponse.error.message;
				}
				// Extract error type for frontend handling
				if (jsonResponse.error.type) {
					errorType = jsonResponse.error.type;
					errorDetails = `Error type: ${jsonResponse.error.type}`;
				}
				// Extract all additional fields from error object (available_balance, requested_value, etc.)
				Object.keys(jsonResponse.error).forEach((key) => {
					if (key !== 'message' && key !== 'type') {
						errorContext[key] = jsonResponse.error[key];
					}
				});
			} else if (jsonResponse.soldbFailed) {
				// Fallback to soldbFailed if error object doesn't exist
				errorMessage = jsonResponse.soldbFailed;
			}
		} catch {
			// If not JSON, use the original message
		}

		// Throw a structured SoldbExecutionError with error type and context
		throw new SoldbExecutionError(
			errorMessage,
			chainId,
			errorDetails,
			session,
			errorType,
			errorContext
		);
	}
};

export const soldbListEvents = async ({
	txHash,
	rpcUrl,
	ethdebugDirs,
	cwd
}: {
	txHash: string;
	rpcUrl: string;
	ethdebugDirs?: string[];
	cwd?: string;
}): Promise<any> => {
	const args = ['list-events', txHash, '--json-events'];

	if (rpcUrl) {
		args.push('--rpc', rpcUrl);
	}

	if (ethdebugDirs && ethdebugDirs.length > 0) {
		ethdebugDirs.forEach((dir) => {
			args.push('--ethdebug-dir', dir);
		});
	}

	console.log('Executing soldb command:', ['soldb', ...args].join(' '));
	if (cwd) {
		console.log('Working directory:', cwd);
	}

	try {
		const { stdout } = await execFile('soldb', args, {
			cwd: cwd || process.cwd(),
			maxBuffer: 50 * 1024 * 1024 // 50MB buffer
		});
		return JSON.parse(stdout);
	} catch (err: any) {
		const sanitizedMessage = sanitizeErrorMessage(err.message || String(err));
		console.error('soldb list-events error:', sanitizedMessage);

		if (isSoldbNotInstalledError(err)) {
			throw wrapError(err, undefined, null);
		}

		if (isTimeoutError(err)) {
			throw new SoldbTimeoutError(undefined, null);
		}

		if (isConnectionError(err)) {
			throw new RpcConnectionError(undefined, err, null);
		}

		let errorMessage = 'Failed to fetch events';
		let errorDetails: string | undefined = undefined;

		if (err.stdout) {
			errorMessage = err.stdout.trim();
		} else if (err.message) {
			errorMessage = err.message;
		}

		// Try to parse JSON response and extract relevant fields from uniform error format
		let errorType: string | undefined = undefined;
		let errorContext: Record<string, any> = {};

		try {
			const jsonResponse = JSON.parse(errorMessage);

			// Check for uniform error format: { soldbFailed, error: { message, type, ... } }
			if (jsonResponse.error && typeof jsonResponse.error === 'object') {
				// Use error.message as the main message (clean original message)
				if (jsonResponse.error.message) {
					errorMessage = jsonResponse.error.message;
				}
				// Extract error type for frontend handling
				if (jsonResponse.error.type) {
					errorType = jsonResponse.error.type;
					errorDetails = `Error type: ${jsonResponse.error.type}`;
				}
				// Extract all additional fields from error object (available_balance, requested_value, etc.)
				Object.keys(jsonResponse.error).forEach((key) => {
					if (key !== 'message' && key !== 'type') {
						errorContext[key] = jsonResponse.error[key];
					}
				});
			} else if (jsonResponse.soldbFailed) {
				// Fallback to soldbFailed if error object doesn't exist
				errorMessage = jsonResponse.soldbFailed;
			}
		} catch {
			// If not JSON, use the original message
		}

		throw new SoldbExecutionError(
			errorMessage,
			undefined,
			errorDetails,
			null,
			errorType,
			errorContext
		);
	}
};

export default soldb;
