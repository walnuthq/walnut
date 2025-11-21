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
import { NetworkBadge } from './network-badge';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

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
	const [tooltipOpen, setTooltipOpen] = useState(false);

	const { parseChain } = useSettings();
	const coreNetworks = ['sn_mainnet', 'sn_sepolia']
		.map((item) => {
			const chainData = parseChain(item);
			if (chainData) {
				return (
					<NetworkBadge
						key={`${chainData.chain}-${chainData.stack}`}
						network={chainData}
						withoutStack
					/>
				);
			} else {
				return <NetworkBadge key={item} network={{ chain: item }} withoutStack />;
			}
		})
		.filter(Boolean);
	const [allAvailableNetworksString, setAllAvailableNetworksString] = useState(coreNetworks);

	const fetchSearchDataResponse = useCallback(
		async (value: string) => {
			try {
				// Trim whitespace from the beginning and end of the hash
				const trimmedHash = value.trim();

				// Don't make API call if hash is empty after trimming
				if (!trimmedHash) {
					setDataResponseResults(0);
					setSearchDataResponse(undefined);
					return;
				}

				const searchData: SearchDataResponse = await fetchSearchData({
					hash: trimmedHash
				});
				setSearchDataResponse(searchData);
				setDataResponseResults(
					searchData.transactions.length + searchData.classes.length + searchData.contracts.length
				);
			} catch (error) {
				setDataResponseResults(0);
				setError(error instanceof Error ? error.message : String(error));
			}
		},
		[networks]
	);

	useEffect(() => {
		if (!networks || networks.length === 0) {
			return;
		}

		const dynamicBadges = networks
			.map(({ networkName }) => {
				const chainData = parseChain(networkName);
				return chainData ? (
					<NetworkBadge
						key={`${chainData.chain}-${chainData.stack}`}
						network={chainData}
						withoutStack
					/>
				) : (
					<NetworkBadge key={networkName} network={{ chain: networkName }} withoutStack />
				);
			})
			.filter(Boolean);

		setAllAvailableNetworksString([...coreNetworks, ...dynamicBadges]);
	}, [networks]);

	useEffect(() => {
		setSearchDataResponse(undefined);
		setError(undefined);

		const trimmedSearchValue = searchValue.trim();
		if (open && trimmedSearchValue.length > 3) {
			fetchSearchDataResponse(trimmedSearchValue);
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
		// Trim the input value immediately to provide better UX
		const trimmedVal = val.trim();
		debounceSearch(trimmedVal);
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

	const getFoundNetworks = useCallback(() => {
		if (!searchDataResponse) return [];

		const foundNetworkIds = new Set<string>();

		[
			...searchDataResponse.transactions,
			...searchDataResponse.classes,
			...searchDataResponse.contracts
		].forEach((item) => {
			if (item.source.chainId) {
				foundNetworkIds.add(item.source.chainId);
			} else if (item.source.rpcUrl) {
				foundNetworkIds.add(item.source.rpcUrl);
			}
		});
		return Array.from(foundNetworkIds)
			.map((networkId) => {
				let chainData = parseChain(networkId);
				if (chainData) {
					return (
						<NetworkBadge
							key={`found-${chainData.chain}-${chainData.stack}`}
							network={chainData}
							withoutStack
						/>
					);
				}
				const network = networks.find((n) => n.rpcUrl === networkId);
				if (network) {
					chainData = parseChain(network.networkName);
					if (chainData) {
						return (
							<NetworkBadge
								key={`found-${chainData.chain}-${chainData.stack}`}
								network={chainData}
								withoutStack
							/>
						);
					} else {
						return (
							<NetworkBadge
								key={`found-${network.networkName}`}
								network={{ chain: network.networkName }}
								withoutStack
							/>
						);
					}
				}

				return (
					<NetworkBadge key={`found-${networkId}`} network={{ chain: networkId }} withoutStack />
				);
			})
			.filter(Boolean);
	}, [searchDataResponse, networks, parseChain]);

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
					<TooltipContent>Search for transactions, contracts, and classes</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
				<CommandInput
					placeholder="Search for transaction or contract"
					onValueChange={(value) => onSearchValueChanged(value)}
					className="pr-6"
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
											chainData={tx.source.chainId ? parseChain(tx.source.chainId) : {}}
											parseChain={parseChain}
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
											chainData={cls.source.chainId ? parseChain(cls.source.chainId) : {}}
											parseChain={parseChain}
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
											chainData={contract.source.chainId ? parseChain(contract.source.chainId) : {}}
											parseChain={parseChain}
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
									&nbsp;found {dataResponseResults === 1 ? 'result' : 'results'} across{' '}
									<Popover open={tooltipOpen} onOpenChange={setTooltipOpen}>
										<PopoverTrigger
											className="underline"
											onMouseEnter={() => setTooltipOpen(true)}
											onMouseLeave={() => setTooltipOpen(false)}
										>
											{allAvailableNetworksString.length}{' '}
											{allAvailableNetworksString.length > 1 ? 'networks' : 'network'}
										</PopoverTrigger>
										<PopoverContent className="w-80 p-4" side="top">
											<div className="space-y-2">
												<h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 border-b pb-1">
													All Available Networks
												</h4>
												<div className="space-y-1">
													{allAvailableNetworksString.map((network, index) => (
														<div
															key={index}
															className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300"
														>
															<span className="break-words">{network}</span>
														</div>
													))}
												</div>
											</div>
										</PopoverContent>
									</Popover>
									.{' '}
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
	networks,
	chainData,
	parseChain
}: {
	data: SearchData;
	type: 'transactions' | 'contracts' | 'classes';
	networks: Network[];
	chainData?: {
		stack?: string | undefined;
		chain?: string | undefined;
	} | null;
	parseChain?: (chainString: string) => {
		stack?: string | undefined;
		chain?: string | undefined;
	} | null;
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
	const networkChainData =
		parseChain && network?.networkName ? parseChain(network?.networkName) : '';
	return (
		<CommandItem
			onSelect={handleSearchItem}
			className={`truncate cursor-pointer !bg-transparent hover:!bg-accent flex gap-2 ${
				network || (data.source.chainId && chainData) ? 'flex justify-between' : ''
			}`}
			style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
		>
			{network ? (
				networkChainData ? (
					<div className="flex-shrink-0">
						<NetworkBadge
							network={networkChainData}
							withoutStack
							className="min-w-[6rem] text-center justify-center"
						/>
					</div>
				) : (
					<div className="flex-shrink-0">
						<NetworkBadge
							key={network?.networkName}
							network={{ chain: network?.networkName }}
							withoutStack
							className="min-w-[6rem] text-center justify-center"
						/>
					</div>
				)
			) : data.source.chainId && chainData ? (
				<div className="flex-shrink-0">
					<NetworkBadge
						network={chainData}
						withoutStack
						className="min-w-[6rem] text-center justify-center"
					/>
				</div>
			) : null}
			<p className="ml-2 text-sm truncate">{data.hash}</p>
		</CommandItem>
	);
};
