import { type Address, type Hash } from 'viem';
import { type DebugCallContract, type WalnutTraceCall, type Contract } from '@/app/api/v1/types';
import {
	CallType,
	type ContractCall,
	EntryPointType,
	FunctionCall,
	type TransactionSimulationResult,
	type InternalFnCallIO,
	type DataDecoded
} from '@/lib/simulation';
import {
	decodeFunctionDataSafe,
	decodeFunctionResultSafe,
	getAbiFunction,
	formatAbiParameterValue
} from '@/app/api/v1/abi-utils';

// Helper function to parse function names like "ShippingManager::initiateShipping(address,string)"
// and extract just the part between :: and (
function parseFunctionName(functionName: string): string {
	if (!functionName) return functionName;

	// Check if the function name contains ::
	if (functionName.includes('::')) {
		// Extract the part after ::
		const afterDoubleColon = functionName.split('::').pop();
		if (afterDoubleColon) {
			// If there's a parenthesis, extract the part before it
			if (afterDoubleColon.includes('(')) {
				const beforeParenthesis = afterDoubleColon.split('(')[0];
				return beforeParenthesis;
			}
			// If no parenthesis, return the part after ::
			return afterDoubleColon;
		}
	}

	// If it doesn't match the expected format, return the original name
	return functionName;
}

// Helper function to replace null values with "unknown"
function replaceNullWithUnknown(value: any): any {
	if (value === null || value === undefined) {
		return 'unknown';
	}
	return value;
}

// Helper function to process arrays and replace null values
function processArrayReplaceNulls(arr: any[]): any[] {
	return arr.map((item) => replaceNullWithUnknown(item));
}

function decodeCalldata(abiFunction: any, args: any[]) {
	try {
		if (!abiFunction || !abiFunction.inputs || !args) return [];
		const decoded = abiFunction.inputs.map((input: any, index: number) => ({
			name: input.name ?? '',
			typeName: input.internalType ?? input.type,
			value: formatAbiParameterValue(args[index], input)
		}));
		return decoded;
	} catch (err) {
		console.error('Error decoding calldata:', err);
		return [];
	}
}

// Helper function to convert decoded values to InternalFnCallIO format
function convertToInternalFnCallIO(
	values: any[],
	types: string[],
	names: string[]
): InternalFnCallIO[] {
	return values.map((value, index) => ({
		typeName: replaceNullWithUnknown(types[index]),
		value: Array.isArray(value)
			? processArrayReplaceNulls(value).map((v) => String(v))
			: [String(replaceNullWithUnknown(value))],
		internalIODecoded: null
	}));
}

// Helper function to convert decoded values to DataDecoded format
function convertToDataDecoded(values: any[], types: string[], names: string[]): DataDecoded {
	return values.map((value, index) => ({
		typeName: replaceNullWithUnknown(types[index]) || '',
		name: replaceNullWithUnknown(names[index]),
		value: Array.isArray(value)
			? processArrayReplaceNulls(value).map((v) => String(v))
			: String(replaceNullWithUnknown(value))
	}));
}

// Helper function to flatten the trace to a map by callId
function flattenTraceToMap(
	traceCall: any,
	map: Record<number, any> = {},
	parentType: string | null = null
): Record<number, any> {
	// If parent is ENTRY, override type to 'CALL' for child
	let node = { ...traceCall };
	if (parentType === 'ENTRY') {
		node.type = 'CALL';
	}

	// Add all nodes to the map, including ENTRY
	map[node.callId] = node;

	// Process children
	(traceCall.calls || []).forEach((child: any) => flattenTraceToMap(child, map, node.type));

	return map;
}

