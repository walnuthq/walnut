import { type Address } from 'viem';
import { type TraceCall, type Step, type DebugCallContract } from '@/app/api/v1/types';
import { DebuggerInfo } from '@/lib/debugger';
import { flattenTraceCall } from '../tracing-client';
import { whatsabi } from '@shazow/whatsabi';

// Helper function that converts byte offset -> (line, col)
function offsetToLineCol(source: string, offset: number) {
	let line = 0;
	let col = 0;
	let curr = 0;
	for (let i = 0; i < source.length; i++) {
		if (curr === offset) break;
		if (source[i] === '\n') {
			line++;
			col = 0;
		} else {
			col++;
		}
		curr++;
	}
	return { line, col };
}

// l is length in bytes, s is offset, f is index of source file
function parsePcToSourceMapping(
	mapping: string,
	fileIndexToPath: Record<number, string>,
	sources: Record<number, string>
) {
	// mapping: 's:l:f'
	const [s, l, f] = mapping.split(':').map(Number);
	const relativePath = fileIndexToPath && fileIndexToPath[f] ? fileIndexToPath[f] : null;
	let filePath = 'unknown';
	let start = { line: 0, col: 0 };
	let end = { line: 0, col: 0 };
	if (relativePath && sources[f]) {
		filePath = relativePath;
		const source = sources[f];
		start = offsetToLineCol(source, s);
		end = offsetToLineCol(source, s + l);
	}

	return {
		start,
		end,
		filePath
	};
}

const debugCallResponseToTransactionSimulationResult = ({
	traceCall,
	steps,
	contracts,
	txHash,
	contractSourcesMap // { [address]: contractSources[] } where contractSources[] = [{ path, content }]
}: {
	traceCall: TraceCall;
	steps: Step[];
	contracts: Record<Address, DebugCallContract>;
	txHash: string;
	contractSourcesMap: Record<string, Array<{ path: string; content: string }>>;
}) => {
	// 1. classesDebuggerData
	const classesDebuggerData: Record<string, any> = {};
	for (const [address, contract] of Object.entries(contracts)) {
		// Build fileIndexToPath for the contract
		const contractSources = contractSourcesMap[address] || [];
		const fileIndexToPath: Record<number, string> = {};
		const sourceCode: Record<string, string> = {};
		const sources: Record<number, string> = {};
		contractSources.forEach((source, idx) => {
			const cleanPath = whatsabi.loaders.SourcifyABILoader.stripPathPrefix(`/${source.path}`);
			fileIndexToPath[idx] = cleanPath;
			sourceCode[cleanPath] = source.content;
			sources[idx] = source.content;
		});
		const sierraStatementsToCairoInfo: Record<number, { cairoLocations: any[] }> = {};
		for (const [pc, mapping] of Object.entries(contract.pcToSourceMappings)) {
			sierraStatementsToCairoInfo[Number(pc)] = {
				cairoLocations: [parsePcToSourceMapping(mapping, fileIndexToPath, sources)]
			};
		}
		classesDebuggerData[address] = {
			sierraStatementsToCairoInfo,
			sourceCode
		};
	}

	// 2. debuggerTrace
	const flatCalls = flattenTraceCall(traceCall);
	const debuggerTrace: any[] = [];
	steps.forEach((step) => {
		const call = flatCalls[step.traceCallIndex];
		let contractCallId = 0;
		let functionCallId = 0;
		if (call?.type === 'CALL') {
			contractCallId = step.traceCallIndex;
		} else if (call?.type === 'INTERNALCALL') {
			functionCallId = step.traceCallIndex;
		}

		// For each contract address check if there is sierraStatementsToCairoInfo for this pc(in code sierraInfo)
		for (const [address, classData] of Object.entries(classesDebuggerData)) {
			const sierraInfo = classData.sierraStatementsToCairoInfo[step.pc];
			if (sierraInfo && Array.isArray(sierraInfo.cairoLocations)) {
				sierraInfo.cairoLocations.forEach((_: any, locationIndex: number) => {
					debuggerTrace.push({
						withLocation: {
							sierraIndex: step.pc,
							locationIndex,
							results: [],
							arguments: [],
							argumentsDecoded: [],
							resultsDecoded: [],
							contractCallId,
							fp: 0,
							functionCallId
						}
					});
				});
			}
		}
	});

	// MOCK contractCallsMap and functionCallsMap for 0x380A1C6b118036364d84C3ecD305C2C11761A26c TestContract
	const contractCallsMap = {
		0: {
			callId: 0,
			parentCallId: 0,
			childrenCallIds: [],
			functionCallId: 1,
			eventCallIds: [],
			entryPoint: {
				classHash: '0x380A1C6b118036364d84C3ecD305C2C11761A26c',
				codeAddress: '0x380A1C6b118036364d84C3ecD305C2C11761A26c',
				entryPointType: 'EXTERNAL',
				entryPointSelector: '0x7cf5dab0',
				calldata: ['0x7cf5dab00000000000000000000000000000000000000000000000000000000000000005'],
				storageAddress: '0x380A1C6b118036364d84C3ecD305C2C11761A26c',
				callerAddress: '0xDefA4230b5cD308E69394e74896Bc3BF5665FEBC',
				callType: 'Call',
				initialGas: 39978796
			},
			result: {
				Success: {
					retData: []
				}
			},
			argumentsNames: ['amount'],
			argumentsTypes: ['uint256'],
			calldataDecoded: [
				{
					name: 'amount',
					typeName: 'uint256',
					value: '5'
				}
			],
			resultTypes: [],
			decodedResult: [],
			contractName: 'TestContract',
			entryPointName: 'increment',
			isErc20Token: false,
			classHash: '0x380A1C6b118036364d84C3ecD305C2C11761A26c',
			isDeepestPanicResult: false,
			nestingLevel: 0,
			callDebuggerDataAvailable: true,
			debuggerTraceStepIndex: null,
			isHidden: false
		}
	};
	const functionCallsMap = {
		1: {
			callId: 1,
			parentCallId: 0,
			childrenCallIds: [2],
			contractCallId: 0,
			eventCallIds: [],
			fnName: 'TestContract::increment2',
			fp: 0,
			isDeepestPanicResult: false,
			results: [],
			resultsDecoded: [],
			arguments: [
				{
					typeName: 'uint256',
					value: ['5'],
					internalIODecoded: null
				}
			],
			argumentsDecoded: [
				{
					typeName: 'uint256',
					value: ['5'],
					internalIODecoded: null
				}
			],
			debuggerDataAvailable: true,
			debuggerTraceStepIndex: null,
			isHidden: false
		},
		2: {
			callId: 2,
			parentCallId: 1,
			childrenCallIds: [],
			contractCallId: 0,
			eventCallIds: [],
			fnName: 'TestContract::increment3',
			fp: 0,
			isDeepestPanicResult: false,
			results: [],
			resultsDecoded: [],
			arguments: [
				{
					typeName: 'uint256',
					value: ['5'],
					internalIODecoded: null
				}
			],
			argumentsDecoded: [
				{
					typeName: 'uint256',
					value: ['5'],
					internalIODecoded: null
				}
			],
			debuggerDataAvailable: true,
			debuggerTraceStepIndex: null,
			isHidden: false
		}
	};

	return {
		contractCallsMap,
		functionCallsMap,
		simulationDebuggerData: {
			classesDebuggerData,
			debuggerTrace
		}
	} as DebuggerInfo;
};

export default debugCallResponseToTransactionSimulationResult;
