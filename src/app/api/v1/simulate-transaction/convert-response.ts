import { type Address, type Hash } from 'viem';
import { type TraceCall, type DebugCallContract } from '@/app/api/v1/types';
import { flattenTraceCall } from '@/app/api/v1/tracing-client';
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
	traceCall: TraceCall;
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
	txHash: Hash;
}): TransactionSimulationResult => {
	const contractCallsMap = flattenTraceCall(traceCall)
		.map((traceCall, index) => {
			if (traceCall.type !== 'CALL' || traceCall.to === undefined || traceCall.from === undefined) {
				return undefined;
			}
			const callId = index + 1;
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
			const contractCall: ContractCall = {
				callId,
				parentCallId: 0,
				childrenCallIds: [],
				functionCallId: 2, // TODO
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
			return { [callId.toString()]: contractCall };
		})
		.filter((contractCall) => contractCall)
		.reduce((previousValue, currentValue) => ({ ...previousValue, ...currentValue }), {});
	console.log(contractCallsMap);
	const functionCallsMap = flattenTraceCall(traceCall)
		.map((traceCall, index) => {
			if (traceCall.type !== 'INTERNALCALL' || traceCall.to === undefined) {
				return undefined;
			}
			const contract = contracts[traceCall.to];
			const abi = contract.abi;
			const { functionName, args } = decodeFunctionDataSafe({ abi, data: traceCall.input });
			const result = decodeFunctionResultSafe({
				abi,
				functionName,
				data: traceCall.output ?? '0x'
			});
			const abiFunction = getAbiFunction({ abi, name: functionName, args });
			const callId = index + 1;
			const functionCall: FunctionCall = {
				callId,
				parentCallId: 0,
				childrenCallIds: traceCall.calls?.map((call) => 3) ?? [], // TODO
				contractCallId: 1, // TODO
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
			return { [callId.toString()]: functionCall };
		})
		.filter((functionCall) => functionCall)
		.reduce((previousValue, currentValue) => ({ ...previousValue, ...currentValue }), {});
	console.log(functionCallsMap);
	/* return {
		l2TransactionData: {
			simulationResult: {
				contractCallsMap: contractCallsMap!,
				functionCallsMap: functionCallsMap!,
				eventCallsMap: {},
				events: [],
				executionResult: { executionStatus: 'SUCCEEDED' },
				simulationDebuggerData: {
					classesDebuggerData: {},
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
	}; */
	return transactionSimulationResponse as TransactionSimulationResult;
};

export default traceCallResponseToTransactionSimulationResult;
