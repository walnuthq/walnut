export interface SimpleContractCall {
	address: string;
	function_name: string;
	calldata: string;
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

function isEthereumAddress(value: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isSmallHexNumber(value: string): boolean {
	const num = parseInt(value, 16);
	return !isNaN(num) && num >= 0 && num <= 100;
}

export function parseContractCalls(calldata: string[]): SimpleContractCall[] {
	const result: SimpleContractCall[] = [];

	if (!calldata || calldata.length === 0) {
		return result;
	}

	const firstElement = calldata[0];

	if (isEthereumAddress(firstElement)) {
		for (let i = 0; i < calldata.length; i += 2) {
			const address = calldata[i];
			const rawCalldata = calldata[i + 1] || '';

			result.push({
				address,
				function_name: '',
				calldata: rawCalldata
			});
		}
	} else if (isSmallHexNumber(firstElement)) {
		const numContracts = parseInt(firstElement, 16);

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
	} else {
		for (let i = 0; i < calldata.length; i += 2) {
			const address = calldata[i];
			const rawCalldata = calldata[i + 1] || '';

			result.push({
				address,
				function_name: '',
				calldata: rawCalldata
			});
		}
	}

	return result;
}
