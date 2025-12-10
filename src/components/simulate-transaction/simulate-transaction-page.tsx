'use client';

import { HeaderNav } from '../header';
import { Footer } from '../footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/solid';
import { useEffect, useState, useRef, useCallback } from 'react';
import { shortenHash, SimulationPayload } from '@/lib/utils';
import { Chain, NetworksSelect } from '@/components/networks-select';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import type { ChainMeta } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { fetchContractFunctions } from '@/lib/contracts';
import CopyToClipboardElement from '../ui/copy-to-clipboard';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { validateHexFormat } from '../../lib/utils/validation-utils';
import { FieldAlert } from './parameter-input-components/field-alert';
import { ContractCallFieldset } from './contract-call-fieldset';
import { useContractFunctions } from '../hooks/use-contract-functions';
import { useDecodeCalldata, DecodedCalldata, DecodedCall } from '../hooks/use-decode-calldata';
import { useSimulationForm, useFormValidation, ValueUnit } from '../hooks/use-simulation-form';
import {
	handleParameterSubmission,
	handleRawSubmission
} from '../../lib/utils/simulation-handlers';
import { flattenParameters } from '@/lib/utils/parameter-utils';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { createCalldataDecoder } from '@/lib/calldata-utils';
import { formatEther, parseEther } from 'viem';

interface SimulateTransactionPageProps {
	txHash?: string;
	title?: string;
	description?: string;
	simulationPayload?: SimulationPayload;
	parsedCalldata?: string;
}

