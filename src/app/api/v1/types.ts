import { type Abi, type Address, type Hex, getAddress } from 'viem';
import { type TraceType as RawTraceType } from 'tevm/actions';
import { whatsabi } from '@shazow/whatsabi';

export type Contract = {
	address: Address;
	bytecode: Hex;
	name: string;
	sources: whatsabi.loaders.ContractSources;
	abi: Abi;
};

export type RawTraceLog = {
	address: Address;
	topics: [Hex, ...Hex[]] | [];
	data: Hex;
	position: Hex;
};

export type RawTraceCall = {
	type: RawTraceType;
	from?: Address;
	to?: Address;
	value?: Hex;
	gas: Hex;
	gasUsed: Hex;
	input: Hex;
	output?: Hex;
	error?: string;
	logs?: RawTraceLog[];
	calls?: RawTraceCall[];
};

export type TraceType = RawTraceType | 'INTERNALCALL';

export type TraceLog = Omit<RawTraceLog, 'position'> & {
	position: number;
};

export type TraceCall = Omit<
	RawTraceCall,
	'type' | 'value' | 'gas' | 'gasUsed' | 'logs' | 'calls'
> & {
	type: TraceType;
	value?: bigint;
	gas: number; //bigint;
	gasUsed: number; //bigint;
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
	from: traceCall.from ? getAddress(traceCall.from) : undefined,
	to: traceCall.to ? getAddress(traceCall.to) : undefined,
	value: traceCall.value ? BigInt(traceCall.value) : undefined,
	gas: Number(traceCall.gas), //BigInt(traceCall.gas),
	gasUsed: Number(traceCall.gasUsed), //BigInt(traceCall.gasUsed),
	logs: traceCall.logs?.map(rawTraceLogToTraceLog),
	calls: traceCall.calls?.map(rawTraceCallToTraceCall)
});

export type TraceCallResponse = {
	traceCall: TraceCall;
	abis: Record<Address, Abi>;
};

type Step = {
	pc: number;
	traceCallIndex: number;
};

type DebugCallContract = {
	pcToSourceMappings: Record<number, string>;
	sources: Record<number, string>;
	abi: Abi;
};

export type DebugCallResponse = {
	traceCall: TraceCall;
	steps: Step[];
	contracts: Record<Address, DebugCallContract>;
};
