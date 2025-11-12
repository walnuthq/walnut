import * as React from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
	ClipboardDocumentIcon,
	ServerIcon,
	CheckCircleIcon,
	InformationCircleIcon,
	ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button } from './button';
import { copyToClipboard } from '@/lib/utils';
import Link from 'next/link';

export function ServerError({
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

			<div className="relative overflow-hidden rounded-xl border border-destructive/20 bg-card shadow-lg">
				{title !== false && (
					<div className="px-6 pt-6 pb-4 border-b border-destructive/20 bg-accent-2/5">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div className="flex-shrink-0">
									<div className="relative w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center border-2 border-destructive/20 shadow-lg">
										<ServerIcon className="w-7 h-7 text-destructive" />
										<div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-2 rounded-full animate-pulse" />
									</div>
								</div>
								<div className="flex-1 min-w-0">
									<h2 className="text-xl font-bold text-destructive leading-tight">
										{title ?? 'Walnut Server Error'}
									</h2>
									<p className="text-xs text-muted-foreground mt-0.5">
										The server encountered an error
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

				<div className="p-6 space-y-4">
					{errorTitle && (
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-2/10 border border-accent-2/40 shadow-sm">
							<div className="relative">
								<div className="w-2 h-2 rounded-full bg-accent-2" />
								<div className="absolute inset-0 w-2 h-2 rounded-full bg-accent-2 animate-ping" />
							</div>
							<span className="text-sm font-mono font-semibold text-accent-2">{errorTitle}</span>
						</div>
					)}

					<div className="relative group">
						<div className="absolute -inset-0.5 bg-accent-2/20 rounded-lg blur group-hover:bg-accent-2/30 transition-all" />
						<ScrollArea className="relative w-full h-40 rounded-lg border border-destructive/20 bg-muted/30 backdrop-blur-sm">
							<Button
								size="sm"
								variant="outline"
								onClick={onCopyToClipboardClick}
								className="flex-shrink-0 h-8 px-3 absolute right-2 top-2 text-xs gap-2 bg-card/90 backdrop-blur-sm border-accent-2/40 hover:bg-accent-2/10 hover:border-accent-2/60 transition-all z-10"
							>
								{copyToastVisible ? (
									<>
										<CheckCircleIcon className="w-4 h-4 text-primary" />
										<span className="text-primary font-medium">Copied!</span>
									</>
								) : (
									<>
										<ClipboardDocumentIcon className="w-4 h-4 text-accent-2" />
										<span className="text-accent-2">Copy</span>
									</>
								)}
							</Button>
							<div className="p-4">
								<pre className="text-sm font-mono text-red-500">
									<code>{message}</code>
								</pre>
							</div>
							<ScrollBar orientation="horizontal" />
							<ScrollBar orientation="vertical" />
						</ScrollArea>
					</div>

					<div className="flex items-start gap-3 p-4 rounded-lg bg-accent/20 border-2 border-accent/30">
						<div className="flex-shrink-0 mt-0.5">
							<div className="w-5 h-5 rounded-full bg-accent/30 flex items-center justify-center">
								<InformationCircleIcon className="w-4 h-4 text-accent-foreground" />
							</div>
						</div>
						<p className="text-sm text-accent-foreground leading-relaxed">
							This is a server-side error. If this error persists, please copy the error details and
							report it in the{' '}
							<Link
								href={'https://t.me/walnuthq'}
								target="_blank"
								className="text-variable hover:underline font-medium underline-offset-2 transition-colors"
							>
								Telegram
							</Link>
							.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
