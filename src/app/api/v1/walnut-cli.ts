import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';
import {
	type RawWalnutTraceCall,
	type WalnutTraceCall,
	type RawDebugCallResponse,
	type DebugCallResponse,
	type TraceCall
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

export const flattenTraceCall = (traceCall: WalnutTraceCall) => {
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
	output: rawWalnutTraceCall.output ?? '0x',
	logs: rawWalnutTraceCall.logs ?? [],
	calls: rawWalnutTraceCall.calls?.map(rawWalnutTraceCallToWalnutTraceCall) ?? []
});

const rawDebugCallResponseToDebugCallResponse = (
	rawDebugCallResponse: RawDebugCallResponse
): DebugCallResponse => ({
	...rawDebugCallResponse,
	traceCall: rawWalnutTraceCallToWalnutTraceCall(rawDebugCallResponse.traceCall)
});

const walnutCli = async ({
	command,
	txHash,
	to,
	calldata,
	from,
	rpcUrl,
	cwd = process.env.PWD
}: {
	command: 'trace' | 'simulate';
	txHash?: Hash;
	to?: Address;
	calldata?: Hex;
	from?: Address;
	rpcUrl: string;
	cwd?: string;
}): Promise<DebugCallResponse> => {
	const args =
		command === 'trace' ? ['trace', txHash!] : ['simulate', to!, calldata!, '--from', from!];
	const { stdout } = await execFile(
		'walnut-cli',
		[...args, '--ethdebug-dir', `${cwd}/debug`, '--rpc', rpcUrl, '--json'],
		{ cwd }
	);
	const rawDebugCallResponse = JSON.parse(stdout) as RawDebugCallResponse;
	return rawDebugCallResponseToDebugCallResponse(rawDebugCallResponse);
};

export default walnutCli;
