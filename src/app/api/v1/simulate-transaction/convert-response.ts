import { type Address, type Hash } from 'viem';
import { type DebugCallContract, type WalnutTraceCall } from '@/app/api/v1/types';
import { flattenTraceCall } from '@/app/api/v1/walnut-cli';
import {
	CallType,
	type ContractCall,
	EntryPointType,
	FunctionCall,
	type TransactionSimulationResult
} from '@/lib/simulation';
import {
	decodeFunctionDataSafe,
	decodeFunctionResultSafe,
	getAbiFunction,
	formatAbiParameterValue
} from '@/app/api/v1/abi-utils';
import transactionSimulationResponse from '@/app/api/v1/simulate-transaction/transaction-simulation-response.json';

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

const traceCallWithIndexes = (traceCall: WalnutTraceCall): TraceCallWithIndex => ({
	...traceCall,
	index: 0,
	calls: traceCall.calls?.map((traceCall) => innerTraceCallWithIndexes(traceCall, 1)) ?? []
});

type TraceCallWithIds = TraceCallWithIndex & {
	id: number;
	parentId: number;
	parentContractCallId: number;
};

const flattenTraceCallsWithIds = (
	traceCalls: TraceCallWithIndex[],
	parent: TraceCallWithIds,
	contractCallId: number,
	functionCallId: number,
	parentContractCallId: number
) =>
	traceCalls.reduce<TraceCallWithIds[]>((accumulator, currentValue) => {
		const nextContractCallId =
			currentValue.type === 'INTERNALCALL' ? contractCallId : contractCallId + 1;
		const nextFunctionCallId =
			currentValue.type === 'INTERNALCALL' ? functionCallId + 1 : functionCallId;
		const traceCall = {
			...currentValue,
			id: currentValue.type === 'INTERNALCALL' ? functionCallId : contractCallId,
			parentId: parent.id,
			parentContractCallId,
			from: currentValue.type === 'INTERNALCALL' ? parent.from : currentValue.from,
			to: currentValue.type === 'INTERNALCALL' ? parent.to : currentValue.to
		};
		accumulator.push(traceCall);
		accumulator.push(
			...flattenTraceCallsWithIds(
				currentValue.calls,
				traceCall,
				nextContractCallId,
				nextFunctionCallId,
				currentValue.type === 'INTERNALCALL' ? parentContractCallId : contractCallId
			)
		);
		return accumulator;
	}, []);

const flattenTraceCallWithIds = (traceCall: TraceCallWithIndex): TraceCallWithIds[] => {
	const flattenedTraceCall = flattenTraceCall(traceCall);
	const contractCallsCount = flattenedTraceCall.filter(({ type }) => type === 'CALL').length;
	const result = [];
	const firstTraceCall = {
		...traceCall,
		id: 1,
		parentId: 0,
		parentContractCallId: 0
	};
	result.push(firstTraceCall);
	result.push(
		...flattenTraceCallsWithIds(firstTraceCall.calls, firstTraceCall, 2, contractCallsCount + 1, 1)
	);
	return result;
};

