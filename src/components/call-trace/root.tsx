import { SimulationResult, FlameNode } from '@/lib/simulation';
import { DebuggerPayload } from '@/lib/debugger';
import {
	CallTraceContextProvider,
	TabId,
	useCallTrace
} from '@/lib/context/call-trace-context-provider';
import { EventsList } from './event-entries';
import { Debugger } from '@/components/debugger';
import { DebuggerContextProvider } from '@/lib/context/debugger-context-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import CalldataSearch from '../ui/calldata-search';
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { CommonCallTrace } from './common-call-trace';
import { useCallback, useEffect } from 'react';
import StorageChanges from '../storage-changes';
import { GasProfiler } from '../gas-profiler';
import ErrorAlert from '../ui/error-alert';

export function CallTraceRoot({
	simulationResult,
	l2Flamegraph,
	l1DataFlamegraph,
	debuggerPayload
}: {
	simulationResult: SimulationResult;
	l2Flamegraph: FlameNode | undefined;
	l1DataFlamegraph: FlameNode | undefined;
	debuggerPayload: DebuggerPayload | null;
}) {
	return (
		<CallTraceContextProvider
			simulationResult={simulationResult}
			l2Flamegraph={l2Flamegraph}
			l1DataFlamegraph={l1DataFlamegraph}
			debuggerPayload={debuggerPayload}
		>
			{debuggerPayload && (
				<DebuggerContextProvider debuggerPayload={debuggerPayload}>
					<CallTraceRootContent />
				</DebuggerContextProvider>
			)}
			{!debuggerPayload && <CallTraceRootContent />}
		</CallTraceContextProvider>
	);
}

function CallTraceRootContent() {
	const {
		collapseAll,
		expandAll,
		activeTab,
		setActiveTab,
		simulationResult,
		l2Flamegraph,
		l1DataFlamegraph,
		setChosenCallName,
		debuggerPayload,
		callWithError
	} = useCallTrace();
	const onValueChange = useCallback(
		(value: string) => {
			setActiveTab(value as TabId);
			if (activeTab !== 'gas-profiler') {
				setChosenCallName(null);
			}
		},
		[setActiveTab]
	);
	return (
		<>
			{simulationResult.executionResult.executionStatus !== 'SUCCEEDED' && callWithError && (
				<div>
					<ErrorAlert callError={callWithError} />
				</div>
			)}

			<div
				className={`${
					simulationResult.executionResult.executionStatus !== 'SUCCEEDED' ? '' : 'mt-12'
				} h-full flex flex-col overflow-hidden`}
			>
				<Tabs
					value={activeTab}
					onValueChange={onValueChange}
					className="flex flex-col flex-1 overflow-hidden min-h-0"
				>
					<TabsList className="flex md:inline-flex md:w-fit dark:bg-card !justify-start md:justify-center flex-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-rounded">
						<TabsTrigger value="call-trace">Call Trace</TabsTrigger>
						{/*<TabsTrigger value="events-list">Events</TabsTrigger>*/}
						<TabsTrigger value="debugger">Debugger</TabsTrigger>
						{/*<TabsTrigger value="storage-changes">Storage</TabsTrigger>
					<TabsTrigger value="gas-profiler">Gas Profiler</TabsTrigger>*/}
					</TabsList>
					<TabsContent
						value="call-trace"
						className={`h-full flex flex-col flex-1 overflow-hidden min-h-0 ${
							activeTab !== 'call-trace' ? 'hidden' : ''
						}`}
					>
						<div className="whitespace-nowrap rounded-xl border flex flex-col flex-1 overflow-hidden min-h-0 dark:bg-card">
							<TooltipProvider>
								<div className="border-b shadow-sm flex-none">
									<div className="flex justify-between w-full items-center px-4">
										<CalldataSearch />
										<div className="pt-1 flex gap-1">
											<Tooltip delayDuration={100}>
												<TooltipTrigger>
													<div
														onClick={() => expandAll()}
														className="rounded-sm h-full p-1 hover:bg-accent cursor-pointer"
													>
														<PlusCircleIcon className="h-5 w-5" />
													</div>
												</TooltipTrigger>
												<TooltipContent className="bg-background border-border text-black dark:text-white border">
													<p>Expand all</p>
												</TooltipContent>
											</Tooltip>

											<Tooltip delayDuration={100}>
												<TooltipTrigger>
													<div
														onClick={() => collapseAll()}
														className="h-full p-1 rounded-sm select-none hover:bg-accent cursor-pointer"
													>
														<MinusCircleIcon className="h-5 w-5" />
													</div>
												</TooltipTrigger>
												<TooltipContent className="bg-background border-border text-black dark:text-white border">
													<p>Collapse all</p>
												</TooltipContent>
											</Tooltip>
										</div>
									</div>
								</div>
							</TooltipProvider>

							<ScrollArea className="flex-1 overflow-auto">
								<div className="text-xs px-0 py-2">
									<CommonCallTrace callId={0} nestingLevel={0} callType="contract" />
									<ScrollBar orientation="horizontal" />
								</div>
							</ScrollArea>
						</div>
					</TabsContent>
					<TabsContent
						value="events-list"
						className={`h-full flex flex-col flex-1 overflow-hidden min-h-0 ${
							activeTab !== 'events-list' ? 'hidden' : ''
						}`}
					>
						<div className="rounded-xl border flex flex-col flex-1 overflow-hidden min-h-0 text-xs dark:bg-card">
							<ScrollArea className="flex-1 overflow-auto">
								<div className="p-0 py-2">
									<EventsList events={simulationResult.events} />
								</div>
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</div>
					</TabsContent>
					<TabsContent
						value="debugger"
						className={`h-full flex flex-col flex-1 overflow-hidden min-h-0 ${
							activeTab !== 'debugger' ? 'hidden' : ''
						}`}
					>
						<div className="rounded-xl border flex flex-col flex-1 overflow-hidden min-h-0 text-xs dark:bg-card">
							<ScrollArea className="flex-1 overflow-auto">
								<Debugger debuggerPayload={debuggerPayload} />
							</ScrollArea>
						</div>
					</TabsContent>
					<TabsContent
						value="storage-changes"
						className={`h-full flex flex-col flex-1 overflow-hidden min-h-0 ${
							activeTab !== 'storage-changes' ? 'hidden' : ''
						}`}
					>
						<div className="rounded-xl border flex flex-col flex-1 overflow-hidden min-h-0 text-xs dark:bg-card">
							<ScrollArea className="flex-1 overflow-auto">
								<StorageChanges />
							</ScrollArea>
						</div>
					</TabsContent>
					<TabsContent
						value="gas-profiler"
						className={`h-full flex flex-col flex-1 overflow-hidden min-h-0 ${
							activeTab !== 'gas-profiler' ? 'hidden' : ''
						}`}
					>
						<div className="rounded-xl border flex flex-col flex-1 overflow-hidden min-h-0 text-xs">
							<ScrollArea className="flex-1 overflow-auto dark:bg-card">
								<GasProfiler l2Flamegraph={l2Flamegraph} l1DataFlamegraph={l1DataFlamegraph} />
							</ScrollArea>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</>
	);
}
