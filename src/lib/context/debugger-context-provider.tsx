import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	useCallback,
	PropsWithChildren
} from 'react';
import {
	ContractDebuggerData,
	CodeLocation,
	ContractCall,
	DebuggerExecutionTraceEntry,
	FunctionCall,
	SimulationDebuggerData,
	TransactionSimulationResult
} from '@/lib/simulation';
import { CallTraceContext } from './call-trace-context-provider';
import {
	debugTransactionByData,
	debugCustomNetworkTransactionByHash,
	DebuggerPayload,
	DebuggerInfo
} from '@/lib/debugger';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { usePathname, useSearchParams } from 'next/navigation';
import debugData from '@/lib/utils/demo_data/reverted_debug_response.json';
import debugSimulationData from '@/lib/utils/demo_data/debug_resposne.json';

interface DebuggerContextProps {
	functionCallsMap: { [key: number]: FunctionCall };
	contractsDebuggerData: Record<string, ContractDebuggerData>;
	currentStep?: DebuggerExecutionTraceEntry;
	totalSteps: number;
	currentStepIndex: number;
	activeFile: string | undefined;
	contractCall?: ContractCall;
	codeLocation?: CodeLocation;
	sourceCode: Record<string, string>;
	availableBreakpoints: Record<string, Record<string, number[]>>;
	debugFunctionCall: (functionCallId: number) => void;
	debugContractCall: (contractCallId: number) => void;
	nextStep: () => void;
	prevStep: () => void;
	stepOver: () => void;
	runToBreakpoint: () => void;
	setActiveFile: (filePath: string) => void;
	setCurrentContractCall: (contractCall: ContractCall) => void;
	isFunctionCallDebuggable: (functionCallId: number) => boolean;
	isContractCallDebuggable: (contractCallId: number) => boolean;
	fileBreakpoints: Record<string, Record<string, number[]>>;
	toggleBreakpoint: (lineNumber: number, activeFile: string, classHash: string) => void;
	isExpressionHover: boolean;
	setExpressionHover: (isHover: boolean) => void;
	loading: boolean;
	error?: string | null;
	hasDebuggableContract: boolean;
	getStepForFunctionCall: (functionCallId: number) => DebuggerExecutionTraceEntry | undefined;
	getStepForContractCall: (contractCallId: number) => DebuggerExecutionTraceEntry | undefined;
}

export const DebuggerContext = createContext<DebuggerContextProps | undefined>(undefined);

export const useDebugger = () => {
	const context = useContext(DebuggerContext);
	if (!context) return null;
	return context;
};

