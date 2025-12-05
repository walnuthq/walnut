import { Label } from '@/components/ui/label';
import { ParameterContainer, ParameterHeader, ArrayControls } from './parameter-input-components';
import { ParameterInput } from '../parameter-input';
import { getDefaultValue } from '@/lib/utils/parameter-utils';

interface ArrayOfTuplesInputProps {
	parameter: {
		name: string;
		type_name: string;
		value: any;
	};
	elementType: string;
	elementTupleTypes: string[];
	arrayValue: any[];
	functionInput?: any;
	onValueChange: (newValue: any) => void;
	onChildValidationChange: (key: string, isValid: boolean) => void;
}

export const ArrayOfTuplesInput = ({
	parameter,
	elementType,
	elementTupleTypes,
	arrayValue,
	functionInput,
	onValueChange,
	onChildValidationChange
}: ArrayOfTuplesInputProps) => {
	const handleAdd = () => {
		const newTuple = elementTupleTypes.map((type: string) => getDefaultValue(type.trim()));
		const newArray = [...arrayValue, newTuple];
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
				{arrayValue.map((tupleItem: any, tupleIdx: number) => {
					const tupleValue = Array.isArray(tupleItem) ? tupleItem : [];

					return (
						<div key={tupleIdx} className="space-y-2 border md:border rounded-lg p-3">
							<div className="flex items-center justify-between border-b md:border-b pb-2">
								<Label className="text-sm font-medium">
									[{tupleIdx}] {elementType}
								</Label>
							</div>
							<div className="space-y-3 pl-2 md:pl-4">
								{elementTupleTypes.map((tupleElementType: string, elementIdx: number) => {
									const elementValue = tupleValue[elementIdx];

									let elementFunctionInput = undefined;
									if (functionInput?.struct_members) {
										elementFunctionInput = functionInput.struct_members[elementIdx];
									}

									return (
										<ParameterInput
											key={elementIdx}
											parameter={{
												name: `[${elementIdx}]`,
												type_name: tupleElementType.trim(),
												value: elementValue
											}}
											functionInput={elementFunctionInput}
											onValueChange={(newValue) => {
												const newArray = [...arrayValue];
												const newTuple = [
													...(Array.isArray(newArray[tupleIdx]) ? newArray[tupleIdx] : [])
												];
												newTuple[elementIdx] = newValue;
												newArray[tupleIdx] = newTuple;
												onValueChange(newArray);
											}}
											onValidationChange={(valid) => {
												onChildValidationChange(`array-tuple-${tupleIdx}-${elementIdx}`, valid);
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
