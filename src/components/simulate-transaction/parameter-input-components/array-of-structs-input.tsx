import { Label } from '@/components/ui/label';

import { getDefaultValue } from '@/lib/utils/parameter-utils';
import { ParameterInput } from '../parameter-input';
import { ParameterContainer, ParameterHeader, ArrayControls } from './parameter-input-components';

interface ArrayOfStructsInputProps {
	parameter: {
		name: string;
		type_name: string;
		value: any;
	};
	elementType: string;
	arrayValue: any[];
	functionInput?: any;
	hasStructMembers: boolean;
	onValueChange: (newValue: any) => void;
	onChildValidationChange: (key: string, isValid: boolean) => void;
}

export const ArrayOfStructsInput = ({
	parameter,
	elementType,
	arrayValue,
	functionInput,
	hasStructMembers,
	onValueChange,
	onChildValidationChange
}: ArrayOfStructsInputProps) => {
	const getStructMembers = (item: any) => {
		let structMembers: any[] = [];

		if (hasStructMembers) {
			structMembers = functionInput.struct_members.map((member: any, memberIdx: number) => {
				let existingValue;

				if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
					const itemMember = item[memberIdx.toString()];
					if (itemMember && typeof itemMember === 'object' && 'value' in itemMember) {
						existingValue = itemMember.value;
					}
				}

				return {
					name: member.name,
					type_name: member.type,
					value: existingValue ?? getDefaultValue(member.type, member)
				};
			});
		} else if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
			const hasServerFormat = Object.keys(item).some(
				(key) =>
					item[key] &&
					typeof item[key] === 'object' &&
					'name' in item[key] &&
					'type_name' in item[key] &&
					'value' in item[key]
			);

			if (hasServerFormat) {
				structMembers = Object.keys(item)
					.filter((key) => /^\d+$/.test(key))
					.sort((a, b) => parseInt(a) - parseInt(b))
					.map((key) => item[key])
					.filter(
						(member) =>
							member &&
							typeof member === 'object' &&
							'name' in member &&
							'type_name' in member &&
							'value' in member
					);
			}
		}

		return structMembers;
	};

	const handleAdd = () => {
		let newStructItem: any = {};

		if (functionInput?.struct_members && functionInput.struct_members.length > 0) {
			functionInput.struct_members.forEach((member: any, idx: number) => {
				newStructItem[idx.toString()] = {
					name: member.name,
					type_name: member.type,
					value: getDefaultValue(member.type, member)
				};
			});
		} else if (arrayValue.length > 0) {
			const firstElement = arrayValue[0];
			if (
				typeof firstElement === 'object' &&
				firstElement !== null &&
				!Array.isArray(firstElement)
			) {
				Object.keys(firstElement)
					.filter((key) => /^\d+$/.test(key))
					.sort((a, b) => parseInt(a) - parseInt(b))
					.forEach((key) => {
						const existingMember = firstElement[key];
						if (existingMember && typeof existingMember === 'object' && 'name' in existingMember) {
							newStructItem[key] = {
								name: existingMember.name,
								type_name: existingMember.type_name,
								value: getDefaultValue(existingMember.type_name)
							};
						}
					});
			}
		} else {
			newStructItem = getDefaultValue(elementType, functionInput);
		}

		const newArray = [...arrayValue, newStructItem];
		onValueChange(newArray);
	};

	const handleRemove = () => {
		const newArray = arrayValue.slice(0, -1);
		onValueChange(newArray);
	};

	return (
		<ParameterContainer>
			<ParameterHeader name={parameter.name} type={parameter.type_name} />

			<div className="space-y-3 pl-2 md:pl-4">
				{arrayValue.map((item: any, idx: number) => {
					const structMembers = getStructMembers(item);

					return (
						<div key={idx} className="space-y-2 border md:border rounded-lg p-3">
							<div className="flex items-center justify-between border-b md:border-b pb-2">
								<Label className="text-sm font-medium">
									[{idx}] {elementType}
								</Label>
							</div>
							<Label className="text-sm text-muted-foreground">Struct members</Label>
							<div className="space-y-3 pl-2 md:pl-4">
								{structMembers.map((member: any, memberIdx: number) => {
									let memberDef: any = undefined;
									if (hasStructMembers) {
										const foundMember = functionInput.struct_members.find(
											(m: any) => m.name === member.name
										);
										if (foundMember) {
											memberDef = {
												type: foundMember.type,
												...foundMember
											};
										}
									}

									return (
										<ParameterInput
											key={memberIdx}
											parameter={{
												name: member.name,
												type_name: member.type_name,
												value: member.value
											}}
											functionInput={memberDef}
											onValueChange={(newFieldValue) => {
												const newArray = [...arrayValue];
												const currentItem = newArray[idx];
												const newItem: any = {};

												structMembers.forEach((m: any, mIdx: number) => {
													const existingField =
														typeof currentItem === 'object' && currentItem?.[mIdx.toString()];
													newItem[mIdx.toString()] = existingField
														? { ...existingField }
														: {
																name: m.name,
																type_name: m.type_name,
																value: getDefaultValue(m.type_name)
														  };
												});

												let newTypeName = member.type_name;
												if (memberDef?.enum_variants && typeof newFieldValue === 'string') {
													const enumBase = member.type_name.includes('::')
														? member.type_name.split('::')[0]
														: memberDef.type || member.type_name;
													newTypeName = `${enumBase}::${newFieldValue}`;
												} else if (
													typeof newFieldValue === 'object' &&
													newFieldValue !== null &&
													'__enum_variant' in newFieldValue
												) {
													const enumBase = member.type_name.includes('::')
														? member.type_name.split('::')[0]
														: memberDef?.type || member.type_name;
													newTypeName = `${enumBase}::${newFieldValue.__enum_variant}`;
												}

												newItem[memberIdx.toString()] = {
													name: member.name,
													type_name: newTypeName,
													value: newFieldValue
												};

												newArray[idx] = newItem;
												onValueChange(newArray);
											}}
											onValidationChange={(valid) => {
												onChildValidationChange(`array-${idx}-${memberIdx}`, valid);
											}}
										/>
									);
								})}
							</div>
						</div>
					);
				})}

				<ArrayControls
					onAdd={handleAdd}
					onRemove={handleRemove}
					hasElements={arrayValue.length > 0}
				/>
			</div>
		</ParameterContainer>
	);
};
