import { type Address, type Hash } from 'viem';
import { type DebugCallContract, type WalnutTraceCall } from '@/app/api/v1/types';
import { traceCallWithIndexes, flattenTraceCallWithIds } from '@/app/api/v1/walnut-cli';
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
	// console.log(flattenedTraceCall);
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
						// @ts-ignore
						retData:
							abiFunction?.outputs.map((output, index) => ({
								name: output.name ?? '',
								typeName: output.internalType ?? output.type,
								value: Array.isArray(result)
									? formatAbiParameterValue(result[index], output)
									: formatAbiParameterValue(result, output)
							})) ?? []
					}
				},

				argumentsNames: abiFunction?.inputs.map((input) => input.name ?? '').filter((name) => name),
				argumentsTypes: abiFunction?.inputs
					.map((input) => input.internalType ?? input.type ?? '')
					.filter((type) => type),
				calldataDecoded: args
					? abiFunction?.inputs.map((input, index) => ({
							name: input.name ?? '',
							typeName: input.internalType ?? input.type,
							value: formatAbiParameterValue(args[index], input)
					  }))
					: [],
				resultTypes: abiFunction?.outputs
					.map((output) => output.internalType ?? output.type ?? '')
					.filter((type) => type),
				decodedResult:
					abiFunction?.outputs.map((output, index) => ({
						name: output.name ?? '',
						typeName: output.internalType ?? output.type,
						value: Array.isArray(result)
							? formatAbiParameterValue(result[index], output)
							: formatAbiParameterValue(result, output)
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
	// console.log(contractCallsMap);
	const flattenedFunctionCalls = flattenedTraceCall.filter(({ type }) => type === 'INTERNALCALL');
	const functionCallsMap = flattenedFunctionCalls
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
						typeName: output.internalType ?? output.type,
						value: [
							Array.isArray(result)
								? formatAbiParameterValue(result[index], output)
								: formatAbiParameterValue(result, output)
						]
					})) ?? [],
				resultsDecoded:
					abiFunction?.outputs.map((output, index) => ({
						typeName: output.internalType ?? output.type,
						value: [
							Array.isArray(result)
								? formatAbiParameterValue(result[index], output)
								: formatAbiParameterValue(result, output)
						]
					})) ?? [],
				arguments: args
					? abiFunction?.inputs.map((input, index) => ({
							typeName: input.internalType ?? input.type,
							value: [formatAbiParameterValue(args[index], input)]
					  })) ?? []
					: [],
				argumentsDecoded: args
					? abiFunction?.inputs.map((input, index) => ({
							typeName: input.internalType ?? input.type,
							value: [formatAbiParameterValue(args[index], input)]
					  })) ?? []
					: [],
				debuggerDataAvailable: true,
				debuggerTraceStepIndex: null,
				isHidden: false
			};
			return { [traceCall.id.toString()]: functionCall };
		})
		.reduce((previousValue, currentValue) => ({ ...previousValue, ...currentValue }), {});
	// console.log(functionCallsMap);
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
			calldata: [traceCall.to, traceCall.input],
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
