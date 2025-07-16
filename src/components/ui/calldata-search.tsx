import React, { useState, useEffect, useRef, useContext, memo, useCallback } from 'react';
import { useCallTrace } from '@/lib/context/call-trace-context-provider';
import { ContractCall, FunctionCall } from '@/lib/simulation';
import { ContractCallSignature } from './signature';

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from './command';
import { FnName } from './function-name';
import { getContractName } from '@/lib/utils';

const CalldataSearch = memo(function CalldataSearch() {
	const { contractCallsMap, functionCallsMap, toggleCallExpand, scrollToTraceLineElement } =
		useCallTrace();

	const [searchTerm, setSearchTerm] = useState<string>('');
	const [searchResults, setSearchResults] = useState<
		[number, { contractCall?: ContractCall; fnCall?: FunctionCall }][]
	>([]);

	const inputRef = useRef<HTMLInputElement | null>(null);
	const componentRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const results = searchCalls(searchTerm);
		setSearchResults(results);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchTerm]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
				setSearchTerm('');
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const searchCalls = useCallback(
		(term: string): [number, { contractCall?: ContractCall; fnCall?: FunctionCall }][] => {
			if (!term) return [];

			const contractCalls: [number, { contractCall?: ContractCall }][] = Array.from(
				Object.entries(contractCallsMap)
			)
				.filter(([key, contractCall]) => {
					let contractName: string = getContractName({ contractCall }).toLowerCase();
					let contractAddress: string = contractCall.entryPoint.storageAddress.toLowerCase();
					let entryPointName: string = contractCall.entryPointName?.toLowerCase() || '';

					const lowercaseTerm = term.toLowerCase();
					return (
						contractName?.includes(lowercaseTerm) ||
						contractAddress?.includes(lowercaseTerm) ||
						entryPointName?.includes(lowercaseTerm)
					);
				})
				.map(([key, contractCall]) => [parseInt(key), { contractCall }]);

			const functionCalls: [number, { fnCall?: FunctionCall }][] = Array.from(
				Object.entries(functionCallsMap)
			)
				.filter(([key, functionCall]) => {
					let contractName: string = functionCall.fnName;
					let splittedFnName: string[] = functionCall.fnName.split('::');
					let entryPointFunctionName: string | undefined = undefined;

					if (splittedFnName.length >= 2) {
						contractName = splittedFnName[splittedFnName.length - 2].toLowerCase();
						entryPointFunctionName = splittedFnName[splittedFnName.length - 1].toLowerCase();
					}

					const lowercaseTerm = term.toLowerCase();
					return (
						contractName?.includes(lowercaseTerm) || entryPointFunctionName?.includes(lowercaseTerm)
					);
				})
				.map(([key, functionCall]) => [parseInt(key), { fnCall: functionCall }]);

			return [...contractCalls, ...functionCalls];
		},
		[contractCallsMap, functionCallsMap]
	);

	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
	};

	const handleResultClick = (result: { contractCall?: ContractCall; fnCall?: FunctionCall }) => {
		setSearchTerm('');
		inputRef.current?.focus();
	};

	return (
		<div className="h-full w-full relative" ref={componentRef}>
			<label htmlFor="search" className="sr-only ">
				Search
			</label>
			<Command className="bg-transparent ">
				<div>
					<CommandInput
						placeholder="Search"
						value={searchTerm}
						name="Search"
						onValueChange={(value) => handleSearchChange(value)}
						displayBorder={false}
						parentClassName="px-0"
					/>
				</div>

				<CommandList className="pr-2">
					{searchTerm && (
						<CommandGroup className="absolute shadow-md bg-white dark:bg-background border pr-2 flex flex-col md:block rounded-b-lg max-h-96 max-w-full w-full md:w-2/5 items-start overflow-auto z-20 ">
							{searchResults.length > 0 ? (
								<div className="flex flex-col">
									{' '}
									{searchResults?.map(([key, value]) => (
										<CommandItem
											className="cursor-pointer pr-2 w-full"
											onSelect={() => {
												handleResultClick(value);
												toggleCallExpand(key);
												scrollToTraceLineElement(key);
											}}
											key={key}
										>
											<div className="pr-2">
												<div className="pr-2">
													{value.contractCall ? (
														<>
															<div className="hidden">{key}</div>
															<div className="!text-xs ">
																<ContractCallSignature
																	displayFunctionName={false}
																	variant="search-result"
																	contractCall={value?.contractCall}
																/>
															</div>
															<div className="flex items-center gap-1 !text-xs">
																<div className="">
																	<ContractCallSignature
																		displayContractName={false}
																		variant="search-result"
																		contractCall={value?.contractCall}
																	/>
																</div>
																{value?.contractCall.codeLocation && (
																	<div className="underline">
																		in {value?.contractCall.codeLocation?.filePath}, line{' '}
																		{value?.contractCall.codeLocation?.start.line + 1}
																	</div>
																)}
															</div>
														</>
													) : value?.fnCall?.fnName ? (
														<>
															<div className="hidden">{key}</div>
															<div className="!text-xs ">
																<ContractCallSignature
																	displayFunctionName={false}
																	variant="search-result"
																	contractCall={contractCallsMap[value.fnCall.contractCallId]}
																/>
															</div>
															<div className="flex items-center gap-1 !text-xs">
																<div>
																	<FnName variant="search-result" fnName={value.fnCall?.fnName} />
																</div>
																{value?.fnCall?.codeLocation && (
																	<div className="underline">
																		in {value?.fnCall?.codeLocation.filePath}, line{' '}
																		{value?.fnCall?.codeLocation?.start.line + 1}
																	</div>
																)}
															</div>
														</>
													) : (
														<>Unkown contract</>
													)}
												</div>
											</div>
										</CommandItem>
									))}
								</div>
							) : (
								<CommandEmpty>No results found.</CommandEmpty>
							)}
						</CommandGroup>
					)}
				</CommandList>
			</Command>
		</div>
	);
});

export default CalldataSearch;
