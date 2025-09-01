import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChainId } from '../types';
export * from './fetch';

import { ContractCall, SimulationPayloadWithCalldata } from '../simulation';

export interface SimpleContractCall {
	address: string;
	function_name: string;
	calldata: string;
}

export interface SimulationPayload {
	senderAddress: string;
	calls: SimpleContractCall[];
	blockNumber?: number;
	transactionVersion: number;
	nonce?: number;
	rpcUrl?: string;
	chainId?: string;
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function copyToClipboard(text: string): void {
	navigator.clipboard.writeText(text).then(
		function () {
			console.log('Copying to clipboard was successful!');
		},
		function (err) {
			console.error('Could not copy text: ', err);
		}
	);
}

export function shortenHash(hash: string, length = 13) {
	if (!hash) return '';
	if (hash.length <= length) return hash;
	length = Math.round((length - 5) / 2);
	return hash.substring(0, length + 2) + '...' + hash.substring(hash.length - length);
}

export function hexToNumber(hexString: string): number {
	return parseInt(hexString, 16);
}

export function hexToText(hex: string): string {
	let text = '';
	for (let i = 0; i < hex.length; i += 2) {
		text += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	}
	return text;
}

export function isHexFormat(value: string): boolean {
	return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value);
}

export function isDecimalFormat(value: string): boolean {
	return typeof value === 'string' && /^[0-9]+$/.test(value);
}

export function formatTimestamp(timestamp: number): string {
	let dateObject = new Date(timestamp * 1000);

	let formatDate =
		dateObject.getFullYear() +
		'-' +
		('0' + (dateObject.getMonth() + 1)).slice(-2) +
		'-' +
		('0' + dateObject.getDate()).slice(-2) +
		' ' +
		('0' + dateObject.getHours()).slice(-2) +
		':' +
		('0' + dateObject.getMinutes()).slice(-2);

	return formatDate;
}

export function formatTimestampToUTC(timestamp: number): string {
	let dateObject = new Date(timestamp * 1000);
	const options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
		timeZone: 'UTC',
		timeZoneName: 'short'
	};

	const formatter = new Intl.DateTimeFormat('en-GB', options);
	return formatter.format(dateObject);
}

export function extractChainId(chainIdStr: string): ChainId | undefined {
	switch (chainIdStr) {
		case ChainId.SN_MAIN:
			return ChainId.SN_MAIN;
		case ChainId.SN_SEPOLIA:
			return ChainId.SN_SEPOLIA;
		case ChainId.ETH_MAIN:
			return ChainId.ETH_MAIN;
		case ChainId.ETH_SEPOLIA:
			return ChainId.ETH_SEPOLIA;
		case ChainId.OP_MAIN:
			return ChainId.OP_MAIN;
		case ChainId.OP_SEPOLIA:
			return ChainId.OP_SEPOLIA;
		default:
			return undefined;
	}
}

export function mapChainIdNumberToEnum(chainIdNumber: number): ChainId | undefined {
	switch (chainIdNumber) {
		case 1: // Ethereum Mainnet
			return ChainId.ETH_MAIN;
		case 11155111: // Sepolia
			return ChainId.ETH_SEPOLIA;
		case 10: // Optimism Mainnet
			return ChainId.OP_MAIN;
		case 11155420: // Optimism Sepolia
			return ChainId.OP_SEPOLIA;
		case 23448594291968334: // Starknet Mainnet
			return ChainId.SN_MAIN;
		case 1536727068981429685: // Starknet Sepolia
			return ChainId.SN_SEPOLIA;
		default:
			return undefined;
	}
}

export function mapChainIdStringToNumber(chainIdString: string): number | undefined {
	switch (chainIdString) {
		case ChainId.ETH_MAIN:
			return 1;
		case ChainId.ETH_SEPOLIA:
			return 11155111;
		case ChainId.OP_MAIN:
			return 10;
		case ChainId.OP_SEPOLIA:
			return 11155420;
		case ChainId.SN_MAIN:
			return 23448594291968334;
		case ChainId.SN_SEPOLIA:
			return 1536727068981429685;
		default:
			return undefined;
	}
}

