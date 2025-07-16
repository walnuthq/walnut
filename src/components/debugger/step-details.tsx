import { useCallTrace } from '@/lib/context/call-trace-context-provider';
import { cn } from '@/lib/utils';
import { DebuggerExecutionTraceEntry, FunctionCall, InternalFnCallIO } from '@/lib/simulation';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import FunctionCallViewer from '../ui/function-call-viewer';
import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface StepDetailsProps {
	step: DebuggerExecutionTraceEntry;
	functionCallsMap: { [key: number]: FunctionCall };
	className?: string;
	toggleExpand: () => void;
}

export function StepDetails({ step, functionCallsMap, className, toggleExpand }: StepDetailsProps) {
	const [isCallTraceExpanded, setIsCallTraceExpanded] = useState(true);

	const toggleCallTrace = useCallback(() => {
		setIsCallTraceExpanded((prev) => !prev);
	}, []);
	if (!isCallTraceExpanded) {
		return (
			<div className={cn('w-full h-full flex flex-col', className)}>
				<button
					onClick={() => {
						toggleCallTrace();
						toggleExpand();
					}}
					className="w-full px-2 py-1 flex items-center justify-between hover:bg-accent h-full"
				>
					<span className="font-medium uppercase whitespace-nowrap">Function Call Details</span>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>
		);
	}

	const stepWithLocation = step.withLocation;

	let functionName: string | undefined = undefined;
	let args: InternalFnCallIO[] = [];
	let result: InternalFnCallIO[] = [];

	const functionCallDetails = stepWithLocation?.functionCallId
		? functionCallsMap?.[stepWithLocation.functionCallId]
		: undefined;
	if (functionCallDetails) {
		const fullFnName = functionCallDetails?.fnName;
		functionName =
			fullFnName && fullFnName.includes('::')
				? fullFnName
						.replace(/::[^:]*<.*>/, '')
						.trim()
						.split('::')
						.pop()
				: fullFnName || '';
		args = functionCallDetails?.argumentsDecoded || [];
		result = functionCallDetails?.resultsDecoded || [];
	}

	const filteredStepInfo = {
		function: functionName,
		args,
		result
	};

	return (
		<div className={cn('w-full h-full flex flex-col', className)}>
			<button
				onClick={() => {
					toggleCallTrace();
					toggleExpand();
				}}
				className="w-full px-2 py-1 flex items-center justify-between hover:bg-accent h-[32px]"
			>
				<span className="font-medium uppercase whitespace-nowrap">Function Call Details</span>
				<ChevronDown className="w-4 h-4" />
			</button>
			<ScrollArea className="flex-1">
				{stepWithLocation ? (
					<FunctionCallViewer data={filteredStepInfo} />
				) : (
					<div className="flex px-2 py-1">No Function Call Details</div>
				)}

				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</div>
	);
}
