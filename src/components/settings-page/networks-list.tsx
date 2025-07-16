'use client';

import * as React from 'react';
import {
	// eslint-disable-next-line import/named
	ColumnDef,
	// eslint-disable-next-line import/named
	ColumnFiltersState,
	// eslint-disable-next-line import/named
	SortingState,
	// eslint-disable-next-line import/named
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';

import { AddNetwork, Network, useSettings } from '@/lib/context/settings-context-provider';
import { Label } from '../ui/label';
import { toast } from '@/components/hooks/use-toast';

export const columns = (removeNetwork: (network: Network) => void): ColumnDef<Network>[] => [
	{
		accessorKey: 'networkName',
		header: 'Network Name',
		cell: ({ row }) => <div>{row.getValue('networkName')}</div>
	},
	{
		accessorKey: 'rpcUrl',
		header: 'RPC URL',
		cell: ({ row }) => <div>{row.getValue('rpcUrl')}</div>
	},
	{
		id: 'actions',
		enableHiding: false,
		cell: ({ row }) => {
			const network = row.original;

			return (
				<Button variant="ghost" className="h-8 w-8 p-0" onClick={() => removeNetwork(network)}>
					<span className="sr-only">Remove network</span>
					<TrashIcon className="h-4 w-4" />
				</Button>
			);
		}
	}
];

export function NetworksList() {
	const { networks, addNetwork, removeNetwork } = useSettings();
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [newNetwork, setNewNetwork] = React.useState<AddNetwork>({
		rpcUrl: '',
		networkName: ''
	});

	const table = useReactTable({
		data: networks,
		columns: columns(removeNetwork),
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		state: {
			sorting,
			columnFilters,
			columnVisibility
		}
	});

	const handleAddNetwork = () => {
		if (networks.find((n) => n.rpcUrl === newNetwork.rpcUrl)) {
			toast({
				title: 'Network already exists!',
				description: 'This network is already added.',
			});
			return;
		}
		try {
			const invalidUrls = ['localhost', '127.0.0.0', '0.0.0.0'];
			if (newNetwork.networkName && newNetwork.rpcUrl) {
				const url = new URL(newNetwork.rpcUrl);
				if (invalidUrls.includes(url.hostname)) {
					alert('Error: Only hosted networks are supported.');
					return;
				}
				addNetwork({ ...newNetwork });
				setNewNetwork({ rpcUrl: '', networkName: '' });
			}
		} catch (err) {
			toast({
				title: 'Add network failed!',
				description: 'Is the network URL correct?',
				className: 'text-red-500',
			})
		}
	};

	return (
		<div className="w-full flex flex-col gap-12">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-3">
					<Label htmlFor="name">Name</Label>
					<Input
						id="name"
						type="text"
						className="w-full"
						value={newNetwork.networkName}
						onChange={(e) => setNewNetwork({ ...newNetwork, networkName: e.target.value })}
					/>
				</div>
				<div className="flex flex-col gap-3">
					<Label htmlFor="rpcUrl">RPC URL</Label>
					<Input
						id="rpcUrl"
						type="text"
						className="w-full"
						value={newNetwork.rpcUrl}
						onChange={(e) => setNewNetwork({ ...newNetwork, rpcUrl: e.target.value })}
					/>
				</div>
				<div className="flex justify-end">
					<Button onClick={handleAddNetwork} disabled={!newNetwork.rpcUrl || !newNetwork.networkName}>Add Network</Button>
				</div>
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header, index) => {
									return (
										<TableHead key={header.id} className={`${index === 2 ? 'w-12' : ''}`}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
									No custom networks
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
