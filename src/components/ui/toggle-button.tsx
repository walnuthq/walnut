import { Switch } from '@headlessui/react';

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(' ');
}

interface ToggleButtonProps {
	enabled: boolean;
	onToggleChange: () => void;
	onCopy?: string;
	offCopy?: string;
	disabled?: boolean;
}

export function ToggleButton(props: ToggleButtonProps) {
	return (
		<Switch.Group as="div" className="flex items-center">
			<Switch
				checked={props.enabled}
				onChange={props.disabled ? () => {} : props.onToggleChange}
				className={classNames(
					props.enabled
						? props.disabled
							? 'bg-muted cursor-not-allowed'
							: 'bg-primary'
						: props.disabled
						? 'bg-muted cursor-not-allowed'
						: 'bg-border',
					'relative inline-flex h-4 w-8 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
					props.disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
				)}
			>
				<span
					aria-hidden="true"
					className={classNames(
						props.enabled ? 'translate-x-4' : 'translate-x-0',
						'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out'
					)}
				/>
			</Switch>
			<Switch.Label as="span" className="ml-3 text-sm">
				<span
					className={classNames('font-normal text-foreground', props.disabled ? 'opacity-50' : '')}
				>
					{props.enabled ? props.onCopy : props.offCopy}
				</span>
			</Switch.Label>
		</Switch.Group>
	);
}