const traceCallResponseToTransactionSimulationResult = ({
	traceCall,
	contracts,
	contractNames,
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
	traceCall: WalnutTraceCall;
	contracts: Record<Address, DebugCallContract>;
	contractNames: Record<Address, string>;
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
	const flattenedTraceCall = flattenTraceCallWithIds(traceCallWithIndexes(traceCall));
	console.log('flattenedTraceCallWithIndexes');
	console.log(flattenedTraceCall);
	const flattenedContractCalls = flattenedTraceCall.filter(({ type }) => type === 'CALL');
	const contractCallsMap = flattenedContractCalls
		.map((traceCall) => {
			const contract = contracts[traceCall.to];
			const abi = contract.abi;
			const { functionName, args } = decodeFunctionDataSafe({ abi, data: traceCall.input });
			const result = decodeFunctionResultSafe({
				abi,
				functionName,
				data: traceCall.output
			});
			const abiFunction = getAbiFunction({ abi, name: functionName, args });
			//
			const contractCalls = traceCall.calls.filter(({ type }) => type === 'CALL');
			const contractCallsIds = contractCalls.map(({ index }) => flattenedTraceCall[index].id);
			//
			const functionCalls = traceCall.calls.filter(({ type }) => type === 'INTERNALCALL');
			const functionCallsIds = functionCalls.map(({ index }) => flattenedTraceCall[index].id);
			const functionCallId = functionCallsIds.length === 0 ? null : functionCallsIds[0];
			//
			const contractCall: ContractCall = {
				callId: traceCall.id,
				parentCallId: traceCall.parentId,
				childrenCallIds: contractCallsIds,
				functionCallId,
				eventCallIds: [],

				entryPoint: {
					classHash: '',
					codeAddress: traceCall.to,
					entryPointType: EntryPointType.EXTERNAL,
					entryPointSelector: traceCall.input.slice(0, 10),
					calldata: [traceCall.input],
					storageAddress: traceCall.to,
					callerAddress: traceCall.from,
					callType: CallType.CALL,
					initialGas: 0
				},

				result: {
					Success: {
						retData: [] // TODO
					}
				},

				argumentsNames: abiFunction?.inputs.map((input) => input.name ?? '').filter((name) => name),
				argumentsTypes: abiFunction?.inputs.map((input) => input.type ?? '').filter((type) => type),
				calldataDecoded: args
					? abiFunction?.inputs.map((input, index) => ({
							name: input.name ?? '',
							typeName: input.type,
							value: formatAbiParameterValue(args[index], input)
					  }))
					: [],
				resultTypes: abiFunction?.outputs.map((output) => output.type ?? '').filter((type) => type),
				decodedResult:
					abiFunction?.outputs.map((output, index) => ({
						name: output.name ?? '',
						typeName: output.type,
						value: [
							Array.isArray(result)
								? formatAbiParameterValue(result[index], output)
								: formatAbiParameterValue(result, output)
						],
						internalIODecoded: null
					})) ?? [],

				contractName: contractNames[traceCall.to],
				entryPointName: functionName,

				isErc20Token: false,
				classHash: '',
				isDeepestPanicResult: false,

				nestingLevel: 0,
				callDebuggerDataAvailable: true,
				debuggerTraceStepIndex: null,
				isHidden: false
			};
			return { [traceCall.id.toString()]: contractCall };
		})
		.reduce((previousValue, currentValue) => ({ ...previousValue, ...currentValue }), {});
	console.log(contractCallsMap);
	const flattenedFunctionCalls = flattenedTraceCall.filter(({ type }) => type === 'INTERNALCALL');
	const functionCallsMap = flattenedFunctionCalls
		.map((traceCall) => {
			const contract = contracts[traceCall.to];
			const abi = contract.abi;
			const { functionName, args } = decodeFunctionDataSafe({ abi, data: traceCall.input });
			const result = decodeFunctionResultSafe({
				abi,
				functionName,
				data: traceCall.output ?? '0x'
			});
			const abiFunction = getAbiFunction({ abi, name: functionName, args });
			//
			const functionCalls = traceCall.calls.filter(({ type }) => type === 'INTERNALCALL');
			const functionCallsIds = functionCalls.map(({ index }) => flattenedTraceCall[index].id);
			//
			const functionCall: FunctionCall = {
				callId: traceCall.id,
				parentCallId: traceCall.parentId,
				childrenCallIds: functionCallsIds,
				contractCallId: traceCall.parentContractCallId,
				eventCallIds: [],
				fnName: `${contractNames[traceCall.to]}::${functionName}`,
				fp: 0,
				isDeepestPanicResult: false,
				results:
					abiFunction?.outputs.map((output, index) => ({
						typeName: output.type,
						value: [
							Array.isArray(result)
								? formatAbiParameterValue(result[index], output)
								: formatAbiParameterValue(result, output)
						],
						internalIODecoded: null
					})) ?? [],
				resultsDecoded:
					abiFunction?.outputs.map((output, index) => ({
						typeName: output.type,
						value: [
							Array.isArray(result)
								? formatAbiParameterValue(result[index], output)
								: formatAbiParameterValue(result, output)
						],
						internalIODecoded: null
					})) ?? [],
				arguments: args
					? abiFunction?.inputs.map((input, index) => ({
							typeName: input.type,
							value: [formatAbiParameterValue(args[index], input)],
							internalIODecoded: null
					  })) ?? []
					: [],
				argumentsDecoded: args
					? abiFunction?.inputs.map((input, index) => ({
							typeName: input.type,
							value: [formatAbiParameterValue(args[index], input)],
							internalIODecoded: null
					  })) ?? []
					: [],
				debuggerDataAvailable: true,
				debuggerTraceStepIndex: null,
				isHidden: false
			};
			return { [traceCall.id.toString()]: functionCall };
		})
		.reduce((previousValue, currentValue) => ({ ...previousValue, ...currentValue }), {});
	console.log(functionCallsMap);
	return {
		l2TransactionData: {
			simulationResult: {
				contractCallsMap,
				functionCallsMap,
				eventCallsMap: {},
				events: [],
				executionResult: { executionStatus: 'SUCCEEDED' },
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
			calldata: [],
			transactionVersion: 1,
			transactionType: type,
			transactionIndexInBlock: transactionIndex,
			totalTransactionsInBlock: transactions.length,
			l2TxHash: txHash
		}
	};
	// return transactionSimulationResponse as TransactionSimulationResult;
};

export default traceCallResponseToTransactionSimulationResult;