const traceCallResponseToTransactionSimulationResult = ({
	status,
	error,
	traceCall,
	contracts,
	sourcifyContracts,
	chainId,
	blockNumber,
	timestamp,
	nonce,
	from,
	type,
	transactionIndex,
	transactions,
	txHash
}: {
	status: string;
	error: string;
	traceCall: WalnutTraceCall;
	contracts: Record<Address, DebugCallContract>;
	sourcifyContracts: Contract[];
	chainId: number;
	blockNumber: bigint;
	timestamp: bigint;
	nonce: number;
	from: Address;
	type: string;
	transactionIndex: number;
	transactions: string[];
	txHash?: Hash;
}): TransactionSimulationResult => {
	const contractNames = sourcifyContracts.reduce<Record<Address, string>>(
		(previousValue, currentValue) => ({
			...previousValue,
			[currentValue.address]: currentValue.name
		}),
		{}
	);
	const traceMap = flattenTraceToMap(traceCall);

	// Contract calls
	const contractCallsMap = Object.values(traceMap)
		.filter(
			(tc: any) =>
				tc.type === 'CALL' ||
				tc.type === 'DELEGATECALL' ||
				tc.type === 'ENTRY' ||
				tc.type === 'CREATE'
		)
		.map((tc: any) => {
			// For CREATE transactions, use deployedContractAddress if available, otherwise use 'to'
			const contractAddress =
				tc.type === 'CREATE' && tc.deployedContractAddress ? tc.deployedContractAddress : tc.to;
			const sourcifyContract = sourcifyContracts.find((c) => c.address === contractAddress);
			const inputs = tc.inputs || {};
			const outputs = tc.outputs || {};

			// Process raw data to replace null values with "unknown"
			const processedInputs = {
				...inputs,
				argumentsDecodedValue: processArrayReplaceNulls(inputs.argumentsDecodedValue || []),
				argumentsType: processArrayReplaceNulls(inputs.argumentsType || []),
				argumentsName: processArrayReplaceNulls(inputs.argumentsName || [])
			};

			const processedOutputs = {
				...outputs,
				argumentsDecodedValue: processArrayReplaceNulls(outputs.argumentsDecodedValue || []),
				argumentsType: processArrayReplaceNulls(outputs.argumentsType || []),
				argumentsName: processArrayReplaceNulls(outputs.argumentsName || [])
			};

			const contractCall: ContractCall = {
				callId: tc.callId,
				parentCallId: tc.parentCallId,
				childrenCallIds: tc.childrenCallIds || [],
				functionCallId:
					(tc.calls || []).find((c: any) => c.type === 'INTERNALCALL')?.callId ?? null,
				eventCallIds: [],
				entryPoint: {
					classHash: '',
					codeAddress: contractAddress,
					entryPointType: tc.type === 'ENTRY' ? EntryPointType.EXTERNAL : EntryPointType.EXTERNAL,
					entryPointSelector: tc.input?.slice(0, 10) || '',
					calldata: [tc.input || 'unknown'],
					storageAddress: contractAddress,
					callerAddress: tc.from,
					callType: CallType.CALL,
					initialGas: Number(tc.gas) || 0
				},
				result: {
					Success: {
						retData: (processedOutputs.argumentsDecodedValue || []).map(
							(value: any, index: number) => ({
								value: {
									val: Array.isArray(value) ? value : [value]
								}
							})
						)
					}
				},
				argumentsNames: processedInputs.argumentsName || [],
				argumentsTypes: processedInputs.argumentsType || [],
				calldataDecoded: convertToDataDecoded(
					processedInputs.argumentsDecodedValue || [],
					processedInputs.argumentsType || [],
					processedInputs.argumentsName || []
				),
				resultTypes: processedOutputs.argumentsType || [],
				decodedResult: convertToDataDecoded(
					processedOutputs.argumentsDecodedValue || [],
					processedOutputs.argumentsType || [],
					processedOutputs.argumentsName || []
				),
				contractName: sourcifyContract?.name || contractAddress,
				entryPointName:
					parseFunctionName(tc.functionName) === 'runtime_dispatcher'
						? tc.input?.slice(0, 10) || ''
						: parseFunctionName(tc.functionName),
				isErc20Token: false,
				classHash: '',
				isDeepestPanicResult: tc.isRevertedFrame ?? false,
				errorMessage: tc.isRevertedFrame ? error || 'Transaction reverted' : null,
				nestingLevel: 0,
				callDebuggerDataAvailable: tc.isVerified ?? false,
				debuggerTraceStepIndex: null,
				isHidden: false
			};
			return { [tc.callId]: contractCall };
		})
		.reduce((acc, curr) => ({ ...acc, ...curr }), {});

	const functionCallsMap = Object.values(traceMap)
		.filter((tc: any) => tc.type === 'INTERNALCALL')
		.map((tc: any) => {
			let parent = traceMap[tc.parentCallId];
			while (
				parent &&
				parent.type !== 'CALL' &&
				parent.type !== 'DELEGATECALL' &&
				parent.type !== 'ENTRY' &&
				parent.type !== 'CREATE'
			) {
				parent = traceMap[parent.parentCallId];
			}
			const to = parent?.to;
			const from = parent?.from;
			if (!to || !from) {
				console.error(
					'Parent CALL/ENTRY/CREATE not found or missing to/from for INTERNALCALL:',
					tc,
					parent
				);
				return {};
			}
			const sourcifyContract = sourcifyContracts.find((c) => c.address === to);
			const inputs = tc.inputs || {};
			const outputs = tc.outputs || {};

			// Process raw data to replace null values with "unknown"
			const processedInputs = {
				...inputs,
				argumentsDecodedValue: processArrayReplaceNulls(inputs.argumentsDecodedValue || []),
				argumentsType: processArrayReplaceNulls(inputs.argumentsType || []),
				argumentsName: processArrayReplaceNulls(inputs.argumentsName || [])
			};

			const processedOutputs = {
				...outputs,
				argumentsDecodedValue: processArrayReplaceNulls(outputs.argumentsDecodedValue || []),
				argumentsType: processArrayReplaceNulls(outputs.argumentsType || []),
				argumentsName: processArrayReplaceNulls(outputs.argumentsName || [])
			};

			// childrenCallIds: all INTERNALCALL and CALL nodes where parentCallId == tc.callId
			const childrenCallIds = (tc.childrenCallIds || []).filter((id: number) => {
				const child = traceMap[id];
				return (
					child &&
					(child.type === 'INTERNALCALL' || child.type === 'CALL' || child.type === 'DELEGATECALL')
				);
			});
			const functionCall: FunctionCall = {
				callId: tc.callId,
				parentCallId: tc.parentCallId,
				childrenCallIds,
				contractCallId: tc.parentContractCallId,
				eventCallIds: [],
				fnName: `${sourcifyContract?.name || to}::${tc.functionName}`,
				fp: 0,
				isDeepestPanicResult: tc.isRevertedFrame ?? false,
				errorMessage: tc.isRevertedFrame ? error || 'Transaction reverted' : null,
				results: convertToInternalFnCallIO(
					processedOutputs.argumentsDecodedValue || [],
					processedOutputs.argumentsType || [],
					processedOutputs.argumentsName || []
				),
				resultsDecoded: convertToInternalFnCallIO(
					processedOutputs.argumentsDecodedValue || [],
					processedOutputs.argumentsType || [],
					processedOutputs.argumentsName || []
				).map((item) => ({
					...item,
					typeName: item.typeName || ''
				})),
				arguments: convertToInternalFnCallIO(
					processedInputs.argumentsDecodedValue || [],
					processedInputs.argumentsType || [],
					processedInputs.argumentsName || []
				),
				argumentsDecoded: convertToInternalFnCallIO(
					processedInputs.argumentsDecodedValue || [],
					processedInputs.argumentsType || [],
					processedInputs.argumentsName || []
				).map((item) => ({
					...item,
					typeName: item.typeName || ''
				})),
				debuggerDataAvailable: true,
				debuggerTraceStepIndex: null,
				isHidden: false
			};
			return { [tc.callId]: functionCall };
		})
		.reduce((acc, curr) => ({ ...acc, ...curr }), {});

	return {
		l2TransactionData: {
			simulationResult: {
				contractCallsMap,
				functionCallsMap,
				eventCallsMap: {},
				events: [],
				executionResult:
					status === 'REVERTED'
						? {
								executionStatus: 'REVERTED' as const,
								revertReason: error ?? 'Transaction reverted'
						  }
						: {
								executionStatus: 'SUCCEEDED' as const
						  },
				simulationDebuggerData: {
					contractDebuggerData: {},
					debuggerTrace: []
				},
				storageChanges: {}
			},
			chainId: chainId.toString(),
			blockNumber: Number(blockNumber),
			blockTimestamp: Number(timestamp),
			nonce,
			senderAddress: from,
			calldata: [traceCall.to, traceCall.input],
			transactionVersion: 1,
			transactionType: type,
			transactionIndexInBlock: transactionIndex,
			totalTransactionsInBlock: transactions.length,
			l2TxHash: txHash
		}
	};
};

export default traceCallResponseToTransactionSimulationResult;
