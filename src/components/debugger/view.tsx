import { useEffect } from 'react';
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup
} from '@/components/ui/resizable-panel';
import { CodeViewer } from '../code-viewer/code-viewer';
import { useDebugger } from '@/lib/context/debugger-context-provider';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ContractCallSignature } from '../ui/signature';
import { ContractCall } from '@/lib/simulation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Link from 'next/link';
import Sidebar from '../code-viewer/sidebar';
import { SOURCIFY_VERIFY_DOCS_URL } from '@/lib/config';
import { useCallTrace } from '@/lib/context/call-trace-context-provider';

export function DebuggerView() {
	const debuggerContext = useDebugger();
	if (!debuggerContext) {
		return null;
	}

	const {
		currentStep,
		activeFile,
		setActiveFile,
		codeLocation,
		sourceCode,
		contractCall,
		isExpressionHover,
		currentStepIndex,
		totalSteps,
		nextStep,
		prevStep,
		stepOver,
		runToBreakpoint
	} = debuggerContext;

	return (
		<ResizablePanelGroup direction="horizontal" className="w-full flex flex-row">
			<ResizablePanel
				defaultSize={30}
				className="flex flex-col justify-between gap-4 border-neutral-200"
			>
				<Sidebar handleFileClick={setActiveFile} />
			</ResizablePanel>
			<ResizableHandle withHandle className="w-[1px]" />
			<ResizablePanel defaultSize={70} className="flex flex-col flex-grow">
				<Controls
					nextStep={nextStep}
					previousStep={prevStep}
					stepIndex={currentStepIndex}
					totalSteps={totalSteps}
					contractCall={contractCall}
					activeFile={activeFile}
				/>
				<div className="flex-grow">
					{currentStep?.withLocation ? (
						<CodeViewer
							key={`${contractCall?.classHash}-${activeFile}`} // Force re-render only on contract/file change, not on every step
							content={activeFile ? sourceCode[activeFile] : ''}
							codeLocation={codeLocation}
							highlightClass={`${
								isExpressionHover ? 'bg-yellow-500' : 'bg-yellow-300'
							} bg-opacity-20 dark:bg-opacity-10 transition-all`}
							args={codeLocation ? currentStep.withLocation.arguments : undefined}
							results={codeLocation ? currentStep.withLocation.results : undefined}
						/>
					) : (
						<Alert className="m-4 w-fit">
							<ExclamationTriangleIcon className="h-5 w-5" />
							<AlertTitle>No Source Code Available</AlertTitle>
							<AlertDescription>
								<p className="mt-2 mb-1">
									Contract Address:{' '}
									<span className="font-mono">{contractCall?.entryPoint.storageAddress}</span>
								</p>
								<p>
									The source code for this contract is missing. To enable the step-by-step debugger,
									verify the contract on Sourcify by following{' '}
									<Link
										className="underline-offset-4 hover:underline text-blue-500"
										href={SOURCIFY_VERIFY_DOCS_URL}
									>
										this guide
									</Link>
									.
								</p>
							</AlertDescription>
						</Alert>
					)}
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function Controls({
	nextStep,
	previousStep,
	// stepOver, // commented out
	stepIndex,
	totalSteps,
	contractCall,
	activeFile
}: // runToBreakpoint // commented out
{
	nextStep: () => void;
	previousStep: () => void;
	// stepOver: () => void; // commented out
	stepIndex: number;
	totalSteps: number;
	contractCall?: ContractCall;
	activeFile?: string;
	// runToBreakpoint: () => void; // commented out
}) {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
				return;
			}
			if (event.key.toLowerCase() === 'b') {
				previousStep();
			} else if (event.key.toLowerCase() === 'n') {
				nextStep();
			}
			// else if (event.key.toLowerCase() === 'o') {
			// 	stepOver();
			// }
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [previousStep, nextStep]); // removed stepOver
	const { contractCallsMap } = useCallTrace();

	let call = contractCall?.callId && contractCallsMap[contractCall?.callId];
	return (
		<div className="flex flex-row border-b py-1 px-3 justify-between items-center">
			<div>{activeFile && activeFile.split('/').pop()?.split('.')[0]}</div>
			<div className="flex flex-row gap-3 items-center">
				<div>
					Step {stepIndex + 1}/{totalSteps}
				</div>
				<TooltipProvider>
					<div className="flex flex-row gap-1">
						<Tooltip delayDuration={100}>
							<TooltipTrigger>
								<div
									onClick={() => previousStep()}
									className={`w-5 h-5 p-0.5 rounded-sm select-none ${
										stepIndex <= 0
											? 'cursor-not-allowed opacity-60'
											: 'cursor-pointer hover:bg-accent'
									}`}
								>
									<div className="icon">
										<svg
											className=" w-4 h-4 text-blue-500"
											viewBox="0 0 16 16"
											xmlns="http://www.w3.org/2000/svg"
											fill="#3b82f6"
										>
											<path
												fillRule="evenodd"
												clipRule="evenodd"
												d="M8 1h-.542L3.553 4.905l1.061 1.06 2.637-2.61v6.177h1.498V3.355l2.637 2.61 1.061-1.06L8.542 1H8zm1.956 12.013a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
											/>
										</svg>
									</div>
								</div>
							</TooltipTrigger>
							<TooltipContent className="bg-background border-border text-black dark:text-white border">
								Previous (b)
							</TooltipContent>
						</Tooltip>
						<Tooltip delayDuration={100}>
							<TooltipTrigger>
								<div
									onClick={() => nextStep()}
									className={`w-5 h-5 p-0.5 rounded-sm select-none ${
										stepIndex >= totalSteps - 1
											? 'cursor-not-allowed opacity-60'
											: 'cursor-pointer hover:bg-accent'
									}`}
								>
									<div className="icon">
										<svg
											className=" w-4 h-4 text-blue-500"
											viewBox="0 0 16 16"
											xmlns="http://www.w3.org/2000/svg"
											fill="#3b82f6"
										>
											<path
												fillRule="evenodd"
												clipRule="evenodd"
												d="M8 9.532h.542l3.905-3.905-1.061-1.06-2.637 2.61V1H7.251v6.177l-2.637-2.61-1.061 1.06 3.905 3.905H8zm1.956 3.481a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
											/>
										</svg>
									</div>
								</div>
							</TooltipTrigger>
							<TooltipContent className="bg-background border-border text-black dark:text-white border">
								Next (n)
							</TooltipContent>
						</Tooltip>
						{/*
						<Tooltip delayDuration={100}>
							<TooltipTrigger>
								<div
									onClick={() => stepOver()}
									className={`w-5 h-5 p-0.5 rounded-sm select-none ${
										stepIndex >= totalSteps - 1
											? 'cursor-not-allowed opacity-60'
											: 'cursor-pointer hover:bg-accent'
									}`}
								>
									<div className="icon">
										<svg
											className=" w-4 h-4 text-blue-500"
											viewBox="0 0 16 16"
											xmlns="http://www.w3.org/2000/svg"
											fill="#3b82f6"
										>
											<path
												fillRule="evenodd"
												clipRule="evenodd"
												d="M14.25 5.75v-4h-1.5v2.542c-1.145-1.359-2.911-2.209-4.84-2.209-3.177 0-5.92 2.307-6.16 5.398l-.02.269h1.501l.022-.226c.212-2.195 2.202-3.94 4.656-3.94 1.736 0 3.244.875 4.05 2.166h-2.83v1.5h4.163l.962-.975V5.75h-.004zM8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
											/>
										</svg>
									</div>
								</div>
							</TooltipTrigger>
							<TooltipContent className="bg-background border-border text-black dark:text-white border">
								Step over (o)
							</TooltipContent>
						</Tooltip>
						<Tooltip delayDuration={100}>
							<TooltipTrigger>
								<div
									onClick={() => runToBreakpoint()}
									className={`w-5 h-5 p-0.5 rounded-sm select-none ${
										stepIndex >= totalSteps - 1
											? 'cursor-not-allowed opacity-60'
											: 'cursor-pointer hover:bg-accent'
									}`}
								>
									<div className="icon">
										<svg
											className=" w-4 h-4 text-blue-500"
											viewBox="0 0 16 16"
											xmlns="http://www.w3.org/2000/svg"
											fill="#3b82f6"
										>
											<path
												fillRule="evenodd"
												clipRule="evenodd"
												d="M4.25 3l1.166-.624 8 5.333v1.248l-8 5.334-1.166-.624V3zm1.5 1.401v7.864l5.898-3.932L5.75 4.401z"
											/>
										</svg>
									</div>
								</div>
							</TooltipTrigger>
							<TooltipContent className="bg-background border-border text-black dark:text-white border">
								Run
							</TooltipContent>
						</Tooltip>
						*/}
					</div>
				</TooltipProvider>
			</div>
		</div>
	);
}
