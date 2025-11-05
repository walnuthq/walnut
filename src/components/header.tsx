'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Disclosure } from '@headlessui/react';
import { Search } from '@/components/ui/search';
import { Button } from '@/components/ui/button';
import { PlayIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import logoWalnut from '@/assets/walnut-logo-beta.svg';
import logoWalnutWhite from '@/assets/walnut-logo-beta-white.svg';
import starknetLogo from '@/assets/network-logos/strk.svg';
import ethLogo from '@/assets/network-logos/eth-purple.svg';
import { Container } from '@/components/ui/container';
import { UserSection } from '@/components/auth/user-section';
import { authClient } from '@/lib/auth-client';
import { useSettings } from '@/lib/context/settings-context-provider';
import { isAuthorizationRequiredFeatureActive } from '@/app/api/feature-flag-service';
import { useTheme } from 'next-themes';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from './ui/dropdown-menu';

export function HeaderNav({
	isMainPage = false,
	hideUserSection = false
}: {
	isMainPage?: boolean;
	hideUserSection?: boolean;
}) {
	const { data: session, isPending } = authClient.useSession();
	const { trackingActive } = useSettings();
	const { theme, setTheme, resolvedTheme } = useTheme();

	const Icon = resolvedTheme === 'dark' ? MoonIcon : SunIcon;
	return (
		<Disclosure as="nav" className={`${!isMainPage && 'bg-background  border-b border-border'}`}>
			{() => (
				<>
					{/* !trackingActive && (
						<div className=" top-0 left-0 w-full h-5 bg-green-500 text-white flex items-center justify-between px-4 shadow-md z-50">
							<div className="text-sm font-semibold">NO TRACKING</div>
						</div>
					) */}
					<Container>
						<div className="flex h-16 items-center justify-between">
							{!isMainPage && (
								<div className="flex items-center gap-3">
									<div className="flex-shrink-0">
										<Link href="/">
											<Image
												src={logoWalnut}
												alt="Walnut logo"
												unoptimized
												className="h-6 w-auto cursor-pointer dark:hidden"
											/>
											<Image
												src={logoWalnutWhite}
												alt="Walnut logo"
												unoptimized
												className="h-6 w-auto cursor-pointer hidden dark:block"
											/>
										</Link>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												className="
													hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-full
													bg-gradient-to-r from-purple-900/20 to-purple-700/15
													hover:from-purple-900/30 hover:to-purple-700/25
													border border-purple-700/40 hover:border-purple-600/60
													transition-all duration-200
													focus:outline-none focus:ring-2 focus:ring-purple-700/50
													group
												"
											>
												<div className="relative w-3 h-3 flex-shrink-0">
													<Image
														src={ethLogo}
														alt="EVM"
														className="w-full h-full object-contain"
														unoptimized
													/>
												</div>
												<span className="text-[10px] font-semibold bg-gradient-to-r from-purple-800 to-purple-600 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent">
													EVM
												</span>
												<svg
													className="w-2.5 h-2.5 text-purple-700 dark:text-purple-400 "
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M19 9l-7 7-7-7"
													/>
												</svg>
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align="start"
											className="min-w-[160px] p-2 bg-background/95 backdrop-blur-sm border border-purple-500/20 shadow-lg"
										>
											<Link href="https://app.walnut.dev/" target="_blank">
												<DropdownMenuItem className="cursor-pointer rounded-md px-3 py-2.5 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 transition-all duration-200">
													<div className="flex items-center gap-2.5">
														<div className="relative w-4 h-4 flex-shrink-0">
															<Image
																src={starknetLogo}
																alt="Starknet"
																className="w-full h-full object-contain"
																unoptimized
															/>
														</div>
														<span className="font-medium text-sm">Starknet</span>
													</div>
												</DropdownMenuItem>
											</Link>
										</DropdownMenuContent>
									</DropdownMenu>
									<div className="hidden md:block">
										<nav className="ml-10 flex items-center space-x-4 lg:space-x-6">
											{/* <Link
											href="/transactions/OP_MAIN"
											className={`text-sm font-medium transition-colors hover:text-primary ${
												pathname.startsWith('/transactions') ? '' : 'text-muted-foreground'
											}`}
										>
											Transactions
										</Link> */}
										</nav>
									</div>
								</div>
							)}

							<div className="flex flex-1 justify-end space-x-2 lg:space-x-4 mx-4 md:mr-0">
								{!isMainPage && (
									<div className="w-auto max-w-xs md:w-80">
										<Search className="w-full" placeholder="Search"></Search>
									</div>
								)}
								<div className="hidden md:block">
									<Link href="/simulate-transaction">
										<Button variant="outline">
											<PlayIcon className="mr-2 h-4 w-4" /> Simulate transaction
										</Button>
									</Link>
								</div>
							</div>
							{!hideUserSection && (
								<div className="hidden md:block">
									<div className="flex items-center">
										<div className="flex flex-row items-center ml-3">
											<UserSection />
										</div>
									</div>
								</div>
							)}
							{!hideUserSection && (
								<div className="flex md:hidden">
									<div className="flex items-center">
										<div className="flex flex-row items-center">
											<UserSection />
										</div>
									</div>
								</div>
							)}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										className="
											p-2 hover:bg-accent rounded-sm ml-3 hidden md:block
											focus:outline-none focus:ring-0
											focus-visible:outline-none focus-visible:ring-0
										"
									>
										<Icon className="w-[1.2rem] h-[1.2rem]" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</Container>

					<Disclosure.Panel className="md:hidden fixed bg-neutral-50 inset-x-0 z-50 border-b border-t shadow-md border-neutral-200">
						<div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
							<div>
								<Link href={`/simulate-transaction`}>
									<Button variant="ghost"> Simulate transaction</Button>
								</Link>
							</div>
							<div>
								<a href="/settings">
									<Button variant="ghost">Settings</Button>
								</a>
							</div>
						</div>
						{/* <div className="border-t border-neutral-100 pb-3 pt-4">
							{session.status === 'authenticated' ? (
								<div className="flex items-center px-5 justify-between">
									<div className="flex flex-row items-center">
										<div className="flex-shrink-0">
											<Avatar>
												{session.data.user?.image && <AvatarImage src={session.data.user.image} />}
												<AvatarFallback>AA</AvatarFallback>
											</Avatar>
										</div>
										<div className="ml-3">
											<div className="text-base font-medium">{session.data.user?.name}</div>
											<div className="text-sm font-medium text-secondary-foreground/80">
												{session.data.user?.email}
											</div>
										</div>
									</div>
									<Disclosure.Button className="ml-2">
										<Button variant="outline" onClick={() => signOut()}>
											Log out
										</Button>
									</Disclosure.Button>
								</div>
							) : session.status === 'unauthenticated' ? (
								// <Button onClick={() => signIn('cognito')} className="mx-5">
								// 	Log in
								// </Button>
								<></>
							) : (
								<></>
							)}
						</div> */}
					</Disclosure.Panel>
				</>
			)}
		</Disclosure>
	);
}
