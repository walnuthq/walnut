import { useEffect, useState } from 'react';
import { validateType } from '@/lib/utils/validation-utils';
import {
	getDefaultValue,
	getInitialEnumVariant,
	isPrimitiveCompoundType,
	parseTupleType,
	parseArrayType,
	hasNestedStructure,
	hasComplexArrayElements,
	extractStructMembers
} from '@/lib/utils/parameter-utils';
import { TupleInput } from './parameter-input-components/tuple-input';
import { PrimitiveArrayInput } from './parameter-input-components/primitive-array-input';
import { BooleanInput, PrimitiveInput } from './parameter-input-components/simple-parameter-input';
import { ArrayOfTuplesInput } from './parameter-input-components/array-of-tuples-input';
import { ArrayOfStructsInput } from './parameter-input-components/array-of-structs-input';
import { PrimitiveCompoundInput } from './parameter-input-components/primitive-compound-input';
import { EnumInput } from './parameter-input-components/enum-input';
import { StructInput } from './parameter-input-components/struct-input';

interface ParameterInputProps {
	parameter: {
		name: string;
		type_name: string;
		value: any;
	};
	onValueChange: (newValue: any) => void;
	onValidationChange?: (isValid: boolean) => void;
	functionInput?: any;
}

export const ParameterInput = ({
	parameter,
	onValueChange,
	onValidationChange,
	functionInput
}: ParameterInputProps) => {
	const [enumVariant, setEnumVariant] = useState<string>(() =>
		getInitialEnumVariant(parameter, functionInput)
	);
	const [isValid, setIsValid] = useState<boolean>(true);
	const [childrenValidation, setChildrenValidation] = useState<Map<string, boolean>>(new Map());

	useEffect(() => {
		if (parameter.type_name.includes('::')) {
			const variantFromType = parameter.type_name.split('::')[1];
			setEnumVariant(variantFromType);
		} else if (
			typeof parameter.value === 'object' &&
			parameter.value !== null &&
			'__enum_variant' in parameter.value
		) {
			setEnumVariant(parameter.value.__enum_variant);
		} else {
			const initialVariant = getInitialEnumVariant(parameter, functionInput);
			setEnumVariant(initialVariant);
		}
	}, [parameter.type_name, parameter.value, parameter.name, functionInput]);

	useEffect(() => {
		if (typeof parameter.value === 'string') {
			const valid = validateType(parameter.value, parameter.type_name);
			setIsValid(valid);
			onValidationChange?.(valid);
		}
	}, [parameter.value, parameter.type_name]);

	useEffect(() => {
		const allChildrenValid = Array.from(childrenValidation.values()).every((v) => v);
		const currentValid = isValid && (childrenValidation.size === 0 || allChildrenValid);
		onValidationChange?.(currentValid);
	}, [childrenValidation, isValid]);

	const handleChildValidationChange = (key: string, valid: boolean) => {
		setChildrenValidation((prev) => {
			const next = new Map(prev);
			next.set(key, valid);
			return next;
		});
	};

	if (parameter.type_name === 'bool') {
		return <BooleanInput parameter={parameter} isValid={isValid} onValueChange={onValueChange} />;
	}

	const tupleTypes = parseTupleType(parameter.type_name);
	if (tupleTypes && Array.isArray(parameter.value)) {
		return (
			<TupleInput
				parameter={parameter}
				tupleTypes={tupleTypes}
				onValueChange={onValueChange}
				onChildValidationChange={handleChildValidationChange}
			/>
		);
	}

	const elementType = parseArrayType(parameter.type_name);
	if (elementType) {
		const hasStructMembers =
			functionInput?.struct_members && functionInput.struct_members.length > 0;
		const arrayValue = Array.isArray(parameter.value) ? parameter.value : [];
		const _hasComplexElements = hasComplexArrayElements(arrayValue);
		const elementTupleTypes = parseTupleType(elementType);
		const isArrayOfTuples = elementTupleTypes && elementTupleTypes.length > 0;

		if (isArrayOfTuples) {
			return (
				<ArrayOfTuplesInput
					parameter={parameter}
					elementType={elementType}
					elementTupleTypes={elementTupleTypes}
					arrayValue={arrayValue}
					functionInput={functionInput}
					onValueChange={onValueChange}
					onChildValidationChange={handleChildValidationChange}
				/>
			);
		}

		if (_hasComplexElements || hasStructMembers) {
			return (
				<ArrayOfStructsInput
					parameter={parameter}
					elementType={elementType}
					arrayValue={arrayValue}
					functionInput={functionInput}
					hasStructMembers={hasStructMembers}
					onValueChange={onValueChange}
					onChildValidationChange={handleChildValidationChange}
				/>
			);
		}

		return (
			<PrimitiveArrayInput
				parameter={parameter}
				elementType={elementType}
				onValueChange={onValueChange}
				onChildValidationChange={handleChildValidationChange}
			/>
		);
	}

	const _isPrimitiveCompoundType = isPrimitiveCompoundType(functionInput);
	if (_isPrimitiveCompoundType) {
		return (
			<PrimitiveCompoundInput
				parameter={parameter}
				functionInput={functionInput}
				onValueChange={onValueChange}
				onChildValidationChange={handleChildValidationChange}
			/>
		);
	}

	if (functionInput?.enum_variants && functionInput.enum_variants.length > 0) {
		return (
			<EnumInput
				parameter={parameter}
				functionInput={functionInput}
				enumVariant={enumVariant}
				setEnumVariant={setEnumVariant}
				onValueChange={onValueChange}
				onChildValidationChange={handleChildValidationChange}
			/>
		);
	}

	const _hasNestedStructure = hasNestedStructure(parameter.value);
	if (_hasNestedStructure) {
		const structMembers = extractStructMembers(parameter.value);
		return (
			<StructInput
				parameter={parameter}
				structMembers={structMembers}
				functionInput={functionInput}
				onValueChange={onValueChange}
				onChildValidationChange={handleChildValidationChange}
			/>
		);
	}

	if (functionInput?.struct_members && functionInput.struct_members.length > 0) {
		return (
			<StructInput
				parameter={parameter}
				structMembers={functionInput.struct_members}
				functionInput={functionInput}
				onValueChange={onValueChange}
				onChildValidationChange={handleChildValidationChange}
			/>
		);
	}
	return <PrimitiveInput parameter={parameter} isValid={isValid} onValueChange={onValueChange} />;
};
