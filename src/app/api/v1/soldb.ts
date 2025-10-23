import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';
import {
	type RawWalnutTraceCall,
	type WalnutTraceCall,
	type RawDebugCallResponse,
	type DebugCallResponse
} from '@/app/api/v1/types';
import { type Hash, type Hex, type Address } from 'viem';

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
	cwd
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
		throw new Error('Failed to fetch debugger call trace');
	}
};

export default soldb;
