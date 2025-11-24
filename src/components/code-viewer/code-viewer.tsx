// eslint-disable-next-line import/named
import { Editor as MonacoEditor, Monaco, useMonaco } from '@monaco-editor/react';
import { editor as Editor } from 'monaco-editor';
import { cn } from '@/lib/utils';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CodeLocation, InternalFnCallIO } from '@/lib/simulation';
import { useDebugger } from '@/lib/context/debugger-context-provider';
import { useTheme } from 'next-themes';
import { registerSolidityLanguageSupport } from './solidity-lang-config';

export function CodeViewer({
	content,
	highlightClass,
	args,
	results,
	codeLocation
}: {
	content: string;
	highlightClass?: string;
	args?: InternalFnCallIO[];
	results?: InternalFnCallIO[];
	codeLocation: CodeLocation | undefined;
}) {
	const { resolvedTheme } = useTheme(); // 'light' | 'dark' | 'system'
	const isDark = resolvedTheme === 'dark';
	const editorRef = useRef<Editor.IStandaloneCodeEditor | null>(null);
	const [editorDecorations, setEditorDecorations] =
		useState<Editor.IEditorDecorationsCollection | null>(null);
	const breakpointDecorationsRef = useRef<string[]>([]);
	const monaco = useMonaco();
	const [hoverLine, setHoverLine] = useState<number | null>(null);
	const [prevCodeValue, setPrevCodeValue] = useState<string | null>(null);
	const activeFileRef = useRef<string | undefined>(undefined);
	const classHashRef = useRef<string | undefined>(undefined);
	const breakPointsLinesRef = useRef<number[] | undefined>(undefined);
	const [contractSwitchCount, setContractSwitchCount] = useState(0);

	const debuggerContext = useDebugger();
	const {
		activeFile,
		contractCall,
		availableBreakpoints = {},
		fileBreakpoints = {},
		toggleBreakpoint,
		isExpressionHover
	} = debuggerContext ?? {};

	const classAvailableBreakpoints = contractCall
		? availableBreakpoints[contractCall.classHash]
		: undefined;
	const classFileBreakpoints = contractCall ? fileBreakpoints[contractCall.classHash] : undefined;
	const classHash = contractCall ? contractCall.classHash : undefined;

	if (!highlightClass) highlightClass = 'bg-neutral-300 bg-opacity-40 dark:bg-opacity-20';

	useEffect(() => {
		activeFileRef.current = activeFile;
	}, [activeFile, classHash, contractCall?.callId]);

	useEffect(() => {
		if (classHashRef.current !== classHash) {
			// Contract changed - trigger smooth transition
			setContractSwitchCount((prev) => prev + 1);
		}
		classHashRef.current = classHash;
	}, [classHash, activeFile, contractCall?.callId]);

	useEffect(() => {
		if (classAvailableBreakpoints && activeFile && classAvailableBreakpoints[activeFile]) {
			breakPointsLinesRef.current = classAvailableBreakpoints[activeFile].map((bp) => bp + 1);
		}
	}, [activeFile, classAvailableBreakpoints]);

	const getCurrentFileBreakpoints = useCallback((): number[] => {
		if (!activeFileRef.current) return [];

		const fileEntry = classFileBreakpoints && classFileBreakpoints[activeFileRef.current];

		return fileEntry ? fileEntry.map((bp) => bp + 1) : [];
	}, [classFileBreakpoints]);

	const highlightCodeLocation = useCallback(
		(
			codeLocation: CodeLocation,
			editor: Editor.IStandaloneCodeEditor,
			_monaco: Monaco,
			isSmoothScroll: boolean
		) => {
			if (!_monaco || !editor) return;
			const range = new _monaco.Range(
				codeLocation.start.line + 1,
				codeLocation.start.col + 1,
				codeLocation.end.line + 1,
				codeLocation.end.col + 1
			);

			const isHighlightOnScreen = isRangeVisible(range.startLineNumber, range.endLineNumber);

			if (!isHighlightOnScreen) {
				editor.revealRangeInCenter(
					range.plusRange(
						new _monaco.Range(
							range.startLineNumber - 2,
							range.startColumn,
							range.endLineNumber,
							range.endColumn
						)
					),
					isSmoothScroll ? 0 : 1
				);
			}

			editorDecorations?.clear();
			setTimeout(() => {
				const decorations = [
					{
						range: range,
						options: {
							inlineClassName: highlightClass
						}
					}
				];
				const editorDecorations = editor.createDecorationsCollection(decorations);
				setEditorDecorations(editorDecorations);
			});
		},
		[editorDecorations, highlightClass]
	);

	const handleEditorDidMount = useCallback(
		async (editor: Editor.IStandaloneCodeEditor, monaco: Monaco) => {
			editorRef.current = editor;

			registerSolidityLanguageSupport(monaco as any);

			editor.onMouseMove((e) => {
				if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
					const lineNumber = e.target.position?.lineNumber;

					if (!lineNumber) return;

					const isBreakpointLine = breakPointsLinesRef.current
						? breakPointsLinesRef.current.some((bp: number) => bp === lineNumber)
						: null;

					if (isBreakpointLine && lineNumber !== hoverLine) {
						setHoverLine(lineNumber);
					} else if (!isBreakpointLine && hoverLine) {
						setHoverLine(null);
					}
				} else if (hoverLine) {
					setHoverLine(null);
				}
			});

			editor.onMouseLeave(() => {
				if (hoverLine) setHoverLine(null);
			});

			editor.onMouseDown((e) => {
				if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
					const lineNumber = e.target.position?.lineNumber;

					if (!lineNumber) return;

					const validBreakpointLine = breakPointsLinesRef.current
						? breakPointsLinesRef.current.some((bp: number) => bp === lineNumber)
						: null;

					if (
						validBreakpointLine &&
						toggleBreakpoint &&
						activeFileRef.current &&
						classHashRef.current
					) {
						toggleBreakpoint(lineNumber - 1, activeFileRef.current, classHashRef.current);
					} else {
						console.log(`Line ${lineNumber} is not a valid breakpoint line`);
					}
				}
			});

			if (codeLocation) {
				highlightCodeLocation(codeLocation, editor, monaco, false);
			}
		},
		[codeLocation, hoverLine, toggleBreakpoint, highlightCodeLocation, args, results]
	);

	const updateBreakpointDecorations = useCallback(
		(currentHoverLine: number | null) => {
			if (!editorRef.current || !monaco || !activeFileRef.current) return;

			const currentFileBreakpoints = getCurrentFileBreakpoints();
			const decorations = [
				...currentFileBreakpoints.map((line) => ({
					range: new monaco.Range(line, 1, line, 1),
					options: {
						isWholeLine: false,
						glyphMarginClassName: 'breakpoint-active',
						glyphMarginHoverMessage: { value: 'Delete breakpoint' }
					}
				})),
				...(currentHoverLine &&
				!currentFileBreakpoints.includes(currentHoverLine) &&
				breakPointsLinesRef.current &&
				breakPointsLinesRef.current.some((bp: number) => bp === currentHoverLine)
					? [
							{
								range: new monaco.Range(currentHoverLine, 1, currentHoverLine, 1),
								options: {
									isWholeLine: false,
									glyphMarginClassName: 'breakpoint-hover',
									glyphMarginHoverMessage: { value: 'Add breakpoint' }
								}
							}
					  ]
					: [])
			];

			breakpointDecorationsRef.current = editorRef.current.deltaDecorations(
				breakpointDecorationsRef.current,
				decorations
			);
		},
		[monaco, getCurrentFileBreakpoints]
	);

	useEffect(() => {
		updateBreakpointDecorations(hoverLine);
	}, [classFileBreakpoints, hoverLine, updateBreakpointDecorations, activeFile]);

	useEffect(() => {
		if (editorRef.current && monaco) {
			if (codeLocation) {
				// Use smooth scroll when content changes, instant when same content
				const isSmoothScroll = content !== prevCodeValue;
				highlightCodeLocation(codeLocation, editorRef.current, monaco, isSmoothScroll);
			} else {
				editorRef.current.revealLineNearTop(0, 1);
			}
			setPrevCodeValue(content);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [codeLocation, args, results, isExpressionHover, content, contractSwitchCount]);

	useEffect(() => {
		const styleId = 'breakpoint-style';
		if (!document.getElementById(styleId)) {
			const style = document.createElement('style');
			style.id = styleId;
			style.innerHTML = `
				.breakpoint-active {
					background: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle fill='%23E51400' cx='8' cy='8' r='4'/%3E%3C/svg%3E") center center no-repeat;
					cursor: pointer;
				}
				.breakpoint-hover:hover {
					background: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle fill='%23888888' cx='8' cy='8' r='4'/%3E%3C/svg%3E") center center no-repeat;
					cursor: pointer;
					opacity: 0.5;
				}
				.monaco-editor .margin-view-overlays .cgmr {
					cursor: pointer;
				}
			`;
			document.head.appendChild(style);
		}
	}, []);

	const isRangeVisible = (startLine: number, endLine: number) => {
		const editor = editorRef.current;
		if (editor) {
			const visibleRanges = editor.getVisibleRanges();
			return visibleRanges.some(
				(visibleRange) =>
					visibleRange.startLineNumber <= endLine && visibleRange.endLineNumber >= startLine
			);
		}
		return false;
	};

	return (
		<MonacoEditor
			onMount={handleEditorDidMount}
			theme={isDark ? 'vs-dark' : 'vs-light'}
			options={{
				minimap: { enabled: false },
				wordBreak: 'keepAll',
				readOnly: true,
				glyphMargin: true,
				smoothScrolling: true,
				lineNumbers: 'on',
				lineNumbersMinChars: 3,
				lineDecorationsWidth: 15
			}}
			value={content}
			language="solidity"
			className={cn(
				'whitespace-pre-wrap overflow-x-scroll p-0 m-0 w-full h-full absolute top-0 left-0'
			)}
		/>
	);
}
