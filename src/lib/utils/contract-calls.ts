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
