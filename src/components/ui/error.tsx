import * as React from 'react';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
	ClipboardDocumentIcon,
	ExclamationTriangleIcon,
	CheckCircleIcon,
	InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from './button';
import { copyToClipboard } from '@/lib/utils';

export function Error({
	message,
	title,
	errorTitle
}: {
	message: string;
	title?: string | false;
	errorTitle?: string;
}) {
	const [copyToastVisible, setCopyToastVisible] = React.useState(false);

	const onCopyToClipboardClick = () => {
		copyToClipboard(message);
		setCopyToastVisible(true);
		setTimeout(() => setCopyToastVisible(false), 3000);
	};

	return (
		<div className="relative w-full mx-auto mt-6">
			<div className="absolute -top-2 -right-2 w-32 h-32 bg-accent-2/10 rounded-full blur-3xl" />
			<div className="absolute -bottom-2 -left-2 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />

			<div className="relative overflow-hidden rounded-xl border border-accent-2/40 bg-card shadow-xl">
				{title !== false && (
					<div className="px-6 pt-6 pb-4 border-b border-accent-2/20 bg-accent-2/5">
						<div className="flex items-center gap-4">
							<div className="flex-shrink-0 ">
								<div className="relative w-12 h-12 rounded-xl bg-accent-2/20 flex items-center justify-center border-2 border-accent-2/40 shadow-lg">
									<ExclamationTriangleIcon className="w-7 h-7 text-accent-2" />
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<h2 className="text-lg font-semibold text-foreground leading-tight">
									{title ?? 'Unexpected Error'}
								</h2>
							</div>
						</div>
					</div>
				)}

				<div className="p-6 space-y-4">
					{errorTitle && (
						<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/5 border border-destructive/20">
							<div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
							<span className="text-sm font-mono font-medium text-destructive">{errorTitle}</span>
						</div>
					)}
					<div className="relative group">
						<ScrollArea className="w-full h-40 rounded-md border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
							<Button
								size="sm"
								variant="outline"
								onClick={onCopyToClipboardClick}
								className="flex-shrink-0 h-8 px-3 absolute right-2 top-2 text-xs gap-2 hover:bg-accent hover:border-accent-foreground/20 transition-all"
							>
								{copyToastVisible ? (
									<>
										<CheckCircleIcon className="w-4 h-4 text-primary" />
										<span className="text-primary font-medium">Copied!</span>
									</>
								) : (
									<>
										<ClipboardDocumentIcon className="w-4 h-4" />
										<span>Copy</span>
									</>
								)}
							</Button>
							<div className="p-4">
								<pre className="text-sm font-mono ">
									<code>{message}</code>
								</pre>
							</div>
							<ScrollBar orientation="horizontal" />
							<ScrollBar orientation="vertical" />
						</ScrollArea>

						<div className="absolute inset-0 rounded-md ring-1 ring-inset ring-border/0 group-hover:ring-border/20 transition-all pointer-events-none" />
					</div>
				</div>
			</div>
		</div>
	);
}
