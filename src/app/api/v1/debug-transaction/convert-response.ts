import { type Address, type Hex } from 'viem';
import {
	type Step,
	type DebugCallContract,
	type WalnutTraceCall,
	type Contract
} from '@/app/api/v1/types';
import { DebuggerInfo } from '@/lib/debugger';
import { type ContractCall, type FunctionCall } from '@/lib/simulation';

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

	// Skip invalid or dispatcher-related mappings
	if ((s === 0 && l === 0 && (f === 0 || f === -1)) || s === -1) {
		return null;
	}

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
	// 1. contractDebuggerData
	const contractDebuggerData: Record<string, any> = {};

	// Add null check for contracts
	if (contracts && typeof contracts === 'object') {
		for (const [address, contract] of Object.entries(contracts)) {
			// 1. Find sourcifyContract for this address;
			const sourcifyContract = sourcifyContracts.find((c) => c.address === address);
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
			// Optimized filtering: group PCs by mapping to avoid duplicates
			const pcToCodeInfo: Record<number, { codeLocations: any[] }> = {};
			const mappingToPcs: Record<string, number[]> = {};

			// Group PCs by their source mapping
			if (contract.pcToSourceMappings && typeof contract.pcToSourceMappings === 'object') {
				for (const [pc, mapping] of Object.entries(contract.pcToSourceMappings)) {
					// Skip PC mappings that are likely dispatcher-related (empty or invalid mappings)
					if (!mapping || mapping === '0:0:0' || mapping.includes('-1')) {
						continue;
					}

					if (!mappingToPcs[mapping]) {
						mappingToPcs[mapping] = [];
					}
					mappingToPcs[mapping].push(Number(pc));
				}
			}

			// Create pcToCodeInfo with only unique mappings
			if (Object.keys(mappingToPcs).length > 0) {
				for (const [mapping, pcs] of Object.entries(mappingToPcs)) {
					const codeLocation = parsePcToSourceMapping(mapping, fileIndexToPath, sources);

					// Skip invalid code locations (dispatcher-related)
					if (!codeLocation) {
						continue;
					}

					// Use the first PC as the representative for this mapping
					const representativePc = pcs[0];
					pcToCodeInfo[representativePc] = {
						codeLocations: [codeLocation]
					};
				}
			}
			contractDebuggerData[address] = {
				pcToCodeInfo,
				sourceCode
			};
		}
	}

	// 2. debuggerTrace - Process steps in execution order
	const debuggerTrace: any[] = [];
	// Process all steps in execution order (not by call hierarchy)
	steps.forEach((step, stepIndex) => {
		const traceCallIndex = step.traceCallIndex;
		const contractCall = contractCallsMap[traceCallIndex];
		const functionCall = functionCallsMap[traceCallIndex];

		let contractCallId = 0;
		let functionCallId = 0;

		if (contractCall) {
			contractCallId = traceCallIndex;
		} else if (functionCall) {
			functionCallId = traceCallIndex;
			// For function calls, we need the parent contract call ID
			contractCallId = functionCall.contractCallId;
		}

		// Check if debugInfo is false - if so, add as withContractCall
		if ((step as any).debugInfo === false) {
			// Find contract call by targetContract address
			let targetContractCallId = 0;
			if ((step as any).targetContract) {
				const targetContract = (step as any).targetContract;
				const foundContractCall = Object.entries(contractCallsMap).find(
					([callId, contractCall]) =>
						contractCall.classHash?.toLowerCase() === targetContract.toLowerCase() ||
						contractCall.entryPoint?.storageAddress?.toLowerCase() === targetContract.toLowerCase()
				);
				if (foundContractCall) {
					targetContractCallId = Number(foundContractCall[0]);
				}
			}

			debuggerTrace.push({
				withContractCall: {
					contractCallId: targetContractCallId,
					reason: `No debug info available for PC ${step.pc}`
				}
			});
			return;
		}

		// Get contract address from contractCall
		let contractAddress: string | null = null;
		if (contractCall) {
			contractAddress = contractCall.entryPoint?.storageAddress || null;
		} else if (functionCall) {
			// For function calls, get parent contract address
			const parentContractCall = contractCallsMap[contractCallId];
			contractAddress = parentContractCall?.entryPoint?.storageAddress || null;
		}

		// Skip if no contract address or no debugger data for this contract
		if (!contractAddress || !contractDebuggerData[contractAddress]) {
			return;
		}

		const classData = contractDebuggerData[contractAddress];
		const pcInfo = classData.pcToCodeInfo[step.pc];

		// Skip if no PC mapping for this step
		if (!pcInfo || !Array.isArray(pcInfo.codeLocations)) {
			return;
		}

		// Process each code location for this PC
		pcInfo.codeLocations.forEach((location: any, locationIndex: number) => {
			// Skip dispatcher-related locations
			if (
				location.filePath === 'unknown' ||
				(location.start.line === 0 && location.end.line === 0)
			) {
				return;
			}

			// Add every step to debuggerTrace (no duplicate checking)
			debuggerTrace.push({
				withLocation: {
					pcIndex: step.pc,
					locationIndex,
					results: functionCall?.results ?? [],
					arguments: functionCall?.arguments ?? [],
					argumentsDecoded: functionCall?.argumentsDecoded ?? [],
					resultsDecoded: functionCall?.resultsDecoded ?? [],
					contractCallId,
					fp: 0,
					functionCallId
				}
			});
		});
	});

	return {
		contractCallsMap,
		functionCallsMap,
		simulationDebuggerData: {
			contractDebuggerData,
			debuggerTrace
		}
	} as DebuggerInfo;
};

export default debugCallResponseToTransactionSimulationResult;
