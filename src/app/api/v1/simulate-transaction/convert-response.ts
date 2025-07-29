import { type Address, type Hash } from 'viem';
import { type DebugCallContract, type WalnutTraceCall, type Contract } from '@/app/api/v1/types';
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
	if (node.type !== 'ENTRY') {
		map[node.callId] = node;
	}
	(traceCall.calls || []).forEach((child: any) => flattenTraceToMap(child, map, node.type));

	return map;
}

const traceCallResponseToTransactionSimulationResult = ({
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
		.filter((tc: any) => tc.type === 'CALL')
		.map((tc: any) => {
			const contract = contracts[tc.to];
			if (!contract) {
				console.error('Contract not found for address:', tc.to);
				return {};
			}
			const abi = contract.abi;
			const { functionName, args } = decodeFunctionDataSafe({ abi, data: tc.input });
			const result = decodeFunctionResultSafe({
				abi,
				functionName,
				data: tc.output
			});
			const abiFunction = getAbiFunction({ abi, name: functionName, args });
			const contractCall: ContractCall = {
				callId: tc.callId,
				parentCallId: tc.parentCallId,
				childrenCallIds: tc.childrenCallIds || [],
				functionCallId:
					(tc.calls || []).find((c: any) => c.type === 'INTERNALCALL')?.callId ?? null,
				eventCallIds: [],
				entryPoint: {
					classHash: '',
					codeAddress: tc.to,
					entryPointType: EntryPointType.EXTERNAL,
					entryPointSelector: tc.input.slice(0, 10),
					calldata: [tc.input],
					storageAddress: tc.to,
					callerAddress: tc.from,
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
				calldataDecoded: decodeCalldata(abiFunction, Array.from(args ?? [])),
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
				contractName: contractNames[tc.to],
				entryPointName: functionName,
				isErc20Token: false,
				classHash: '',
				isDeepestPanicResult: false,
				nestingLevel: 0,
				callDebuggerDataAvailable: true,
				debuggerTraceStepIndex: null,
				isHidden: false
			};
			return { [tc.callId]: contractCall };
		})
		.reduce((acc, curr) => ({ ...acc, ...curr }), {});

	// Function calls
	const functionCallsMap = Object.values(traceMap)
		.filter((tc: any) => tc.type === 'INTERNALCALL')
		.map((tc: any) => {
			// Find the nearest parent CALL (can be multiple levels of INTERNALCALL)
			let parent = traceMap[tc.parentCallId];
			while (parent && parent.type !== 'CALL') {
				parent = traceMap[parent.parentCallId];
			}
			const to = parent?.to;
			const from = parent?.from;
			if (!to || !from) {
				console.error('Parent CALL not found or missing to/from for INTERNALCALL:', tc, parent);
				return {};
			}
			const contract = contracts[to];
			if (!contract) {
				console.error('Contract not found for address:', to);
				return {};
			}
			const abi = contract.abi;
			const { functionName, args } = decodeFunctionDataSafe({ abi, data: tc.input });
			const result = decodeFunctionResultSafe({
				abi,
				functionName,
				data: tc.output
			});
			const abiFunction = getAbiFunction({ abi, name: functionName, args });
			// childrenCallIds: all INTERNALCALL and CALL nodes where parentCallId == tc.callId
			const childrenCallIds = (tc.childrenCallIds || []).filter((id: number) => {
				const child = traceMap[id];
				return child && (child.type === 'INTERNALCALL' || child.type === 'CALL');
			});
			const functionCall: FunctionCall = {
				callId: tc.callId,
				parentCallId: tc.parentCallId,
				childrenCallIds,
				contractCallId: tc.parentContractCallId,
				eventCallIds: [],
				fnName: `${contractNames[to]}::${functionName}`,
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
};

export default traceCallResponseToTransactionSimulationResult;
