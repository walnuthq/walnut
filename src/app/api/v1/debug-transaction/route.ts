import { NextResponse, type NextRequest } from 'next/server';
import { DebuggerInfo } from '@/lib/debugger';
import { type Hash } from 'viem';

export const POST = async (request: NextRequest) => {
	const body = await request.json();
	const {
		WithTxHash: { rpc_url: rpcUrl, tx_hash: txHash }
	} = body as {
		WithTxHash: {
			rpc_url: string;
			tx_hash: Hash;
		};
	};
	const debuggerInfo: DebuggerInfo = {
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
	};
	return NextResponse.json(debuggerInfo);
};
