import { type Address } from 'viem';
import debuggerInfo from '@/app/api/v1/debug-transaction/debugger-info.json';
import { type TraceCall, type Step, type DebugCallContract } from '@/app/api/v1/types';
import { DebuggerInfo } from '@/lib/debugger';
import { flattenTraceCall } from '../tracing-client';

const debugCallResponseToTransactionSimulationResult = ({
	traceCall,
	steps,
	contracts
}: {
	traceCall: TraceCall;
	steps: Step[];
	contracts: Record<Address, DebugCallContract>;
}) => {
	// TODO use walnut-cli JSON output to craft the DebuggerInfo data format
	console.log(flattenTraceCall(traceCall));
	console.log(steps.length);
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
