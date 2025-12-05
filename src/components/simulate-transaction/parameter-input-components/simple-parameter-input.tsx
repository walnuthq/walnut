import { Label } from '@/components/ui/label';
import { Input } from '../../ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { validateType } from '@/lib/utils/validation-utils';

interface SimpleParameterInputProps {
	parameter: {
		name: string;
		type_name: string;
		value: any;
	};
	isValid: boolean;
	onValueChange: (newValue: any) => void;
}

export const BooleanInput = ({ parameter, onValueChange }: SimpleParameterInputProps) => (
	<div className="space-y-2 col-span-3">
		<div className="flex items-center justify-between">
			<Label className="text-sm">{parameter.name}</Label>
			<span className="text-xs text-muted-foreground">{parameter.type_name}</span>
		</div>

		<Select
			value={parameter.value === true ? 'true' : parameter.value === false ? 'false' : ''}
			onValueChange={(value) => onValueChange(value === 'true')}
		>
			<SelectTrigger>
				<SelectValue placeholder="Select value" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="true">true</SelectItem>
				<SelectItem value="false">false</SelectItem>
			</SelectContent>
		</Select>
	</div>
);

export const PrimitiveInput = ({
	parameter,
	isValid,
	onValueChange
}: SimpleParameterInputProps) => (
	<div className="space-y-2 col-span-3">
		<div className="flex items-center justify-between">
			<Label className="text-sm">{parameter.name}</Label>
			<div className="text-xs text-muted-foreground">{parameter.type_name}</div>
		</div>
		<Input
			value={parameter.value || ''}
			onChange={(e) => onValueChange(e.target.value)}
			className={`font-mono text-sm ${!isValid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
			placeholder={`Enter ${parameter.type_name}...`}
		/>
		<span className={`text-xs ${!isValid ? 'text-red-500' : 'text-muted-foreground'}`}>
			{!isValid && 'Invalid format'}
		</span>
	</div>
);
