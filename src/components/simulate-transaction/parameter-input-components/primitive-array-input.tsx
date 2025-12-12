import { Label } from '@/components/ui/label';
import {
	ParameterContainer,
	ParameterHeader,
	PrimitiveInputField,
	ArrayControls
} from './parameter-input-components';
import { getDefaultValue } from '@/lib/utils/parameter-utils';

interface PrimitiveArrayInputProps {
	parameter: {
		name: string;
		type_name: string;
		value: any[];
	};
	elementType: string;
	onValueChange: (newValue: any) => void;
	onChildValidationChange: (key: string, isValid: boolean) => void;
}

export const PrimitiveArrayInput = ({
	parameter,
	elementType,
	onValueChange,
	onChildValidationChange
}: PrimitiveArrayInputProps) => {
	const arrayValue = Array.isArray(parameter.value) ? parameter.value : [];

	const handleAdd = () => {
		const newElement = getDefaultValue(elementType);
		const newArray = [...arrayValue, newElement];
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
				{arrayValue.map((item: any, idx: number) => (
					<div key={idx} className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-sm">[{idx}]</Label>
							<div className="text-xs text-muted-foreground">{elementType}</div>
						</div>

						<PrimitiveInputField
							value={item || ''}
							type={elementType}
							onChange={(newValue) => {
								const newArray = [...arrayValue];
								newArray[idx] = newValue;
								onValueChange(newArray);
							}}
							onValidationChange={(isValid) => {
								onChildValidationChange(`array-${idx}`, isValid);
							}}
						/>
					</div>
				))}

				<ArrayControls onAdd={handleAdd} onRemove={handleRemove} hasElements={arrayValue.length > 0} />
			</div>
		</ParameterContainer>
	);
};
