import React, { Fragment, memo, useCallback, useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { CodeLocation, DataType, ContractCall, FlameNode } from '@/lib/simulation';
import { shortenHash } from '@/lib/utils';
import { useCallTrace } from '@/lib/context/call-trace-context-provider';
import { InfoBox } from '@/components/ui/info-box';
import { CALL_NESTING_SPACE_BUMP, CallTypeChip, TraceLine } from '.';
import { DecodeDataTable } from '../decode-data-table';
import { useDebugger } from '@/lib/context/debugger-context-provider';
import { DebugButton } from '@/components/call-trace/debug-btn';
import { ErrorTooltip } from '@/components/error-tooltip';
import { CommonCallTrace } from './common-call-trace';
import { ContractCallSignature } from '../ui/signature';
import { ErrorTraceLine } from './error-trace-line';
import { Copy } from 'lucide-react';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import FunctionCallViewer from '../ui/function-call-viewer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import CopyToClipboardElement from '../ui/copy-to-clipboard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';

export const ContractCallTrace = memo(function ContractCallTrace({
	contractCallId,
	nestingLevel,
	previewMode,
	l2Flamegraph
}: {
	contractCallId: number;
	nestingLevel: number;
	previewMode?: boolean;
	l2Flamegraph?: FlameNode | undefined;
}) {
	const {
		expandedCalls,
		collapsedCalls,
		toggleCallCollapse,
		toggleCallExpand,
		setActiveTab,
		contractCallsMap,
		isExecutionFailed,
		traceLineElementRefs,
		setChosenCallName
	} = useCallTrace();
	const debuggerContext: ReturnType<typeof useDebugger> = useDebugger();

	let call = contractCallsMap[contractCallId];
	const firstChildCallId = call.childrenCallIds[0];
	const firstChildCall = contractCallsMap[firstChildCallId];
	const formatter = new Intl.NumberFormat(navigator.language);
	let callType = call.entryPoint.callType;

	const hasNestedElements =
		call.childrenCallIds.length > 0 || call.functionCallId || call.isDeepestPanicResult;

	const childrenCallIdsArray = useMemo(() => {
		return call.childrenCallIds.map((childCallId) => (
			<CommonCallTrace
				previewMode={previewMode}
				key={childCallId}
				callId={childCallId}
				nestingLevel={nestingLevel + 1}
				callType="contract"
			/>
		));
	}, [call.childrenCallIds, nestingLevel, previewMode]);

	if (!debuggerContext) return null;
	const { debugContractCall, currentStep } = debuggerContext;

	// The error column doesn't render in case the whole tx is successful
	// If the tx is reverted, the error column will render for all call lines
	// Only the error-ed call line will have the error icon
	let errorColumn = <></>;
	if (isExecutionFailed) {
		errorColumn = (
			<div className="w-5 mr-0.5">
				{!!call.errorMessage && <ErrorTooltip errorMessage={call.errorMessage} />}
			</div>
		);
	}

	let contractName: string | undefined = undefined;
	if (call.contractName) {
		contractName = call.contractName;
	} else if (call.erc20TokenName || call.erc20TokenSymbol) {
		contractName = [call.erc20TokenName, `(${call.erc20TokenSymbol})`].join(' ');
	} else if (call.entryPointInterfaceName) {
		contractName = call.entryPointInterfaceName.split('::').pop();
	}

	if (!contractName) {
		contractName = shortenHash(call.entryPoint.storageAddress, 13);
	}

	const isDebuggable = call.callDebuggerDataAvailable;

	if (!traceLineElementRefs.current[contractCallId]) {
		traceLineElementRefs.current[contractCallId] = React.createRef<HTMLDivElement>();
	}

	function ArgsWithTooltips() {
		const [openIndex, setOpenIndex] = useState<number | null>(null);

		const handleCopy = async (text: string) => {
			try {
				await navigator.clipboard.writeText(text);
			} catch {
				console.error('Error copy');
			}
		};

		return (
			<>
				{call?.argumentsNames?.map((name, i) => {
					const type = call.argumentsTypes?.[i] ?? 'unknown';
					const decoded = call.calldataDecoded?.[i]?.value;
					const fullObj = call.calldataDecoded?.[i].value ?? {};

					const str = JSON.stringify(decoded).replace(/"/g, '');
					const preview =
						call.calldataDecoded &&
						(typeof call.calldataDecoded?.[i].value === 'string' ||
						typeof call.calldataDecoded?.[i].value === 'boolean'
							? str.length > 13
								? `${str.slice(0, 6)}...${str.slice(-6)}`
								: str
							: Array.isArray(call.calldataDecoded?.[i].value) &&
							  //@ts-ignore
							  call.calldataDecoded[i].value.every((item) => typeof item === 'string')
							? str.length > 13
								? `${str.slice(0, 6)}...${str.slice(-6)}`
								: str
							: Array.isArray(call.calldataDecoded?.[i].value) &&
							  //@ts-ignore
							  call.calldataDecoded[i].value.every((item) => Array.isArray(item))
							? str.length > 13
								? `${str.slice(0, 6)}...${str.slice(-6)}`
								: str
							: ((json) => (json.length > 16 ? `${json.slice(0, 8)}...${json.slice(-8)}` : json))(
									Array.isArray(call.calldataDecoded?.[i].value)
										? JSON.stringify(
												//@ts-ignore
												call.calldataDecoded[i].value.flatMap((item) =>
													Object.values(item).map((subItem) => ({
														//@ts-ignore
														[subItem.name]: subItem.value
													}))
												)
										  )
										: JSON.stringify(
												Object.values(call.calldataDecoded[i].value).map((item: any) => ({
													[item.name]: item.value
												}))
										  )
							  ));
					return (
						<React.Fragment key={i}>
							<span className="relative inline-block">
								<span>{name}: </span>
								<span className="text-typeColor">[{type}]</span>
								<span> = </span>
								<DropdownMenu>
									<TooltipProvider delayDuration={100}>
										<Tooltip>
											<TooltipTrigger asChild key={i + name}>
												<DropdownMenuTrigger asChild>
													<span
														className={`py-1 hover:bg-accent_2 h-full ${
															str.length > 13
																? 'text-variable border-variable'
																: 'text-result border-result'
														}  border-b  transition-colors duration-200 focus:outline-none rounded-sm`}
														onClick={(e) => {
															e.stopPropagation();
														}}
													>
														{`${preview}`}
													</span>
												</DropdownMenuTrigger>
											</TooltipTrigger>
											<TooltipContent className="bg-background border-border text-black dark:text-white border">
												Click to show full value
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									<DropdownMenuContent
										className="bg-card shadow-xl border rounded-lg text-xs max-w-[90vw] w-fit min-w-[16rem] p-0"
										onClick={(e) => {
											e.stopPropagation();
										}}
										onMouseDown={(e) => {
											e.stopPropagation();
										}}
										onWheel={(e) => {
											e.stopPropagation();
										}}
										onScroll={(e) => {
											e.stopPropagation();
										}}
									>
										<div className="relative">
											<CopyToClipboardElement
												value={JSON.stringify(fullObj, null, 2)}
												toastDescription={`${name} has been copied`}
												className="absolute top-2 right-3 z-10 bg-accent p-1.5 rounded transition-colors duration-200 focus:outline-none focus:ring-2"
												aria-label="Copy"
											>
												<Copy size={14} />
											</CopyToClipboardElement>

											<ScrollArea
												className="w-full max-h-72 p-3 pr-12 overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-accent [&::-webkit-scrollbar-thumb]:rounded-full"
												onScroll={(e) => e.stopPropagation()}
											>
												{call.calldataDecoded?.[i].value && (
													<FunctionCallViewer
														data={{
															function: name,
															//@ts-ignore
															args:
																typeof call.calldataDecoded[i].value === 'object' &&
																!Array.isArray(call.calldataDecoded[i].value)
																	? [call.calldataDecoded[i].value]
																	: call.calldataDecoded[i].value,
															typeName: type
														}}
														isContract
													/>
												)}
											</ScrollArea>
										</div>
									</DropdownMenuContent>
								</DropdownMenu>

								<span>
									{call.argumentsNames && i < call.argumentsNames.length - 1 && ',\u00A0'}
								</span>
							</span>
						</React.Fragment>
					);
				})}
			</>
		);
	}
	const truncateString = (str: string, maxLength = 13) => {
		return str.length > maxLength ? `${str.slice(0, 6)}...${str.slice(-6)}` : str;
	};
	return (
		<Fragment key={call.callId}>
			<TraceLine
				previewMod={previewMode}
				className={`${
					previewMode
						? isDebuggable
							? currentStep?.withLocation?.contractCallId === call.callId
								? 'bg-accent hover:bg-accent'
								: 'hover:!bg-accent'
							: ''
						: ''
				}`}
				isActive={!previewMode && expandedCalls[call.callId]}
				onClick={() => {
					if (previewMode) {
						debugContractCall(call.callId);
					} else {
						toggleCallExpand(call.callId);
					}
				}}
				ref={traceLineElementRefs.current[contractCallId]}
			>
				{!previewMode && CallTypeChip(callType)}

				{/* Error column
				 * Empty in most lines,
				 * or exclamation triangle icon in case of error on the line
				 */}
				{errorColumn}
				{/*!previewMode && (
					<DebugButton
						onDebugClick={() => {
							debugContractCall(call.callId);
							setActiveTab('debugger');
						}}
						isDebuggable={isDebuggable}
					/>
				)*/}

				<div
					style={{ marginLeft: nestingLevel * CALL_NESTING_SPACE_BUMP }}
					className="flex flex-row items-center trace-line_content"
				>
					<div
						className={`w-5 h-5 p-1 mr-1  rounded-sm  ${
							hasNestedElements ? 'cursor-pointer hover:bg-accent_2' : ''
						}`}
						onClick={(event) => {
							event.stopPropagation();
							hasNestedElements && toggleCallCollapse(call.callId);
						}}
					>
						{hasNestedElements ? (
							collapsedCalls[call.callId] == true ? (
								<ChevronRightIcon />
							) : (
								<ChevronDownIcon />
							)
						) : (
							''
						)}
					</div>

					<ContractCallSignature contractCall={call} />
					{!previewMode && <span className="text-highlight_yellow">{'('}</span>}
					{!previewMode && call.argumentsNames ? <ArgsWithTooltips /> : <></>}
					{!previewMode && <span className="text-highlight_yellow">{')'}</span>}
					{!previewMode && call.result && call.resultTypes ? (
						<>
							<span className="text-variable">&nbsp;{'->'}&nbsp;</span>
							<span className="text-highlight_yellow">{`(`}</span>
							<span className="text-typeColor">
								{call.resultTypes.map((resultType, i) => (
									<span key={i}>
										<span>{resultType}</span>
										{call.decodedResult && (
											<TooltipProvider delayDuration={100}>
												<Tooltip>
													<span className="text-foreground"> = </span>
													<TooltipTrigger>
														<CopyToClipboardElement
															value={JSON.stringify(call.decodedResult[i].value).replace(
																/^"|"$/g,
																''
															)}
															toastDescription={'Value copied'}
														>
															<span
																className={`${
																	JSON.stringify(call.decodedResult[i].value).replace(/^"|"$/g, '')
																		.length > 13
																		? 'text-variable'
																		: 'text-result'
																}   py-1`}
															>
																{truncateString(
																	JSON.stringify(call.decodedResult[i].value).replace(/^"|"$/g, '')
																)}
															</span>
														</CopyToClipboardElement>
													</TooltipTrigger>
													<TooltipContent className="bg-background border-border text-black dark:text-white border">
														{JSON.stringify(call.decodedResult[i].value).replace(/^"|"$/g, '')}
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										)}
									</span>
								))}
							</span>
							<span className="text-highlight_yellow">{`)`}</span>
						</>
					) : (
						<>
							<span className="text-highlight_yellow">{'->()'}</span>{' '}
						</>
					)}
				</div>
			</TraceLine>
			{expandedCalls[call.callId] && !previewMode && <ContractCallDetails call={call} />}{' '}
			{collapsedCalls[call.callId] != true && (
				<>
					{call.functionCallId ? (
						<CommonCallTrace
							previewMode={previewMode}
							callId={call.functionCallId}
							nestingLevel={nestingLevel + 1}
							callType="function"
						/>
					) : (
						<>
							{childrenCallIdsArray}
							{call.isDeepestPanicResult && call.errorMessage && !previewMode && (
								<ErrorTraceLine
									executionFailed
									errorMessage={call.errorMessage}
									nestingLevel={nestingLevel + 1}
								/>
							)}
						</>
					)}
				</>
			)}
		</Fragment>
	);
});

const ContractCallDetails = memo(function ContractCallDetails({ call }: { call: ContractCall }) {
	const details: { name: string; value: string; isCopyable?: boolean; valueToCopy?: string }[] = [
		{
			name: 'Entry Point Type',
			value: call.entryPoint.entryPointType
		},
		{
			name: 'Caller Address',
			value: call.entryPoint.callerAddress
		},
		{
			name: 'Initial Gas',
			value: call.entryPoint.initialGas.toString()
		},
		{
			name: 'Contract Address',
			value: call.entryPoint.storageAddress
		},
		{
			name: 'Class Hash',
			value: call.entryPoint.classHash
		},
		{
			name: 'Entrypoint Selector',
			value: call.entryPoint.entryPointSelector
		}
	];

	if (call.erc20TokenName) {
		details.push({
			name: 'Token Name',
			value: call.erc20TokenName
		});
	}

	if (call.erc20TokenSymbol) {
		details.push({
			name: 'Token Symbol',
			value: call.erc20TokenSymbol
		});
	}

	if (call.entryPointName) {
		details.push({
			name: 'Function Name',
			value: call.entryPointName
		});
	}

	/* if (call.entryPointInterfaceName) {
		details.push({
			name: 'Interface Name',
			value: call.entryPointInterfaceName
		});
	} */

	if (call.errorMessage) {
		details.push({
			name: 'Error Message',
			value: call.errorMessage
		});
	}

	if (call.cairoVersion) {
		details.push({
			name: 'Cairo Version',
			value: call.cairoVersion
		});
	}

	if (call.result) {
		details.unshift({
			name: 'Raw Result',
			value: JSON.stringify(call.result)
		});
	}
	let contractName: string | null = call.contractName ?? null;
	let entryPointInterfaceName: string | null = call.entryPointInterfaceName ?? null;

	const cairoLocation: CodeLocation | undefined = call.codeLocation ?? undefined;

	const findFilePath = useCallback(
		(terms: string[], files: { [key: string]: string }): string | undefined => {
			for (const term of terms) {
				const filePath = Object.keys(files).find((path) => path.includes(`${term}.cairo`));
				if (filePath) return filePath;
			}
			return undefined;
		},
		[]
	);

	return (
		<div className="flex flex-col bg-sky-50 dark:bg-background border-y border-blue-400 py-2 px-4 ">
			<div className="w-[calc(100vw-4rem)] sm:w-[calc(100vw-7rem)]">
				<div className="">
					<InfoBox details={details} />
					{call.entryPoint.calldata && (
						<DecodeDataTable
							rawData={call.entryPoint.calldata}
							decodeData={call.calldataDecoded}
							type={DataType.CALLDATA}
						/>
					)}
					{call.decodedResult && (
						<DecodeDataTable decodeData={call.decodedResult} type={DataType.OUTPUT} />
					)}
				</div>
			</div>
		</div>
	);
});
