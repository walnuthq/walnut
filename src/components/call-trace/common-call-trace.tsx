import { useCallTrace } from '@/lib/context/call-trace-context-provider';
import { ContractCallTrace } from './contract-call-trace';
import { FunctionCallTrace } from './function-call-trace';
import { EventCallTrace } from './event-call-trace';
import { ErrorTraceLine } from './error-trace-line';
import { memo, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { getContractName, shortenHash } from '@/lib/utils';

export const CommonCallTrace = memo(function CommonCallTrace({
	previewMode,
	callId,
	nestingLevel,
	callType
}: {
	previewMode?: boolean;
	callId: number;
	nestingLevel: number;
	callType?: 'event' | 'function' | 'contract';
}) {
	const {
		eventCallsMap,
		functionCallsMap,
		contractCallsMap,
		errorMessage,
		l2Flamegraph,
		setChosenCallName,
		setActiveTab
	} = useCallTrace();

	const formatter = new Intl.NumberFormat(navigator.language);
	if (!callType) {
		const functionCall = functionCallsMap[callId];
		const contractCall = contractCallsMap[callId];
		const eventCall = eventCallsMap[callId];
		if (functionCall) callType = 'function';
		else if (contractCall) callType = 'contract';
		else if (eventCall) callType = 'event';
	}
	const contractCallIdsArray = useMemo(() => {
		if (contractCallsMap && !contractCallsMap[callId]) {
			return null;
		}
		return contractCallsMap[callId].childrenCallIds.map((childCallId) => (
			<CommonCallTrace
				previewMode={previewMode}
				key={childCallId}
				callId={childCallId}
				nestingLevel={nestingLevel}
				callType="contract"
			/>
		));
		return null;
	}, [contractCallsMap, nestingLevel, callId, previewMode]);

	const functionCallIdsList = useMemo(() => {
		if (functionCallsMap && !functionCallsMap[callId]) {
			return null;
		}

		if (functionCallsMap[callId].childrenCallIds) {
			return functionCallsMap[callId].childrenCallIds.map((nestedCallId) => (
				<CommonCallTrace
					previewMode={previewMode}
					key={nestedCallId}
					callId={nestedCallId}
					nestingLevel={nestingLevel}
				/>
			));
		}

		return null;
	}, [functionCallsMap, callId, nestingLevel, previewMode]);

	if (eventCallsMap && eventCallsMap[callId] && callType === 'event' && !previewMode) {
		return <EventCallTrace eventCallId={callId} nestingLevel={nestingLevel} />;
	} else if (functionCallsMap && functionCallsMap[callId] && callType === 'function') {
		const functionCall = functionCallsMap[callId];
		if (!functionCall.isHidden) {
			return (
				<FunctionCallTrace
					previewMode={previewMode}
					functionCallId={callId}
					nestingLevel={nestingLevel}
				/>
			);
		} else {
			return (
				<>
					{functionCallIdsList}
					{functionCall.isDeepestPanicResult && errorMessage && !previewMode && (
						<ErrorTraceLine
							executionFailed
							errorMessage={errorMessage}
							nestingLevel={nestingLevel}
						/>
					)}
				</>
			);
		}
	} else if (contractCallsMap && contractCallsMap[callId] && callType === 'contract') {
		const contractCall = contractCallsMap[callId];
		if (!contractCall.isHidden) {
			let call = contractCallsMap[callId];
			return (
				<div className="relative flex w-full items-start">
					<div className="w-full min-w-0">
						<ContractCallTrace
							l2Flamegraph={l2Flamegraph}
							previewMode={previewMode}
							contractCallId={callId}
							nestingLevel={nestingLevel}
						/>
					</div>
					{/* {typeof call.sierraGas === 'number' &&
					call.sierraGas > 0 &&
					l2Flamegraph &&
					!previewMode ? (
						<span
							onClick={(e) => {
								e.stopPropagation();
								setChosenCallName(
									`${getContractName({ contractCall: call })}.${
										call?.entryPointName ?? shortenHash(call.entryPoint.entryPointSelector, 13)
									}`
								);
								setActiveTab('gas-profiler');
							}}
							className="sticky right-4 mt-1 -ml-20
									 min-w-[5rem] px-1.5 py-0.5 hover:bg-blue-200
									 dark:hover:bg-blue-700
									 text-center rounded-sm cursor-pointer
									 bg-blue-100 border border-blue-400 text-blue-900 dark:bg-[#004A7E] dark:text-white z-10"
						>
							{formatter.format(call.sierraGas)}
						</span>
					) : (
						!previewMode && (
							<TooltipProvider>
								<Tooltip delayDuration={100}>
									<TooltipTrigger asChild>
										<span
											className="sticky right-4 mt-1 -ml-20 flex-shrink-0
														 min-w-[5rem] px-1.5 py-0.5
														 text-center rounded-sm cursor-not-allowed
														 bg-blue-100 border border-blue-400 text-blue-900 z-10 dark:bg-[#004A7E] dark:text-white"
										>
											N/A
										</span>
									</TooltipTrigger>
									<TooltipContent className="bg-background border-border text-black dark:text-white border">
										Gas information available for transactions version 3 and sierra version 1.7.0 or
										above.
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)
					)} */}
				</div>
			);
		} else {
			return contractCall.functionCallId ? (
				<CommonCallTrace
					previewMode={previewMode}
					callId={contractCall.functionCallId}
					nestingLevel={nestingLevel}
					callType="function"
				/>
			) : (
				<>
					{contractCallIdsArray}
					{contractCall.isDeepestPanicResult && errorMessage && !previewMode && (
						<ErrorTraceLine
							executionFailed
							errorMessage={errorMessage}
							nestingLevel={nestingLevel}
						/>
					)}
				</>
			);
		}
	}
});
