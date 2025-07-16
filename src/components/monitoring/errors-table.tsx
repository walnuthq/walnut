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
import { MonitoringErrorType } from '@/app/api/monitoring-api-service';
import { Badge } from '@/components/ui/badge';

export function ErrorsTable({
	errors,
	onNext,
	onPrevious,
	onErrorClick
}: {
	errors: MonitoringErrorType[];
	onNext?: () => void;
	onPrevious?: () => void;
	onErrorClick?: (error: MonitoringErrorType) => void;
}) {
	return (
		<Card className="flex-1">
			<CardHeader>
				<CardTitle>Most recent errors</CardTitle>
				<CardDescription>Click on a row to see more details</CardDescription>
			</CardHeader>
			<CardContent className="">
				<Table className="border-separate border-spacing-0">
					<TableHeader>
						<TableRow className="border-none">
							<TableHead className=""></TableHead>
							<TableHead className="w-[10%]">Events</TableHead>
							<TableHead className="w-[10%]">User addresses</TableHead>
							<TableHead className="w-[15%]">First incident</TableHead>
							<TableHead className="w-[15%]">Last incident</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="">
						{errors.map((error, index) => {
							const borderStyle =
								(index === errors.length - 1 ? 'border-b' : '') + ' border-t border-border';
							return (
								<TableRow
									key={error.id}
									className="hover:bg-muted cursor-pointer"
									onClick={() => onErrorClick?.(error)}
								>
									<TableCell
										className={`border-l ${borderStyle} ${index === 0 ? 'rounded-tl' : ''} ${
											index === errors.length - 1 ? 'rounded-bl border-b' : ''
										}`}
									>
										<Badge
											variant="default"
											className="bg-red-100 hover:bg-red-100 text-red-600 font-normal shadow-none px-1.5"
										>
											<div className="w-[5px] h-[5px] min-w-[5px] min-h-[5px] rounded-full bg-red-500 mr-[5px]"></div>
											<span>
												Error: &apos;
												{error.error}
												&apos;
											</span>
										</Badge>
									</TableCell>
									<TableCell className={borderStyle + ' border-r'}>{error.totalCount}</TableCell>
									<TableCell className={borderStyle + ' border-r'}>{error.usersCount}</TableCell>
									<TableCell className={borderStyle + ' border-r'}>
										{error.firstOccurrenceDate.toLocaleString()}
									</TableCell>
									<TableCell
										className={`${borderStyle} border-r ${
											index === errors.length - 1 ? 'rounded-br' : index === 0 ? 'rounded-tr' : ''
										}`}
									>
										{error.lastOccurrenceDate.toLocaleString()}
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
