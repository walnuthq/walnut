import React, { memo, useMemo } from 'react';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Copy } from 'lucide-react';
import AddressLink from '../address-link';
import CopyToClipboardElement from './copy-to-clipboard';
import FunctionCallViewer from './function-call-viewer';

export interface ValueWithTooltipProps {
	value: any;
	fullObject?: any;
	typeName?: string;
	functionName?: string;
	isContract?: boolean;
}

const MAX_LEN = 13;
const HEAD = 6;
const TAIL = 6;

const truncateString = (s: string) => {
	const result =
		s.length <= MAX_LEN
			? { text: s, isTruncated: false }
			: { text: `${s.slice(0, HEAD)}...${s.slice(-TAIL)}`, isTruncated: true };

	result.text = result.text.replace(/"/g, '');

	return result;
};

const extractPureValue = (item: any): string => {
	if (item == null) return 'null';
	if (['string', 'number', 'boolean'].includes(typeof item)) return String(item);

	if (Array.isArray(item)) {
		return `[${item.map(extractPureValue).join(', ')}]`;
	}

	if (typeof item === 'object') {
		if ('value' in item) {
			return extractPureValue(item.value);
		}

		const keys = Object.keys(item);
		if (keys.every((k) => /^\d+$/.test(k))) {
			return `{${keys
				.sort((a, b) => +a - +b)
				.map((k) => extractPureValue(item[k]))
				.join(', ')}}`;
		}

		return JSON.stringify(item);
	}

	return String(item);
};
const ValueWithTooltip: React.FC<ValueWithTooltipProps> = memo(function VWT({
	value,
	fullObject,
	typeName,
	functionName,
	isContract
}) {
	const { text, isTruncated } = useMemo(() => {
		const pure = extractPureValue(value.value);
		return truncateString(pure);
	}, [value]);

	const rawText = useMemo(() => {
		const s = JSON.stringify(value).replace(/^"|"$/g, '');
		return s;
	}, [value]);

	const renderInner = () => {
		if (isTruncated) {
			return rawText.startsWith('0x') ? (
				<AddressLink address={rawText} addressClassName="!text-variable">
					{text}
				</AddressLink>
			) : (
				text
			);
		}
		return (
			<CopyToClipboardElement value={text} toastDescription="Value copied">
				{text}
			</CopyToClipboardElement>
		);
	};

	return (
		<DropdownMenu>
			<TooltipProvider delayDuration={100}>
				<Tooltip>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<span
								className={`py-1 hover:bg-accent_2 h-full ${
									isTruncated ? 'text-variable border-variable border-b' : 'text-result'
								} transition-colors duration-200 focus:outline-none rounded-sm`}
							>
								{renderInner()}
							</span>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					{isTruncated && (
						<TooltipContent className="bg-background border-border text-black dark:text-white border">
							Click to show full value
						</TooltipContent>
					)}
				</Tooltip>
			</TooltipProvider>
			{isTruncated && (
				<DropdownMenuContent
					className="bg-card shadow-xl border rounded-lg text-xs max-w-[90vw] w-fit min-w-[16rem] p-0"
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
					onWheel={(e) => e.stopPropagation()}
					onScroll={(e) => e.stopPropagation()}
				>
					<div className="relative">
						<CopyToClipboardElement
							value={JSON.stringify(fullObject ?? value, null, 2)}
							toastDescription="Full JSON copied"
							className="absolute top-2 right-3 z-10 bg-accent p-1.5 rounded focus:outline-none focus:ring-2"
							aria-label="Copy"
						>
							<Copy size={14} />
						</CopyToClipboardElement>
						<ScrollArea
							className="md:w-[40rem] h-40 px-3 overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-accent [&::-webkit-scrollbar-thumb]:rounded-full"
							onScroll={(e) => e.stopPropagation()}
						>
							<div className="pt-2">
								<FunctionCallViewer
									data={{
										function: functionName,
										args: value.value,
										typeName
									}}
									tooltipValue
									isContract={isContract}
								/>
							</div>
							<ScrollBar orientation="horizontal" className="sticky bottom-0 left-0 right-0 h-2" />
						</ScrollArea>
					</div>
				</DropdownMenuContent>
			)}
		</DropdownMenu>
	);
});

export default ValueWithTooltip;
