'use client';

import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Input } from './input';
import { useEffect, useState, useCallback } from 'react';
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from './command';
import { cn } from '@/lib/utils';
import { fetchSearchData } from '@/lib/api';
import { SearchDataResponse, SearchData } from '@/lib/types';
import { Badge } from './badge';
import { Network, useSettings } from '@/lib/context/settings-context-provider';
import Link from 'next/link';
import debounce from 'lodash/debounce';
import { useUserContext } from '@/lib/context/user-context-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Search({
	className,
	placeholder,
	...props
}: React.ComponentPropsWithoutRef<'div'> & {
	placeholder: string;
}) {
	const [searchValue, setSearchValue] = useState('');
	const [searchDataResponse, setSearchDataResponse] = useState<SearchDataResponse | undefined>();
	const [dataResponseResults, setDataResponseResults] = useState<number>(0);
	const [error, setError] = useState<string | undefined>();
	const [open, setOpen] = useState(false);
	const [isMac, setIsMac] = useState(true);
	const { networks } = useSettings();
	const { isLogged } = useUserContext();
	const coreNetworks = '';
	const [allAvailableNetworksString, setAllAvailableNetworksString] =
		useState<string>(coreNetworks);

	const fetchSearchDataResponse = useCallback(
		async (value: string) => {
			try {
				const searchData: SearchDataResponse = await fetchSearchData({
					hash: value,
					rpcUrls: networks.map((n) => n.rpcUrl)
				});
				setSearchDataResponse(searchData);
				setDataResponseResults(
					searchData.transactions.length + searchData.classes.length + searchData.contracts.length
				);
			} catch (error: any) {
				setDataResponseResults(0);
				setError(error.toString());
			}
		},
		[networks]
	);

	useEffect(() => {
		if (networks.length > 0) {
			const networkNames = networks.map((network) => network.networkName);
			setAllAvailableNetworksString(`${networkNames.join(', ')}`);
		}
	}, [networks]);

	useEffect(() => {
		setSearchDataResponse(undefined);
		setError(undefined);

		if (open && searchValue.trim().length > 3) {
			fetchSearchDataResponse(searchValue);
		} else {
			setSearchValue('');
		}
	}, [searchValue, open, fetchSearchDataResponse]);

	const debounceSearch = debounce((value: string) => {
		console.log('Search value:', value); // Here you log the search value
		setSearchValue(value);
	}, 500);

	useEffect(() => {
		return () => {
			debounceSearch.cancel();
		};
	}, [debounceSearch]);

	const onSearchValueChanged = (val: string) => {
		debounceSearch(val);
	};

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};
		document.addEventListener('keydown', down);
		return () => document.removeEventListener('keydown', down);
	}, []);

	useEffect(() => {
		// Set isMac state on client side
		setIsMac(
			typeof window !== 'undefined' && window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
		);
	}, []); // Run only once after the component mounts

	return (
		<div className={cn('flex flex-row', className)} {...props}>
			<label htmlFor="search" className="sr-only">
				Search
			</label>

			<TooltipProvider>
				<Tooltip delayDuration={50}>
					<TooltipTrigger className={`relative flex-1`}>
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
						</div>
						<Input
							disabled={!isLogged}
							className="pl-10 flex-1"
							placeholder={placeholder}
							type="search"
							name="search"
							onFocus={() => setOpen(true)}
						/>
						<div className="pointer-events-none border border-border text-neutral-600 rounded-sm text-sm absolute right-0 inset-y-1.5 mr-1.5 p-1 hidden md:flex items-center">
							{isMac ? '⌘K' : 'Ctrl+K'}
						</div>
					</TooltipTrigger>
					<TooltipContent hidden={isLogged}>Please sign up to use this feature.</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
				<CommandInput
					placeholder="Search for transaction or contract"
					onValueChange={(value) => onSearchValueChanged(value)}
					displayBorder={!!searchDataResponse || !!error || searchValue.length > 3}
				/>
				<CommandList>
					{searchDataResponse ? (
						<>
							{searchDataResponse.transactions?.length > 0 && (
								<CommandGroup heading="Transactions">
									{searchDataResponse.transactions.map((tx, index) => (
										<SearchItem
											key={`${tx.hash}-${index}`}
											data={tx}
											type="transactions"
											networks={networks}
										/>
									))}
								</CommandGroup>
							)}
							{searchDataResponse.classes?.length > 0 && (
								<CommandGroup heading="Classes">
									{searchDataResponse.classes.map((cls, index) => (
										<SearchItem
											key={`${cls.hash}-${index}`}
											data={cls}
											type="classes"
											networks={networks}
										/>
									))}
								</CommandGroup>
							)}
							{searchDataResponse.contracts?.length > 0 && (
								<CommandGroup heading="Contracts">
									{searchDataResponse.contracts.map((contract, index) => (
										<SearchItem
											key={`${contract.hash}-${index}`}
											data={contract}
											type="contracts"
											networks={networks}
										/>
									))}
								</CommandGroup>
							)}
						</>
					) : error ? (
						<CommandEmpty>Nothing found</CommandEmpty>
					) : (
						searchValue.length > 3 && <CommandEmpty>Searching...</CommandEmpty>
					)}
					{(searchDataResponse || error) && (
						<div className="border-t ">
							<CommandItem
								className="hover:bg-accent !rounded-b-sm !rounded-t-none"
								style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
							>
								<p className="text-muted-foreground">
									<span className="font-semibold">{dataResponseResults}</span>
									&nbsp;{dataResponseResults === 1 ? 'result' : 'results'} found on&nbsp;
									<span className="font-semibold">{allAvailableNetworksString}</span>
									&nbsp;networks.&nbsp;
									<Link href="/settings" className="underline">
										Add custom networks to search.
									</Link>
								</p>
							</CommandItem>
						</div>
					)}
				</CommandList>
			</CommandDialog>
		</div>
	);
}

const SearchItem = ({
	data,
	type,
	networks
}: {
	data: SearchData;
	type: 'transactions' | 'contracts' | 'classes';
	networks: Network[];
}) => {
	const handleSearchItem = useCallback(() => {
		if (type === 'transactions') {
			if (data.source.rpcUrl) {
				window.location.href = `/transactions?rpcUrl=${encodeURIComponent(
					data.source.rpcUrl
				)}&txHash=${data.hash}`;
			} else if (data.source.chainId) {
				window.location.href = `/transactions?chainId=${data.source.chainId.toUpperCase()}&txHash=${
					data.hash
				}`;
			}
		} else if (type === 'contracts') {
			window.location.href = `/contracts/${data.hash}`;
		} else if (type === 'classes') {
			window.location.href = `/classes/${data.hash}`;
		}
	}, [data, type]);

	const network = data.source.rpcUrl
		? networks.find((n) => n.rpcUrl === data.source.rpcUrl)
		: undefined;

	return (
		<CommandItem
			onSelect={handleSearchItem}
			className="truncate cursor-pointer !bg-transparent hover:!bg-accent"
			style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
		>
			{network ? (
				<Badge className="hover:bg-primary">{network.networkName}</Badge>
			) : data.source.chainId ? (
				<Badge className="hover:bg-primary">{data.source.chainId}</Badge>
			) : null}
			<p className="ml-2 text-sm truncate">{data.hash}</p>
		</CommandItem>
	);
};
