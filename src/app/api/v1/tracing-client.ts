import { createTestClient, http, publicActions } from 'viem';
import { anvil } from 'viem/chains';
import { type DebugTraceTransactionParams } from 'tevm/actions';
import { type RawTraceCall, type TraceCall, rawTraceCallToTraceCall } from '@/app/api/v1/types';

const flattenTraceCalls = (traceCalls: TraceCall[], parent: TraceCall) =>
	traceCalls.reduce<TraceCall[]>((accumulator, currentValue) => {
		const traceCall = {
			...currentValue,
			to: currentValue.type === 'INTERNALCALL' ? parent.to : currentValue.to
		};
		accumulator.push(traceCall);
		if (currentValue.calls) {
			accumulator.push(...flattenTraceCalls(currentValue.calls, traceCall));
		}
		return accumulator;
	}, []);

export const flattenTraceCall = (traceCall: TraceCall) => {
	const result = [];
	result.push(traceCall);
	if (traceCall.calls) {
		result.push(...flattenTraceCalls(traceCall.calls, traceCall));
	}
	return result;
};

const createTracingClient = (rpcUrl = 'http://localhost:8545') =>
	createTestClient({
		// chain: anvil,
		mode: 'anvil',
		transport: http(rpcUrl)
	})
		.extend(publicActions)
		.extend((client) => ({
			async traceTransaction(args: DebugTraceTransactionParams): Promise<TraceCall | null> {
				const traceTransactionResult = await client.request({
					// @ts-ignore
					method: 'debug_traceTransaction',
					params: [args.transactionHash, { tracer: args.tracer, tracerConfig: args.tracerConfig }]
				});
				if (!traceTransactionResult) {
					return null;
				}
				const rawTraceTransactionResult = traceTransactionResult as unknown as {
					gas: number;
				};
				if (rawTraceTransactionResult.gas === 0) {
					return null;
				}
				return rawTraceCallToTraceCall(traceTransactionResult as unknown as RawTraceCall);
			}
		}));

export default createTracingClient;
