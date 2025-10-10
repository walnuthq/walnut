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
import ValueWithTooltip from '../ui/value-with-tooltip';
import { getContractCompilationError } from '@/app/api/v1/utils/compilation-status-utils';

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
		functionCallsMap,
		isExecutionFailed,
		traceLineElementRefs,
		setChosenCallName,
		compilationSummary
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
	const { debugContractCall, currentStep, error: debuggerError } = debuggerContext;

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

	const isDebuggable = call?.callDebuggerDataAvailable;

	// Get compilation error for this contract if available
	const compilationError = compilationSummary
		? getContractCompilationError(
				call.entryPoint.storageAddress as `0x${string}`,
				compilationSummary
		  )
		: undefined;

	if (!traceLineElementRefs.current[contractCallId]) {
		traceLineElementRefs.current[contractCallId] = React.createRef<HTMLDivElement | null>();
	}

	function ArgsWithTooltips() {
		return (
			<>
				{call.argumentsNames?.map((name, i) => {
					const decoded = call.calldataDecoded?.[i];
					if (decoded == null) return <React.Fragment key={i}>{name},&nbsp;</React.Fragment>;

					return (
						<React.Fragment key={i}>
							<span className="relative inline-block">
								<span>{name}: </span>
								<span className="text-typeColor">{call.argumentsTypes?.[i] ?? 'unknown'}</span>
								<span> = </span>
								<ValueWithTooltip
									value={decoded}
									fullObject={decoded}
									typeName={call.argumentsTypes?.[i]}
									functionName={name}
									isContract
								/>
								{i < (call.argumentsNames?.length ?? 0) - 1 && ',\u00A0'}
							</span>
						</React.Fragment>
					);
				})}
			</>
		);
	}

	function ResultsWithTooltips() {
		return (
			<>
				{call.resultTypes?.map((resultType, i) => {
					const val = call.decodedResult?.[i];
					return (
						<span key={i}>
							<span>{resultType}</span>
							{val != null && (
								<>
									<span> = </span>
									<ValueWithTooltip
										value={val}
										fullObject={call.result}
										typeName={resultType}
										isContract
									/>
								</>
							)}
						</span>
					);
				})}
			</>
		);
	}

	return (
		<Fragment key={call.callId}>
			<TraceLine
				previewMod={previewMode}
				className={`py-0.5 ${
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
				{!previewMode && (
					<DebugButton
						onDebugClick={() => {
							debugContractCall(call.callId);
							setActiveTab('debugger');
						}}
						isDebuggable={isDebuggable}
						debuggerError={debuggerError}
						compilationError={compilationError}
					/>
				)}

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
					{!previewMode && call.argumentsNames && call.argumentsNames.length > 0 ? (
						<ArgsWithTooltips />
					) : !previewMode && call.entryPoint.calldata && call.entryPoint.calldata.length > 0 ? (
						<ValueWithTooltip
							value={{ typeName: 'bytes', name: 'calldata', value: call.entryPoint.calldata[0] }}
							fullObject={call.entryPoint.calldata[0]}
							typeName="bytes"
							functionName="calldata"
							isContract
						/>
					) : (
						<></>
					)}
					{!previewMode && <span className="text-highlight_yellow">{')'}</span>}
					{!previewMode && call.result && call.resultTypes && call.resultTypes.length > 0 ? (
						<>
							<span className="text-variable">&nbsp;{'->'}&nbsp;</span>
							<span className="text-highlight_yellow">{`(`}</span>
							<span className="text-typeColor">
								<ResultsWithTooltips />
							</span>
							<span className="text-highlight_yellow">{`)`}</span>
						</>
					) : !previewMode &&
					  call.result &&
					  'Success' in call.result &&
					  call.result.Success.retData &&
					  call.result.Success.retData.length > 0 ? (
						<>
							<span className="text-variable">&nbsp;{'->'}&nbsp;</span>
							<span className="text-highlight_yellow">{`(`}</span>
							<span className="text-typeColor">
								{(call.result as any).Success.retData.map((retData: any, index: number) => (
									<ValueWithTooltip
										key={index}
										value={{
											typeName: 'bytes',
											name: `result_${index}`,
											value: retData.value.val.join(', ')
										}}
										fullObject={retData.value.val}
										typeName="bytes"
										isContract
									/>
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
					{call.childrenCallIds.map((childId) => {
						if (contractCallsMap[childId]) {
							return (
								<CommonCallTrace
									previewMode={previewMode}
									key={childId}
									callId={childId}
									nestingLevel={nestingLevel + 1}
									callType="contract"
								/>
							);
						} else if (functionCallsMap[childId]) {
							return (
								<CommonCallTrace
									previewMode={previewMode}
									key={childId}
									callId={childId}
									nestingLevel={nestingLevel + 1}
									callType="function"
								/>
							);
						}
						return null;
					})}
					{call.isDeepestPanicResult && call.errorMessage && !previewMode && (
						<ErrorTraceLine
							executionFailed
							errorMessage={call.errorMessage}
							nestingLevel={nestingLevel + 1}
						/>
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

	// if (call.entryPointInterfaceName) {
	// 	details.push({
	// 		name: 'Interface Name',
	// 		value: call.entryPointInterfaceName
	// 	});
	// }

	if (call.errorMessage) {
		details.push({
			name: 'Error Message',
			value: call.errorMessage
		});
	}

	// if (call.cairoVersion) {
	// 	details.push({
	// 		name: 'Cairo Version',
	// 		value: call.cairoVersion
	// 	});
	// }

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
				const filePath = Object.keys(files).find((path) => path.includes(`${term}.sol`));
				if (filePath) return filePath;
			}
			return undefined;
		},
		[]
	);

	return (
		<div className="flex flex-col bg-sky-50 dark:bg-background border-y border-blue-400 py-1 px-4 ">
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
