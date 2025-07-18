import {
	type DecodeFunctionDataParameters,
	type DecodeFunctionResultParameters,
	decodeFunctionData,
	decodeFunctionResult,
	getAbiItem,
	type GetAbiItemParameters,
	type AbiFunction,
	type AbiParameter
} from 'viem';
import { type AbiEventParameter } from 'abitype';

export const decodeFunctionDataSafe = (params: DecodeFunctionDataParameters) => {
	try {
		return decodeFunctionData(params);
	} catch (error) {
		console.error(error);
		return { functionName: params.data.slice(0, 10), args: undefined };
	}
};

export const decodeFunctionResultSafe = (params: DecodeFunctionResultParameters) => {
	try {
		return decodeFunctionResult(params);
	} catch (error) {
		console.error(error);
		return undefined;
	}
};

const formatAbiParameterType = ({ type, internalType }: AbiParameter) => {
	const actualType = internalType ?? type;
	if (actualType.includes('struct')) {
		const [, structName] = actualType.split(' ');
		return structName;
	} else {
		return actualType;
	}
};

const formatAbiParameterName = ({ name }: AbiParameter | AbiEventParameter) =>
	`${name ? ` ${name}` : ''}`;

const formatAbiParameter = (value: unknown, abiParameter: AbiParameter) =>
	`${formatAbiParameterType(abiParameter)}${formatAbiParameterName(
		abiParameter
	)}: ${formatAbiParameterValue(value, abiParameter)}`;

export const formatAbiParameterValue = (
	value: unknown,
	abiParameter: AbiParameter | AbiEventParameter
): string => {
	switch (abiParameter.type) {
		case 'bool': {
			return `${value}`;
		}
		case 'uint8':
		case 'uint16':
		case 'uint24':
		case 'uint32':
		case 'uint40':
		case 'uint48':
		case 'uint56':
		case 'uint64':
		case 'uint72':
		case 'uint80':
		case 'uint88':
		case 'uint96':
		case 'uint104':
		case 'uint112':
		case 'uint120':
		case 'uint128':
		case 'uint136':
		case 'uint144':
		case 'uint152':
		case 'uint160':
		case 'uint168':
		case 'uint176':
		case 'uint184':
		case 'uint192':
		case 'uint200':
		case 'uint208':
		case 'uint216':
		case 'uint224':
		case 'uint232':
		case 'uint240':
		case 'uint248':
		case 'uint256': {
			return `${value}`;
		}
		case 'int8':
		case 'int16':
		case 'int24':
		case 'int32':
		case 'int40':
		case 'int48':
		case 'int56':
		case 'int64':
		case 'int72':
		case 'int80':
		case 'int88':
		case 'int96':
		case 'int104':
		case 'int112':
		case 'int120':
		case 'int128':
		case 'int136':
		case 'int144':
		case 'int152':
		case 'int160':
		case 'int168':
		case 'int176':
		case 'int184':
		case 'int192':
		case 'int200':
		case 'int208':
		case 'int216':
		case 'int224':
		case 'int232':
		case 'int240':
		case 'int248':
		case 'int256': {
			return `${value}`;
		}
		case 'bytes':
		case 'bytes1':
		case 'bytes2':
		case 'bytes3':
		case 'bytes4':
		case 'bytes5':
		case 'bytes6':
		case 'bytes7':
		case 'bytes8':
		case 'bytes9':
		case 'bytes10':
		case 'bytes11':
		case 'bytes12':
		case 'bytes13':
		case 'bytes14':
		case 'bytes15':
		case 'bytes16':
		case 'bytes17':
		case 'bytes18':
		case 'bytes19':
		case 'bytes20':
		case 'bytes21':
		case 'bytes22':
		case 'bytes23':
		case 'bytes24':
		case 'bytes25':
		case 'bytes26':
		case 'bytes27':
		case 'bytes28':
		case 'bytes29':
		case 'bytes30':
		case 'bytes31':
		case 'bytes32': {
			return `${value}`;
		}
		case 'address': {
			return `${value}`;
		}
		case 'string': {
			return `"${value}"`;
		}
		case 'tuple': {
			const tuple = value as Record<string, unknown>;
			const { components } = abiParameter as {
				components: readonly AbiParameter[];
			};
			const [, structName] = abiParameter.internalType ? abiParameter.internalType.split(' ') : [];
			return `${structName}({ ${components
				.map((component) => formatAbiParameter(tuple[component.name ?? ''], component))
				.join(', ')} })`;
		}
		// arrays
		default: {
			const array = value as unknown[];
			const typeMatches = abiParameter.type.match(/(.*)\[(\d*)\]/);
			if (!typeMatches) {
				return `[${array.join(', ')}]`;
			}
			const [, type] = typeMatches;
			if (!type) {
				return `[${array.join(', ')}]`;
			}
			const internalTypeMatches = abiParameter.internalType
				? abiParameter.internalType.match(/(.*)\[(\d*)\]/)
				: null;
			const [, internalType] = internalTypeMatches ?? [];
			const arrayFormatted = array
				.map((item, index) =>
					formatAbiParameterValue(item, {
						...abiParameter,
						name: `${abiParameter.name}[${index}]`,
						type,
						internalType
					})
				)
				.join(', ');
			return `[${arrayFormatted}]`;
		}
	}
};

export const getAbiFunction = (params: GetAbiItemParameters) => {
	const abiFunction = getAbiItem(params);
	return abiFunction ? (abiFunction as AbiFunction) : undefined;
};
