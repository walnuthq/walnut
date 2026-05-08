import { type Abi, type Address, type Hex, getAddress } from 'viem';
import { type TraceType } from '@tevm/actions';

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

export type SoldbJsonStatus = 'success' | 'reverted' | 'SUCCESS' | 'REVERTED' | string;

export type SoldbTraceCapabilities = {
	opcode_steps?: boolean;
	stack?: boolean;
	memory?: boolean;
	storage?: boolean;
	storage_diff?: boolean;
	call_trace?: boolean;
	contract_creation?: boolean;
	logs?: boolean;
	revert_data?: boolean;
	gas_details?: boolean;
	account_changes?: boolean;
	notes?: string[];
	[key: string]: unknown;
};

export type SoldbTraceArtifacts = {
	calls?: unknown[];
	creations?: unknown[];
	logs?: unknown[];
	account_changes?: unknown[];
	gas?: unknown;
	revert_data?: string | null;
	[key: string]: unknown;
};

export type RawWalnutTraceCall = Omit<
	TraceCall,
	'type' | 'value' | 'gas' | 'gasUsed' | 'logs' | 'calls'
> & {
	type: WalnutTraceType;
	callId?: number;
	parentCallId?: number | null;
	childrenCallIds?: number[];
	functionName?: string;
	value?: Hex | number | bigint;
	gas: Hex | number | bigint;
	gasUsed: Hex | number | bigint;
	logs?: RawTraceLog[];
	calls?: RawWalnutTraceCall[];
	inputs?: Record<string, unknown>;
	outputs?: Record<string, unknown>;
	isRevertedFrame?: boolean;
};

export type WalnutTraceCall = Omit<
	RawWalnutTraceCall,
	'output' | 'logs' | 'calls' | 'callId' | 'parentCallId' | 'childrenCallIds'
> & {
	type: WalnutTraceType;
	output: Hex;
	callId: number;
	parentCallId: number | null;
	childrenCallIds: number[];
	isRevertedFrame?: boolean;
	logs: TraceLog[];
	calls: WalnutTraceCall[];
};

export type Step = {
	step?: number;
	pc: number;
	traceCallIndex: number;
	op?: string;
	gas?: number;
	gasCost?: number;
	depth?: number;
	stack?: string[];
	snapshot?: unknown;
};

export type DebugCallContract = {
	pcToSourceMappings: Record<number, string>;
	sources: Record<number, string>;
	abi?: Abi;
};

export type RawDebugCallResponse = {
	schemaVersion?: number;
	status: SoldbJsonStatus;
	error?: string | null;
	backend?: string;
	capabilities?: SoldbTraceCapabilities;
	artifacts?: SoldbTraceArtifacts;
	traceCall: RawWalnutTraceCall;
	steps?: Step[];
	contracts?: Record<Address, DebugCallContract>;
};

export type DebugCallResponse = Omit<RawDebugCallResponse, 'traceCall' | 'steps' | 'status' | 'contracts'> & {
	status: 'success' | 'reverted';
	traceCall: WalnutTraceCall;
	steps: Step[];
	contracts: Record<Address, DebugCallContract>;
};
