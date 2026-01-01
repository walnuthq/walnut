import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Box, Code2, ArrowDownRight, ArrowUpLeft } from 'lucide-react';
import { useDebugger } from '@/lib/context/debugger-context-provider';
import CopyToClipboardElement from './copy-to-clipboard';
import AddressLink from '../address-link';
import { ContractCall, DecodedItem, InternalFnCallIO, TextPosition } from '@/lib/simulation';
import { useSettings } from '@/lib/context/settings-context-provider';
import { toast } from '@/components/hooks/use-toast';

const INDENT_SIZE = 9;
const INDEX_INDENT_SIZE = 7;

const getIndentStyle = (depth: number, parentIsIndex = false): React.CSSProperties => ({
	paddingLeft: parentIsIndex ? depth * INDEX_INDENT_SIZE : depth * INDENT_SIZE
});

interface FilteredStepInfo {
	function?: string | undefined;
	args: InternalFnCallIO[] | string | string[] | DecodedItem[] | boolean;
	result?: InternalFnCallIO[];
	typeName?: string;
	contractCallDetails?: ContractCall | undefined;
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
	const [isParametersExpanded, setIsParametersExpanded] = useState<boolean>(true);
	const [isExpressionExpanded, setIsExpressionExpanded] = useState<boolean>(true);
	const [expression, setExpression] = useState<string>('');
	const [results, setResults] = useState<InternalFnCallIO[] | undefined>(undefined);
	const [args, setArgs] = useState<InternalFnCallIO[] | undefined>(undefined);
	const debuggerContext = useDebugger();
	// const { customSettings } = useSettings();
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

