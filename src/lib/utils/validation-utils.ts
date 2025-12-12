export const validateHexFormat = (value: string): boolean => {
	return /^0x[0-9a-fA-F]+$/.test(value) || value === '';
};

export const validateCalldata = (calldata: string[]): boolean => {
	return calldata.every((item) => validateHexFormat(item));
};

export const validateCalldataString = (calldataString: string): boolean => {
	if (calldataString.trim() === '') return true;

	const calldataLines = calldataString
		.trim()
		.split('\n')
		.filter((line) => line.trim() !== '');

	return validateCalldata(calldataLines);
};

export function validateType(value: string, type: string): boolean {
	if (typeof value !== 'string') return true;

	if (!value || value.trim() === '') return true;

	const trimmedValue = value.trim();

	if (trimmedValue.startsWith('0x') || trimmedValue.startsWith('0X')) {
		const hexPattern = /^0[xX][0-9a-fA-F]+$/;
		return hexPattern.test(trimmedValue);
	}

	if (type.match(/^u\d+$/) || type.match(/^i\d+$/)) {
		if (trimmedValue.startsWith('0x') || trimmedValue.startsWith('0X')) {
			return /^0[xX][0-9a-fA-F]+$/.test(trimmedValue);
		}
		if (type.startsWith('i')) {
			return /^-?\d+$/.test(trimmedValue);
		}
		return /^\d+$/.test(trimmedValue);
	}

	if (type === 'felt252' || type.includes('felt')) {
		if (trimmedValue.startsWith('0x') || trimmedValue.startsWith('0X')) {
			return /^0[xX][0-9a-fA-F]+$/.test(trimmedValue);
		}
		return /^\d+$/.test(trimmedValue);
	}

	if (type === 'ContractAddress') {
		return /^0[xX][0-9a-fA-F]+$/.test(trimmedValue);
	}

	if (type === 'ByteArray' || type.includes('String')) {
		return true;
	}

	return true;
}

export interface ValidationErrors {
	emptyFields: string[];
	hexFormatErrors: string[];
	calldataErrors: { index: number; message: string }[];
	versionError?: string;
}

export const getValidationErrors = (
	senderAddress: string,
	contractCalls: Array<{ address: string; function_name: string; calldata: string }>,
	transactionVersion: number
): ValidationErrors => {
	const errors: ValidationErrors = {
		emptyFields: [],
		hexFormatErrors: [],
		calldataErrors: []
	};

	if (!senderAddress) {
		errors.emptyFields.push('Sender Address');
	}

	const hasEmptyAddresses = contractCalls.some(
		(call) => !call.address || !validateHexFormat(call.address)
	);
	if (hasEmptyAddresses) {
		errors.emptyFields.push('Contract Address');
	}

	const hasEmptyFunctions = contractCalls.some((call) => !call.function_name);
	if (hasEmptyFunctions) {
		errors.emptyFields.push('Entry Point');
	}

	if (!transactionVersion) {
		errors.emptyFields.push('Transaction version');
	}

	if (senderAddress && !validateHexFormat(senderAddress)) {
		errors.hexFormatErrors.push('Sender address must be a hexadecimal number starting with 0x');
	}

	contractCalls.forEach((call, index) => {
		if (call.address && !validateHexFormat(call.address)) {
			errors.hexFormatErrors.push(
				`Contract address in call #${index + 1} must be a hexadecimal number starting with 0x`
			);
		}

		if (call.address && call.calldata && call.calldata.trim() !== '') {
			const calldataArray = call.calldata
				.trim()
				.split('\n')
				.filter((line) => line.trim() !== '');
			if (!validateCalldata(calldataArray)) {
				errors.calldataErrors.push({
					index,
					message: `Calldata in call #${
						index + 1
					} must be a list of hexadecimal numbers, each starting with 0x`
				});
			}
		}
	});

	if (![1, 3].includes(transactionVersion)) {
		errors.versionError = 'Transaction version must be either 1 or 3';
	}

	return errors;
};

export const hasValidationErrors = (errors: ValidationErrors): boolean => {
	return (
		errors.emptyFields.length > 0 ||
		errors.hexFormatErrors.length > 0 ||
		errors.calldataErrors.length > 0 ||
		!!errors.versionError
	);
};

export function normalizeValue(val: any): any {
	if (val === null || val === undefined) return val;
	if (typeof val === 'boolean' || typeof val === 'number' || typeof val === 'string') {
		return val;
	}
	if (Array.isArray(val)) {
		return val.map(normalizeValue);
	}
	if (typeof val === 'object') {
		const normalized: any = {};
		Object.entries(val).forEach(([key, fieldValue]: [string, any]) => {
			if (
				fieldValue &&
				typeof fieldValue === 'object' &&
				('name' in fieldValue || 'typeName' in fieldValue || 'type_name' in fieldValue)
			) {
				normalized[key] = {
					name: fieldValue.name,
					type_name: fieldValue.type_name || fieldValue.typeName,
					value: normalizeValue(fieldValue.value)
				};
			} else {
				normalized[key] = normalizeValue(fieldValue);
			}
		});
		return normalized;
	}
	return val;
}

export function normalizeDecodedCalldata(decodeCalldataResult: any): any {
	return {
		...decodeCalldataResult,
		decoded_calldata: decodeCalldataResult.decoded_calldata.map((call: any) => ({
			...call,
			parameters: call.parameters.map((param: any) => ({
				name: param.name,
				type_name: param.type_name || param.typeName,
				value: normalizeValue(param.value)
			}))
		}))
	};
}
