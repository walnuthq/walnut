import { ContractCall, FunctionCall } from '../simulation';

export type CallResult =
	| {
			Success: {
				retData: {
					value: {
						val: number[];
					};
				}[];
			};
	  }
	| {
			Failure: {
				Panic: {
					panicData: {
						value: {
							val: number[];
						};
					}[];
				};
			};
	  };

export enum EntryPointType {
	EXTERNAL = 'EXTERNAL',
	INTERNAL = 'INTERNAL'
}

export enum CallType {
	CALL = 'Call',
	DELEGATE = 'Delegate'
}

export enum DataType {
	CALLDATA = 'CALLDATA',
	OUTPUT = 'OUTPUT',
	DATA = 'DATA'
}

export interface EntryPoint {
	classHash: string;
	codeAddress: string;
	entryPointType: EntryPointType;
	entryPointSelector: string;
	calldata: string[];
	storageAddress: string;
	callerAddress: string;
	callType: CallType;
	initialGas: number;
}

export interface DecodedItem {
	typeName: string;
	name: string | null;
	value: string | DecodedItem[] | string[];
}

export type DataDecoded = DecodedItem[];

export interface DebuggerExecutionTraceEntryWithContractCall {
	contractCallId: number;
	reason: string;
}

export interface DebuggerExecutionTraceEntryWithLocation {
	pcIndex: number;
	locationIndex: number;
	results: InternalFnCallIO[];
	arguments: InternalFnCallIO[];
	argumentsDecoded: InternalFnCallIO[];
	resultsDecoded: InternalFnCallIO[];
	contractCallId: number;
	fp: number;
	functionCallId: number;
}

export type DebuggerExecutionTraceEntry =
	| { withContractCall: DebuggerExecutionTraceEntryWithContractCall; withLocation?: undefined }
	| { withLocation: DebuggerExecutionTraceEntryWithLocation; withContractCall?: undefined };

export interface CallDebuggerData {
	executionTrace: DebuggerExecutionTraceEntry[];
}

export interface ExecutionResultSucceeded {
	executionStatus: 'SUCCEEDED';
}

export interface ExecutionResultReverted {
	executionStatus: 'REVERTED';
	revertReason: string;
}

export interface ContractDebuggerData {
	pcToCodeInfo: {
		[key: number]: {
			codeLocations: CodeLocation[];
		};
	};
	sourceCode: {
		[key: string]: string;
	};
}

export interface SimulationDebuggerData {
	contractDebuggerData: {
		[key: string]: ContractDebuggerData;
	};
	debuggerTrace: DebuggerExecutionTraceEntry[];
}
export interface DebuggerInfo {
	contractCallsMap: { [key: string]: ContractCall };
	functionCallsMap: { [key: string]: FunctionCall };
	simulationDebuggerData: SimulationDebuggerData;
}

export interface TextPosition {
	line: number;
	col: number;
}

export interface CodeLocation {
	start: TextPosition;
	end: TextPosition;
	filePath: string;
}

export interface InternalFnCallIO {
	typeName: string | null;
	value: string[];
	internalIODecoded: DataDecoded | null;
}

export interface DebuggerPayload {
	chainId?: string | null;
	blockNumber?: number | null;
	blockTimestamp: number;
	nonce: number;
	senderAddress: string;
	calldata: string[];
	transactionVersion: number;
	transactionType: string;
	transactionIndexInBlock?: number | null;
	totalTransactionsInBlock?: number | null;
	l1TxHash?: string | null;
	l2TxHash?: string | null;
}