	const getArrayElementType = (typeName?: string): string | undefined => {
		if (!typeName) return undefined;
		const genericMatch = typeName.match(/^Array<(.*)>$/);
		if (genericMatch?.[1]) return genericMatch[1];
		const genericMatchSpan = typeName.match(/^Span<(.*)>$/);
		if (genericMatchSpan?.[1]) return genericMatchSpan[1];
		const bracketMatch = typeName.match(/^(.*)\[\]$/);
		if (bracketMatch?.[1]) return bracketMatch[1];
		return undefined;
	};

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
			return {
				[key]: formatObject(obj.value),
				[`__type_${key}`]: obj.typeName
			};
		}
		if (typeof obj === 'object' && obj !== null) {
			const keys = Object.keys(obj);
			if (keys.every((key: string) => !isNaN(Number(key)))) {
				return keys.reduce((acc: Record<string, any>, key: string) => {
					const formatted = formatObject(obj[key]);
					if (typeof formatted === 'object' && !Array.isArray(formatted)) {
						Object.keys(formatted).forEach((formattedKey: string) => {
							if (formattedKey.startsWith('__type_')) {
								acc[`${formattedKey}_${key}`] = formatted[formattedKey];
							} else {
								acc[`${formattedKey}_${key}`] = formatted[formattedKey];
							}
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
	const renderValue = (item: any, depth: number = 0, typeName?: string) => {
		const isAddress = typeof item === 'string' && item.startsWith('0x');

		if (isAddress) {
			return (
				<div className="inline-flex items-baseline">
					{typeName && (
						<>
							<span className="font-mono text-[11px] text-typeColor mr-2">{typeName}</span>
							<span className="text-[11px]"> = </span>
						</>
					)}
					<CopyToClipboardElement
						value={item}
						toastDescription="Copied!"
						className="px-0 py-0 hover:bg-inherit inline-flex whitespace-nowrap"
					>
						<AddressLink
							address={item}
							// customSettings={customSettings}
							addressClassName=" ml-1"
						>
							<span className="font-mono text-[11px]">{item}</span>
						</AddressLink>
					</CopyToClipboardElement>
				</div>
			);
		}

		const valueElement = (
			<span className="font-mono text-[11px] ml-1">{item?.toString() || 'null'}</span>
		);

		if (typeName) {
			return (
				<div className="inline-flex items-baseline cursor-pointer">
					{typeName && (
						<>
							<span className="font-mono text-[11px] text-typeColor mr-2">{typeName}</span>
							<span className="text-[11px]"> = </span>
						</>
					)}
					{valueElement}
				</div>
			);
		}

		return valueElement;
	};

	const renderData = (
		item: any,
		name: string | number,
		path: string,
		skipName = false,
		depth = 0,
		parentObj?: any,
		type?: string,
		parentIsIndex = false
	) => {
		const key = path;
		const isExpandable = item && typeof item === 'object';
		const isArray = Array.isArray(item);
		const isIndex = typeof name === 'number' || (typeof name === 'string' && !isNaN(Number(name)));
		let itemType: string | undefined;
		const lookupKey = type ?? name;
		if (parentObj) {
			const directTypeKey = `__type_${lookupKey}`;
			if (directTypeKey in parentObj) {
				itemType = parentObj[directTypeKey];
			} else if (typeof lookupKey === 'string' && lookupKey.includes('_')) {
				const baseName = lookupKey.split('_').slice(0, -1).join('_');
				const numericSuffix = lookupKey.split('_').pop();
				if (numericSuffix && !isNaN(Number(numericSuffix))) {
					const typeKeyWithSuffix = `__type_${baseName}_${numericSuffix}`;
					if (typeKeyWithSuffix in parentObj) {
						itemType = parentObj[typeKeyWithSuffix];
					}
				}
			}
		}
		if (!itemType && type) itemType = type;

		if (isExpandable) {
			const entries = isArray
				? item
				: Object.entries(item).filter(([k]) => !k.startsWith('__type_'));

			if (entries.length === 0) {
				const emptyElement = (
					<div className="flex items-baseline gap-1" style={getIndentStyle(depth, parentIsIndex)}>
						{!skipName && (
							<span
								className={`font-mono text-[11px] ${
									name !== itemType ? 'text-pink-900 dark:text-keys' : 'text-typeColor'
								} flex-shrink-0 whitespace-nowrap`}
							>
								{name}:{' '}
								{name !== itemType && (
									<>
										<span className="font-mono text-[11px] text-typeColor">{itemType}</span> ={' '}
									</>
								)}
							</span>
						)}
						<span className="font-mono text-[11px] text-muted-foreground/60 italic">
							{isArray ? '[]' : '{}'}
						</span>
					</div>
				);

				if (itemType) {
					return <div className="cursor-pointer">{emptyElement}</div>;
				}

				return emptyElement;
			}

			if (isArray && entries.length === 1) {
				const singleItem = entries[0];
				if (typeof singleItem === 'object' && singleItem !== null) {
					const singleItemIsArray = Array.isArray(singleItem);
					const singleItemContent = singleItemIsArray
						? singleItem
						: Object.entries(singleItem).filter(([k]) => !k.startsWith('__type_'));

					if (singleItemContent.length === 0) {
					} else if (!singleItemIsArray) {
						const nameElement = (
							<div className="flex items-center gap-1">
								<span
									className={`font-mono text-[11px] ${
										name !== itemType ? 'text-pink-900 dark:text-keys' : 'text-typeColor'
									} whitespace-nowrap`}
								>
									{name}:{' '}
									{name !== itemType && (
										<span>
											<span className="font-mono text-[11px]">{itemType} = </span>
										</span>
									)}
								</span>
							</div>
						);

						return (
							<div style={getIndentStyle(depth, parentIsIndex)}>
								{!skipName &&
									(itemType ? (
										<div className="cursor-pointer inline-block">{nameElement}</div>
									) : (
										nameElement
									))}
								<div className="space-y-1 mt-1">
									{Object.entries(singleItem)
										.filter(([k]) => !k.startsWith('__type_'))
										.map(([childKey, childVal]) => (
											<div key={childKey}>
												{renderData(
													childVal,
													childKey,
													`${key}.0.${childKey}`,
													false,
													depth + 1,
													singleItem,
													undefined,
													isIndex
												)}
											</div>
										))}
								</div>
							</div>
						);
					}
				}
			}
			const shouldAutoExpand = skipName && depth === 0;
			const isExpanded = shouldAutoExpand || expanded.has(key);

			const expandableContent = (
				<div
					className="flex items-center gap-1 cursor-pointer hover:bg-accent/40 -mx-1 px-1 rounded transition-colors group"
					onClick={() => toggleExpand(key)}
				>
					{isExpanded ? (
						<ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
					) : (
						<ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
					)}
					{!skipName && (
						<span
							className={`font-mono text-[11px] ${
								itemType !==
								(typeof name === 'string' &&
								name.includes('_') &&
								/\d$/.test(name.split('_').pop() || '')
									? name.split('_').slice(0, -1).join('_')
									: name)
									? 'text-pink-900 dark:text-keys'
									: 'text-typeColor'
							} whitespace-nowrap`}
						>
							{typeof name === 'string' &&
							name.includes('_') &&
							/\d$/.test(name.split('_').pop() || '')
								? name.split('_').slice(0, -1).join('_')
								: name}
						</span>
					)}
					{itemType &&
						itemType !==
							(typeof name === 'string' &&
							name.includes('_') &&
							/\d$/.test(name.split('_').pop() || '')
								? name.split('_').slice(0, -1).join('_')
								: name) && (
							<span className="font-mono text-[11px] text-typeColor whitespace-nowrap">
								{' '}
								: {itemType}{' '}
							</span>
						)}

					{!isExpanded && (
						<>
							<span className="font-mono text-[11px] text-muted-foreground/60 italic ml-1 whitespace-nowrap">
								={' '}
							</span>
							<span className="font-mono text-[11px] text-muted-foreground/60 italic whitespace-nowrap">
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
						</>
					)}
				</div>
			);

			return (
				<div style={getIndentStyle(depth, parentIsIndex)}>
					{!shouldAutoExpand && (itemType ? <div>{expandableContent}</div> : expandableContent)}

					{isExpanded && (
						<div className="space-y-1 mt-1">
							{isArray
								? entries.map((child, idx) => (
										<div key={idx}>
											{renderData(
												child,
												idx,
												`${key}.${idx}`,
												false,
												depth + 1,
												item,
												getArrayElementType(itemType),
												isIndex
											)}
										</div>
								  ))
								: entries.map(([childKey, childVal]) => (
										<div key={childKey}>
											{renderData(
												childVal,
												typeof childKey === 'string' &&
													childKey.includes('_') &&
													/\d$/.test(childKey.split('_').pop() || '')
													? childKey.split('_').slice(0, -1).join('_')
													: childKey,
												`${key}.${childKey}`,
												false,
												depth + 1,
												item,
												childKey,
												isIndex
											)}
										</div>
								  ))}
						</div>
					)}
				</div>
			);
		}

		const displayName =
			typeof name === 'string' && name.includes('_') && /\d$/.test(name.split('_').pop() || '')
				? name.split('_').slice(0, -1).join('_')
				: name;
		const hasDistinctName = itemType !== displayName;
		const showOnlyTypeAndValue = !hasDistinctName && itemType;

		return (
			<div className="flex items-baseline gap-1" style={getIndentStyle(depth, parentIsIndex)}>
				{!skipName && (
					<span
						className={`font-mono text-[11px] ${
							hasDistinctName ? 'text-pink-900 dark:text-keys' : 'text-typeColor'
						} flex-shrink-0 whitespace-nowrap`}
					>
						{displayName}
						{showOnlyTypeAndValue ? ' =' : ':'}
					</span>
				)}
				<div className="flex-1 min-w-0 whitespace-nowrap">
					{renderValue(item, depth, hasDistinctName ? itemType : '')}
				</div>
			</div>
		);
	};

	const formattedArgs = formatObject(data.args);
	const formattedResult = data.result ? formatObject(data.result) : null;

	if (!debuggerContext) {
		return null;
	}

	const { codeLocation, setExpressionHover, setActiveFile, activeFile, setContractCall } =
		debuggerContext;

	const hasArgs =
		typeof data.args === 'boolean' ||
		(Array.isArray(data.args)
			? data.args.length > 0
			: typeof data.args === 'object' && data.args !== null && Object.keys(data.args).length > 0) ||
		typeof data.args === 'string';

	const hasResults = data.result && data.result.length > 0;

	console.log(data);

	return (
		<div className="px-2 py-1 min-w-[16rem]">
			<div className="space-y-2">
				{tooltipValue ? (
					<div className="space-y-2">
						{(() => {
							const hasParamsOrResults = hasArgs || (!isContract && hasResults);
							const hasType = !!data.typeName;
							const blockCount = (hasParamsOrResults ? 1 : 0) + (hasType ? 1 : 0);

							if (blockCount === 2) {
								const isExpandable =
									Array.isArray(formattedArgs) ||
									(typeof formattedArgs === 'object' && formattedArgs !== null);

								return (
									<>
										<div className="flex gap-1.5 flex-col md:flex-row">
											<div className="flex-1 bg-card/50 backdrop-blur-sm rounded-md transition-colors">
												<div
													className={`flex items-center gap-1.5 ${
														isExpandable && isParametersExpanded ? 'pt-2' : 'py-2'
													}  px-2 ${
														isExpandable ? 'cursor-pointer hover:bg-accent/20' : ''
													} transition-colors`}
													onClick={() =>
														isExpandable && setIsParametersExpanded(!isParametersExpanded)
													}
												>
													{isExpandable &&
														(isParametersExpanded ? (
															<ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
														) : (
															<ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
														))}
													<span
														className={`${
															!isContract ? 'text-function_purple' : ''
														} font-mono text-[11px] whitespace-nowrap`}
													>
														<span
															className={`${
																data.function === data.typeName ? 'text-typeColor' : ''
															} text-[11px]`}
														>
															{data.function}
														</span>
														{data.function && ': '}
														<span className="text-typeColor font-mono text-[11px] font-normal">
															{data.typeName}
														</span>
														{!isExpandable ? (
															<span className="font-mono text-[11px] font-normal">
																<span className="text-[11px] font-normal">{' = '}</span>
																{typeof formattedArgs === 'string' &&
																formattedArgs.startsWith('0x') ? (
																	<CopyToClipboardElement
																		value={formattedArgs}
																		toastDescription="Copied!"
																		className="px-0 py-0 hover:bg-inherit inline-flex whitespace-nowrap "
																	>
																		<AddressLink
																			address={formattedArgs}
																			// customSettings={customSettings}
																		>
																			<span className="font-mono text-[11px] cursor-pointer font-normal">
																				{formattedArgs}
																			</span>
																		</AddressLink>
																	</CopyToClipboardElement>
																) : (
																	<span className="font-normal">
																		{formattedArgs?.toString() ?? 'null'}
																	</span>
																)}
															</span>
														) : (
															!isParametersExpanded && (
																<span className="font-mono text-[11px] text-muted-foreground/60 italic font-normal">
																	{Array.isArray(formattedArgs)
																		? ` = (${formattedArgs.length}) [...]`
																		: ` = {...}`}
																</span>
															)
														)}
													</span>
												</div>
												{isExpandable && isParametersExpanded && (
													<div>
														{hasArgs && (
															<div className="ml-[16px]">
																{renderData(
																	formattedArgs,
																	'params',
																	'Value',
																	true,
																	0,
																	undefined,
																	Array.isArray(data.args) ? data.typeName : undefined
																)}
															</div>
														)}
														{!isContract && hasResults && (
															<div className="">
																{renderData(formattedResult, 'results', 'Results', true, 0)}
															</div>
														)}
													</div>
												)}
											</div>
										</div>
									</>
								);
							}
							return (
								<>
									{hasParamsOrResults && (
										<div className="bg-card/50 backdrop-blur-sm rounded-md overflow-hidden transition-colors">
											<div
												className={`flex items-center gap-1.5 ${
													isParametersExpanded ? 'pt-2' : 'py-2'
												} px-2 cursor-pointer hover:bg-accent/20 transition-colors`}
												onClick={() => setIsParametersExpanded(!isParametersExpanded)}
											>
												{isParametersExpanded ? (
													<ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
												) : (
													<ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
												)}
											</div>
											{isParametersExpanded && (
												<div className="px-2 pb-2">
													{hasArgs && (
														<div>
															{renderData(
																formattedArgs,
																'params',
																'params',
																true,
																0,
																undefined,
																Array.isArray(data.args) ? data.typeName : undefined
															)}
														</div>
													)}
													{!isContract && hasResults && (
														<div>{renderData(formattedResult, 'results', 'results', true, 0)}</div>
													)}
												</div>
											)}
										</div>
									)}

									{hasType && (
										<>
											<div className="bg-card/50 backdrop-blur-sm rounded-md p-2 transition-colors">
												{/* <div className="flex items-center gap-1.5 mb-1">
													<Box className="w-3 h-3 text-cyan-500" />
												</div> */}
												<div>
													{data.function}
													{data.function && ':'}{' '}
													<span className="text-typeColor font-mono text-[11px]">
														{data.typeName}
													</span>
													{data.args && ' = '}
													{data.args && (
														<span className="text-[11px] font-mono">{data.args as string}</span>
													)}
												</div>
											</div>
											{hasParamsOrResults && (
												<div className="bg-card/50 backdrop-blur-sm rounded-md overflow-hidden transition-colors">
													<div
														className={`flex items-center gap-1.5 ${
															isParametersExpanded ? 'pt-2' : 'py-2'
														} px-2 cursor-pointer hover:bg-accent/20 transition-colors`}
														onClick={() => setIsParametersExpanded(!isParametersExpanded)}
													>
														{isParametersExpanded ? (
															<ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
														) : (
															<ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
														)}
													</div>

													{isParametersExpanded && (
														<div className="px-2 pb-2">
															{hasArgs && (
																<div>
																	{renderData(
																		formattedArgs,
																		'params',
																		'params',
																		true,
																		0,
																		undefined,
																		Array.isArray(data.args) ? data.typeName : undefined
																	)}
																</div>
															)}
															{!isContract && hasResults && (
																<div>
																	{renderData(formattedResult, 'results', 'results', true, 0)}
																</div>
															)}
														</div>
													)}
												</div>
											)}
										</>
									)}
								</>
							);
						})()}
					</div>
				) : (
					(hasArgs || (!isContract && hasResults) || data.typeName) && (
						<div className="flex gap-1.5 min-w-[12rem]">
							{(hasArgs || (!isContract && hasResults)) && (
								<div className="flex-1 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-border transition-colors">
									{isParametersExpanded && (
										<div className="w-full pb-2 space-y-3">
											{hasArgs && (
												<div>
													<div className="flex items-center gap-1  mb-1">
														<ArrowDownRight className="w-3 h-3 text-green-500" />
														<div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
															Parameters
														</div>
													</div>

													{renderData(
														formattedArgs,
														'params',
														'params',
														true,
														0,
														undefined,
														Array.isArray(data.args) ? data.typeName : undefined
													)}
												</div>
											)}

											{!isContract && hasResults && (
												<div>
													<div className="flex items-center gap-1  mb-1">
														<ArrowUpLeft className="w-3 h-3 text-blue-500" />
														<div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
															Result
														</div>
													</div>
													{renderData(formattedResult, 'results', 'results', true, 0)}
												</div>
											)}
										</div>
									)}
								</div>
							)}
							{data.typeName && (
								<div className="flex-1 bg-card/50 backdrop-blur-sm rounded-md p-2 transition-colors">
									{/* <div className="flex items-center gap-1.5 mb-1">
										<Box className="w-3 h-3 text-cyan-500" />
									</div> */}
									<div>
										{data.function}
										{data.function && ': '}
										<span className="text-typeColor font-mono text-[11px]">{data.typeName}</span>
									</div>
								</div>
							)}
						</div>
					)
				)}
				{!tooltipValue && expression && (
					<div className="bg-gradient-to-br from-yellow-500/5 to-orange-500/5 backdrop-blur-sm rounded-md overflow-hidden transition-colors">
						<div
							className="flex items-center gap-1.5 p-2 cursor-pointer hover:bg-yellow-500/10 transition-colors"
							onClick={() => setIsExpressionExpanded(!isExpressionExpanded)}
						>
							{isExpressionExpanded ? (
								<ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
							) : (
								<ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
							)}
							<Code2 className="w-3 h-3 text-yellow-600 dark:text-yellow-500" />
							<span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
								Expression
							</span>
						</div>

						{isExpressionExpanded && (
							<div className="px-3 py-3">
								<div className="flex flex-wrap items-center gap-2">
									<div
										className="inline-block bg-yellow-400/20 hover:bg-yellow-400/30 px-2 py-1 rounded cursor-pointer transition-colors"
										onMouseEnter={() => {
											setExpressionHover(true);
											if (
												debuggerContext?.codeLocation &&
												activeFile !== debuggerContext?.codeLocation?.filePath
											) {
												if (data.contractCallDetails) setContractCall(data.contractCallDetails);
												setActiveFile(debuggerContext?.codeLocation?.filePath);
												toast({
													title: 'Active file changed',
													description: `Opened ${debuggerContext?.codeLocation?.filePath}`
												});
											}
										}}
										onMouseLeave={() => setExpressionHover(false)}
									>
										<code className="font-mono text-[11px] text-yellow-900 dark:text-yellow-100 whitespace-nowrap">
											{expression}
										</code>
									</div>
									<div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
										<span className="flex items-center gap-1 whitespace-nowrap">
											Line{' '}
											{codeLocation?.start.line &&
												(codeLocation?.start.line === codeLocation?.end.line
													? `${codeLocation?.start.line + 1}`
													: `${codeLocation?.start.line + 1}-${codeLocation?.end.line + 1}`)}
										</span>
										{debuggerContext?.codeLocation?.filePath && (
											<>
												<span className="text-muted-foreground/50">•</span>
												<span
													onClick={() => {
														if (
															debuggerContext?.codeLocation &&
															activeFile !== debuggerContext?.codeLocation?.filePath
														) {
															if (data.contractCallDetails)
																setContractCall(data.contractCallDetails);
															setActiveFile(debuggerContext?.codeLocation?.filePath);
															toast({
																title: 'Active file changed',
																description: `Opened ${debuggerContext?.codeLocation?.filePath}`
															});
														}
													}}
													className="hover:underline cursor-pointer hover:text-foreground transition-colors truncate max-w-[200px]"
												>
													{debuggerContext?.codeLocation?.filePath}
												</span>
											</>
										)}
									</div>
								</div>
								{args && args.length > 0 && (
									<div className="mt-2 pt-2">
										<div className="flex items-center gap-1  mb-1">
											<ArrowDownRight className="w-3 h-3 text-green-500" />
											<div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
												Parameters
											</div>
										</div>
										{renderData(formatObject(args), 'params', 'expr_args', true, 0)}
									</div>
								)}

								{results && results.length > 0 && (
									<div className="mt-2 pt-2">
										<div className="flex items-center gap-1  mb-1">
											<ArrowUpLeft className="w-3 h-3 text-blue-500" />
											<div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
												Result
											</div>
										</div>
										{renderData(formatObject(results), 'results', 'expr_result', true, 0)}
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default FunctionCallViewer;
