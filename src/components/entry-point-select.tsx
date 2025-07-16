import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Label } from '@/components/ui/label';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Chain } from './networks-select';

interface FunctionInput {
	name: string;
	type: string;
}

interface FunctionOutput {
	type: string;
	name?: string;
}

interface FunctionData {
	name: string;
	inputs: FunctionInput[];
	outputs: FunctionOutput[];
	state_mutability: string;
}

type EntryPointItem = [string, FunctionData];

function normalizeHexValue(value: string): string {
	if (!value || !value.startsWith('0x')) return value;

	try {
		const asBigInt = BigInt(value);
		return '0x' + asBigInt.toString(16);
	} catch (e) {
		return value;
	}
}

export function EntryPointSelect({
	entryPoints,
	value,
	onChange,
	chain,
	isLoading = false,
	isError = false
}: {
	entryPoints: EntryPointItem[] | null;
	value: string;
	chain: Chain | undefined;
	onChange: (value: string) => void;
	isLoading?: boolean;
	isError?: boolean;
}) {
	const normalizedInputValue = normalizeHexValue(value);

	const [entryPointsOptions, setEntryPointsOptions] = useState<
		{
			value: string;
			normalizedValue: string;
			label: string;
			data: FunctionData;
		}[]
	>([]);

	const [valueExistsInOptions, setValueExistsInOptions] = useState(false);

	const [selectedOption, setSelectedOption] = useState<
		| {
				value: string;
				normalizedValue: string;
				label: string;
				data: FunctionData;
		  }
		| undefined
	>(undefined);

	const [entrypointValue, setEntrypointValue] = useState<string>('');

	useEffect(() => {
		if (!entryPoints) {
			setEntryPointsOptions([]);
			return;
		}

		const newOptions = entryPoints.map((entrypoint: EntryPointItem) => {
			const selector = entrypoint[0];
			const data = entrypoint[1];

			return {
				value: selector,
				normalizedValue: normalizeHexValue(selector),
				label: data.name,
				data: data
			};
		});

		setEntryPointsOptions(newOptions);
	}, [entryPoints]);

	useEffect(() => {
		if (entryPointsOptions.length === 0) {
			setEntrypointValue('');
		}
		const option = entryPointsOptions.find(
			(option) => option.normalizedValue === normalizedInputValue
		);

		setValueExistsInOptions(!!option);
		setSelectedOption(option);

		if (option) {
			setEntrypointValue(option.value);
			if (option.value !== value && normalizedInputValue === option.normalizedValue) {
				onChange(option.value);
			}
		} else {
			if (value && entryPointsOptions.length > 0) {
				const optionByName = entryPointsOptions.find((option) => option.label === value);
				if (optionByName) {
					setEntrypointValue(optionByName.value);
					onChange(optionByName.value);
				} else {
					setEntrypointValue('');
				}
			} else {
				setEntrypointValue('');
			}
		}
	}, [entryPointsOptions, normalizedInputValue, onChange, value]);

	const getSignatureString = () => {
		if (!selectedOption?.data) return null;

		const inputs = selectedOption.data.inputs
			.map((input) => `${input.name}: ${input.type}`)
			.join(', ');

		return `fn ${selectedOption.data.name}(${inputs})`;
	};

	const handleValueChange = (newValue: string) => {
		onChange(newValue);
	};
	return (
		<>
			<div className="grid grid-cols-4 !items-center gap-x-4 gap-y-2">
				<Label className="text-right">Entrypoint</Label>
				<Select
					value={entrypointValue}
					onValueChange={handleValueChange}
					disabled={entryPointsOptions.length === 0}
				>
					<SelectTrigger
						disabled={entryPointsOptions.length === 0}
						className={` col-span-3 font-mono ${isError && 'border-red-500'}`}
					>
						<SelectValue
							className="col-span-3"
							placeholder={
								isLoading
									? 'Loading Entrypoints...'
									: !entryPointsOptions || entryPointsOptions.length === 0
									? `Enter a valid contract address above to see available entrypoints.`
									: 'Select an Entrypoint'
							}
						>
							{selectedOption ? selectedOption.label : 'Select an Entrypoint'}
						</SelectValue>
					</SelectTrigger>

					<SelectContent>
						{isLoading ? (
							<div className="p-2 text-sm text-gray-500">Loading Entrypoints...</div>
						) : entryPointsOptions.length > 0 ? (
							entryPointsOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div className="font-medium">{option.label}</div>
									<div className="text-xs text-gray-500">{option.value}</div>
								</SelectItem>
							))
						) : (
							<div className="p-2 text-sm text-gray-500">No Entryoints available</div>
						)}
					</SelectContent>
				</Select>
				{isError && (
					<p className="text-xs text-red-500 text-muted-foreground col-span-3 col-start-2">
						Entrypoint is required.
					</p>
				)}
			</div>
			<div className="grid grid-cols-4 items-center gap-y-2 gap-x-4">
				<Label className="text-right">Entrypoint signature</Label>
				{selectedOption?.data ? (
					<Input value={getSignatureString() || ''} className="col-span-3 font-mono" readOnly />
				) : (
					<>
						<Input
							placeholder={'Select an Entrypoint above to see the signature'}
							className="col-span-3 font-mono"
							disabled={true}
							readOnly
						/>
					</>
				)}
				<p className="text-xs text-muted-foreground col-span-3 col-start-2">
					Automatically generated based on the selected Entrypoint.
				</p>
			</div>
		</>
	);
}
