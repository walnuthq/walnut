'use client';

import { formatTimestamp, hexToText } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { SimulationListItem } from '@/lib/types';
import { Button } from './ui/button';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import Link from 'next/link';

export function SimulationsTable({ simulations }: { simulations: SimulationListItem[] }) {
	// const router = useRouter();
	const [isFilterStatus, setIsFilterStatus] = useState(false);

	const isOnlyFailure = !simulations.some((s) => s.status !== 'failure');

	return (
		<Table>
			<TableHeader>
				<TableRow className="hover:bg-transparent">
					<TableHead className="w-[100px]">Timestamp</TableHead>
					<TableHead>Wallet address</TableHead>
					<TableHead>Chain</TableHead>
					<TableHead>
						{isOnlyFailure ? (
							'Status'
						) : (
							<Button
								variant="ghost"
								className={`-ml-4 relative pr-8`}
								onClick={() => setIsFilterStatus(!isFilterStatus)}
							>
								Status
								<ChevronUpDownIcon className="w-5 h-5 absolute right-2" />
							</Button>
						)}
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody className="font-mono">
				{simulations
					.filter((s) => !isFilterStatus || s.status === 'failure')
					.map((simulation) => (
						<Link
							key={simulation.id}
							href={`/simulation/${simulation.id}`}
							className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted table-row"
						>
							<TableCell className="whitespace-nowrap">
								{formatTimestamp(simulation.created_at)}
							</TableCell>
							<TableCell className="flex flex-row items-center">
								{simulation.wallet_address}{' '}
								{/* <DocumentDuplicateIcon className="w-3 h-3 ml-2 cursor-pointer" /> */}
							</TableCell>
							<TableCell>{hexToText(simulation.chain_id)}</TableCell>
							<TableCell
								className={`${
									simulation.status === 'success'
										? 'text-lime-600'
										: simulation.status === 'simulating'
										? 'text-variable'
										: 'text-red-600'
								}`}
							>
								{simulation.status}
							</TableCell>
						</Link>
					))}
			</TableBody>
		</Table>
	);
}