export const DebuggerContextProvider = ({
	children,
	debuggerPayload
}: PropsWithChildren<{ debuggerPayload: DebuggerPayload }>) => {
	const [debuggerInfo, setDebuggerInfo] = useState<DebuggerInfo | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [currentStepIndex, _setCurrentStepIndex] = useState(0);
	const [currentStep, _setCurrentStep] = useState<DebuggerExecutionTraceEntry | undefined>(
		undefined
	);
	const [activeFile, setActiveFile] = useState<string>();
	const [fileBreakpoints, setFileBreakpoints] = useState<Record<string, Record<string, number[]>>>(
		{}
	);
	const [contractCall, setContractCall] = useState<ContractCall>();
	const [codeLocation, setCodeLocation] = useState<CodeLocation>();
	const [sourceCode, setSourceCode] = useState<Record<string, string>>({});
	const [isExpressionHover, setExpressionHover] = useState(false);
	const [hasDebuggableContract, setHasDebuggableContract] = useState(false);
	const pathname = usePathname();
	const { contractCallsMap: callTraceContractCalls, functionCallsMap: callTraceFunctionCalls } =
		useContext(CallTraceContext);
	const CACHE_TTL_MS = 0; //15 * 60 * 1000;
	const searchParams = useSearchParams();

	function safeStringify(value: any): string {
		return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v));
	}

	function safeParse<T = any>(value: string): T {
		return JSON.parse(value, (_, v) => {
			if (typeof v === 'string' && /^\d+n$/.test(v)) {
				return BigInt(v.slice(0, -1));
			}
			return v;
		});
	}

	function getDebuggerCacheKey(payload: DebuggerPayload) {
		const raw = safeStringify(payload);
		const hash = btoa(unescape(encodeURIComponent(raw))).slice(0, 100);
		return `debugger:${hash}`;
	}

	function getCachedDebuggerInfo(key: string) {
		const compressed = localStorage.getItem(key);
		if (!compressed) return null;

		try {
			const json = decompressFromUTF16(compressed);
			if (!json) throw new Error('decompression failed');

			const record = safeParse<{ timestamp: number; data: any }>(json);
			if (!record.timestamp || !record.data) return null;

			if (Date.now() - record.timestamp > CACHE_TTL_MS) {
				localStorage.removeItem(key);
				return null;
			}

			return record.data;
		} catch {
			localStorage.removeItem(key);
			return null;
		}
	}

	function clearExpiredLocalStorage() {
		const now = Date.now();

		for (let i = localStorage.length - 1; i >= 0; i--) {
			const key = localStorage.key(i);
			if (!key) continue;

			try {
				const compressed = localStorage.getItem(key);
				if (!compressed) continue;

				const json = decompressFromUTF16(compressed);
				if (!json) continue;

				const parsed = safeParse<{ timestamp?: number }>(json);
				if (parsed?.timestamp && now - parsed.timestamp > CACHE_TTL_MS) {
					localStorage.removeItem(key);
				}
			} catch {
				localStorage.removeItem(key);
			}
		}
	}

	function setCachedDebuggerInfo(key: string, data: any) {
		const json = safeStringify({ timestamp: Date.now(), data });
		const compressed = compressToUTF16(json);

		try {
			localStorage.setItem(key, compressed);
		} catch (e) {
			if (e instanceof DOMException && e.name === 'QuotaExceededError') {
				console.warn('localStorage full — clearing expired entries');
				clearExpiredLocalStorage();
				try {
					localStorage.setItem(key, compressed);
				} catch (e2) {
					console.error('Failed to cache after cleanup:', e2);
				}
			} else {
				console.error('localStorage write failed:', e);
			}
		}
	}

	useEffect(() => {
		const fetch = async () => {
			setLoading(true);

			try {
				const isDemoPage = pathname === '/demo';
				const isDemoSimulationPage = pathname === '/demo/simulation';

				if (isDemoPage || isDemoSimulationPage) {
					const result = isDemoPage ? debugData : debugSimulationData;

					setDebuggerInfo(result as any);

					if ((result as any)?.simulationDebuggerData?.debuggerTrace) {
						const i = findInitialIndex((result as any).simulationDebuggerData.debuggerTrace);
						_setCurrentStepIndex(i);
						_setCurrentStep((result as any).simulationDebuggerData.debuggerTrace[i]);
					}

					setLoading(false);
					return;
				}

				if (!debuggerPayload) {
					setLoading(false);
					return;
				}

				const hasDebuggableContract_ = Object.values(callTraceContractCalls).some(
					(call) => call?.callDebuggerDataAvailable
				);
				setHasDebuggableContract(hasDebuggableContract_);

				if (!hasDebuggableContract_) {
					setLoading(false);
					return;
				}

				const cacheKey = getDebuggerCacheKey(debuggerPayload);
				const cached = getCachedDebuggerInfo(cacheKey);

				if (cached) {
					setDebuggerInfo(cached);
					if (cached?.simulationDebuggerData?.debuggerTrace) {
						const i = findInitialIndex(cached.simulationDebuggerData.debuggerTrace);
						_setCurrentStepIndex(i);
						_setCurrentStep(cached.simulationDebuggerData.debuggerTrace[i]);
					}
					setLoading(false);
					return;
				}

				const txHash = searchParams.get('txHash');
				const result = txHash
					? await debugCustomNetworkTransactionByHash({
							chainKey: debuggerPayload?.chainId ?? undefined,
							txHash
					  })
					: await debugTransactionByData(debuggerPayload);

				setDebuggerInfo(result);
				setCachedDebuggerInfo(cacheKey, result);

				if (result?.simulationDebuggerData?.debuggerTrace) {
					const i = findInitialIndex(result.simulationDebuggerData.debuggerTrace);
					_setCurrentStepIndex(i);
					_setCurrentStep(result.simulationDebuggerData.debuggerTrace[i]);
				}
			} catch (err: any) {
				setError(err.message || 'Unknown error');
			} finally {
				setLoading(false);
			}
		};

		fetch();
	}, [debuggerPayload]);

	const simulationDebuggerData = debuggerInfo?.simulationDebuggerData;
	const contractCallsMap = debuggerInfo?.contractCallsMap || {};
	const functionCallsMap = debuggerInfo?.functionCallsMap || {};

	useEffect(() => {
		if (!simulationDebuggerData) return;
		const step = simulationDebuggerData.debuggerTrace[currentStepIndex];
		_setCurrentStep(step);

		const { contractCall, classSourceCode, activeFile, codeLocation } = getDebuggerDataForStep(
			contractCallsMap,
			simulationDebuggerData,
			step
		);

		// Auto-switch contract context when step changes
		const previousContractCall = contractCall;
		setContractCall(contractCall);
		setSourceCode(classSourceCode);
		setActiveFile(activeFile);
		setCodeLocation(codeLocation);

		if (previousContractCall?.classHash !== contractCall?.classHash) {
			// Force update activeFile if it's not set or doesn't exist in new contract
			if (!activeFile || !classSourceCode[activeFile]) {
				const availableFiles = Object.keys(classSourceCode);
				if (availableFiles.length > 0) {
					const newActiveFile = availableFiles[0];
					setActiveFile(newActiveFile);
				}
			}
		}
	}, [currentStepIndex, simulationDebuggerData]);

	const availableBreakpoints = useMemo(() => {
		if (!simulationDebuggerData) return {};
		const breakpoints: { [key: string]: { [key: string]: number[] } } = {};

		for (const classHash in simulationDebuggerData.contractDebuggerData) {
			breakpoints[classHash] = {};
			if (simulationDebuggerData.contractDebuggerData[classHash]) {
				for (const pcIndex in simulationDebuggerData.contractDebuggerData[classHash].pcToCodeInfo) {
					const info = simulationDebuggerData.contractDebuggerData[classHash].pcToCodeInfo[pcIndex];
					for (const codeLocation of info.codeLocations) {
						if (!breakpoints[classHash][codeLocation.filePath]) {
							breakpoints[classHash][codeLocation.filePath] = [];
						}
						const start = codeLocation.start.line;
						const end = codeLocation.end.line;
						for (let i = start; i <= end; i++) {
							if (!breakpoints[classHash][codeLocation.filePath].includes(i)) {
								breakpoints[classHash][codeLocation.filePath].push(i);
							}
						}
					}
				}
			}
		}

		return breakpoints;
	}, [simulationDebuggerData]);

	const toggleBreakpoint = (lineNumber: number, activeFile: string, classHash: string) => {
		setFileBreakpoints((prev) => {
			const newFileBreakpoints = JSON.parse(JSON.stringify(prev));

			if (!newFileBreakpoints[classHash]) {
				newFileBreakpoints[classHash] = {};
			}

			if (!newFileBreakpoints[classHash][activeFile]) {
				newFileBreakpoints[classHash][activeFile] = [];
			}

			const breakpointIndex = newFileBreakpoints[classHash][activeFile].indexOf(lineNumber);

			if (breakpointIndex !== -1) {
				newFileBreakpoints[classHash][activeFile] = newFileBreakpoints[classHash][
					activeFile
				].filter((bp: number) => bp !== lineNumber);
			} else {
				newFileBreakpoints[classHash][activeFile] = [
					...newFileBreakpoints[classHash][activeFile],
					lineNumber
				];
			}
			if (newFileBreakpoints[classHash][activeFile].length === 0) {
				delete newFileBreakpoints[classHash][activeFile];

				if (Object.keys(newFileBreakpoints[classHash]).length === 0) {
					delete newFileBreakpoints[classHash];
				}
			}

			return newFileBreakpoints;
		});
	};

	function setCurrentStepIndex(index: number) {
		_setCurrentStepIndex(index);
		const newStep = simulationDebuggerData?.debuggerTrace[index];
		_setCurrentStep(newStep);

		const { contractCall, classSourceCode, activeFile, codeLocation, functionCallId } =
			getDebuggerDataForStep(contractCallsMap, simulationDebuggerData || null, newStep || null);

		// Optimized contract switching with smooth transition
		const previousContractCall = contractCall;
		// Update contract call first
		setContractCall(contractCall);
		// Update source code for the new contract
		setSourceCode(classSourceCode);
		// Set active file for the new contract context
		setActiveFile(activeFile);
		// Update code location for highlighting
		setCodeLocation(codeLocation);

		if (previousContractCall?.classHash !== contractCall?.classHash) {
			// Force update activeFile if it's not set or doesn't exist in new contract
			if (!activeFile || !classSourceCode[activeFile]) {
				const availableFiles = Object.keys(classSourceCode);
				if (availableFiles.length > 0) {
					const newActiveFile = availableFiles[0];
					setActiveFile(newActiveFile);
				}
			}
		}
	}

	const setCurrentContractCall = (call: ContractCall) => {
		if (call.debuggerTraceStepIndex != null) {
			setCurrentStepIndex(call.debuggerTraceStepIndex);
		}
	};

	const debugFunctionCall = (functionCallId: number) => {
		const fc = functionCallsMap[functionCallId];
		if (fc?.debuggerTraceStepIndex != null) {
			setCurrentStepIndex(fc.debuggerTraceStepIndex);
		}
	};

	const debugContractCall = (contractCallId: number) => {
		const cc = contractCallsMap[contractCallId];
		if (cc?.debuggerTraceStepIndex != null) {
			setCurrentStepIndex(cc.debuggerTraceStepIndex);
		}
	};

	const nextStep = () => {
		if (!simulationDebuggerData) return;
		if (currentStepIndex < simulationDebuggerData.debuggerTrace.length - 1) {
			setCurrentStepIndex(currentStepIndex + 1);
		}
	};

	const prevStep = () => {
		if (currentStepIndex > 0) {
			setCurrentStepIndex(currentStepIndex - 1);
		}
	};

	const stepOver = () => {
		if (!simulationDebuggerData) return;
		if (currentStepIndex < simulationDebuggerData.debuggerTrace.length - 1) {
			const currentStep = simulationDebuggerData.debuggerTrace[currentStepIndex];
			let nextStepIndex = currentStepIndex + 1;
			if (currentStep.withLocation && currentStep.withLocation.fp) {
				while (nextStepIndex + 1 < simulationDebuggerData.debuggerTrace.length) {
					const nextStepWithCodeLocation =
						simulationDebuggerData.debuggerTrace[nextStepIndex].withLocation;
					if (nextStepWithCodeLocation) {
						if (nextStepWithCodeLocation.fp <= currentStep.withLocation.fp) {
							break;
						}
					}
					nextStepIndex++;
				}
			}
			setCurrentStepIndex(nextStepIndex);
		}
	};

	const runToBreakpoint = () => {
		if (!simulationDebuggerData) return;

		for (let i = currentStepIndex + 1; i < simulationDebuggerData.debuggerTrace.length; i++) {
			if (simulationDebuggerData.debuggerTrace[i].withLocation) {
				const step = simulationDebuggerData.debuggerTrace[i].withLocation!;
				const contractCall = contractCallsMap[step.contractCallId];
				const classHash = contractCall.classHash;
				const contractDebuggerData = simulationDebuggerData.contractDebuggerData[classHash];
				const info = contractDebuggerData.pcToCodeInfo[step.pcIndex];
				const location = info.codeLocations[step.locationIndex];
				const linesRange = Array.from(
					{ length: location.end.line - location.start.line + 1 },
					(_, k) => k + location.start.line
				);
				if (
					fileBreakpoints[classHash] &&
					fileBreakpoints[classHash][location.filePath] &&
					fileBreakpoints[classHash][location.filePath].some((line) => linesRange.includes(line))
				) {
					setCurrentStepIndex(i);
					return;
				}
			}
		}
		setCurrentStepIndex(simulationDebuggerData.debuggerTrace.length - 1);
	};

	const isContractCallDebuggable = (id: number) =>
		contractCallsMap[id]?.debuggerTraceStepIndex != null;

	const isFunctionCallDebuggable = (id: number) =>
		functionCallsMap[id]?.debuggerTraceStepIndex != null;

	const getStepForFunctionCall = (functionCallId: number) => {
		const fc = functionCallsMap[functionCallId];
		if (fc?.debuggerTraceStepIndex != null) {
			return simulationDebuggerData?.debuggerTrace[fc.debuggerTraceStepIndex];
		}
		return undefined;
	};

	const getStepForContractCall = (contractCallId: number) => {
		const cc = contractCallsMap[contractCallId];
		if (cc?.debuggerTraceStepIndex != null) {
			setCurrentStepIndex(cc.debuggerTraceStepIndex);
			return simulationDebuggerData?.debuggerTrace[cc.debuggerTraceStepIndex];
		}
		return undefined;
	};

	return (
		<DebuggerContext.Provider
			value={{
				functionCallsMap,
				contractsDebuggerData: simulationDebuggerData?.contractDebuggerData || {},
				currentStep,
				totalSteps: simulationDebuggerData?.debuggerTrace.length || 0,
				currentStepIndex,
				activeFile,
				contractCall,
				codeLocation,
				sourceCode,
				availableBreakpoints,
				debugFunctionCall,
				debugContractCall,
				nextStep,
				prevStep,
				stepOver,
				runToBreakpoint,
				setActiveFile,
				setCurrentContractCall,
				isContractCallDebuggable,
				isFunctionCallDebuggable,
				fileBreakpoints,
				toggleBreakpoint,
				isExpressionHover,
				setExpressionHover,
				loading,
				error,
				getStepForFunctionCall,
				getStepForContractCall,
				hasDebuggableContract
			}}
		>
			{children}
		</DebuggerContext.Provider>
	);
};

