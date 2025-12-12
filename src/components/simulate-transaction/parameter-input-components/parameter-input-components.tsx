import { Label } from '@/components/ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { validateType } from '@/lib/utils/validation-utils';

interface ParameterHeaderProps {
	name: string;
	type: string;
	className?: string;
}

export const ParameterHeader = ({ name, type, className = '' }: ParameterHeaderProps) => (
	<div className={`flex items-center justify-between ${className}`}>
		<Label className="font-medium">{name}</Label>
		<span className="text-xs text-muted-foreground">{type}</span>
	</div>
);

interface PrimitiveInputFieldProps {
	value: string;
	type: string;
	placeholder?: string;
	onChange: (value: string) => void;
	onValidationChange?: (isValid: boolean) => void;
}

export const PrimitiveInputField = ({
	value,
	type,
	placeholder,
	onChange,
	onValidationChange
}: PrimitiveInputFieldProps) => {
	const isValid = validateType(value || '', type);

	const handleChange = (newValue: string) => {
		onChange(newValue);
		if (onValidationChange) {
			const valid = validateType(newValue, type);
			onValidationChange(valid);
		}
	};

	return (
		<div className="space-y-2">
			<Input
				value={value || ''}
				onChange={(e) => handleChange(e.target.value)}
				className={`font-mono text-sm ${
					!isValid ? 'border-red-500 focus-visible:ring-red-500' : ''
				}`}
				placeholder={placeholder || `Enter ${type}...`}
			/>
			{!isValid && <span className="text-xs text-red-500">Invalid format</span>}
		</div>
	);
};

interface ArrayControlsProps {
	onAdd: () => void;
	onRemove: () => void;
	hasElements: boolean;
}

export const ArrayControls = ({ onAdd, onRemove, hasElements }: ArrayControlsProps) => (
	<div className="flex gap-2 items-center">
		<Button type="button" variant="outline" size="sm" onClick={onAdd}>
			Add element
		</Button>
		{hasElements && (
			<Button type="button" variant="outline" size="sm" onClick={onRemove}>
				Remove last
			</Button>
		)}
	</div>
);

interface ContainerProps {
	children: React.ReactNode;
	className?: string;
}

export const ParameterContainer = ({ children, className = '' }: ContainerProps) => (
	<div className={`space-y-3 md:border col-span-3 rounded-lg py-4 md:p-4 ${className}`}>
		{children}
	</div>
);

export const StructContainer = ({ children, className = '' }: ContainerProps) => (
	<div className={`space-y-3 col-span-3 md:border rounded-lg py-4 md:p-4 ${className}`}>
		{children}
	</div>
);
