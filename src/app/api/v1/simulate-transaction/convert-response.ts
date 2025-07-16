import {
	type Address,
	type Abi,
	type DecodeFunctionDataParameters,
	type DecodeFunctionResultParameters,
	decodeFunctionData,
	decodeFunctionResult,
	getAbiItem,
	type GetAbiItemParameters,
	type AbiFunction,
	type AbiParameter,
	type Hash
} from 'viem';
import { type AbiEventParameter } from 'abitype';
import { type TraceCall, type DebugCallContract } from '@/app/api/v1/types';
import { flattenTraceCall } from '@/app/api/v1/tracing-client';
import {
	CallType,
	type ContractCall,
	EntryPointType,
	FunctionCall,
	type TransactionSimulationResult
} from '@/lib/simulation';
import transactionSimulationResponse from '@/app/api/v1/simulate-transaction/transaction-simulation-response.json';

const decodeFunctionDataSafe = (params: DecodeFunctionDataParameters) => {
	try {
		return decodeFunctionData(params);
	} catch (error) {
		console.error(error);
		return { functionName: params.data.slice(0, 10), args: undefined };
	}
};

const decodeFunctionResultSafe = (params: DecodeFunctionResultParameters) => {
	try {
		return decodeFunctionResult(params);
	} catch (error) {
		console.error(error);
		return undefined;
	}
};

const formatAbiParameterValue = (
	value: unknown,
	abiParameter: AbiParameter | AbiEventParameter
): string => {
	switch (abiParameter.type) {
		case 'bool': {
			return `${value}`;
		}
		case 'uint8':
		case 'uint16':
		case 'uint24':
		case 'uint32':
		case 'uint40':
		case 'uint48':
		case 'uint56':
		case 'uint64':
		case 'uint72':
		case 'uint80':
		case 'uint88':
		case 'uint96':
		case 'uint104':
		case 'uint112':
		case 'uint120':
		case 'uint128':
		case 'uint136':
		case 'uint144':
		case 'uint152':
		case 'uint160':
		case 'uint168':
		case 'uint176':
		case 'uint184':
		case 'uint192':
		case 'uint200':
		case 'uint208':
		case 'uint216':
		case 'uint224':
		case 'uint232':
		case 'uint240':
		case 'uint248':
		case 'uint256': {
			return `${value}`;
		}
		case 'int8':
		case 'int16':
		case 'int24':
		case 'int32':
		case 'int40':
		case 'int48':
		case 'int56':
		case 'int64':
		case 'int72':
		case 'int80':
		case 'int88':
		case 'int96':
		case 'int104':
		case 'int112':
		case 'int120':
		case 'int128':
		case 'int136':
		case 'int144':
		case 'int152':
		case 'int160':
		case 'int168':
		case 'int176':
		case 'int184':
		case 'int192':
		case 'int200':
		case 'int208':
		case 'int216':
		case 'int224':
		case 'int232':
		case 'int240':
		case 'int248':
		case 'int256': {
			return `${value}`;
		}
		case 'bytes':
		case 'bytes1':
		case 'bytes2':
		case 'bytes3':
		case 'bytes4':
		case 'bytes5':
		case 'bytes6':
		case 'bytes7':
		case 'bytes8':
		case 'bytes9':
		case 'bytes10':
		case 'bytes11':
		case 'bytes12':
		case 'bytes13':
		case 'bytes14':
		case 'bytes15':
		case 'bytes16':
		case 'bytes17':
		case 'bytes18':
		case 'bytes19':
		case 'bytes20':
		case 'bytes21':
		case 'bytes22':
		case 'bytes23':
		case 'bytes24':
		case 'bytes25':
		case 'bytes26':
		case 'bytes27':
		case 'bytes28':
		case 'bytes29':
		case 'bytes30':
		case 'bytes31':
		case 'bytes32': {
			return `${value}`;
		}
		case 'address': {
			return `${value}`;
		}
		case 'string': {
			return `"${value}"`;
		}
		/* case 'tuple': {
			const tuple = value as Record<string, unknown>;
			const { components } = abiParameter as {
				components: readonly AbiParameter[];
			};
			const [, structName] = abiParameter.internalType ? abiParameter.internalType.split(' ') : [];
			return `${cyan(structName)}({ ${components
				.map((component) => formatAbiParameter(tuple[component.name ?? ''], component))
				.join(', ')} })`;
		} */
		// arrays
		default: {
			const array = value as unknown[];
			const typeMatches = abiParameter.type.match(/(.*)\[(\d*)\]/);
			if (!typeMatches) {
				return `[${array.join(', ')}]`;
			}
			const [, type] = typeMatches;
			if (!type) {
				return `[${array.join(', ')}]`;
			}
			const internalTypeMatches = abiParameter.internalType
				? abiParameter.internalType.match(/(.*)\[(\d*)\]/)
				: null;
			const [, internalType] = internalTypeMatches ?? [];
			const arrayFormatted = array
				.map((item, index) =>
					formatAbiParameterValue(item, {
						...abiParameter,
						name: `${abiParameter.name}[${index}]`,
						type,
						internalType
					})
				)
				.join(', ');
			return `[${arrayFormatted}]`;
		}
	}
};

const getAbiFunction = (params: GetAbiItemParameters) => {
	const abiFunction = getAbiItem(params);
	return abiFunction ? (abiFunction as AbiFunction) : undefined;
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
				callDebuggerDataAvailable: false,
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
				debuggerDataAvailable: false,
				debuggerTraceStepIndex: null,
				isHidden: false
			};
			return { [callId.toString()]: functionCall };
		})
		.filter((functionCall) => functionCall)
		.reduce((previousValue, currentValue) => ({ ...previousValue, ...currentValue }), {});
	console.log(functionCallsMap);
	return {
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
	};
	//return transactionSimulationResponse as TransactionSimulationResult;
};

export default traceCallResponseToTransactionSimulationResult;
