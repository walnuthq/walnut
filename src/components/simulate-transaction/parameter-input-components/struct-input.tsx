import { Label } from '@/components/ui/label';
import { StructContainer, ParameterHeader } from './parameter-input-components';
import { ParameterInput } from '../parameter-input';
import { getDefaultValue } from '@/lib/utils/parameter-utils';

interface StructInputProps {
	parameter: {
		name: string;
		type_name: string;
		value: any;
	};
	structMembers: any[];
	functionInput?: any;
	onValueChange: (newValue: any) => void;
	onChildValidationChange: (key: string, isValid: boolean) => void;
}

export const StructInput = ({
	parameter,
	structMembers,
	functionInput,
	onValueChange,
	onChildValidationChange
}: StructInputProps) => {
	const isFromFunctionInput =
		functionInput?.struct_members && functionInput.struct_members.length > 0;

	const getMembersToRender = () => {
		if (isFromFunctionInput) {
			return functionInput.struct_members.map((member: any, idx: number) => {
				const fieldValue = parameter.value?.[idx.toString()];
				return {
					name: member.name,
					type_name: member.type,
					value: fieldValue?.value ?? getDefaultValue(member.type),
					index: idx,
					definition: member
				};
			});
		} else {
			return structMembers.map((member: any, idx: number) => {
				let memberFunctionInput: any = undefined;
				if (functionInput?.struct_members) {
					memberFunctionInput = functionInput.struct_members.find(
						(m: any) => m.name === member.name
					);
				}
				return {
					name: member.name,
					type_name: member.type_name,
					value: member.value,
					index: idx,
					definition: memberFunctionInput
				};
			});
		}
	};

	const members = getMembersToRender();

	return (
		<StructContainer>
			<ParameterHeader name={parameter.name} type={parameter.type_name} />

			<Label className="text-sm text-muted-foreground">Struct members</Label>
			<div className="space-y-3 pl-2 md:pl-4">
				{members.map((member: any) => {
					return (
						<ParameterInput
							key={member.index}
							parameter={{
								name: member.name,
								type_name: member.type_name,
								value: member.value
							}}
							functionInput={member.definition}
							onValueChange={(newFieldValue) => {
								let newValue: any = {};

								if (
									typeof parameter.value === 'object' &&
									parameter.value !== null &&
									!Array.isArray(parameter.value)
								) {
									newValue = { ...parameter.value };
								} else {
									members.forEach((m: any) => {
										const existingField =
											typeof parameter.value === 'object' && parameter.value?.[m.index.toString()];
										newValue[m.index.toString()] = existingField || {
											name: m.name,
											type_name: m.type_name,
											value: m.value
										};
									});
								}

								let newTypeName = member.type_name;
								if (member.definition?.enum_variants && typeof newFieldValue === 'string') {
									const enumBase = member.type_name.includes('::')
										? member.type_name.split('::')[0]
										: member.definition.type || member.type_name;
									newTypeName = `${enumBase}::${newFieldValue}`;
								} else if (
									typeof newFieldValue === 'object' &&
									newFieldValue !== null &&
									'__enum_variant' in newFieldValue
								) {
									const enumBase = member.type_name.includes('::')
										? member.type_name.split('::')[0]
										: member.definition?.type || member.type_name;
									newTypeName = `${enumBase}::${newFieldValue.__enum_variant}`;
								}

								newValue[member.index.toString()] = {
									name: member.name,
									type_name: newTypeName,
									value: newFieldValue
								};

								onValueChange(newValue);
							}}
							onValidationChange={(valid) => {
								onChildValidationChange(`struct-${member.index}`, valid);
							}}
						/>
					);
				})}
			</div>
		</StructContainer>
	);
};