// Helpers
function findInitialIndex(trace: DebuggerExecutionTraceEntry[]) {
	return trace.findIndex((step) => step.withLocation) || 0;
}

function getDebuggerDataForStep(
	contractCallsMap: { [key: string]: ContractCall },
	simulationDebuggerData: SimulationDebuggerData | null,
	step: DebuggerExecutionTraceEntry | null
) {
	const contractCallId = step?.withLocation
		? step.withLocation.contractCallId
		: step?.withContractCall?.contractCallId;
	const contractCall =
		contractCallId !== undefined && contractCallId !== null
			? contractCallsMap[String(contractCallId)]
			: undefined;

	let classHash = contractCall?.classHash;
	let contractDebuggerData: any = undefined;

	// Enhanced contract detection logic

	const findContractByClassHash = (targetClassHash: string) => {
		if (!targetClassHash || !simulationDebuggerData?.contractDebuggerData) return undefined;

		const normalizedTarget = targetClassHash.toUpperCase();
		for (const [key, data] of Object.entries(simulationDebuggerData.contractDebuggerData)) {
			if (key.toUpperCase() === normalizedTarget) {
				return { key, data };
			}
		}
		return undefined;
	};

	if (classHash) {
		const foundContract = findContractByClassHash(classHash);
		if (foundContract) {
			classHash = foundContract.key; // Use the exact key from the data
			contractDebuggerData = foundContract.data;
		}
	}

	// if (classHash && simulationDebuggerData?.contractDebuggerData?.[classHash]) {
	// 	contractDebuggerData = simulationDebuggerData.contractDebuggerData[classHash];
	// 	console.log('Found contract by classHash:', classHash);
	// } else if (step?.withLocation?.pcIndex !== undefined) {
	// 	// Try to find contract by PC mapping
	// 	console.log('Searching by PC mapping for PC:', step.withLocation.pcIndex);
	// 	for (const [hash, data] of Object.entries(simulationDebuggerData?.contractDebuggerData ?? {})) {
	// 		if (data.pcToCodeInfo && data.pcToCodeInfo[step.withLocation!.pcIndex]) {
	// 			classHash = hash;
	// 			contractDebuggerData = data;
	// 			console.log('Found contract by PC mapping:', hash);
	// 			break;
	// 		}
	// 	}
	// }

	// Fallback: take first contractDebuggerData from object
	if (!contractDebuggerData) {
		const allClassData = Object.values(simulationDebuggerData?.contractDebuggerData ?? {});
		contractDebuggerData = allClassData.length > 0 ? allClassData[0] : undefined;
		classHash =
			allClassData.length > 0
				? Object.keys(simulationDebuggerData?.contractDebuggerData ?? {})[0]
				: undefined;
	}

	const contractSourceCode = contractDebuggerData?.sourceCode ?? {};

	let activeFile: string | undefined;
	let codeLocation: CodeLocation | undefined;
	let functionCallId: number | undefined;

	if (step?.withLocation) {
		const pcIndex = String(step.withLocation.pcIndex);
		const locations = contractDebuggerData?.pcToCodeInfo?.[pcIndex]?.codeLocations;
		codeLocation = locations?.[step.withLocation.locationIndex];
		if (!codeLocation) {
			console.warn('No codeLocation for', {
				classHash,
				pcIndex,
				locationIndex: step.withLocation.locationIndex,
				locations
			});
		}
		activeFile = codeLocation?.filePath;
		functionCallId = step.withLocation.functionCallId;
	} else {
		if (contractDebuggerData) {
			const someFile = Object.keys(contractDebuggerData.sourceCode)[0];
			if (someFile) activeFile = someFile;
		}
	}

	// Enhanced fallback for activeFile with contract context awareness
	if (!activeFile && simulationDebuggerData) {
		// First try to find file in current contract context
		if (contractDebuggerData?.sourceCode) {
			activeFile = Object.keys(contractDebuggerData.sourceCode)[0];
		}

		// If still no file, fallback to any available source code
		if (!activeFile) {
			const allSourceCodes = Object.values(simulationDebuggerData.contractDebuggerData ?? {});
			const firstSourceCode = allSourceCodes.length > 0 ? allSourceCodes[0].sourceCode : {};
			activeFile = Object.keys(firstSourceCode)[0];
		}
	}

	// Force update activeFile when contract changes and no valid codeLocation
	if (!activeFile && contractDebuggerData?.sourceCode) {
		// Get the first available file for this contract
		const availableFiles = Object.keys(contractDebuggerData.sourceCode);
		if (availableFiles.length > 0) {
			activeFile = availableFiles[0];
		}
	}

	return {
		contractCall,
		classSourceCode: contractSourceCode,
		activeFile,
		codeLocation,
		functionCallId
	};
}
