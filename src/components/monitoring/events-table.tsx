import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { MonitoringErrorType, MonitoringEventType } from '@/app/api/monitoring-api-service';
import { Badge } from '@/components/ui/badge';
import React from 'react';

export function EventsTable({
	events,
	onNext,
	onPrevious
}: {
	events: MonitoringEventType[];
	onNext?: () => void;
	onPrevious?: () => void;
}) {
	const openSimulationPage = (event: MonitoringEventType) => {
		const uri = `/simulations?senderAddress=${event.senderAddress}&calldata=${encodeURIComponent(
			event.calldataHex.toString()
		)}&chainId=SN_SEPOLIA&transactionVersion=3&blockNumber=${event.blockNumber}`;
		window.open(uri, '_blank');
	};
	return (
		<Card className="flex-1">
			<CardHeader>
				<CardTitle>Failed transactions</CardTitle>
				<CardDescription>All failed transactions with given error message</CardDescription>
			</CardHeader>
			<CardContent className="">
				<Table className="border-separate border-spacing-0">
					<TableHeader>
						<TableRow className="border-none">
							<TableHead className="w-[15%]">Incident date</TableHead>
							<TableHead className="w-[50%]">User address</TableHead>
							<TableHead className="w-[10%] text-left">Simulate</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="">
						{events.map((event, index) => {
							const borderStyle =
								(index === events.length - 1 ? 'border-b' : '') + ' border-t border-border';
							return (
								<TableRow key={event.id} className="hover:bg-muted cursor-pointer">
									<TableCell className={borderStyle + ' border-r border-l'}>
										{event.date.toLocaleString()}
									</TableCell>
									{/*<TableCell*/}
									{/*	className={`border-l ${borderStyle} ${index === 0 ? 'rounded-tl' : ''} ${*/}
									{/*		index === events.length - 1 ? 'rounded-bl border-b' : ''*/}
									{/*	}`}*/}
									{/*>*/}
									{/*	<Badge*/}
									{/*		variant="default"*/}
									{/*		className="bg-red-100 hover:bg-red-100 text-red-600 font-normal shadow-none px-1.5"*/}
									{/*	>*/}
									{/*		<div className="w-[5px] h-[5px] min-w-[5px] min-h-[5px] rounded-full bg-red-500 mr-[5px]"></div>*/}
									{/*		<span>*/}
									{/*			Error: &apos;*/}
									{/*			{event.error}*/}
									{/*			&apos;*/}
									{/*		</span>*/}
									{/*	</Badge>*/}
									{/*</TableCell>*/}
									<TableCell className={borderStyle + ' border-r'}>{event.senderAddress}</TableCell>
									<TableCell className={borderStyle + ' border-r text-left'}>
										<Button
											className="text-sm px-3 py-1 h-auto"
											onClick={() => openSimulationPage(event)}
										>
											Simulate
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</CardContent>
			<CardFooter className="justify-end gap-2">
				<Button variant="outline" onClick={onPrevious} disabled={!onPrevious}>
					Previous
				</Button>
				<Button variant="outline" onClick={onNext} disabled={!onNext}>
					Next
				</Button>
			</CardFooter>
		</Card>
	);
}
