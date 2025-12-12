import { Label } from '@/components/ui/label';
import { Input } from '../../ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { StructContainer, ParameterHeader } from './parameter-input-components';
import { ParameterInput } from '../parameter-input';
import { getDefaultValue, parseTupleType } from '@/lib/utils/parameter-utils';
import { validateType } from '@/lib/utils/validation-utils';

interface EnumInputProps {
	parameter: {
		name: string;
		type_name: string;
		value: any;
	};
	functionInput: any;
	enumVariant: string;
	setEnumVariant: (variant: string) => void;
	onValueChange: (newValue: any) => void;
	onChildValidationChange: (key: string, isValid: boolean) => void;
}

export const EnumInput = ({
	parameter,
	functionInput,
	enumVariant,
	setEnumVariant,
	onValueChange,
	onChildValidationChange
}: EnumInputProps) => {
	const hasServerDecodedVariant = parameter.type_name.includes('::');

	if (hasServerDecodedVariant && Array.isArray(parameter.value)) {
		const variantName = parameter.type_name.split('::')[1];
		const variant = functionInput.enum_variants.find((v: any) => v.name === variantName);
		const variantType = variant?.type || '';
		const tupleTypes = parseTupleType(variantType);

		if (tupleTypes && tupleTypes.length > 0) {
			return (
				<StructContainer>
					<ParameterHeader name={parameter.name} type={parameter.type_name} />

					<div className="space-y-3 pl-2 md:pl-4">
						{parameter.value.map((item: any, idx: number) => {
							const elementType = tupleTypes[idx] || 'felt252';
							const itemValid = validateType(item || '', elementType);

							return (
								<div key={idx} className="space-y-2">
									<div className="flex items-center justify-between">
										<Label className="text-sm">[{idx}]</Label>
										<div className="text-xs text-muted-foreground">{elementType}</div>
									</div>

									<Input
										value={item || ''}
										onChange={(e) => {
											const newArray = [...parameter.value];
											newArray[idx] = e.target.value;
											onValueChange(newArray);

											const valid = validateType(e.target.value, elementType);
											onChildValidationChange(`tuple-${idx}`, valid);
										}}
										className={`font-mono text-sm ${
											!itemValid ? 'border-red-500 focus-visible:ring-red-500' : ''
										}`}
										placeholder={`Enter ${elementType}...`}
									/>
									<span
										className={`text-xs ${!itemValid ? 'text-red-500' : 'text-muted-foreground'}`}
									>
										{!itemValid && 'Invalid format'}
									</span>
								</div>
							);
						})}
					</div>
				</StructContainer>
			);
		}
	}

	const currentVariant = functionInput.enum_variants.find((v: any) => v.name === enumVariant);
	const hasStructMembers =
		currentVariant?.struct_members && currentVariant.struct_members.length > 0;
	const hasType = currentVariant?.type && currentVariant.type !== '';
	const hasNestedEnumVariants =
		currentVariant?.enum_variants && currentVariant.enum_variants.length > 0;
	const needsValueInput = hasType && !hasStructMembers && !hasNestedEnumVariants;

	let actualValue = parameter.value;
	if (needsValueInput) {
		if (
			typeof parameter.value === 'object' &&
			parameter.value !== null &&
			'__enum_value' in parameter.value
		) {
			actualValue = parameter.value.__enum_value;
		} else if (typeof parameter.value === 'string') {
			const isJustVariantName = functionInput.enum_variants.some(
				(v: any) => v.name === parameter.value
			);
			if (isJustVariantName) {
				actualValue = '0';
				setTimeout(() => {
					onValueChange({
						__enum_variant: enumVariant,
						__enum_value: '0'
					});
				}, 0);
			}
		}
	}

	const handleVariantChange = (newVariant: string) => {
		setEnumVariant(newVariant);
		const variant = functionInput.enum_variants.find((v: any) => v.name === newVariant);

		if (variant.struct_members && variant.struct_members.length > 0) {
			let newValue: any = {
				__enum_variant: variant.name
			};
			variant.struct_members.forEach((member: any, idx: number) => {
				newValue[idx.toString()] = {
					name: member.name,
					type_name: member.type,
					value: getDefaultValue(member.type)
				};
			});
			onValueChange(newValue);
			return;
		}

		if (variant.enum_variants && variant.enum_variants.length > 0) {
			const firstNestedVariant = variant.enum_variants[0];
			const nestedValue = getDefaultValue(firstNestedVariant.type, firstNestedVariant);
			onValueChange({
				__enum_variant: variant.name,
				__enum_value: {
					__enum_variant: firstNestedVariant.name,
					...(firstNestedVariant.struct_members && firstNestedVariant.struct_members.length > 0
						? (() => {
								const structValue: any = {};
								firstNestedVariant.struct_members.forEach((member: any, idx: number) => {
									structValue[idx.toString()] = {
										name: member.name,
										type_name: member.type,
										value: getDefaultValue(member.type, member)
									};
								});
								return structValue;
						  })()
						: firstNestedVariant.type && firstNestedVariant.type !== ''
						? { __enum_value: nestedValue }
						: {})
				}
			});
			return;
		}

		if (variant.type && variant.type !== '') {
			const defaultVal = getDefaultValue(variant.type);
			onValueChange({
				__enum_variant: variant.name,
				__enum_value: defaultVal
			});
			return;
		}

		if (hasServerDecodedVariant) {
			onValueChange(variant.name);
		} else {
			onValueChange({
				__enum_variant: variant.name
			});
		}
	};

	return (
		<StructContainer>
			<ParameterHeader name={parameter.name} type={functionInput.type} />

			<div className="space-y-2">
				<Label className="text-xs">Variant</Label>
				<Select value={enumVariant} onValueChange={handleVariantChange}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{functionInput.enum_variants.map((variant: any) => (
							<SelectItem key={variant.name} value={variant.name}>
								{variant.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{needsValueInput && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-sm">Value</Label>
						<span className="text-xs text-muted-foreground">{currentVariant.type}</span>
					</div>
					<Input
						value={actualValue || ''}
						onChange={(e) => {
							onValueChange({
								__enum_variant: enumVariant,
								__enum_value: e.target.value
							});
						}}
						className={`font-mono text-sm ${
							!validateType(actualValue || '', currentVariant.type)
								? 'border-red-500 focus-visible:ring-red-500'
								: ''
						}`}
						placeholder={`Enter ${currentVariant.type}...`}
					/>
					<span
						className={`text-xs ${
							!validateType(actualValue || '', currentVariant.type)
								? 'text-red-500'
								: 'text-muted-foreground'
						}`}
					>
						{!validateType(actualValue || '', currentVariant.type) && 'Invalid format'}
					</span>
				</div>
			)}
			{hasStructMembers && <div className="text-sm text-muted-foreground mt-3">Struct members</div>}
			{hasStructMembers && (
				<div className="space-y-3 pl-2 md:pl-4">
					{currentVariant.struct_members.map((member: any, idx: number) => {
						const fieldValue = parameter.value?.[idx.toString()];
						const actualValue = fieldValue?.value ?? getDefaultValue(member.type, member);

						return (
							<ParameterInput
								key={idx}
								parameter={{
									name: member.name,
									type_name: member.type,
									value: actualValue
								}}
								functionInput={member}
								onValueChange={(newFieldValue) => {
									let newValue: any = {
										__enum_variant: enumVariant
									};
									if (
										typeof parameter.value === 'object' &&
										parameter.value !== null &&
										!Array.isArray(parameter.value)
									) {
										currentVariant.struct_members.forEach((m: any, mIdx: number) => {
											const existingField = parameter.value[mIdx.toString()];
											if (existingField) {
												newValue[mIdx.toString()] = {
													name: existingField.name,
													type_name: existingField.type_name,
													value: existingField.value
												};
											} else {
												newValue[mIdx.toString()] = {
													name: m.name,
													type_name: m.type,
													value: getDefaultValue(m.type, m)
												};
											}
										});
									} else {
										currentVariant.struct_members.forEach((m: any, mIdx: number) => {
											newValue[mIdx.toString()] = {
												name: m.name,
												type_name: m.type,
												value: getDefaultValue(m.type, m)
											};
										});
									}

									let newTypeName = member.type;
									if (member.enum_variants && typeof newFieldValue === 'string') {
										const enumBase = member.type;
										newTypeName = `${enumBase}::${newFieldValue}`;
									} else if (
										typeof newFieldValue === 'object' &&
										newFieldValue !== null &&
										'__enum_variant' in newFieldValue
									) {
										const enumBase = member.type;
										newTypeName = `${enumBase}::${newFieldValue.__enum_variant}`;
									}

									newValue[idx.toString()] = {
										name: member.name,
										type_name: newTypeName,
										value: newFieldValue
									};

									onValueChange(newValue);
								}}
								onValidationChange={(valid) => {
									onChildValidationChange(`enum-variant-${idx}`, valid);
								}}
							/>
						);
					})}
				</div>
			)}

			{hasNestedEnumVariants && (
				<div className="space-y-3 pl-2 md:pl-4">
					{(() => {
						const nestedValue =
							typeof parameter.value === 'object' && parameter.value?.__enum_value
								? parameter.value.__enum_value
								: getDefaultValue(currentVariant.type, currentVariant);
						const nestedTypeName =
							typeof parameter.value === 'object' && parameter.value?.__enum_value
								? `${currentVariant.type}::${parameter.value.__enum_value?.__enum_variant || ''}`
								: currentVariant.type;

						return (
							<ParameterInput
								parameter={{
									name: currentVariant.type,
									type_name: nestedTypeName,
									value: nestedValue
								}}
								functionInput={currentVariant}
								onValueChange={(newNestedValue) => {
									onValueChange({
										__enum_variant: enumVariant,
										__enum_value: newNestedValue
									});
								}}
								onValidationChange={(valid) => {
									onChildValidationChange('nested-enum', valid);
								}}
							/>
						);
					})()}
				</div>
			)}
		</StructContainer>
	);
};
