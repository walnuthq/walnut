import { type Address } from 'viem';
import debuggerInfo from '@/app/api/v1/debug-transaction/debugger-info.json';
import {
	type Step,
	type DebugCallContract,
	type WalnutTraceCall,
	type Contract
} from '@/app/api/v1/types';
import { DebuggerInfo } from '@/lib/debugger';
import { type ContractCall, type FunctionCall } from '@/lib/simulation';

const debugCallResponseToTransactionSimulationResult = ({
	traceCall,
	steps,
	contracts,
	sourcifyContracts,
	contractCallsMap,
	functionCallsMap
}: {
	traceCall: WalnutTraceCall;
	steps: Step[];
	contracts: Record<Address, DebugCallContract>;
	sourcifyContracts: Contract[];
	contractCallsMap: Record<string, ContractCall>;
	functionCallsMap: Record<string, FunctionCall>;
}) => {
	// TODO use walnut-cli JSON output to craft the DebuggerInfo data format
	/*const debuggerInfo: DebuggerInfo = {
		contractCallsMap: {},
		functionCallsMap: {},
		simulationDebuggerData: {
			classesDebuggerData: {
				'0x0': {
					sierraStatementsToCairoInfo: {
						0: {
							cairoLocations: [
								{
									start: { line: 0, col: 0 },
									end: { line: 0, col: 0 },
									filePath: 'examples/TestContract'
								}
							]
						}
					},
					sourceCode: {
						'examples/TestContract': 'pragma'
					}
				}
			},
			debuggerTrace: [
				{
					withLocation: {
						sierraIndex: 0,
						locationIndex: 0,
						results: [],
						arguments: [],
						argumentsDecoded: [],
						resultsDecoded: [],
						contractCallId: 0,
						fp: 0,
						functionCallId: 0
					}
				}
			]
		}
	};*/
	return debuggerInfo as DebuggerInfo;
};

export default debugCallResponseToTransactionSimulationResult;
