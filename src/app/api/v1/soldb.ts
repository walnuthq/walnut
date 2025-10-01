import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';
import {
	type RawWalnutTraceCall,
	type WalnutTraceCall,
	type RawDebugCallResponse,
	type DebugCallResponse
} from '@/app/api/v1/types';
import { type Hash, type Hex, type Address } from 'viem';
import { sanitizeError } from '@/lib/utils/error-sanitization';
import { getLabelForChainIdNumber } from '@/lib/networks';

const execFile = promisify(execFileCb);

/**
 * Checks if an error is a timeout error from soldb
 * @param error - The error to check
 * @returns True if the error is a timeout error
 */
const isTimeoutError = (error: any): boolean => {
	if (!error) return false;

	const message = error.message || String(error);
	const stdout = error.stdout || '';

	// Check for timeout indicators in the error message or stdout
	return message.includes('timeout') || stdout.includes('timeout');
};

const isConnectionError = (error: any): boolean => {
	if (!error) return false;

	const message = error.message || String(error);
	const stdout = error.stdout || '';

	// Check for connection error indicators
	return message.includes('connect') || stdout.includes('connect');
};

const flattenTraceCalls = (traceCalls: WalnutTraceCall[], parent: WalnutTraceCall) =>
	traceCalls.reduce<WalnutTraceCall[]>((accumulator, currentValue) => {
		const traceCall = {
			...currentValue,
			from: currentValue.type === 'INTERNALCALL' ? parent.from : currentValue.from,
			to: currentValue.type === 'INTERNALCALL' ? parent.to : currentValue.to
		};
		accumulator.push(traceCall);
		if (currentValue.calls) {
			accumulator.push(...flattenTraceCalls(currentValue.calls, traceCall));
		}
		return accumulator;
	}, []);

const flattenTraceCall = (traceCall: WalnutTraceCall) => {
	const result = [];
	result.push(traceCall);
	if (traceCall.calls) {
		result.push(...flattenTraceCalls(traceCall.calls, traceCall));
	}
	return result;
};

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

type TraceCallWithIndex = Omit<WalnutTraceCall, 'calls'> & {
	index: number;
	calls: TraceCallWithIndex[];
};

const innerTraceCallWithIndexes = (
	traceCall: WalnutTraceCall,
	index: number
): TraceCallWithIndex => ({
	...traceCall,
	index,
	calls: traceCall.calls?.map((traceCall) => innerTraceCallWithIndexes(traceCall, index + 1)) ?? []
});

export const traceCallWithIndexes = (traceCall: WalnutTraceCall): TraceCallWithIndex => ({
	...traceCall,
	index: 0,
	calls: traceCall.calls?.map((traceCall) => innerTraceCallWithIndexes(traceCall, 1)) ?? []
});

type TraceCallWithIds = TraceCallWithIndex & {
	id: number;
	parentId: number;
	parentContractCallId: number;
};

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
	chainId
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
		console.error('soldb error:', err);

		// Check if this is a timeout error
		if (isTimeoutError(err)) {
			const chainLabel = chainId ? ` on ${getLabelForChainIdNumber(chainId)}` : '';
			throw new Error(`Failed with execution timeout${chainLabel}.`);
		}

		// Check if this is a connection error
		if (isConnectionError(err)) {
			const chainLabel = chainId ? getLabelForChainIdNumber(chainId) : 'network';
			throw new Error(`Failed to connect to${chainLabel}`);
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

		const chainLabel = chainId ? ` on ${getLabelForChainIdNumber(chainId)}` : '';
		throw new Error(`${errorMessage}${chainLabel}`);
	}
};

export default soldb;
