import React, { memo, useMemo } from 'react';
import { ContractCall, InternalFnCallIO, FunctionCall } from '@/lib/simulation';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { useCallTrace } from '@/lib/context/call-trace-context-provider';
import { CALL_NESTING_SPACE_BUMP, CallTypeChip, TraceLine } from '.';
import { ErrorTraceLine } from './error-trace-line';
import { useDebugger } from '@/lib/context/debugger-context-provider';
import { DebugButton } from './debug-btn';
import { CommonCallTrace } from './common-call-trace';
import { InfoBox } from '@/components/ui/info-box';
import { FnName } from '../ui/function-name';

export const FunctionCallTrace = memo(function FunctionCallTrace({
	previewMode,
	functionCallId,
	nestingLevel
}: {
	previewMode?: boolean;
	functionCallId: number;
	nestingLevel: number;
}) {
	const {
		collapsedCalls,
		toggleCallCollapse,
		expandedCalls,
		toggleCallExpand,
		setActiveTab,
		functionCallsMap,
		contractCallsMap,
		isExecutionFailed,
		traceLineElementRefs,
		errorMessage
	} = useCallTrace();
	const debuggerContext: ReturnType<typeof useDebugger> = useDebugger();

	const functionCall = functionCallsMap[functionCallId];
	const contractCall = contractCallsMap[functionCall.contractCallId];

	const isDebuggable = functionCall.debuggerDataAvailable;
	const isParentContractCallDebuggable = contractCall.callDebuggerDataAvailable;

	const noCodeLocationAvaliable = isParentContractCallDebuggable && !isDebuggable;
	if (!traceLineElementRefs.current[functionCallId]) {
		traceLineElementRefs.current[functionCallId] = React.createRef<HTMLDivElement>();
	}

	if (!debuggerContext) return null;
	const { debugContractCall, currentStep } = debuggerContext;

	return (
		<React.Fragment key={functionCallId}>
			<TraceLine
				previewMod={previewMode}
				className={`py-0.5 ${
					previewMode
						? isDebuggable
							? currentStep?.withLocation?.functionCallId === functionCallId ||
							  currentStep?.withContractCall?.contractCallId
								? 'bg-accent hover:bg-accent'
								: 'hover:!bg-accent'
							: ''
						: ''
				}`}
				isActive={!previewMode && expandedCalls[functionCallId]}
				onClick={() => {
					if (previewMode) {
						debugContractCall(functionCall.contractCallId);
					} else {
						toggleCallExpand(functionCallId);
					}
				}}
				ref={traceLineElementRefs.current[functionCallId]}
			>
				{!previewMode && CallTypeChip('Function')}

				{isExecutionFailed && <div className="w-5 mr-0.5"></div>}
				{!previewMode && (
					<DebugButton
						onDebugClick={() => {
							debugContractCall(functionCall.contractCallId);
							setActiveTab('debugger');
						}}
						isDebuggable={isDebuggable}
						noCodeLocationAvaliable={noCodeLocationAvaliable}
					/>
				)}

				<div
					style={{ marginLeft: nestingLevel * CALL_NESTING_SPACE_BUMP }}
					className="flex flex-row items-center trace-line_content"
				>
					<div
						className={`w-5 h-5 p-1 mr-1  rounded-sm  ${
							functionCall.childrenCallIds.length > 0 || functionCall.isDeepestPanicResult
								? 'cursor-pointer hover:!bg-accent_2'
								: ''
						}`}
						onClick={(event) => {
							event.stopPropagation();
							(functionCall.childrenCallIds.length > 0 || functionCall.isDeepestPanicResult) &&
								toggleCallCollapse(functionCallId);
						}}
					>
						{functionCall.childrenCallIds.length > 0 || functionCall.isDeepestPanicResult ? (
							collapsedCalls[functionCallId] === true ? (
								<ChevronRightIcon />
							) : (
								<ChevronDownIcon />
							)
						) : (
							''
						)}
					</div>
					<FnName fnName={functionCall.fnName} />
					{!previewMode && <CallIO ios={functionCall.arguments} />}
					{!previewMode && <span className="text-variable">&nbsp;{'->'}&nbsp;</span>}
					{!previewMode && <CallIO ios={functionCall.results} />}
				</div>
			</TraceLine>
			{expandedCalls[functionCallId] && !previewMode && (
				<FunctionCallDetails call={functionCall} contractCall={contractCall} />
			)}{' '}
			{collapsedCalls[functionCallId] != true && (
				<>
					{functionCall.childrenCallIds.map((nestedCallId) => (
						<CommonCallTrace
							previewMode={previewMode}
							key={nestedCallId}
							callId={nestedCallId}
							nestingLevel={nestingLevel + 1}
						/>
					))}
					{functionCall.isDeepestPanicResult && errorMessage && !previewMode && (
						<ErrorTraceLine
							executionFailed
							errorMessage={errorMessage}
							nestingLevel={nestingLevel + 1}
						/>
					)}
				</>
			)}
		</React.Fragment>
	);
});
const ioToSkip = ['RangeCheck', 'GasBuiltin'];
const CallIO = memo(function CallIO({ ios }: { ios: InternalFnCallIO[] }) {
	const iosList = useMemo(() => {
		return ios.map((io, i) =>
			ioToSkip.includes(io.typeName ?? '') ? null : (
				<React.Fragment key={i}>
					<span className="text-typeColor">{io.typeName}</span>:&nbsp;
					<span className="text-result">
						{io.value.length === 0
							? 'None'
							: io.value.length === 1
							? io.value[0]
							: `[${io.value.join(', ')}]`}
					</span>
					{i < ios.length - 1 ? <>,&nbsp;</> : ''}
				</React.Fragment>
			)
		);
	}, [ios]);
	return (
		<>
			<span className="text-highlight_yellow">{'('}</span>
			{iosList}
			<span className="text-highlight_yellow">{')'}</span>
		</>
	);
});

const FunctionCallDetails = memo(function FunctionCallDetails({
	call,
	contractCall
}: {
	call: FunctionCall;
	contractCall: ContractCall;
}) {
	const details: { name: string; value: string; isCopyable?: boolean; valueToCopy?: string }[] = [];
	if (call.fnName) {
		const splittedFnName = call.fnName.split('::');

		details.push(
			{
				name: 'Function Name',
				value: splittedFnName[splittedFnName.length - 1]
			},
			{
				name: 'Interface Name',
				value: call.fnName
			}
		);
	}
	if (call.arguments) {
		details.push({
			name: 'Raw Arguments',
			value: JSON.stringify(call.arguments)
		});
	}

	if (call.results) {
		details.push({
			name: 'Raw Results',
			value: JSON.stringify(call.results)
		});
	}

	return (
		<div className="flex flex-col bg-sky-50 dark:bg-background border-y border-blue-400 py-1 px-4">
			<div className="w-[calc(100vw-4rem)] sm:w-[calc(100vw-7rem)]">
				<div className="">
					<InfoBox details={details} />
				</div>
			</div>
		</div>
	);
});
