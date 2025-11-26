import { SimulationResult, FlameNode, L2TransactionData } from '@/lib/simulation';
import { DebuggerPayload } from '@/lib/debugger';
import {
	CallTraceContextProvider,
	TabId,
	useCallTrace
} from '@/lib/context/call-trace-context-provider';
import { EventsList } from './event-entries';
import { EventsTab } from '@/components/events-tab';
import { EventsContextProvider, useEvents } from '@/lib/context/events-context-provider';
import { Debugger } from '@/components/debugger';
import { DebuggerContextProvider } from '@/lib/context/debugger-context-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import CalldataSearch from '../ui/calldata-search';
import {
	PlusCircleIcon,
	MinusCircleIcon,
	ClipboardDocumentIcon,
	ClockIcon
} from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { CommonCallTrace } from './common-call-trace';
import { useCallback, useEffect } from 'react';
import StorageChanges from '../storage-changes';
import { GasProfiler } from '../gas-profiler';
import { Error } from '@/components/ui/error';
import ErrorAlert from '../ui/error-alert';
import { Button } from '../ui/button';
import { copyToClipboard } from '@/lib/utils';
import { TransactionDetails } from '../transaction-page/l2-transaction-details';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export function CallTraceRoot({
	transactionData,
	debuggerPayload,
	txHash,
	chainId,
	rpcUrl
}: {
	transactionData: L2TransactionData;
	debuggerPayload: DebuggerPayload | null;
	txHash?: string;
	chainId?: string;
	rpcUrl?: string;
}) {
	return (
		<CallTraceContextProvider
			simulationResult={transactionData.simulationResult}
			l2Flamegraph={transactionData.l2Flamegraph}
			l1DataFlamegraph={transactionData.l1DataFlamegraph}
			debuggerPayload={debuggerPayload}
			transactionData={transactionData}
		>
			<EventsContextProvider txHash={txHash} chainId={chainId} rpcUrl={rpcUrl} shouldLoad={true}>
				{debuggerPayload && (
					<DebuggerContextProvider debuggerPayload={debuggerPayload}>
						<CallTraceRootContent txHash={txHash} />
					</DebuggerContextProvider>
				)}
				{!debuggerPayload && <CallTraceRootContent txHash={txHash} />}
			</EventsContextProvider>
		</CallTraceContextProvider>
	);
}

function CallTraceRootContent({ txHash }: { txHash?: string }) {
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
		callWithError,
		transactionData
	} = useCallTrace();
	const { events, loading, error } = useEvents();
	const onCopyToClipboardClick = (message: string) => {
		copyToClipboard(message);
	};
	const onValueChange = useCallback(
		(value: string) => {
			setActiveTab(value as TabId);
			if (activeTab !== 'gas-profiler') {
				setChosenCallName(null);
			}
		},
		[setActiveTab, activeTab, setChosenCallName]
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
					<TabsList className="inline-flex w-full sm:w-fit dark:bg-card justify-start sm:justify-center overflow-x-scroll sm:overflow-x-hidden">
						<TabsTrigger value="call-trace">Call Trace</TabsTrigger>
						<TabsTrigger value="transaction-details" className="md:hidden">
							Transaction Details
						</TabsTrigger>
						<TabsTrigger value="input-output">Input/Output</TabsTrigger>
						<TabsTrigger value="events-list">Events</TabsTrigger>
						<TabsTrigger value="debugger">Debugger</TabsTrigger>
						<TabsTrigger value="storage-changes">Storage</TabsTrigger>
						<TabsTrigger value="gas-profiler">Gas Profiler</TabsTrigger>
					</TabsList>
					<TabsContent
						value="transaction-details"
						className={`h-full flex flex-col flex-1 overflow-hidden min-h-0 ${
							activeTab !== 'transaction-details' ? 'hidden' : ''
						}`}
					>
						<TransactionDetails
							transactionData={transactionData}
							// rpcUrl={rpcUrl}
						/>
					</TabsContent>
					<TabsContent
						value="input-output"
						className={`h-full flex flex-col flex-1 overflow-hidden min-h-0 ${
							activeTab !== 'input-output' ? 'hidden' : ''
						}`}
					>
						<div className="rounded-xl border flex flex-col flex-1 overflow-hidden min-h-0 text-xs dark:bg-card">
							<ScrollArea className="flex-1 overflow-auto">
								{/* <MultiCallIO /> */}
								<Alert className="m-4 w-fit ">
									<div className="flex items-center gap-2">
										<ClockIcon className="h-5 w-5" />
										<div className="font-medium">Coming soon.</div>
									</div>
								</Alert>
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</div>
					</TabsContent>
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
							{error ? (
								<div className="rounded-md ">
									<div className="flex items-center justify-between border-b p-2 pl-4 rounded-t-md bg-card">
										<p className="text-sm">{'Walnut server error'}</p>

										<div className="flex items-center h-8">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onCopyToClipboardClick(error)}
											>
												<ClipboardDocumentIcon className="mr-2 h-4 w-4" /> Copy
											</Button>
										</div>
									</div>

									<ScrollArea className="h-fit rounded-b-md">
										<div className="flex w-full space-x-4 p-4">
											<pre className="text-red-700 text-xs whitespace-pre-wrap">{error}</pre>
										</div>
										<ScrollBar orientation="horizontal" />
									</ScrollArea>
								</div>
							) : txHash ? (
								<ScrollArea className="flex-1 overflow-auto">
									<EventsTab
										shouldLoad={activeTab === 'events-list'}
										events={events}
										loading={loading}
									/>
									<ScrollBar orientation="horizontal" />
								</ScrollArea>
							) : (
								<div className="px-4 py-2 text-sm">Data unavailable</div>
							)}
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
								{/* <StorageChanges /> */}
								<Alert className="m-4 w-fit ">
									<div className="flex items-center gap-2">
										<ClockIcon className="h-5 w-5" />
										<div className="font-medium">Coming soon.</div>
									</div>
								</Alert>
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
								{/* <GasProfiler l2Flamegraph={l2Flamegraph} l1DataFlamegraph={l1DataFlamegraph} /> */}
								<Alert className="m-4 w-fit ">
									<div className="flex items-center gap-2">
										<ClockIcon className="h-5 w-5" />
										<div className="font-medium">Coming soon.</div>
									</div>
								</Alert>
							</ScrollArea>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</>
	);
}
