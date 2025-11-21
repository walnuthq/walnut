import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

export function VerifiedBadge() {
	return (
		<Badge className="px-2 py-1 text-xs border rounded-full w-fit flex items-center bg-green-100 border-green-400 text-green-900 dark:bg-opacity-40 dark:bg-green-500 dark:text-white pointer-events-none">
			<div className="h-4"></div>
			<div className="flex gap-1 items-center">
				<ShieldCheckIcon className="h-4 w-4" />
				Verified on Sourcify
			</div>
		</Badge>
	);
}
