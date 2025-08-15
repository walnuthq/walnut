import { type Abi, type Address, type Hex, getAddress } from 'viem';
import { type TraceType } from 'tevm/actions';
import { whatsabi } from '@shazow/whatsabi';

export type Contract = {
	address: Address;
	bytecode: Hex;
	name: string;
	sources: { path: string; content: string }[];
	abi: Abi;
	verified: boolean;
	verificationSource?: 'sourcify' | 'blockscout';
	compilationStatus?: 'pending' | 'success' | 'failed';
	compilationError?: string;
};

export type RawTraceLog = {
	address: Address;
	topics: [Hex, ...Hex[]] | [];
	data: Hex;
	position: Hex;
};

export type RawTraceCall = {
	type: TraceType;
	from: Address;
	to: Address;
	value?: Hex;
	gas: Hex;
	gasUsed: Hex;
	input: Hex;
	output?: Hex;
	error?: string;
	revertReason?: string;
	isRevertedFrame?: boolean;
	logs?: RawTraceLog[];
	calls?: RawTraceCall[];
};

export type TraceLog = Omit<RawTraceLog, 'position'> & {
	position: number;
};

export type TraceCall = Omit<RawTraceCall, 'value' | 'gas' | 'gasUsed' | 'logs' | 'calls'> & {
	value?: bigint;
	gas: bigint;
	gasUsed: bigint;
	isRevertedFrame?: boolean;
	logs?: TraceLog[];
	calls?: TraceCall[];
};

export const rawTraceLogToTraceLog = (traceLog: RawTraceLog): TraceLog => ({
	...traceLog,
	address: getAddress(traceLog.address),
	position: Number(traceLog.position)
});

export const rawTraceCallToTraceCall = (traceCall: RawTraceCall): TraceCall => ({
	...traceCall,
	from: getAddress(traceCall.from),
	to: getAddress(traceCall.to),
	value: traceCall.value ? BigInt(traceCall.value) : undefined,
	gas: BigInt(traceCall.gas),
	gasUsed: BigInt(traceCall.gasUsed),
	logs: traceCall.logs?.map(rawTraceLogToTraceLog),
	calls: traceCall.calls?.map(rawTraceCallToTraceCall)
});

export type WalnutTraceType = TraceType | 'INTERNALCALL';

export type RawWalnutTraceCall = Omit<TraceCall, 'type'> & {
	type: WalnutTraceType;
};

export type WalnutTraceCall = Omit<RawWalnutTraceCall, 'output' | 'logs' | 'calls'> & {
	type: WalnutTraceType;
	output: Hex;
	isRevertedFrame?: boolean;
	logs: TraceLog[];
	calls: WalnutTraceCall[];
};

export type Step = {
	pc: number;
	traceCallIndex: number;
};

export type DebugCallContract = {
	pcToSourceMappings: Record<number, string>;
	sources: Record<number, string>;
	abi: Abi;
};

export type RawDebugCallResponse = {
	status: string;
	error: string;
	traceCall: RawWalnutTraceCall;
	steps: Step[];
	contracts: Record<Address, DebugCallContract>;
};

export type DebugCallResponse = Omit<RawDebugCallResponse, 'traceCall'> & {
	traceCall: WalnutTraceCall;
};
