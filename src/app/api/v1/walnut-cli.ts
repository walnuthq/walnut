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
	// FIXME walnut-cli returns output as a string without 0x prefix
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

const walnutCli = async ({
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

	const { stdout } = await execFile(
		'walnut-cli',
		[
			...args,
			...(ethdebugDirs?.flatMap((dir) => ['--ethdebug-dir', dir]) ?? []),
			'--rpc',
			rpcUrl,
			'--json'
		],
		{ cwd }
	);
	const rawDebugCallResponse = JSON.parse(stdout) as RawDebugCallResponse;
	return rawDebugCallResponseToDebugCallResponse(rawDebugCallResponse);
};

export default walnutCli;
