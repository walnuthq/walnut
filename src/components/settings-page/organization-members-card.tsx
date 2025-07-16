'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
	// eslint-disable-next-line import/named
	ColumnDef,
	// eslint-disable-next-line import/named
	ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	// eslint-disable-next-line import/named
	SortingState,
	useReactTable,
	// eslint-disable-next-line import/named
	VisibilityState
} from '@tanstack/react-table';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	useSetGlobalOrganizationIdInUserContext,
	useUserContext
} from '@/lib/context/user-context-provider';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
	createOrganizationApi,
	getOrganizationMembersApi,
	inviteToOrganization
} from '@/app/api/monitoring-api-service';

interface User {
	// can be ''
	id: string;
	// can be email for invited users
	name: string;
	// can be ''
	avatarSrc?: string;
	// true when invited email
	invited: boolean;
}

export const columns = (): ColumnDef<User>[] => [
	{
		accessorKey: 'avatarSrc',
		header: 'Member',
		cell: ({ row }) => (
			<div>
				<Avatar className="h-8 w-8 ml-2">
					<AvatarImage src={row.getValue('avatarSrc')} />
				</Avatar>
			</div>
		)
	},
	{
		accessorKey: 'name',
		header: '',
		cell: ({ row }) => <div>{row.getValue('name')}</div>
	},
	{
		accessorKey: 'invited',
		header: 'Status',
		cell: ({ row }) => (
			<div>
				{row.getValue('invited') ? <Badge>INVITED</Badge> : <Badge variant="outline">MEMBER</Badge>}
			</div>
		)
	}
];

export function OrganizationMembersCard() {
	const { name, avatarSrc, organizationId, isLogged, isGlobalOrg } = useUserContext();
	const setOrganizationId = useSetGlobalOrganizationIdInUserContext();
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [email, setEmail] = React.useState<string>('');
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [inviteButtonDisabled, setInviteButtonDisabled] = useState<boolean>(false);

	const [members, setMembers] = useState<User[]>([
		{
			name: `${name} (You)`,
			avatarSrc,
			id: '',
			invited: false
		}
	]);

	const table = useReactTable({
		data: members,
		columns: columns(),
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

	const getMembers = useCallback(async () => {
		const membersRes = await getOrganizationMembersApi(organizationId);
		if (membersRes) {
			const members = membersRes.members.map((member) => {
				let memberName = member.name;
				// if is current logged user - add 'You'
				if (member.name === name) {
					memberName = `${name} (You)`;
				}
				return {
					id: member.id,
					avatarSrc: member.avatarSrc,
					name: memberName,
					invited: false
				};
			});
			const invitedMembers = membersRes.invitedEmails.map((email) => ({
				id: '',
				avatarSrc: '',
				name: email,
				invited: true
			}));
			const updatedMembers = [...members, ...invitedMembers];
			// if there is only logged user - don't update the list
			if (updatedMembers.length > 1) {
				setMembers(updatedMembers);
			}
		}
	}, [name, organizationId]);

	useEffect(() => {
		if (isLogged && isGlobalOrg) {
			getMembers();
		}
	}, [getMembers, isGlobalOrg, isLogged]);

	const isEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	const inviteMember = async () => {
		const userAlreadyInvited = members.some((member) => member.invited && member.name === email);
		if (userAlreadyInvited) {
			toast({
				title: `Invitation already sent to: ${email}`,
				description: "You've already invited this user."
			});
			return;
		}
		setInviteButtonDisabled(true);
		try {
			let organizationIdToUse = organizationId;
			if (!isGlobalOrg) {
				const newOrganizationId = await createOrganizationApi();
				if (!newOrganizationId) {
					toast({
						title: `Inviting member failed!`,
						description: 'Sorry there was a problem while inviting member. Please try again.',
						className: 'text-red-500'
					});
					return;
				}
				setOrganizationId(newOrganizationId);
				organizationIdToUse = newOrganizationId;
			}
			const invited = await inviteToOrganization(organizationIdToUse, email.trim());
			if (invited) {
				toast({
					title: `Invitation sent to: ${email}`,
					description: "Invitation link was sent to the user's email."
				});
				setEmail('');
				// no await needed
				getMembers();
			}
		} finally {
			setInviteButtonDisabled(false);
		}
	};

	return (
		<Card x-chunk="dashboard-04-chunk-1">
			<CardHeader>
				<CardTitle>Your team members</CardTitle>
				<CardDescription>See, manage and invite your team members.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="w-full flex flex-col gap-12">
					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-3">
							<Label htmlFor="email">Member e-mail</Label>
							<Input
								id="email"
								type="text"
								className="w-full"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="flex justify-end">
							{inviteButtonDisabled ? (
								<Button disabled>
									<Loader2 className="animate-spin h-4 w-4 mr-2" />
									Please wait
								</Button>
							) : (
								<Button onClick={inviteMember} disabled={!isEmail(email)}>
									Invite member
								</Button>
							)}
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
											No members
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
