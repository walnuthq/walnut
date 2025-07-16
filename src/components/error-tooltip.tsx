import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export function ErrorTooltip({ errorMessage }: { errorMessage: string }) {
	const [tooltipOpen, setTooltipOpen] = useState(false);

	return (
		<TooltipProvider>
			<Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
				<TooltipTrigger asChild>
					<div
						onClick={(event) => {
							event.stopPropagation();
							setTooltipOpen(true);
						}}
						className="w-5 h-5 rounded-sm"
					>
						<ExclamationCircleIcon className="w-5 h-5 text-red-600" />
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>This call resulted in an error: {errorMessage}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
