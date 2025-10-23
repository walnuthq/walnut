import React, { memo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BugAntIcon } from '@heroicons/react/24/outline';

export const DebugButton = memo(function DebugButton({
	onDebugClick,
	noCodeLocationAvaliable,
	isDebuggable,
	debuggerError,
	compilationError
}: {
	onDebugClick: React.MouseEventHandler<HTMLDivElement>;
	noCodeLocationAvaliable?: boolean;
	isDebuggable?: boolean;
	debuggerError?: string | null;
	compilationError?: string | null;
}) {
	const [tooltipOpen, setPopoverOpen] = useState(false);

	const bugIconClassName = 'w-h h-4';

	const NoCodeLocationMessage = () => (
		<>
			There are no code locations present for this call. It might be a bug; Please{' '}
			<a
				href="https://t.me/walnuthq"
				target="_blank"
				className="text-blue-500 cursor-pointer"
				rel="noreferrer"
			>
				contact us
			</a>{' '}
			to resolve it.{' '}
		</>
	);

	const NoCodeMessage = () => (
		<>
			This contract source code is not verified. To run the debugger, first verify the source code
			by following{' '}
			<Link href="/how-to-verify" className="underline-offset-4 hover:underline text-blue-500">
				this guide
			</Link>
			.
		</>
	);

	const CompilationErrorMessage = () => (
		<>
			Debugger failed to load due to compilation issues. The transaction trace is still available
			without debug information.
		</>
	);

	const handleDebugClick = useCallback(
		(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			event.stopPropagation();
			if (isDebuggable && !debuggerError && !compilationError) {
				onDebugClick(event);
			}
		},
		[isDebuggable, debuggerError, compilationError, onDebugClick]
	);

	return (
		<div
			onClick={handleDebugClick}
			className="w-5 h-5 p-0.5 rounded-sm cursor-pointer hover:bg-accent_2"
		>
			{isDebuggable && !debuggerError && !compilationError ? (
				<BugAntIcon className={`${bugIconClassName} text-green-700`} />
			) : (
				<Popover open={tooltipOpen} onOpenChange={setPopoverOpen}>
					<PopoverTrigger asChild>
						<div
							onClick={(event) => {
								event.stopPropagation();
								setPopoverOpen(true);
							}}
						>
							<BugAntIcon className={`${bugIconClassName} text-gray-700 dark:text-gray-400`} />
						</div>
					</PopoverTrigger>
					<PopoverContent className="text-sm text-muted-foreground">
						{debuggerError || compilationError ? (
							<CompilationErrorMessage />
						) : noCodeLocationAvaliable ? (
							<NoCodeLocationMessage />
						) : (
							<NoCodeMessage />
						)}
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
});
