import React, { useState, useEffect, useRef } from 'react';
import { TriangleRightIcon, TriangleDownIcon } from '@radix-ui/react-icons';
import { useDebugger } from '@/lib/context/debugger-context-provider';
import CopyToClipboardElement from './copy-to-clipboard';
import AddressLink from '../address-link';
import { DecodedItem, InternalFnCallIO, TextPosition } from '@/lib/simulation';

interface FilteredStepInfo {
	function?: string | undefined;
	args: InternalFnCallIO[] | string | string[] | DecodedItem[] | boolean;
	result?: InternalFnCallIO[];
	typeName?: string;
}

const FunctionCallViewer = ({
	data,
	isContract = false,
	tooltipValue = false
}: {
	data: FilteredStepInfo;
	isContract?: boolean;
	tooltipValue?: boolean;
}) => {
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const [expression, setExpression] = useState<string>('');
	const [results, setResults] = useState<InternalFnCallIO[] | undefined>(undefined);
	const [args, setArgs] = useState<InternalFnCallIO[] | undefined>(undefined);
	const debuggerContext = useDebugger();

	useEffect(() => {
		if (!debuggerContext) return;
		setResults(debuggerContext.currentStep?.withLocation?.resultsDecoded);
		setArgs(debuggerContext.currentStep?.withLocation?.argumentsDecoded);
	}, [debuggerContext]);

	useEffect(() => {
		if (
			!debuggerContext?.activeFile ||
			!debuggerContext?.codeLocation?.start ||
			!debuggerContext?.codeLocation?.end
		)
			return;
		setExpression(
			truncateString(
				extractCodeFragment(
					debuggerContext.sourceCode[debuggerContext.codeLocation.filePath],
					debuggerContext.codeLocation.start,
					debuggerContext.codeLocation.end
				),
				50
			)
		);
	}, [debuggerContext]);

	function extractCodeFragment(sourceCode: string, start: TextPosition, end: TextPosition): string {
		const lines = sourceCode.split('\n');
		const startLine = start.line;
		const endLine = end.line;
		if (startLine === endLine) {
			return lines[startLine]?.substring(start.col, end.col);
		}

		let fragment = [];
		fragment.push(lines[startLine]?.substring(start.col));
		for (let i = startLine + 1; i < endLine; i++) {
			fragment.push(lines[i]);
		}
		fragment.push(lines[endLine]?.substring(0, end.col));
		return fragment.join('\n');
	}

	function truncateString(str: string | undefined, maxLength: number): string {
		if (!str) return '';
		const cleanedStr = str.replace(/\s+/g, ' ').trim();
		if (cleanedStr.length <= maxLength) return cleanedStr;
		return cleanedStr.substring(0, maxLength) + '...';
	}

	const toggleExpand = (key: string): void => {
		setExpanded((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(key)) newSet.delete(key);
			else newSet.add(key);
			return newSet;
		});
	};

	const formatObject = (obj: any): any => {
		if (Array.isArray(obj)) {
			return obj.map((item: any) => formatObject(item));
		}
		if (
			typeof obj === 'object' &&
			obj !== null &&
			('name' in obj || 'typeName' in obj) &&
			'value' in obj
		) {
			const key = obj.name || obj.typeName;
			return { [key]: formatObject(obj.value) };
		}
		if (typeof obj === 'object' && obj !== null) {
			const keys = Object.keys(obj);
			if (keys.every((key: string) => !isNaN(Number(key)))) {
				return keys.reduce((acc: Record<string, any>, key: string) => {
					const formatted = formatObject(obj[key]);
					if (typeof formatted === 'object' && !Array.isArray(formatted)) {
						Object.keys(formatted).forEach((formattedKey: string) => {
							acc[`${formattedKey}_${key}`] = formatted[formattedKey];
						});
					} else {
						acc[key] = formatted;
					}
					return acc;
				}, {});
			}
			return Object.fromEntries(keys.map((key: string) => [key, formatObject(obj[key])]));
		}
		return obj;
	};

	const renderData = (
		item: any,
		name: string | number,
		path: string,
		skipName = false,
		isRoot = false
	) => {
		const key = path;
		const isExpandable = item && typeof item === 'object';
		const isArray = Array.isArray(item);
		const isAddress = typeof item === 'string' && item.startsWith('0x');

		if (isExpandable) {
			const entries = isArray ? item : Object.entries(item);
			if (isArray && entries.length === 1) {
				const singleItem = entries[0];
				if (typeof singleItem === 'object' && singleItem !== null) {
					return (
						<div className={`font-mono ${isRoot ? '' : 'ml-2'}`}>
							{!skipName && (
								<div className="mb-1.5">
									<span className={`font-semibold ${isRoot ? '' : 'text-pink-900 dark:text-keys'}`}>
										{name}:{' '}
									</span>
								</div>
							)}
							<div className={skipName ? '' : 'ml-2 mb-1.5'}>
								{Object.entries(singleItem).map(([childKey, childVal]) => (
									<div key={childKey} className="whitespace-pre">
										{renderData(childVal, childKey, `${key}.0.${childKey}`, false, false)}
									</div>
								))}
							</div>
						</div>
					);
				}
			}

			return (
				<div className={`font-mono ${isRoot ? '' : 'ml-2'}`}>
					<div
						className="flex items-center cursor-pointer select-none hover:bg-accent pr-1 rounded-sm transition-all delay-75 ease-out mb-1.5 mr-2"
						onClick={() => toggleExpand(key)}
					>
						<span className="-m-1">
							{expanded.has(key) ? (
								<TriangleDownIcon className="h-4 w-4 mr-1" />
							) : (
								<TriangleRightIcon className="h-4 w-4 mr-1" />
							)}
						</span>
						{!skipName && (
							<span className={`font-semibold ${isRoot ? '' : 'text-pink-900 dark:text-keys'} `}>
								{typeof name === 'string' && name.includes('_') ? name.split('_')[0] : name}:
							</span>
						)}
						{!expanded.has(key) && (
							<span className="italic font-normal">
								{isArray
									? `(${entries.length}) [${
											entries.length > 0
												? entries.length === 1 && typeof entries[0] === 'string'
													? entries[0]
													: '...'
												: ''
									  }]`
									: `(${entries.length}) {...}`}
							</span>
						)}
					</div>

					{expanded.has(key) && (
						<div className="ml-2 mb-1.5">
							{isArray
								? entries.map((child, idx) => (
										<div key={idx} className="whitespace-pre mb-1.5">
											{renderData(child, idx, `${key}.${idx}`, false, false)}
										</div>
								  ))
								: entries.map(([childKey, childVal]) => (
										<div key={childKey} className="whitespace-pre mb-1.5">
											{renderData(
												childVal,
												typeof childKey === 'string' && childKey.includes('_')
													? childKey.split('_')[0]
													: childKey,
												`${key}.${childKey}`,
												false,
												false
											)}
										</div>
								  ))}
						</div>
					)}
				</div>
			);
		}

		return (
			<div className={`${isRoot ? '' : 'ml-2'} mb-1.5`}>
				{!skipName && (
					<span className={` ${isRoot ? '' : 'dark:text-keys text-pink-900'}  font-semibold`}>
						{typeof name === 'string' && name.includes('_') ? name.split('_')[0] : name}:
					</span>
				)}
				<CopyToClipboardElement
					value={item.toString()}
					toastDescription="Copied!"
					className={`${isAddress ? 'py-1 px-0' : 'px-1'}`}
				>
					{isAddress ? (
						<AddressLink address={item}>
							<span className="whitespace-nowrap">{item}</span>
						</AddressLink>
					) : (
						item.toString()
					)}
				</CopyToClipboardElement>
			</div>
		);
	};

	const formattedArgs = formatObject(data.args);
	const formattedResult = data.result ? formatObject(data.result) : null;

	if (!debuggerContext) {
		return null;
	}

	const { codeLocation, setExpressionHover } = debuggerContext;

	return (
		<div className="font-mono px-2 my-2">
			{data.function && (
				<div className="font-bold mb-1.5">
					{isContract ? 'arg: ' : 'fn: '}{' '}
					<span className="text-function_pink">{data.function}</span>
				</div>
			)}
			{data.typeName && (
				<div className="mb-1.5">
					<span className="font-semibold ">
						type: <span className="font-normal text-typeColor">{data.typeName}</span>
					</span>
				</div>
			)}
			<div className="mb-1.5">
				{typeof data.args === 'boolean' ||
				(Array.isArray(data.args)
					? data.args.length > 0
					: typeof data.args === 'object' &&
					  data.args !== null &&
					  Object.keys(data.args).length > 0) ||
				typeof data.args === 'string' ? (
					<div className="whitespace-nowrap mb-1.5">
						{renderData(formattedArgs, tooltipValue ? 'value' : 'args', 'args', false, true)}
					</div>
				) : (
					<span className="font-semibold ">{tooltipValue ? 'value: ' : 'args: '} </span>
				)}
			</div>

			{!isContract && data.result && (
				<div className="mb-1.5">
					{data.result.length > 0 ? (
						<div className="whitespace-nowrap mb-1.5">
							{renderData(formattedResult, 'result', 'result', false, true)}
						</div>
					) : (
						<span className="font-semibold ">result: </span>
					)}
				</div>
			)}
			{!data.typeName && (
				<div className="mt-4">
					<div className="mb-1.5">
						<span className="font-semibold whitespace-nowrap">
							expression:{' '}
							<span
								className="bg-yellow-300 bg-opacity-40 font-normal cursor-pointer hover:bg-yellow-500 hover:bg-opacity-40 trasition-all"
								onMouseEnter={() => setExpressionHover(true)}
								onMouseLeave={() => setExpressionHover(false)}
							>
								{expression}
							</span>
						</span>
					</div>
					<div className="mb-1.5">
						<span className="font-semibold whitespace-nowrap">
							line:{' '}
							<span className="font-normal">
								{codeLocation?.start.line &&
									(codeLocation?.start.line === codeLocation?.end.line
										? `${codeLocation?.start.line + 1}`
										: `${codeLocation?.start.line + 1}-${codeLocation?.end.line + 1}`)}
							</span>
						</span>
					</div>
					<div className="mb-1.5">
						{args && args.length > 0 && (
							<div>
								<span className="font-semibold">args: </span>
								<div className="whitespace-nowrap mb-1.5">
									{renderData(formatObject(args), 'args', 'expr_args', true, true)}
								</div>
							</div>
						)}
					</div>
					<div className="mb-1.5">
						{results && results.length > 0 && (
							<div>
								<span className="font-semibold">result: </span>
								<div className="whitespace-nowrap mb-1.5">
									{renderData(formatObject(results), 'result', 'expr_result', true, true)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default FunctionCallViewer;
