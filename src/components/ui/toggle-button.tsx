import { Switch } from '@headlessui/react';

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(' ');
}

// export ToggleButton

interface ToggleButtonProps {
	enabled: boolean;
	onToggleChange: () => void;
	onCopy: string;
	offCopy: string;
}

export function ToggleButton(props: ToggleButtonProps) {
	return (
		<Switch.Group as="div" className="flex items-center">
			<Switch
				checked={props.enabled}
				onChange={props.onToggleChange}
				className={classNames(
					props.enabled ? 'bg-blue-500' : 'bg-gray-200',
					'relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2'
				)}
			>
				<span
					aria-hidden="true"
					className={classNames(
						props.enabled ? 'translate-x-4' : 'translate-x-0',
						'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
					)}
				/>
			</Switch>
			<Switch.Label as="span" className="ml-3 text-sm">
				<span className="font-normal text-gray-900">
					{props.enabled ? props.onCopy : props.offCopy}
				</span>
			</Switch.Label>
		</Switch.Group>
	);
}
