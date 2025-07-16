import React from 'react';
import { cn, copyToClipboard } from '@/lib/utils';
import { toast } from '../hooks/use-toast';

interface CopyToClipboardProps {
	value: string | null;
	toastDescription?: string;
	className?: string;
	children: React.ReactNode;
}

const CopyToClipboardElement = ({
	value,
	toastDescription,
	className,
	children
}: CopyToClipboardProps) => {
	return (
		<span
			onClick={(e) => {
				e.stopPropagation();
				if (value) {
					copyToClipboard(value);
					toast({
						description: toastDescription
					});
				}
			}}
			className={cn('hover:bg-accent_2 cursor-pointer p-1 rounded-sm', className)}
		>
			{children}
		</span>
	);
};

export default CopyToClipboardElement;
