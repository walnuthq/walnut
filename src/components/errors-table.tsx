import { CommonError } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useRouter } from 'next/navigation';
import { md5 } from 'js-md5';
import Link from 'next/link';

export default function CommonErrorsTable({
	commonErrors,
	projectSlug
}: {
	commonErrors: CommonError[];
	projectSlug: string;
}) {
	const router = useRouter();

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="whitespace-nowrap">Count</TableHead>
					<TableHead>Contract address</TableHead>
					<TableHead>Error message</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody className="font-mono">
				{commonErrors.map((error) => (
					<Link
						key={error.error_message}
						href={`/monitoring/project/${projectSlug}/error/${md5(error.error_message)}`}
						className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted table-row"
					>
						<TableCell className="whitespace-nowrap">{error.error_count}</TableCell>
						<TableCell className="whitespace-nowrap">0x{error.error_contract_address}</TableCell>
						<TableCell className="flex flex-row items-center whitespace-nowrap">
							{error.error_message}
						</TableCell>
					</Link>
				))}
			</TableBody>
		</Table>
	);
}
