import { useEffect, useRef, useState } from 'react';
import { ResizablePanelGroup, ResizableHandle, ResizablePanel } from '../ui/resizable-panel';
// import { StepDetails } from '../debugger/step-details';
import CallTracePreview from './call-trace-preview';
import { useDebugger } from '@/lib/context/debugger-context-provider';
import { DebuggerFilesExplorer } from './debugger-file-explorer';

interface PanelHandle {
	collapse: () => void;
	expand: () => void;
	getId: () => string;
	getSize: () => number;
	isCollapsed: () => boolean;
	isExpanded: () => boolean;
	resize: (size: number) => void;
}
export default function Sidebar({
	handleFileClick
}: {
	handleFileClick: (filePath: string) => void;
}) {
	const debuggerContext = useDebugger();
	const inspectorFilePanelRef = useRef<PanelHandle>(null);
	const inspectorCallTracePanelRef = useRef<PanelHandle>(null);
	// const inspectorStepDetailsPanelRef = useRef<PanelHandle>(null);
	const [isFilesExpanded, setFilesExpanded] = useState(false);
	const [isCallTraceExpanded, setCallTraceExpanded] = useState(true);
	// const [isStepDetailsExpanded, setStepDetailsExpanded] = useState(true);

	useEffect(() => {
		if (!debuggerContext) return;

		// const expandedPanels = [isFilesExpanded, isCallTraceExpanded, isStepDetailsExpanded].filter(
		// 	Boolean
		// ).length;
		const expandedPanels = [isFilesExpanded, isCallTraceExpanded].filter(Boolean).length;

		// let sizes = [5, 47.5, 47.5];
		// if (expandedPanels === 1)
		// 	sizes = [
		// 		isStepDetailsExpanded ? 90 : 5,
		// 		isCallTraceExpanded ? 90 : 5,
		// 		isFilesExpanded ? 90 : 5
		// 	];
		// if (expandedPanels === 2)
		// 	sizes = [
		// 		isStepDetailsExpanded ? 47.5 : 5,
		// 		isCallTraceExpanded ? 47.5 : 5,
		// 		isFilesExpanded ? 47.5 : 5
		// 	];
		// if (expandedPanels === 3) sizes = [33, 33, 33];
		// if (expandedPanels === 0) sizes = [5, 5, 90];
		let sizes = [47.5, 47.5];
		if (expandedPanels === 1) sizes = [isCallTraceExpanded ? 90 : 5, isFilesExpanded ? 90 : 5];
		if (expandedPanels === 2) sizes = [50, 50];
		if (expandedPanels === 0) sizes = [5, 90];

		//inspectorStepDetailsPanelRef.current?.resize(sizes[0]);
		inspectorCallTracePanelRef.current?.resize(sizes[0]);
		inspectorFilePanelRef.current?.resize(sizes[1]);
	}, [isFilesExpanded, isCallTraceExpanded, debuggerContext]);

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
		runToBreakpoint,
		functionCallsMap,
		contractsDebuggerData
	} = debuggerContext;

	const toggleExpand = (setState: React.Dispatch<React.SetStateAction<boolean>>) => {
		setState((prev: boolean) => !prev);
	};

	return (
		<ResizablePanelGroup direction="vertical" className="h-full w-full">
			{/* <ResizablePanel
				ref={inspectorStepDetailsPanelRef}
				defaultSize={47.5}
				minSize={5}
				collapsedSize={5}
				className="min-h-[32px]"
				maxSize={isStepDetailsExpanded ? 90 : 5}
			>
				{currentStep && (
					<StepDetails
						step={currentStep}
						functionCallsMap={functionCallsMap}
						toggleExpand={() => toggleExpand(setStepDetailsExpanded)}
					/>
				)}
			</ResizablePanel> */}
			{/* <ResizableHandle
				disabled={!(isCallTraceExpanded && isStepDetailsExpanded)}
				className="w-[1px]"
			/> */}

			<ResizablePanel
				ref={inspectorCallTracePanelRef}
				defaultSize={47.5}
				minSize={5}
				collapsedSize={5}
				className="min-h-[32px]"
				maxSize={isCallTraceExpanded ? 90 : 5}
			>
				<CallTracePreview toggleExpand={() => toggleExpand(setCallTraceExpanded)} />
			</ResizablePanel>
			<ResizableHandle disabled={!(isFilesExpanded && isCallTraceExpanded)} />
			<ResizablePanel
				className="min-h-[32px]"
				ref={inspectorFilePanelRef}
				defaultSize={5}
				minSize={5}
				collapsedSize={5}
			>
				<DebuggerFilesExplorer
					currentStepIndex={currentStepIndex}
					className="flex h-full"
					contractsDebuggerData={contractsDebuggerData}
					classSourceCode={sourceCode}
					activeFile={activeFile}
					handleFileClick={handleFileClick}
					toggleExpand={() => toggleExpand(setFilesExpanded)}
				/>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
