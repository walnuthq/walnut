import { useState, useEffect } from 'react';
import { SimpleContractCall } from '@/lib/utils';
import { Chain } from '@/components/networks-select';
import { validateHexFormat, validateCalldata } from '../../lib/utils/validation-utils';

type ValueUnit = 'wei' | 'ether';

const getUnitFromValue = (value?: string): ValueUnit => {
	if (value && value.toLowerCase().endsWith('ether')) {
		return 'ether';
	}
	return 'wei';
};

const getDisplayValueFromPayload = (value?: string): string => {
	if (!value) return '';
	if (getUnitFromValue(value) === 'ether') {
		return value.slice(0, -5);
	}
	return value;
};

export function useSimulationForm(simulationPayload?: any, defaultTransactionVersion: number = 3) {
	const [alert, setAlert] = useState(false);
	const [isParameterInvalid, setIsParameterInvalid] = useState(false);
	const [serverDataLoaded, setServerDataLoaded] = useState(false);
	const [isSimulating, setIsSimulating] = useState(false);
	const [calldataDecodeError, setCalldataDecodeError] = useState<{ [key: number]: boolean }>({});

	const [_senderAddress, _setSenderAddress] = useState<string>(
		simulationPayload?.senderAddress ?? ''
	);
	const [_numberOfContracts, _setNumberOfContracts] = useState<number>(
		simulationPayload?.calls?.length || 1
	);
	const [_contractCalls, _setContractCalls] = useState<SimpleContractCall[]>(
		simulationPayload?.calls || []
	);
	const [_blockNumber, _setBlockNumber] = useState<number | ''>(
		simulationPayload?.blockNumber ?? ''
	);
	const [_transactionIndexInBlock, _setTransactionIndexInBlock] = useState<number | ''>(
		simulationPayload?.transactionIndexInBlock ?? ''
	);
	const [_value, _setValue] = useState<string>(() =>
		getDisplayValueFromPayload(simulationPayload?.value)
	);
	const [_valueUnit, _setValueUnit] = useState<ValueUnit>(() =>
		getUnitFromValue(simulationPayload?.value)
	);
	const [_transactionVersion, _setTransactionVersion] = useState<number>(
		simulationPayload?.transactionVersion || defaultTransactionVersion
	);
	const [_chain, _setChain] = useState<Chain | undefined>(undefined);
	const [activeTabs, setActiveTabs] = useState('parameters');

	useEffect(() => {
		if (!simulationPayload) return;

		_setSenderAddress(simulationPayload.senderAddress ?? '');
		_setBlockNumber(simulationPayload.blockNumber ?? '');
		_setTransactionIndexInBlock(simulationPayload.transactionIndexInBlock ?? '');

		if (simulationPayload.value !== undefined) {
			_setValue(getDisplayValueFromPayload(simulationPayload.value));
			_setValueUnit(getUnitFromValue(simulationPayload.value));
		} else {
			_setValue('');
			_setValueUnit('wei');
		}

		if (simulationPayload.networkName) {
			_setChain({ networkName: simulationPayload.networkName });
		} else if (simulationPayload.rpcUrl) {
			_setChain({
				network: {
					rpcUrl: simulationPayload.rpcUrl,
					networkName: 'Custom Network'
				}
			});
		}

		if (simulationPayload.calls && simulationPayload.calls.length > 0) {
			_setContractCalls(simulationPayload.calls);
			_setNumberOfContracts(simulationPayload.calls.length);
		} else {
			_setContractCalls([{ address: '', function_name: '', calldata: '' }]);
			_setNumberOfContracts(1);
		}

		_setTransactionVersion(simulationPayload.transactionVersion || defaultTransactionVersion);
	}, [simulationPayload, defaultTransactionVersion]);

	useEffect(() => {
		if (_contractCalls.length === _numberOfContracts) return;

		const newCalls = [..._contractCalls];

		if (newCalls.length < _numberOfContracts) {
			for (let i = newCalls.length; i < _numberOfContracts; i++) {
				newCalls.push({
					address: '',
					function_name: '',
					calldata: ''
				});
			}
		} else if (newCalls.length > _numberOfContracts) {
			newCalls.splice(_numberOfContracts);
		}

		_setContractCalls(newCalls);
	}, [_numberOfContracts, _contractCalls.length, _chain]);

	return {
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
		_transactionIndexInBlock,
		_setTransactionIndexInBlock,
		_value,
		_setValue,
		_valueUnit,
		_setValueUnit,
		_transactionVersion,
		_setTransactionVersion,
		_chain,
		_setChain,
		activeTabs,
		setActiveTabs
	};
}

export { type ValueUnit, getUnitFromValue, getDisplayValueFromPayload };

export function useFormValidation(
	_senderAddress: string,
	_contractCalls: SimpleContractCall[],
	_transactionVersion: number,
	alert: boolean,
	contractCallsFunctions: any,
	setAlert: (alert: boolean) => void
) {
	useEffect(() => {
		if (alert) {
			const allAddressesValid = _contractCalls.every((call) => validateHexFormat(call.address));
			const allFunctionsSelected = _contractCalls.every((call) => !!call.function_name);
			const allCalldataValid = _contractCalls.every((call) => {
				const calldataLines = call.calldata
					.trim()
					.split('\n')
					.filter((line) => line.trim() !== '');
				return (
					validateCalldata(calldataLines) &&
					calldataLines.length ===
						contractCallsFunctions[call.address]?.find(
							(item: string) => item[0] === call.function_name
						)?.[1]?.inputs?.length
				);
			});

			if (
				_senderAddress !== '' &&
				validateHexFormat(_senderAddress) &&
				allAddressesValid &&
				allFunctionsSelected &&
				allCalldataValid &&
				[1, 3].includes(_transactionVersion)
			) {
				setAlert(false);
			}
		}
	}, [
		_senderAddress,
		_contractCalls,
		_transactionVersion,
		alert,
		contractCallsFunctions,
		setAlert
	]);
}