export function extractSimulationPayloadWithCalldata(
	searchParams: URLSearchParams
): SimulationPayloadWithCalldata | undefined {
	const senderAddress = searchParams.get('senderAddress');
	const calldata = searchParams.get('calldata');
	const blockNumber = searchParams.get('blockNumber');
	const transactionVersion = searchParams.get('transactionVersion');
	const nonce = searchParams.get('nonce');
	const chainId = searchParams.get('chainId');

	if (senderAddress && calldata && transactionVersion) {
		const parsedCalldata = parseCalldata(calldata);

		const result: SimulationPayloadWithCalldata = {
			senderAddress,
			calldata: parsedCalldata,
			transactionVersion: parseInt(transactionVersion),
			nonce: nonce ? parseInt(nonce) : undefined,
			chainId: chainId ?? undefined
		};

		if (blockNumber) {
			result.blockNumber = parseInt(blockNumber);
		}

		return result;
	}

	return undefined;
}

export function serializeContractCalls(calls: SimpleContractCall[]): string[] {
	const result: string[] = [];
	result.push('0x' + calls.length.toString(16));

	for (const call of calls) {
		result.push(call.address);
		result.push(call.function_name);
		const calldataLines = call.calldata
			.trim()
			.split('\n')
			.filter((line) => line.trim() !== '');
		result.push('0x' + calldataLines.length.toString(16));

		for (const line of calldataLines) {
			result.push(line.trim());
		}
	}

	return result;
}

export function parseContractCalls(calldata: string[]): SimpleContractCall[] {
	const result: SimpleContractCall[] = [];

	if (!calldata || calldata.length === 0) {
		return result;
	}

	const numContracts = parseInt(calldata[0], 16);

	let index = 1;
	for (let i = 0; i < numContracts; i++) {
		if (index >= calldata.length) break;
		const address = calldata[index++];

		if (index >= calldata.length) break;
		const function_name = calldata[index++];

		if (index >= calldata.length) break;
		const numCalldataElements = parseInt(calldata[index++], 16);

		const contractCalldata: string[] = [];
		for (let j = 0; j < numCalldataElements; j++) {
			if (index >= calldata.length) break;
			contractCalldata.push(calldata[index++]);
		}

		result.push({
			address,
			function_name,
			calldata: contractCalldata.join('\n')
		});
	}

	return result;
}

export function openSimulationPage(simulationPayload: SimulationPayload): void {
	const serializedCalls = serializeContractCalls(simulationPayload.calls);

	const params = new URLSearchParams({
		senderAddress: simulationPayload.senderAddress,
		calldata: serializedCalls.join(','),
		transactionVersion: simulationPayload.transactionVersion.toString()
	});

	if (simulationPayload.blockNumber !== undefined)
		params.set('blockNumber', simulationPayload.blockNumber.toString());
	if (simulationPayload.nonce !== undefined)
		params.set('nonce', simulationPayload.nonce.toString());
	if (simulationPayload.chainId) params.set('chainId', simulationPayload.chainId);

	window.location.href = `/simulations?${params.toString()}`;
}

export function parseCalldata(calldata: string): string[] {
	return calldata.split(',');
}

export const getContractName = ({ contractCall }: { contractCall: ContractCall }) => {
	let contractName: string | undefined = undefined;
	if (contractCall.contractName) {
		contractName = contractCall.contractName;
	} else if (contractCall.erc20TokenName || contractCall.erc20TokenSymbol) {
		contractName = [contractCall.erc20TokenName, `(${contractCall.erc20TokenSymbol})`].join(' ');
	} else if (contractCall.entryPointInterfaceName) {
		contractName = contractCall.entryPointInterfaceName.split('::').pop();
	}

	if (!contractName) {
		contractName = shortenHash(contractCall.entryPoint.storageAddress, 13);
	}
	return contractName;
};

export const stackMapping: { [key: string]: string } = {
	sn: 'Starknet',
	OP: 'Optimism',
	op: 'Optimism',
	eth: 'Ethereum',
	'PowerLoom Devnet': 'Arbitrum'
};

export const chainMapping: { [key: string]: string } = {
	sepolia: 'Sepolia',
	main: 'Mainnet',
	mainnet: 'Mainnet',
	'PowerLoom Devnet': 'PowerLoom Devnet'
};

export const starknetPrefixes = ['sn'];

export const unknownPrefixesAsStarknet = (prefix: string): boolean => {
	const knownPrefixes = Object.keys(stackMapping).map((k) => k.toLowerCase());
	return !knownPrefixes.includes(prefix.toLowerCase());
};
