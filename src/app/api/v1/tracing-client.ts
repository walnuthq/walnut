import { createTestClient, http, formatTransactionRequest, type Hash, type BlockTag } from 'viem';
import { type DebugTraceTransactionParams, type DebugTraceCallParams } from 'tevm/actions';
import { type RawTraceCall, type TraceCall, rawTraceCallToTraceCall } from '@/app/api/v1/types';

const flattenTraceCalls = (traceCalls: TraceCall[]) =>
	traceCalls.reduce<TraceCall[]>((accumulator, currentValue) => {
		accumulator.push(currentValue);
		if (currentValue.calls) {
			accumulator.push(...flattenTraceCalls(currentValue.calls));
		}
		return accumulator;
	}, []);

export const flattenTraceCall = (traceCall: TraceCall) => {
	const result = [];
	result.push(traceCall);
	if (traceCall.calls) {
		result.push(...flattenTraceCalls(traceCall.calls));
	}
	return result;
};

const createTracingClient = (rpcUrl?: string) =>
	createTestClient({
		mode: 'anvil',
		transport: http(rpcUrl)
	}).extend((client) => ({
		async traceTransaction(
			args: DebugTraceTransactionParams /* & { readonly tracerConfig?: { readonly withLog?: boolean } }*/
		): Promise<TraceCall | null> {
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
		},
		async traceCall(
			args: DebugTraceCallParams & {
				blockNrOrHash: `0x${string}` | Hash | BlockTag;
				//txIndex: number;
			}
		): Promise<TraceCall | null> {
			const traceCallResult = await client.request({
				// @ts-ignore
				method: 'debug_traceCall',
				params: [
					formatTransactionRequest(args),
					args.blockNrOrHash,
					{
						tracer: args.tracer,
						tracerConfig: args.tracerConfig
						//txIndex: args.txIndex
					}
				]
			});
			if (!traceCallResult) {
				return null;
			}
			const rawTraceCallResult = traceCallResult as unknown as {
				gas: number;
			};
			if (rawTraceCallResult.gas === 0) {
				return null;
			}
			return rawTraceCallToTraceCall(traceCallResult as unknown as RawTraceCall);
		}
	}));

export default createTracingClient;
