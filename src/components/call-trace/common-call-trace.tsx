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
					<div className="w-5 mr-0.5"></div>
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
