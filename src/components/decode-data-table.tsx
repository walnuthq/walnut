import { useState } from 'react';
import { DecodedItem, DataDecoded, DataType } from '@/lib/simulation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import AddressLink from './address-link';
import CopyToClipboardElement from './ui/copy-to-clipboard';

export function DecodeDataTable({
	rawData,
	decodeData,
	type
}: {
	rawData?: string[];
	decodeData: DataDecoded | null | undefined;
	type: DataType;
}) {
	const [displayFormat, setDisplayFormat] = useState<'auto' | 'raw'>('auto');

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

	const renderValue = (value: any): React.JSX.Element => {
		if (Array.isArray(value)) {
			return (
				<div className="pl-4">
					[
					{value.map((item, index) => (
						<div key={index}>{renderValue(item)}</div>
					))}
					]
				</div>
			);
		} else if (typeof value === 'object' && value !== null) {
			// Handle object values
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
			return value.startsWith('0x') ? (
				<CopyToClipboardElement
					value={formattedValue}
					className="py-1 px-0"
					toastDescription="Value has been copied!"
				>
					<AddressLink address={formattedValue} addressClassName="cursor-pointer">
						{formattedValue}
					</AddressLink>
				</CopyToClipboardElement>
			) : (
				<span>{formattedValue}</span>
			);
		}
	};

	// Skip rendering if there's no data at all
	if ((!decodeData || decodeData.length === 0) && (!rawData || rawData.length === 0)) {
		return null;
	}

	return (
		<div className="my-4">
			<div className="flex flex-raw items-center mb-1">
				<div className="font-medium uppercase mr-2">{type}</div>
				{type === DataType.CALLDATA && decodeData && (
					<ToggleGroup
						type="single"
						size={'sm'}
						variant="outline"
						className="mb-1"
						defaultValue="auto"
						aria-label="Native or Raw Toggle"
						onValueChange={(value) => setDisplayFormat(value as 'auto' | 'raw')}
					>
						<ToggleGroupItem value="auto" aria-label="Auto">
							Auto
						</ToggleGroupItem>
						<ToggleGroupItem value="raw" aria-label="Raw">
							Raw
						</ToggleGroupItem>
					</ToggleGroup>
				)}
			</div>
			<Card>
				{/* Always show Raw data if decodeData is not available */}
				{(displayFormat === 'raw' || !decodeData) &&
				type === DataType.CALLDATA &&
				rawData &&
				rawData.length > 0 ? (
					<ScrollArea>
						<Table className="w-auto py-0.5 px-2 text-xs w-full">
							<TableHeader>
								<TableRow>
									<TableHead className="whitespace-break-spaces">Value</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rawData.map((item: string, index: number) => (
									<TableRow key={index}>
										<TableCell className="border-r last:border-r-0 whitespace-break-spaces">
											{item.startsWith('0x') ? (
												<CopyToClipboardElement
													value={item}
													className="py-1 px-0"
													toastDescription="Value has been copied!"
												>
													<AddressLink address={item} addressClassName="cursor-pointer">
														{item}
													</AddressLink>
												</CopyToClipboardElement>
											) : (
												item
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</ScrollArea>
				) : (
					<ScrollArea>
						{' '}
						<Table className="w-auto py-0.5 px-2 text-xs">
							<TableHeader>
								<TableRow>
									{type === DataType.CALLDATA && (
										<TableHead className="whitespace-break-spaces">Name</TableHead>
									)}
									<TableHead>Type</TableHead>
									<TableHead>Value</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{decodeData &&
									decodeData.map((item: DecodedItem, index: number) => (
										<TableRow key={index}>
											{type === DataType.CALLDATA && (
												<TableCell className="border-r  last:border-r-0 whitespace-break-spaces">
													{item.name}
												</TableCell>
											)}
											<TableCell className="border-r last:border-r-0 whitespace-break-spaces">
												{item.typeName}
											</TableCell>
											<TableCell className="border-r last:border-r-0 w-full">
												{renderValue(item.value)}
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</ScrollArea>
				)}
			</Card>
		</div>
	);
}
