import * as React from 'react';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
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

		setTimeout(() => {
			setCopyToastVisible(false);
		}, 3000);
	};

	let copyButton;
	if (copyToastVisible) {
		copyButton = <span className="text-xs font-medium mr-3">Copied!</span>;
	} else {
		copyButton = (
			<Button variant="ghost" size="sm" onClick={onCopyToClipboardClick}>
				<ClipboardDocumentIcon className="mr-2 h-4 w-4" /> Copy
			</Button>
		);
	}

	return (
		<div className="my-8">
			{title !== false && (
				<h3 className="text-md mb-4 font-medium whitespace-pre-line">
					{title ?? 'Oops! Something went nuts. Try again.'}
				</h3>
			)}

			<div className="rounded-md border">
				<div className="flex items-center justify-between border-b p-2 pl-4 rounded-t-md bg-card">
					<p className="text-sm">{errorTitle ?? 'Walnut server error'}</p>

					<div className="flex items-center h-8">{copyButton}</div>
				</div>

				<ScrollArea className="h-fit rounded-b-md">
					<div className="flex w-full space-x-4 p-4">
						<pre className="text-red-700 text-xs whitespace-pre-wrap">{message}</pre>
					</div>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</div>
		</div>
	);
}
