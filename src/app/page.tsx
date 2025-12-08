'use client';

import { Footer } from '@/components/footer';
import Image from 'next/image';
import logoWalnut from '@/assets/walnut-logo-beta.svg';
import { Search } from '@/components/ui/search';
import Link from 'next/link';
import { HeaderNav } from '@/components/header';
import logoWalnutWhite from '@/assets/walnut-logo-beta-white.svg';
import { ChainId } from '@/lib/types';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import starknetLogo from '@/assets/network-logos/strk.svg';
import ethLogo from '@/assets/network-logos/eth-purple.svg';

export const runtime = 'edge';

export default function Page() {
	return (
		<div className="min-h-screen flex flex-col">
			<HeaderNav isMainPage={true} />
			<main className="overflow-hidden flex flex-col items-center justify-center gap-10 flex-auto relative">
				<div className="flex items-center gap-3">
					<Image
						src={logoWalnut}
						alt="Walnut logo"
						unoptimized
						className="h-7 w-auto dark:hidden"
					/>
					<Image
						src={logoWalnutWhite}
						alt="Walnut logo"
						unoptimized
						className="h-7 w-auto hidden dark:block"
					/>
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
									Ethereum (EVM)
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
							className="min-w-[10px] p-1 bg-background/95 backdrop-blur-sm border border-purple-500/20 shadow-lg"
						>
							<Link href="https://app.walnut.dev/" target="_blank">
								<DropdownMenuItem className="cursor-pointer rounded-md  hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 transition-all duration-200">
									<div className="flex items-center gap-2.5">
										<div className="relative w-4 h-4 flex-shrink-0">
											<Image
												src={starknetLogo}
												alt="Starknet"
												className="w-full h-full object-contain"
												unoptimized
											/>
										</div>
										<span className="font-medium text-xs">Starknet (CairoVM)</span>
									</div>
								</DropdownMenuItem>
							</Link>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<div className="w-[38rem] max-w-[92%] text-center">
					<Search placeholder={`Search for transaction or contract`}></Search>
					<Link
						href={`/transactions?${new URLSearchParams({
							chainId: ChainId.OP_SEPOLIA,
							txHash: '0x1362ee26050935178c2f491dbe2a5f0d277903cb5d77fa9e6e30d8b2db31a541'
						}).toString()}`}
						className="hover:underline text-sm inline-block mt-4 text-gray-500"
					>
						Try an example transaction.
					</Link>
				</div>
			</main>
			<Footer />
		</div>
	);
}
