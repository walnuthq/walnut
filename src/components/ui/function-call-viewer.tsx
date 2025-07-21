import { DecodedItem, InternalFnCallIO } from '@/lib/simulation';
import React, { useContext, useEffect, useState } from 'react';
import { TriangleRightIcon, TriangleDownIcon } from '@radix-ui/react-icons';
import { DebuggerContext, useDebugger } from '@/lib/context/debugger-context-provider';
import CopyToClipboardElement from './copy-to-clipboard';

interface FilteredStepInfo {
	function: string | undefined;
	args: InternalFnCallIO[] | string | string[] | DecodedItem[];
	result?: InternalFnCallIO[];
	typeName?: string;
}

const FunctionCallViewer = ({
	data,
	isContract = false
}: {
	data: FilteredStepInfo;
	isContract?: boolean;
}) => {
	const debuggerContext = useDebugger();
	const [results, setResults] = useState<InternalFnCallIO[] | undefined>(undefined);
	const [args, setArgs] = useState<InternalFnCallIO[] | undefined>(undefined);
	const [expression, setExpression] = useState<string>('');
	const [isExpanded, setIsExpanded] = useState<string[]>([]);

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

	if (!debuggerContext) {
		return null;
	}

	const { sourceCode, activeFile, currentStep, codeLocation, setExpressionHover } = debuggerContext;

	function extractCodeFragment(
		sourceCode: string,
		start: { line: number; col: number },
		end: { line: number; col: number }
	): string {
		if (typeof sourceCode !== 'string') return '';
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

	function truncateString(str: string, maxLength: number): string {
		if (!str) return '';

		const cleanedStr = str.replace(/\s+/g, ' ').trim();

		if (cleanedStr.length <= maxLength) return cleanedStr;
		return cleanedStr.substring(0, maxLength) + '...';
	}

	const CollapsibleArray = ({
		value,
		name
	}: {
		value: string[] | InternalFnCallIO[];
		name: string | null;
	}) => {
		const isSimpleArray =
			Array.isArray(value) &&
			value.every((item) => typeof item === 'string' || typeof item === 'number');

		if (!isSimpleArray) {
			return null;
		}

		return (
			<div className="font-mono">
				<div
					className="flex items-center cursor-pointer hover:bg-accent pr-1 rounded-sm transition-all delay-75 ease-out mb-1 mr-2"
					onClick={() => toggleExpand(name + value.length.toString())}
				>
					{isExpanded.includes(name + value.length.toString()) ? (
						<>
							<span className="-m-1">
								<TriangleDownIcon className="h-4 w-4 mr-1" />
							</span>
							<span className="text-pink-900 dark:text-keys font-semibold">{name}: </span>
						</>
					) : (
						<>
							<span className="-m-1">
								<TriangleRightIcon className="h-4 w-4 mr-1" />
							</span>
							<span>
								<span className="text-pink-900 dark:text-keys font-semibold ">{name}:</span>
								<span className="italic">
									({value.length}){' '}
									{`[${value.length > 0 ? (value.length === 1 ? value.join(', ') : '...') : ''}]`}
								</span>
							</span>
						</>
					)}
				</div>

				{isExpanded.includes(name + value.length.toString()) && (
					<div className="ml-2 mb-1">
						{value.map((item, index) => (
							<div key={index} className="whitespace-pre">
								<CopyToClipboardElement value={item as string} toastDescription="Copied!">
									<span className="text-pink-900 dark:text-keys font-semibold">{index}: </span>
									{`${item}`}
								</CopyToClipboardElement>
							</div>
						))}
					</div>
				)}
			</div>
		);
	};
	const toggleExpand = (typeName: string) => {
		setIsExpanded((prev) =>
			prev.includes(typeName) ? prev.filter((name) => name !== typeName) : [...prev, typeName]
		);
	};
	const renderValue = (
		value: InternalFnCallIO | string | string[] | DecodedItem,
		path: string = ''
	) => {
		if (
			value &&
			typeof value === 'object' &&
			(isContract ? 'typeName' in value : 'name' in value) &&
			'value' in value
		) {
			if (
				Array.isArray(value.value) &&
				value.value.every((item) => typeof item === 'string' || typeof item === 'number')
			) {
				return (
					<CollapsibleArray
						value={value.value as any}
						name={isContract ? (value as DecodedItem).name : value.typeName}
					/>
				);
			}

			if (typeof value.value === 'object' && value.value !== null && value.typeName) {
				const isArray = Array.isArray(value.value);
				const arrayLength = Object.keys(value.value).length;
				const uniqueId = `${path}_${value.typeName}`;
				return (
					<div>
						<div
							className="flex items-center cursor-pointer hover:bg-accent pr-1 rounded-sm transition-all delay-75 ease-out mb-1"
							onClick={() => value.typeName && toggleExpand(uniqueId)}
						>
							{isExpanded.includes(uniqueId) ? (
								<span className="-m-1">
									<TriangleDownIcon className="h-4 w-4 mr-1" />
								</span>
							) : (
								<span className="-m-1">
									<TriangleRightIcon className="h-4 w-4 mr-1" />
								</span>
							)}
							<span className="text-pink-900 dark:text-keys font-semibold">
								{isContract ? (value as DecodedItem).name : value.typeName}:{' '}
							</span>
							{!isExpanded.includes(uniqueId) && (
								<span className="ml-1 italic">
									{arrayLength === 1 ? (
										typeof value.value[0] === 'string' ? (
											<CopyToClipboardElement
												value={value.value[0]}
												toastDescription={`${value.value[0]} has been copied`}
												aria-label="Copy"
											>
												{value.value[0]}
											</CopyToClipboardElement>
										) : (
											'{...}'
										)
									) : (
										'{...}'
									)}
								</span>
							)}
						</div>
						{isExpanded.includes(uniqueId) && (
							<div className="ml-2">
								{isArray
									? value.value.map((val, index) => (
											<div key={index} className="mb-1">
												<div className="flex items-center">
													{typeof val === 'object' && !('typeName' in val) ? (
														<div className="flex-1">
															<div
																className="flex items-center cursor-pointer hover:bg-accent pr-1 rounded-sm transition-all delay-75 ease-out"
																onClick={() => toggleExpand(`${uniqueId}_array-item-${index}`)}
															>
																{isExpanded.includes(`${uniqueId}_array-item-${index}`) ? (
																	<span className="flex items-center -ml-1">
																		<TriangleDownIcon className="h-4 w-4 mr-1" />
																		<span className="text-pink-900 dark:text-keys font-semibold">
																			{index}:{' '}
																		</span>
																	</span>
																) : (
																	<span className="flex items-center -ml-1">
																		<TriangleRightIcon className="h-4 w-4 mr-1" />
																		<span className="text-pink-900 dark:text-keys font-semibold">
																			{index}:{' '}
																		</span>
																		<span className="ml-1 italic">{'{...}'}</span>
																	</span>
																)}
															</div>
															{isExpanded.includes(`${uniqueId}_array-item-${index}`) && (
																<div className="ml-2">
																	{Object.values(val).map((nestedVal, i) => (
																		<div className="mb-1" key={i}>
																			{renderValue(
																				nestedVal as InternalFnCallIO | string | string[],
																				`${uniqueId}_${index}_${i}`
																			)}
																		</div>
																	))}
																</div>
															)}
														</div>
													) : (
														<span>
															<span className="text-pink-900 dark:text-keys font-semibold">
																{index}:{' '}
															</span>
															<span>
																{renderValue(
																	val as InternalFnCallIO | string | string[] | DecodedItem,
																	`${uniqueId}_${index}`
																)}
															</span>
														</span>
													)}
												</div>
											</div>
									  ))
									: Object.values(value.value).map((val, index) => (
											<div key={index} className="mb-1">
												{renderValue(
													val as InternalFnCallIO | string | string[] | DecodedItem,
													`${uniqueId}_${index}`
												)}
											</div>
									  ))}
							</div>
						)}
					</div>
				);
			}
			return (
				<span className={`${value.typeName === 'Panic' && '!text-red-600'} mb-1`}>
					<CopyToClipboardElement value={value.value as string} toastDescription="Copied!">
						<span
							className={`${
								value.typeName === 'Panic' ? '!text-red-600' : 'text-pink-900 dark:text-keys'
							} font-semibold`}
						>
							{isContract ? (value as DecodedItem).name : value.typeName}:{' '}
						</span>
						{typeof value.value === 'boolean'
							? value.value
								? 'true'
								: 'false'
							: (value.value as string)}
					</CopyToClipboardElement>
				</span>
			);
		}

		if (typeof value === 'object' && value !== null) {
			const isArray = Array.isArray(value);
			return (
				<div>
					{isArray
						? value.map((val, index) => (
								<div key={index} className="ml-2 mb-1">
									<span className="text-pink-900 dark:text-keys font-semibold">{index}: </span>
									{renderValue(val as InternalFnCallIO | string | string[], `${path}_${index}`)}
								</div>
						  ))
						: Object.values(value).map((val, index) => (
								<div key={index} className="ml-2 mb-1">
									{renderValue(val as InternalFnCallIO | string | string[], `${path}_${index}`)}
								</div>
						  ))}
				</div>
			);
		}

		return value !== null && value !== undefined ? value.toString() : '';
	};
	const RenderArgs = ({
		args,
		isResult,
		isExpression
	}: {
		args: string | InternalFnCallIO[] | string[] | DecodedItem[];
		isResult?: boolean;
		isExpression?: boolean;
	}) => {
		return (
			<div>
				<div className="flex items-center mb-1">
					<span className="font-semibold ">
						{isResult ? 'result: ' : isContract ? 'value: ' : 'args: '}
					</span>
				</div>
				<div>
					{Array.isArray(args) ? (
						args.map((arg, index) => (
							<div key={index} className=" whitespace-nowrap mb-1">
								<div>
									<div className="ml-2 mb-1">
										{typeof (isExpression ? renderValue(arg, 'expression') : renderValue(arg)) ===
										'string' ? (
											<CopyToClipboardElement
												value={
													isExpression
														? (renderValue(arg, 'expression') as string)
														: (renderValue(arg) as string)
												}
												toastDescription="Copied!"
											>
												{isExpression ? renderValue(arg, 'expression') : renderValue(arg)}
											</CopyToClipboardElement>
										) : isExpression ? (
											renderValue(arg, 'expression')
										) : (
											renderValue(arg)
										)}
									</div>{' '}
								</div>
							</div>
						))
					) : (
						<div className=" whitespace-nowrap mb-1">
							<div>
								<div className="ml-2 mb-1">
									{typeof (isExpression ? renderValue(args, 'expression') : renderValue(args)) ===
									'string' ? (
										<CopyToClipboardElement
											value={
												isExpression
													? (renderValue(args, 'expression') as string)
													: (renderValue(args) as string)
											}
											toastDescription="Copied!"
										>
											{isExpression ? renderValue(args, 'expression') : renderValue(args)}
										</CopyToClipboardElement>
									) : isExpression ? (
										renderValue(args, 'expression')
									) : (
										renderValue(args)
									)}
								</div>{' '}
							</div>
						</div>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="font-mono px-2 my-2">
			<div className="font-bold mb-1">
				{isContract ? 'arg: ' : 'fn: '} <span className="text-function_pink">{data.function}</span>
			</div>
			{isContract && (
				<div className="mb-1">
					<span className="font-semibold ">
						type: <span className="font-normal text-typeColor">[{data.typeName}]</span>
					</span>
				</div>
			)}
			<div className="mb-1">
				{data.args.length > 0 ? (
					<RenderArgs args={data.args} />
				) : (
					<span className="font-semibold ">{isContract ? 'value: ' : 'args: '} </span>
				)}
			</div>

			{!isContract && data.result && (
				<div className="mb-1">
					{data.result.length > 0 ? (
						<RenderArgs isResult args={data.result} />
					) : (
						<span className="font-semibold ">result: </span>
					)}
				</div>
			)}
			{!isContract && (
				<div className="mt-4">
					<div className="mb-1">
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
					<div className="mb-1">
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
					<div className="mb-1">
						{args && args.length > 0 && <RenderArgs args={args} isExpression />}
					</div>
					<div className="mb-1">
						{results && results.length > 0 && <RenderArgs isResult args={results} isExpression />}
					</div>
				</div>
			)}
		</div>
	);
};

export default FunctionCallViewer;
