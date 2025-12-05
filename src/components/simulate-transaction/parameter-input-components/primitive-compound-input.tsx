import { Label } from '@/components/ui/label';
import { ParameterContainer, ParameterHeader, PrimitiveInputField } from './parameter-input-components';
import { getDefaultValue } from '@/lib/utils/parameter-utils';

interface PrimitiveCompoundInputProps {
	parameter: {
		name: string;
		type_name: string;
		value: any;
	};
	functionInput: any;
	onValueChange: (newValue: any) => void;
	onChildValidationChange: (key: string, isValid: boolean) => void;
}

export const PrimitiveCompoundInput = ({
	parameter,
	functionInput,
	onValueChange,
	onChildValidationChange
}: PrimitiveCompoundInputProps) => {
	return (
		<ParameterContainer>
			<ParameterHeader name={parameter.name} type={functionInput.type} />

			<div className="space-y-3 pl-2 md:pl-4">
				{functionInput.struct_members.map((member: any, idx: number) => {
					const fieldValue = parameter.value?.[idx.toString()];

					return (
						<div key={idx} className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-sm">{member.name}</Label>
								<div className="text-xs text-muted-foreground">{member.type}</div>
							</div>
							<PrimitiveInputField
								value={fieldValue?.value || ''}
								type={member.type}
								onChange={(newValue) => {
									let newValueObj: any = {};

									if (
										typeof parameter.value === 'object' &&
										parameter.value !== null &&
										!Array.isArray(parameter.value)
									) {
										newValueObj = { ...parameter.value };
									} else {
										functionInput.struct_members.forEach((m: any, mIdx: number) => {
											const existingField =
												typeof parameter.value === 'object' && parameter.value?.[mIdx.toString()];
											newValueObj[mIdx.toString()] = existingField || {
												name: m.name,
												type_name: m.type,
												value: getDefaultValue(m.type, m)
											};
										});
									}
									newValueObj[idx.toString()] = {
										name: member.name,
										type_name: member.type,
										value: newValue
									};

									onValueChange(newValueObj);
								}}
								onValidationChange={(isValid) => {
									onChildValidationChange(`compound-${idx}`, isValid);
								}}
							/>
						</div>
					);
				})}
			</div>
		</ParameterContainer>
	);
};
