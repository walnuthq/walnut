'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Disclosure } from '@headlessui/react';
import { Search } from '@/components/ui/search';
import { Button } from '@/components/ui/button';
import { PlayIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import logoWalnut from '@/assets/walnut-logo-beta.svg';
import logoWalnutWhite from '@/assets/walnut-logo-beta-white.svg';
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
								<div className="flex items-center">
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
