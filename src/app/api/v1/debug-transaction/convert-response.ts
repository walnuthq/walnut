import { type Address, type Hex } from 'viem';
import {
	type Step,
	type DebugCallContract,
	type WalnutTraceCall,
	type Contract
} from '@/app/api/v1/types';
import { DebuggerInfo } from '@/lib/debugger';
import { type ContractCall, type FunctionCall } from '@/lib/simulation';
// import { whatsabi } from '@shazow/whatsabi'; // Ukloni ovaj import

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
	sourcifyContracts,
	contractCallsMap,
	functionCallsMap,
	txHash
}: {
	traceCall: WalnutTraceCall;
	steps: Step[];
	contracts: Record<Address, DebugCallContract>;
	txHash: string;
	sourcifyContracts: Contract[];
	contractCallsMap: Record<string, ContractCall>;
	functionCallsMap: Record<string, FunctionCall>;
}) => {
	// 1. classesDebuggerData
	const classesDebuggerData: Record<string, any> = {};
	for (const [address, contract] of Object.entries(contracts)) {
		// 1. Find sourcifyContract for this address;
		const sourcifyContract = sourcifyContracts.find((c) => c.address === address);
		console.log('sourcifyContract {}', sourcifyContract?.bytecode);
		const entryPointSelector = contractCallsMap[1].entryPoint.entryPointSelector;
		console.log('entryPointSelector {}', entryPointSelector);
		const push4Offsets =
			sourcifyContract?.bytecode && entryPointSelector
				? findPush4SelectorOffsets(sourcifyContract.bytecode, entryPointSelector)
				: [];
		console.log('push4Offsets {}', push4Offsets);
		const contractSources = sourcifyContract?.sources || [];
		const fileIndexToPath: Record<number, string> = {};
		const sourceCode: Record<string, string> = {};
		const sources: Record<number, string> = {};
		contractSources.forEach((source, idx) => {
			if (!source.path || !source.content) return; // skip if missing path or content
			const cleanPath = source.path;
			fileIndexToPath[Number(idx)] = cleanPath;
			sourceCode[cleanPath] = source.content;
			sources[Number(idx)] = source.content;
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
	// const flatCalls = flattenTraceCall(traceCall); // uklonjeno
	const debuggerTrace: any[] = [];
	steps.forEach((step) => {
		const contractCall = contractCallsMap[step.traceCallIndex];
		const functionCall = functionCallsMap[step.traceCallIndex];
		let contractCallId = 0;
		let functionCallId = 0;
		if (contractCall) {
			contractCallId = step.traceCallIndex;
		} else if (functionCall) {
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

	return {
		contractCallsMap,
		functionCallsMap,
		simulationDebuggerData: {
			classesDebuggerData,
			debuggerTrace
		}
	} as DebuggerInfo;
};

/**
 * Find all offsets (PC) where PUSH4 <selector> appears in the bytecode.
 * @param bytecode - hex string (can start with 0x)
 * @param selector - hex string (can start with 0x)
 * @returns array of offsets (PC) in bytes
 */
export function findPush4SelectorOffsets(bytecode: Hex, selector: string): number[] {
	// Convert Hex to a regular hex string without 0x
	const hex = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
	if (selector.startsWith('0x')) selector = selector.slice(2);
	const offsets: number[] = [];
	// PUSH4 = 0x63
	const pattern = '63' + selector;
	let idx = hex.indexOf(pattern);
	while (idx !== -1) {
		offsets.push(idx / 2);
		idx = hex.indexOf(pattern, idx + 1);
	}
	return offsets;
}

export default debugCallResponseToTransactionSimulationResult;
