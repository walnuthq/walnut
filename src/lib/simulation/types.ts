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
	name?: string | null;
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

export interface ContractCall {
	callId: number;
	parentCallId: number;
	childrenCallIds: number[];
	functionCallId?: number | null;
	eventCallIds: number[];

	entryPoint: EntryPoint;
	result: CallResult;

	contractName?: string | null;
	entryPointName?: string | null;
	entryPointSelector?: string | null;
	entryPointInterfaceName?: string | null;
	isErc20Token: boolean;
	erc20TokenName?: string | null;
	erc20TokenSymbol?: string | null;
	errorMessage?: string | null;
	callDebuggerData?: CallDebuggerData | null;
	classHash: string;
	isDeepestPanicResult: boolean;

	resultTypes?: string[] | null;
	argumentsNames?: string[] | null;
	argumentsTypes?: string[] | null;
	calldataDecoded?: DataDecoded | null;
	decodedResult?: DataDecoded | null;

	nestingLevel: number;
	codeLocation?: CodeLocation | null;
	callDebuggerDataAvailable: boolean;
	debuggerTraceStepIndex: number | null;
	compilationError?: string | null;

	isHidden: boolean;
}

export interface FunctionCall {
	resultsDecoded: DecodedItem[];
	argumentsDecoded: DecodedItem[];
	callId: number;
	parentCallId: number;
	childrenCallIds: number[];
	eventCallIds: number[];
	contractCallId: number;
	fnName: string;
	fp: number;
	isDeepestPanicResult: boolean;
	errorMessage?: string | null;
	debuggerDataAvailable: boolean;
	debuggerTraceStepIndex: number | null;
	codeLocation?: CodeLocation | null;
	arguments: InternalFnCallIO[];
	results: InternalFnCallIO[];
	isHidden: boolean;
}

export interface EventCall {
	callId: number;
	contractCallId: number;
	functionCallId: number;
	name: string;
	selector: string;
	members: EventField[];
	datas?: DataDecoded | null;
	isHidden: boolean;
}

export interface ContractCallEvent {
	contractCallId: number;
	contractAddress: string;
	contractName: string;
	functionCallId: number;
	name: string;
	selector: string;
	datas?: DataDecoded | null;
}
export interface EventField {
	name: string;
	type: string;
}
export interface Parameter {
	name: string;
	typeName: string;
}

export interface CompilationStatus {
	address: `0x${string}`;
	status: 'pending' | 'success' | 'failed';
	error?: string;
	verificationSource?: 'sourcify' | 'blockscout';
}

export interface CompilationSummary {
	totalContracts: number;
	successfulCompilations: number;
	failedCompilations: number;
	compilationErrors: string[];
	contractStatuses: CompilationStatus[];
}

export interface SimulationResult {
	contractCallsMap: { [key: string]: ContractCall };
	functionCallsMap: { [key: string]: FunctionCall };
	eventCallsMap: { [key: string]: EventCall };
	events: ContractCallEvent[];
	executionResult: ExecutionResultSucceeded | ExecutionResultReverted;
	simulationDebuggerData: SimulationDebuggerData;
	storageChanges: { [key: string]: { [key: string]: string[] } }; // { contractCallId: { storageAddress: [before, after] } }
	estimatedFee?: string;
	compilationSummary?: CompilationSummary;
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
	internalIODecoded?: DataDecoded | null;
}
export type FlameNode = {
	callId: number;
	name: string;
	value: number;
	rawValue: number;
	children?: FlameNode[];
};

export interface L1TransactionData {
	chainId?: string;
	blockNumber?: number;
	senderAddress: string;
	receiverAddress?: string;
	transactionType?: string;
	status?: string;
	messageHashes: string[];
	l1TxHash?: string;
}

export interface L2TransactionData {
	simulationResult: SimulationResult;
	chainId?: string;
	blockNumber: number;
	blockTimestamp: number;
	nonce: number;
	senderAddress: string;
	calldata: string[];
	transactionVersion: number;
	transactionType: string;
	transactionIndexInBlock?: number;
	totalTransactionsInBlock?: number;
	l1TxHash?: string;
	l2TxHash?: string;
	flamechart?: FlameNode;
	l1DataFlamechart?: FlameNode;
	actualFee?: string;
	executionResources?: {
		l1Gas: number;
		l1DataGas: number;
		l2Gas: number;
	};
}

export interface TransactionSimulationResult {
	l1TransactionData?: L1TransactionData;
	l2TransactionData?: L2TransactionData;
}

export interface SimulationPayloadWithCalldata {
	senderAddress: string;
	calldata: string[];
	blockNumber?: number;
	transactionVersion: number;
	nonce?: number;
	// Either chainId or rpcUrl should be provided
	chainId?: string;
	rpcUrl?: string;
}
