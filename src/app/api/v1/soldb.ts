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
	session
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
}): Promise<DebugCallResponse> => {
	const args =
		command === 'trace'
			? ['trace', txHash!]
			: ['simulate', to!, '--raw-data', calldata!, '--from', from!];
	if (command === 'simulate' && blockNumber) {
		args.push('--block', blockNumber.toString());
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
		if (err.stdout) {
			errorMessage = err.stdout.trim();
		} else if (err.message) {
			errorMessage = err.message;
		} else {
			errorMessage = 'Unknown error occurred';
		}

		// Try to parse JSON response and extract relevant fields
		try {
			const jsonResponse = JSON.parse(errorMessage);
			if (jsonResponse.soldbFailed || jsonResponse.error?.message) {
				const parts = [];
				if (jsonResponse.soldbFailed) {
					parts.push(jsonResponse.soldbFailed);
				}
				if (jsonResponse.error?.message) {
					parts.push(jsonResponse.error.message);
				}
				errorMessage = parts.join(' - ');
			}
		} catch {
			// If not JSON, use the original message
		}

		// Throw a structured SoldbExecutionError
		throw new SoldbExecutionError(errorMessage, chainId, undefined, session);
	}
};

export default soldb;
