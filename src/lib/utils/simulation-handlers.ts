import { SimpleContractCall, SimulationPayload, openSimulationPage } from '@/lib/utils';
import { validateHexFormat, validateCalldata } from './validation-utils';
import { Chain } from '@/components/networks-select';
import { toast } from '../../components/hooks/use-toast';
import { createCalldataDecoder } from '@/lib/calldata-utils';

function formatErrorMessage(error: unknown): string {
	const errorStr = String(error);
	if (errorStr.length > 300) {
		return errorStr.substring(0, 297) + '...';
	}

	return errorStr;
}

function cleanEnumValue(value: any): any {
	if (typeof value !== 'object' || value === null) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map(cleanEnumValue);
	}

	if ('__enum_value' in value && typeof value.__enum_value === 'object') {
		return cleanEnumValue(value.__enum_value);
	}

	const cleaned: any = {};
	for (const key in value) {
		if (key !== '__enum_variant') {
			cleaned[key] = cleanEnumValue(value[key]);
		}
	}

	return cleaned;
}

export async function handleParameterSubmission(
	_senderAddress: string,
	decodeCalldata: any,
	_blockNumber: number | '',
	_transactionVersion: number,
	_chain: Chain | undefined,
	setIsSimulating: (value: boolean) => void,
	setAlert: (value: boolean) => void,
	_transactionIndexInBlock?: number | '',
	_value?: string,
	contractCallsFunctions?: { [key: string]: any }
) {
	try {
		setIsSimulating(true);

		const calldataDecoder = createCalldataDecoder();
		const calls: SimpleContractCall[] = [];

		// Encode each decoded call to raw calldata
		for (const decodedCall of decodeCalldata.decoded_calldata) {
			const contractAddress = decodedCall.contract_address;
			const functionName = decodedCall.function_name;
			const parameters = decodedCall.parameters;

			// Prepare data for encoding
			const decodedData = {
				functionName: functionName,
				args: parameters.map((p: any) => cleanEnumValue(p.value)),
				argsWithTypes: parameters.map((p: any) => ({
					name: p.name,
					type: p.type_name,
					value: cleanEnumValue(p.value)
				})),
				rawCalldata: ''
			};

			// Get ABI for this contract from contractCallsFunctions
			let abi: any[] | undefined;
			if (contractCallsFunctions && contractCallsFunctions[contractAddress]) {
				const entryPoints = contractCallsFunctions[contractAddress];
				// Convert entry_point_datas to ABI format for viem
				abi = entryPoints.map(([_selector, funcData]: [string, any]) => ({
					type: 'function',
					name: funcData.name,
					inputs: funcData.inputs,
					outputs: funcData.outputs,
					stateMutability: funcData.state_mutability
				}));
			}

			// Encode to raw calldata
			const encodedCalldata = await calldataDecoder.encode(decodedData, contractAddress, abi);

			if (!encodedCalldata) {
				throw new Error(`Failed to encode calldata for function ${functionName}`);
			}

			calls.push({
				address: contractAddress,
				function_name: decodedCall.function_selector,
				calldata: encodedCalldata
			});
		}

		// Build simulation payload with encoded calldata
		const simulationPagePayload: SimulationPayload = {
			senderAddress: _senderAddress,
			calls: calls,
			blockNumber: _blockNumber === '' ? undefined : _blockNumber,
			transactionVersion: _transactionVersion,
			...(_transactionIndexInBlock !== '' &&
				_transactionIndexInBlock !== undefined && {
					transactionIndexInBlock: _transactionIndexInBlock as number
				}),
			...(_value && { value: _value })
		};

		if (_chain) {
			if (_chain.networkName) {
				simulationPagePayload.networkName = _chain.networkName;
			} else if (_chain.network) {
				simulationPagePayload.networkName = _chain.network.networkName;
				simulationPagePayload.rpcUrl = _chain.network.rpcUrl;
			}
		} else {
			throw new Error('Chain is not defined');
		}

		openSimulationPage(simulationPagePayload);
		setIsSimulating(false);
	} catch (e: any) {
		setIsSimulating(false);
		toast({
			description: formatErrorMessage(e.message || String(e)),
			variant: 'destructive'
		});
		setAlert(true);
	}
}

export async function handleRawSubmission(
	_senderAddress: string,
	_contractCalls: SimpleContractCall[],
	_blockNumber: number | '',
	_transactionVersion: number,
	_chain: Chain | undefined,
	setAlert: (value: boolean) => void,
	_transactionIndexInBlock?: number | '',
	_value?: string
) {
	const processedCalls = _contractCalls.map((call) => ({
		...call,
		calldata: call.calldata.trim() === '' ? '' : call.calldata
	}));

	const allCallsValid = processedCalls.every((call) => validateHexFormat(call.address));

	const allCalldataValid = processedCalls.every((call) => {
		if (call.calldata.trim() === '') {
			return true;
		}

		const calldataLines = call.calldata
			.trim()
			.split('\n')
			.filter((line) => line.trim() !== '');
		return validateCalldata(calldataLines);
	});

	if (!allCallsValid || !allCalldataValid) {
		setAlert(true);
		return;
	}

	const simulationPayload: SimulationPayload = {
		senderAddress: _senderAddress,
		calls: processedCalls,
		blockNumber: _blockNumber === '' ? undefined : _blockNumber,
		transactionVersion: _transactionVersion,
		...(_transactionIndexInBlock !== '' &&
			_transactionIndexInBlock !== undefined && {
				transactionIndexInBlock: _transactionIndexInBlock as number
			}),
		...(_value && { value: _value })
	};

	if (_chain) {
		if (_chain.networkName) {
			simulationPayload.networkName = _chain.networkName;
		} else if (_chain.network) {
			simulationPayload.rpcUrl = _chain.network.rpcUrl;
		}
	} else {
		throw new Error('Chain is not defined');
	}

	if (
		!simulationPayload.senderAddress ||
		simulationPayload.senderAddress === '' ||
		!validateHexFormat(simulationPayload.senderAddress) ||
		!simulationPayload.transactionVersion ||
		![1, 3].includes(simulationPayload.transactionVersion)
	) {
		setAlert(true);
	} else {
		openSimulationPage(simulationPayload);
	}
}

export function handleNumberOfContractsChange(
	e: React.ChangeEvent<HTMLInputElement>,
	setNumberOfContracts: (value: number) => void
) {
	const inputValue = e.target.value;
	const numValue = Math.max(1, parseInt(inputValue) || 1);
	setNumberOfContracts(numValue);
}

export function handleBlockNumberChange(
	e: React.ChangeEvent<HTMLInputElement>,
	_blockNumber: number | '',
	setBlockNumber: (value: number | '') => void
) {
	const inputValue = e.target.value;

	if (inputValue === '') {
		setBlockNumber('');
		return;
	}

	if (/^0$|^[1-9]\d*$/.test(inputValue)) {
		const numValue = parseInt(inputValue, 10);
		setBlockNumber(numValue);
	} else {
		e.target.value = _blockNumber !== null ? _blockNumber.toString() : '';
	}
}
