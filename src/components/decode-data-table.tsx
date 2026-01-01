import { useState } from 'react';
import { DecodedItem, DataDecoded, DataType } from '@/lib/simulation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Card } from './ui/card';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import AddressLink from './address-link';
import CopyToClipboardElement from './ui/copy-to-clipboard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { useSettings } from '@/lib/context/settings-context-provider';
import FunctionCallViewer from './ui/function-call-viewer';

export function DecodeDataTable({
	rawData,
	decodeData,
	type,
	displayFormat,
	setDisplayFormat
}: {
	rawData?: string[];
	decodeData: DataDecoded | null | undefined;
	type: DataType;
	displayFormat: 'auto' | 'raw';
	setDisplayFormat: (v: 'auto' | 'raw') => void;
}) {
	// const { customSettings } = useSettings();
	const isObject = (value: any): boolean => {
		return (
			typeof value === 'object' &&
			value !== null &&
			(('name' in value && 'type_name' in value && 'value' in value) ||
				Object.keys(value).every((key) => !isNaN(Number(key))))
		);
	};

	const formatValue = (value: any): string => {
		if (displayFormat == 'auto') {
			if (typeof value === 'boolean') {
				return value ? 'true' : 'false';
			}
		}

		return value;
	};

	const renderValue = (value: any) => {
		if (Array.isArray(value)) {
			return (
				<div className="pl-4">
					[
					{value.map((item, index) => (
						<div key={index} className="my-1.5 ml-2">
							{renderValue(item)}
						</div>
					))}
					]
				</div>
			);
		} else if (typeof value === 'object' && value !== null) {
			if (isObject(value)) {
				return (
					<Table className="text-xs">
						<TableHeader>
							<TableRow>
								{type === DataType.CALLDATA && <TableHead>Name</TableHead>}
								<TableHead>Type</TableHead>
								<TableHead>Value</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="font-mono">
							{Object.entries(value).map(([key, item]) => (
								<TableRow key={key}>
									{type === DataType.CALLDATA && (item as { name: string }).name != null && (
										<TableCell className="whitespace-break-spaces">
											{(item as { name: string }).name}
										</TableCell>
									)}
									<TableCell className="whitespace-break-spaces">
										{(item as { typeName: string }).typeName}
									</TableCell>
									<TableCell>{renderValue((item as { value: any }).value)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				);
			} else {
				// Handle other objects
				return (
					<div className="pl-4">
						{Object.entries(value).map(([key, val]) => (
							<div key={key}>
								{key}: {renderValue(val)}
							</div>
						))}
					</div>
				);
			}
		} else {
			const formattedValue = formatValue(value);
			return formattedValue?.startsWith('0x') ? (
				<CopyToClipboardElement
					value={formattedValue}
					className="px-0 hover:bg-inherit"
					toastDescription="Value has been copied!"
				>
					<AddressLink
						address={formattedValue}
						// customSettings={customSettings}
						addressClassName="cursor-pointer whitespace-nowrap"
					>
						{formattedValue}
					</AddressLink>
				</CopyToClipboardElement>
			) : (
				<CopyToClipboardElement value={formattedValue} toastDescription="Value has been copied!">
					{formattedValue}
				</CopyToClipboardElement>
			);
		}
	};

	const [isRawDataExpanded, setIsRawDataExpanded] = useState(false);

	const toggleRawData = () => {
		setIsRawDataExpanded(!isRawDataExpanded);
	};

	const getCollapsedRawData = (data: string[]) => {
		const allData = data.join(', ');
		if (allData.length <= 8) return allData;
		return `[${allData.slice(0, 4)}...${allData.slice(-4)}]`;
	};

	return (
		<div className="my-4">
			<div className="flex flex-raw items-center mb-1">
				<div className="font-medium uppercase mr-2 h-9 flex items-center">{type}</div>
				{type === DataType.CALLDATA && (
					<ToggleGroup
						type="single"
						size={'sm'}
						value={displayFormat}
						variant="outline"
						className="mb-1"
						defaultValue="auto"
						aria-label="Native or Raw Toggle"
						onValueChange={(value) => setDisplayFormat(value as 'auto' | 'raw')}
					>
						{decodeData && (
							<ToggleGroupItem value="auto" aria-label="Auto">
								Auto
							</ToggleGroupItem>
						)}
						{rawData && (
							<ToggleGroupItem value="raw" aria-label="Raw">
								Raw
							</ToggleGroupItem>
						)}
					</ToggleGroup>
				)}
			</div>

			{(!rawData || rawData.length === 0) && (!decodeData || decodeData.length === 0) ? (
				<Card className="overflow-auto">
					<Table className="w-auto py-0.5 px-2 text-xs w-full">
						<TableBody>
							<TableRow>
								<TableCell
									colSpan={type === DataType.CALLDATA ? 3 : 2}
									className="text-center py-4 whitespace-nowrap"
								>
									No data
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
					<ScrollBar orientation="horizontal" />
				</Card>
			) : (displayFormat === 'raw' || !decodeData) && rawData && rawData.length > 0 ? (
				<Card className="overflow-auto">
					<Table className="w-auto py-0.5 px-2 text-xs w-full">
						<TableHeader>
							<TableRow>
								<TableHead className="whitespace-break-spaces flex justify-between items-center">
									Value
									{!decodeData && (
										<Button variant={'ghost'} onClick={toggleRawData} className="text-xs">
											{isRawDataExpanded ? 'Collapse data' : 'Expand data'}
										</Button>
									)}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{!decodeData && !isRawDataExpanded ? (
								<TableRow className="cursor-pointer hover:bg-accent">
									<TableCell className="border-r last:border-r-0">
										<TooltipProvider>
											<Tooltip delayDuration={100}>
												<TooltipTrigger asChild>
													<div onClick={toggleRawData} className="w-full">
														{getCollapsedRawData(rawData)}
													</div>
												</TooltipTrigger>
												<TooltipContent className="bg-background border-border text-black dark:text-white border">
													Click to expand full data
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</TableCell>
								</TableRow>
							) : (
								rawData.map((item: string, index: number) => (
									<TableRow key={index}>
										<TableCell className="border-r last:border-r-0 whitespace-break-spaces">
											{item.startsWith('0x') ? (
												<CopyToClipboardElement
													value={item}
													className="px-0"
													toastDescription="Value has been copied!"
												>
													<AddressLink
														address={item}
														addressClassName="cursor-pointer whitespace-nowrap"
													>
														{item}
													</AddressLink>
												</CopyToClipboardElement>
											) : (
												item
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
					<ScrollBar orientation="horizontal" />
				</Card>
			) : !decodeData || decodeData.length === 0 ? (
				<Card className="overflow-auto">
					<Table className="w-auto py-0.5 px-2 text-xs w-full">
						<TableBody>
							<TableRow>
								<TableCell
									colSpan={type === DataType.CALLDATA ? 3 : 2}
									className="text-center py-4 whitespace-nowrap"
								>
									No decoded data
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
					<ScrollBar orientation="horizontal" />
				</Card>
			) : (
				<div className="flex-col flex gap-y-2 ">
					{decodeData?.map((item, idx) => (
						<Card key={`${item.name}-${idx}`} className=" !p-2 ">
							<FunctionCallViewer
								data={{
									function: item.name || '',
									args: item.value,
									typeName: item.typeName
								}}
								tooltipValue
								isContract={true}
							/>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