export function SimulateTransactionPage({
	txHash,
	title = 'Simulate transaction',
	description = 'Configure your invoke transaction for simulation.',
	simulationPayload,
	parsedCalldata
}: SimulateTransactionPageProps) {
	const defaultTransactionVersion = 3;
	const router = useRouter();
	const calldataDecoder = createCalldataDecoder();
	const {
		alert,
		setAlert,
		isParameterInvalid,
		setIsParameterInvalid,
		serverDataLoaded,
		setServerDataLoaded,
		isSimulating,
		setIsSimulating,
		calldataDecodeError,
		setCalldataDecodeError,
		_senderAddress,
		_setSenderAddress,
		_numberOfContracts,
		_setNumberOfContracts,
		_contractCalls,
		_setContractCalls,
		_blockNumber,
		_setBlockNumber,
		_transactionVersion,
		_setTransactionVersion,
		_chain,
		_setChain,
		activeTabs,
		setActiveTabs,
		_value,
		_setValue,
		_valueUnit,
		_setValueUnit,
		_transactionIndexInBlock,
		_setTransactionIndexInBlock
	} = useSimulationForm(simulationPayload, defaultTransactionVersion);
	const {
		contractCallsFunctions,
		isLoadingFunctions,
		contractFetchErrors,
		isLoading,
		fetchFunctionsForContractAddress,
		resetContractFunctions
	} = useContractFunctions(_chain, _contractCalls);

	const { decodeCalldata, setDecodeCalldata } = useDecodeCalldata();

	const previousChainRef = useRef<Chain | undefined>(undefined);

	const createDecodedCalldataFromEntrypoints = (): DecodedCalldata => {
		const decodedCalls: DecodedCall[] = _contractCalls.map((call) => {
			const contractAddress = call.address;
			const functionName = call.function_name;
			const functions = contractCallsFunctions[contractAddress];

			if (!functions || !functionName) {
				return {
					contract_address: contractAddress || '',
					function_selector: functionName || '',
					function_name: '',
					parameters: []
				};
			}

			const functionData = functions.find((fn: any) => fn[0] === functionName);
			if (!functionData) {
				return {
					contract_address: contractAddress,
					function_selector: functionName,
					function_name: '',
					parameters: []
				};
			}

			const functionInfo = functionData[1];
			const parameters = flattenParameters(functionInfo?.inputs || []);

			return {
				contract_address: contractAddress,
				function_selector: functionData[0],
				function_name: functionInfo.name,
				parameters
			};
		});

		return {
			decoded_calldata: decodedCalls,
			raw_calldata: []
		};
	};

	const firstContractAddress = _contractCalls[0]?.address;
	const firstContractFunctions = firstContractAddress
		? contractCallsFunctions[firstContractAddress]
		: null;

	useEffect(() => {
		const autoDecodeCalldata = async () => {
			if (
				_contractCalls.length > 0 &&
				_contractCalls[0].calldata &&
				_contractCalls[0].calldata.trim() !== ''
			) {
				try {
					const call = _contractCalls[0];
					const functions = contractCallsFunctions[call.address];

					if (!functions || !Array.isArray(functions) || functions.length === 0) {
						return;
					}

					let abi: any[] | undefined;

					if (functions && Array.isArray(functions)) {
						abi = functions.map((fn: any) => ({
							type: 'function',
							name: fn[1]?.name || fn[0],
							inputs: fn[1]?.inputs || [],
							outputs: fn[1]?.outputs || []
						}));
					}

					const decoded = await calldataDecoder.decode(
						call.calldata.trim(),
						call.address,
						abi || undefined
					);

					if (decoded) {
						_setContractCalls((prevCalls) => {
							const newCalls = [...prevCalls];
							if (newCalls[0]) {
								newCalls[0] = {
									address: prevCalls[0].address,
									function_name: decoded.functionName,
									calldata: prevCalls[0].calldata
								};
							}
							return newCalls;
						});

						const decodedCall = {
							contract_address: call.address,
							function_selector: decoded.functionName,
							function_name: decoded.functionName,
							parameters: decoded.argsWithTypes.map((arg) => ({
								name: arg.name,
								type_name: arg.type,
								value: arg.value
							}))
						};

						setDecodeCalldata({
							decoded_calldata: [decodedCall],
							raw_calldata: []
						});
					}
				} catch (error) {
					console.warn('Auto-decode failed:', error);
				}
			}
		};

		autoDecodeCalldata();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [_contractCalls[0]?.calldata, firstContractAddress, firstContractFunctions]);

	useFormValidation(
		_senderAddress,
		_contractCalls,
		_transactionVersion,
		alert,
		contractCallsFunctions,
		setAlert
	);

	const onChainChangedCallback = async (chain: Chain) => {
		const previousChain = previousChainRef.current;
		const newNetworkName = chain?.networkName || (chain?.network as any)?.networkName;
		const previousNetworkName =
			previousChain?.networkName || (previousChain?.network as any)?.networkName;

		_setChain(chain);

		const networkChanged = previousChain !== undefined && previousNetworkName !== newNetworkName;

		previousChainRef.current = chain;

		if (networkChanged) {
			resetContractFunctions();

			setDecodeCalldata(null);

			_setContractCalls((prevCalls) =>
				prevCalls.map((call) => ({
					...call,
					function_name: '',
					calldata: ''
				}))
			);

			setCalldataDecodeError({});
			setServerDataLoaded(false);

			const contractsWithAddresses = _contractCalls.filter(
				(call) => call.address && validateHexFormat(call.address)
			);

			for (const call of contractsWithAddresses) {
				await fetchFunctionsForContractAddress(call.address, newNetworkName);
			}
		}
	};

	const handleNumberOfContractsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		const numValue = Math.max(1, parseInt(inputValue) || 1);
		_setNumberOfContracts(numValue);
	};

	const handleBlockNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;

		if (inputValue === '') {
			_setBlockNumber('');
			return;
		}

		if (/^0$|^[1-9]\d*$/.test(inputValue)) {
			const numValue = parseInt(inputValue, 10);
			_setBlockNumber(numValue);
		} else {
			e.target.value = _blockNumber !== null ? _blockNumber.toString() : '';
		}
	};

	const handleContractAddressChange = async (index: number, newAddress: string) => {
		const newCalls = [..._contractCalls];
		const oldAddress = newCalls[index].address;

		newCalls[index] = {
			...newCalls[index],
			address: newAddress,
			function_name: ''
		};

		_setContractCalls(newCalls);

		setDecodeCalldata((prevData) => {
			if (!prevData) return prevData;

			const updatedData = { ...prevData };
			updatedData.decoded_calldata = [...prevData.decoded_calldata];

			if (updatedData.decoded_calldata[index]) {
				updatedData.decoded_calldata[index] = {
					contract_address: newAddress,
					function_selector: '',
					function_name: '',
					parameters: []
				};
			}

			return updatedData;
		});

		const chainId = _chain?.networkName || (_chain?.network as any)?.networkName;
		if (
			newAddress &&
			validateHexFormat(newAddress) &&
			newAddress !== oldAddress &&
			chainId &&
			!contractCallsFunctions[newAddress] &&
			!isLoadingFunctions[newAddress]
		) {
			await fetchFunctionsForContractAddress(newAddress, String(chainId));
		}
	};

	const handleFunctionNameChange = (
		index: number,
		newFunctionName: string,
		callAddress: string
	) => {
		const currentCall = _contractCalls[index];
		const currentFunctionSelector = currentCall?.function_name;
		const currentCalldata = currentCall?.calldata || '';

		const normalizeSelector = (s: string) => s?.toLowerCase?.() || '';
		const isSameFunction =
			normalizeSelector(currentFunctionSelector) === normalizeSelector(newFunctionName);

		const calldataMatchesNewSelector =
			currentCalldata &&
			normalizeSelector(currentCalldata).startsWith(normalizeSelector(newFunctionName));

		const shouldPreserveCalldata =
			(isSameFunction || calldataMatchesNewSelector) && currentCalldata;

		if (shouldPreserveCalldata) {
			_setContractCalls((prevCalls) => {
				return prevCalls.map((call, idx) => {
					if (idx === index) {
						return {
							...call,
							function_name: newFunctionName
						};
					}
					return call;
				});
			});
			return;
		}

		_setContractCalls((prevCalls) => {
			return prevCalls.map((call, idx) => {
				if (idx === index) {
					return {
						address: call.address,
						function_name: newFunctionName,
						calldata: ''
					};
				}
				return call;
			});
		});

		const functions = contractCallsFunctions[callAddress];
		if (functions) {
			const functionData = functions.find((fn: any) => fn[0] === newFunctionName);
			if (functionData) {
				const functionInfo = functionData[1];
				const parameters = flattenParameters(functionInfo?.inputs || []);

				setDecodeCalldata((prevData) => {
					if (!prevData) {
						const emptyDecodedCalls: DecodedCall[] = _contractCalls.map(() => ({
							contract_address: '',
							function_selector: '',
							function_name: '',
							parameters: []
						}));

						emptyDecodedCalls[index] = {
							contract_address: callAddress,
							function_selector: functionData[0],
							function_name: functionInfo.name,
							parameters
						};

						return {
							decoded_calldata: emptyDecodedCalls,
							raw_calldata: []
						};
					}

					const updatedData = { ...prevData };
					updatedData.decoded_calldata = [...prevData.decoded_calldata];
					updatedData.decoded_calldata[index] = {
						contract_address: callAddress,
						function_selector: functionData[0],
						function_name: functionInfo.name,
						parameters
					};

					return updatedData;
				});
			}
		}
	};

	const handleCalldataChange = (index: number, newCalldata: string) => {
		const newCalls = [..._contractCalls];
		newCalls[index] = {
			...newCalls[index],
			calldata: newCalldata
		};
		_setContractCalls(newCalls);

		setServerDataLoaded(false);
	};

	const handleTabChange = async (newTab: string) => {
		setActiveTabs(newTab);

		if (newTab === 'parameters') {
			const hasAnyRawCalldata = _contractCalls.some(
				(call) => call.calldata && call.calldata.trim() !== ''
			);

			const hasExistingErrors = Object.keys(calldataDecodeError).length > 0;

			if (!hasAnyRawCalldata || serverDataLoaded || hasExistingErrors || !_chain?.networkName) {
				return;
			}
			if (!_senderAddress || !_blockNumber) {
				const localDecodedData = createDecodedCalldataFromEntrypoints();
				setDecodeCalldata(localDecodedData);
				setServerDataLoaded(true);
				return;
			}
		}
	};

	const handleResetCalldata = (index: number) => {
		const newCalls = [..._contractCalls];
		newCalls[index] = {
			...newCalls[index],
			calldata: ''
		};
		_setContractCalls(newCalls);

		const newErrors = { ...calldataDecodeError };
		delete newErrors[index];
		setCalldataDecodeError(newErrors);

		const contractAddress = _contractCalls[index].address;
		const functionName = _contractCalls[index].function_name;
		const functions = contractCallsFunctions[contractAddress];

		if (functions && functionName) {
			const functionData = functions.find((fn: any) => fn[0] === functionName);
			if (functionData) {
				const functionInfo = functionData[1];
				const parameters = flattenParameters(functionInfo?.inputs || []);

				setDecodeCalldata((prevData) => {
					if (!prevData) {
						const emptyDecodedCalls: DecodedCall[] = _contractCalls.map(() => ({
							contract_address: '',
							function_selector: '',
							function_name: '',
							parameters: []
						}));

						emptyDecodedCalls[index] = {
							contract_address: contractAddress,
							function_selector: functionData[0],
							function_name: functionInfo.name,
							parameters
						};

						return {
							decoded_calldata: emptyDecodedCalls,
							raw_calldata: []
						};
					}

					const updatedData = { ...prevData };
					updatedData.decoded_calldata = [...prevData.decoded_calldata];
					updatedData.decoded_calldata[index] = {
						contract_address: contractAddress,
						function_selector: functionData[0],
						function_name: functionInfo.name,
						parameters
					};

					return updatedData;
				});
			}
		}
	};

	const handleParameterValueChange = (callIndex: number, paramIndex: number, newValue: any) => {
		setDecodeCalldata((prevData) => {
			if (!prevData) return prevData;
			const updatedData = { ...prevData };
			updatedData.decoded_calldata = [...prevData.decoded_calldata];
			updatedData.decoded_calldata[callIndex] = {
				...prevData.decoded_calldata[callIndex],
				parameters: [...prevData.decoded_calldata[callIndex].parameters]
			};

			const parameter = updatedData.decoded_calldata[callIndex].parameters[paramIndex];
			const contractAddress = _contractCalls[callIndex].address;
			const functionName = _contractCalls[callIndex].function_name;
			const functions = contractCallsFunctions[contractAddress];
			const functionData = functions?.find((fn: any) => fn[0] === functionName);
			const functionInput = functionData?.[1]?.inputs?.[paramIndex];

			let finalValue = newValue;
			let newTypeName: string;

			if (typeof newValue === 'object' && newValue !== null && '__enum_variant' in newValue) {
				const enumBase = parameter.type_name.includes('::')
					? parameter.type_name.split('::')[0]
					: functionInput?.type || parameter.type_name;
				newTypeName = `${enumBase}::${newValue.__enum_variant}`;

				if ('__enum_value' in newValue) {
					const enumValue = newValue.__enum_value;
					if (
						typeof enumValue === 'object' &&
						enumValue !== null &&
						'__enum_variant' in enumValue
					) {
						finalValue = { __enum_value: enumValue };
					} else {
						finalValue = enumValue;
					}
				} else {
					const { __enum_variant, ...rest } = newValue;
					finalValue = rest;
				}
			} else if (functionInput?.enum_variants && typeof newValue === 'string') {
				const enumBase = parameter.type_name.includes('::')
					? parameter.type_name.split('::')[0]
					: parameter.type_name;
				newTypeName = `${enumBase}::${newValue}`;
			} else {
				newTypeName = parameter.type_name.includes('::')
					? parameter.type_name.split('::')[0]
					: parameter.type_name;
			}

			updatedData.decoded_calldata[callIndex].parameters[paramIndex] = {
				...parameter,
				type_name: newTypeName,
				value: finalValue
			};

			return updatedData;
		});
	};

	const handleTransactionIndexInBlockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;

		if (inputValue === '') {
			_setTransactionIndexInBlock('');
			return;
		}

		if (/^0$|^[1-9]\d*$/.test(inputValue)) {
			const numValue = parseInt(inputValue, 10);
			_setTransactionIndexInBlock(numValue);
		} else {
			e.target.value = _transactionIndexInBlock !== null ? _transactionIndexInBlock.toString() : '';
		}
	};

	const normalizeEtherValue = (value: string) => {
		if (!value) return '';
		let normalized = value.trim();

		if (normalized === '') return '';
		if (normalized.startsWith('.')) {
			normalized = `0${normalized}`;
		}
		if (normalized.endsWith('.')) {
			normalized = normalized.slice(0, -1);
		}

		return normalized;
	};

	const toWei = (value: string, unit: ValueUnit): bigint | null => {
		const trimmed = value.trim();
		if (trimmed === '') return null;

		try {
			if (unit === 'wei') {
				return BigInt(trimmed);
			}

			const normalized = normalizeEtherValue(trimmed);
			if (normalized === '') {
				return null;
			}

			return parseEther(normalized);
		} catch (error) {
			console.warn('Failed to convert value to wei:', error);
			return null;
		}
	};

	const formatFromWei = (weiValue: bigint, unit: ValueUnit) => {
		return unit === 'wei' ? weiValue.toString() : formatEther(weiValue);
	};

	const handleValueUnitChange = (nextUnit: ValueUnit | '') => {
		if (!nextUnit || nextUnit === _valueUnit) {
			return;
		}

		if (_value.trim() === '') {
			_setValueUnit(nextUnit);
			return;
		}

		const weiValue = toWei(_value, _valueUnit);
		if (weiValue === null) {
			_setValueUnit(nextUnit);
			return;
		}

		_setValue(formatFromWei(weiValue, nextUnit));
		_setValueUnit(nextUnit);
	};

	const getValueForPayload = (): string | undefined => {
		const trimmed = _value.trim();
		if (trimmed === '') {
			return undefined;
		}

		if (_valueUnit === 'ether') {
			const normalized = normalizeEtherValue(trimmed);
			return normalized === '' ? undefined : `${normalized}ether`;
		}

		return trimmed;
	};

	const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let inputValue = e.target.value;

		if (inputValue === '') {
			_setValue('');
			return;
		}

		if (_valueUnit === 'wei') {
			if (/^\d+$/.test(inputValue)) {
				_setValue(inputValue);
			} else {
				e.target.value = _value;
			}
			return;
		}

		if (inputValue.startsWith('.')) {
			inputValue = `0${inputValue}`;
		}

		if (/^\d+(\.\d*)?$/.test(inputValue)) {
			_setValue(inputValue);
		} else {
			e.target.value = _value;
		}
	};

	const onDialogSubmit = async () => {
		if (activeTabs === 'parameters' && decodeCalldata) {
			await handleParameterSubmission(
				_senderAddress,
				decodeCalldata,
				_blockNumber,
				_transactionVersion,
				_chain,
				setIsSimulating,
				setAlert,
				_transactionIndexInBlock,
				getValueForPayload(),
				contractCallsFunctions
			);
		} else {
			await handleRawSubmission(
				_senderAddress,
				_contractCalls,
				_blockNumber,
				_transactionVersion,
				_chain,
				setAlert,
				_transactionIndexInBlock,
				getValueForPayload()
			);
		}
	};

	return (
		<>
			<HeaderNav />
			<main className="overflow-y-scroll h-[calc(100vh-650px)] xl:flex xl:justify-between flex-grow relative">
				<div className="left-8 px-4 py-8 xl:block hidden">
					<Button onClick={() => router.back()} variant="outline">
						<ArrowLeftIcon className="w-4 h-4 mr-2" /> Back
					</Button>
				</div>
				<div className="xl:hidden block px-4 py-8">
					<Button onClick={() => router.back()} variant="outline">
						<ArrowLeftIcon className="w-4 h-4 mr-2" /> Back
					</Button>
				</div>

				<div className="w-full flex justify-center">
					<div className="w-full max-w-5xl px-4 py-8">
						<div className="mb-6">
							<div className="flex flex-col gap-2">
								<h1 className="text-xl font-medium flex flex-nowrap items-center">
									{title}
									{txHash && (
										<>
											<CopyToClipboardElement
												value={txHash}
												toastDescription="The address has been copied."
												className="lg:block hidden"
											>
												{txHash}
											</CopyToClipboardElement>
											<CopyToClipboardElement
												value={txHash}
												toastDescription="The address has been copied."
												className="lg:hidden block"
											>
												{shortenHash(txHash)}
											</CopyToClipboardElement>
										</>
									)}
								</h1>
								<h3 className="text-muted-foreground">{description}</h3>
							</div>
						</div>

						<div className="rounded-lg py-4">
							<div className="grid gap-6">
								<div className="grid grid-cols-1 md:grid-cols-4 md:items-center gap-2 md:gap-4">
									<Label htmlFor="chain-id" className="md:text-right">
										Network
									</Label>
									<NetworksSelect
										isLoading={isLoading}
										simulationPayload={simulationPayload}
										onChainChangedCallback={onChainChangedCallback}
									/>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-4 md:items-center gap-2 md:gap-y-2 md:gap-x-4">
									<Label htmlFor="sender-address" className="md:text-right">
										Sender address
									</Label>
									<Input
										id="sender-address"
										value={_senderAddress}
										onChange={(e) => _setSenderAddress(e.target.value)}
										className={`md:col-span-3 font-mono ${
											alert &&
											(_senderAddress === '' || !validateHexFormat(_senderAddress)) &&
											'border-red-500'
										}`}
									/>
									{alert && _senderAddress === '' && (
										<p className="text-xs text-muted-foreground text-red-500 md:col-span-3 md:col-start-2">
											Sender address is required.
										</p>
									)}
									{alert && !validateHexFormat(_senderAddress) && (
										<p className="text-xs text-muted-foreground text-red-500 md:col-span-3 md:col-start-2">
											Sender address must be a hexadecimal number.
										</p>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-4 md:items-center gap-2 md:gap-4">
									<Label htmlFor="number-contracts" className="md:text-right">
										Number of contract calls
									</Label>
									<Input
										id="number-contracts"
										value={_numberOfContracts}
										type="number"
										min={1}
										onChange={handleNumberOfContractsChange}
										className={`md:col-span-3 font-mono ${
											alert && _numberOfContracts < 1 && 'border-red-500'
										}`}
									/>
								</div>

								<Tabs defaultValue="parameters" onValueChange={handleTabChange}>
									<div className="grid grid-cols-1 md:grid-cols-4 md:items-center gap-2 md:gap-4">
										<Label className="md:text-right">Calldata mode</Label>

										<TabsList className="flex md:inline-flex md:col-span-3 w-fit dark:bg-card !justify-start md:justify-center flex-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-rounded">
											<TabsTrigger value="raw">Raw</TabsTrigger>
											<TabsTrigger value="parameters">Parameters</TabsTrigger>
										</TabsList>
									</div>

									{_contractCalls.map((call, index) => (
										<ContractCallFieldset
											key={`${index}-${call.address}-${call.function_name}`}
											call={call}
											index={index}
											chain={_chain}
											contractCallsFunctions={contractCallsFunctions}
											isLoadingFunctions={isLoadingFunctions}
											contractFetchErrors={contractFetchErrors}
											alert={alert}
											decodeCalldata={decodeCalldata}
											serverDataLoaded={serverDataLoaded}
											isParameterInvalid={isParameterInvalid}
											hasDecodeError={calldataDecodeError[index] || false}
											onContractAddressChange={handleContractAddressChange}
											onFunctionNameChange={handleFunctionNameChange}
											onCalldataChange={handleCalldataChange}
											onParameterValueChange={handleParameterValueChange}
											onValidationChange={(isValid) => setIsParameterInvalid(!isValid)}
											onResetCalldata={handleResetCalldata}
										/>
									))}
								</Tabs>
								<div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
									<Label htmlFor="transaction-index" className="text-right">
										Transaction index
									</Label>
									<Input
										type="text"
										inputMode="numeric"
										id="transaction-index"
										value={_transactionIndexInBlock ?? ''}
										onChange={handleTransactionIndexInBlockChange}
										className="col-span-3 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
										placeholder="Auto"
									/>
									<p className="text-xs text-muted-foreground col-span-3 col-start-2">
										Transaction index in block. If empty, the last transaction in block will be
										used.
									</p>
								</div>

								<div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
									<Label htmlFor="value" className="text-right">
										Value
									</Label>
									<div className="col-span-3 flex flex-col gap-2 sm:flex-row sm:items-center">
										<Input
											type="text"
											inputMode={_valueUnit === 'wei' ? 'numeric' : 'decimal'}
											id="value"
											value={_value}
											onChange={handleValueChange}
											className="font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex-1"
											placeholder={_valueUnit === 'wei' ? '0' : '0.05'}
										/>
										<ToggleGroup
											type="single"
											value={_valueUnit}
											onValueChange={(unit) => handleValueUnitChange(unit as ValueUnit | '')}
											aria-label="Value unit"
											className="justify-start sm:justify-center"
										>
											<ToggleGroupItem value="wei" className="px-3">
												Wei
											</ToggleGroupItem>
											<ToggleGroupItem value="ether" className="px-3">
												Ether
											</ToggleGroupItem>
										</ToggleGroup>
									</div>
									<p className="text-xs text-muted-foreground col-span-3 col-start-2">
										Optional ETH value. Use the toggle to switch between wei and ether - the input
										converts automatically. Leave empty to send 0.
									</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-4 md:items-center gap-2 md:gap-x-4 md:gap-y-2">
									<Label htmlFor="block-number" className="md:text-right">
										Block number
									</Label>
									<Input
										type="text"
										inputMode="numeric"
										id="block-number"
										value={_blockNumber ?? ''}
										onChange={handleBlockNumberChange}
										className="md:col-span-3 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
										placeholder="Latest"
									/>
									<p className="text-xs text-muted-foreground md:col-span-3 md:col-start-2">
										If you leave the field empty, the latest block will be used.
									</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-4 md:items-center gap-2 md:gap-4">
									<Label htmlFor="tx-version" className="md:text-right">
										Transaction version
									</Label>
									<div className="md:col-span-3">
										<Select
											value={_transactionVersion.toString()}
											onValueChange={(value) => _setTransactionVersion(parseInt(value))}
										>
											<SelectTrigger className="font-mono">
												<SelectValue placeholder="Select version" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="1">Version 1</SelectItem>
												<SelectItem value="3">Version 3</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								{alert && (
									<FieldAlert
										senderAddress={_senderAddress}
										contractCalls={_contractCalls}
										transactionVersion={_transactionVersion}
									/>
								)}

								<div className="flex justify-end mt-4 mb-12">
									<Button
										type="submit"
										onClick={onDialogSubmit}
										disabled={isParameterInvalid || isSimulating}
									>
										{isSimulating ? (
											<>
												<span className="h-4 w-4 block rounded-full border-2 border-t-transparent animate-spin mr-2"></span>
												Simulating...
											</>
										) : (
											<>
												<PlayIcon className="w-4 h-4 mr-2" /> Run Simulation
											</>
										)}
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div></div>
			</main>
			<Footer />
		</>
	);
}
