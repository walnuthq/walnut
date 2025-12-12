import { Label } from '@/components/ui/label';
import { ParameterContainer, ParameterHeader, PrimitiveInputField } from './parameter-input-components';

interface TupleInputProps {
	parameter: {
		name: string;
		type_name: string;
		value: any[];
	};
	tupleTypes: string[];
	onValueChange: (newValue: any) => void;
	onChildValidationChange: (key: string, isValid: boolean) => void;
}

export const TupleInput = ({
	parameter,
	tupleTypes,
	onValueChange,
	onChildValidationChange
}: TupleInputProps) => {
	return (
		<ParameterContainer>
			<ParameterHeader name={parameter.name} type={parameter.type_name} />

			<div className="space-y-3 pl-2 md:pl-4">
				{parameter.value.map((item: any, idx: number) => {
					const elementType = tupleTypes[idx] || 'felt252';

					return (
						<div key={idx} className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-sm">[{idx}]</Label>
								<div className="text-xs text-muted-foreground">{elementType}</div>
							</div>

							<PrimitiveInputField
								value={item || ''}
								type={elementType}
								onChange={(newValue) => {
									const newArray = [...parameter.value];
									newArray[idx] = newValue;
									onValueChange(newArray);
								}}
								onValidationChange={(isValid) => {
									onChildValidationChange(`tuple-${idx}`, isValid);
								}}
							/>
						</div>
					);
				})}
			</div>
		</ParameterContainer>
	);
};
