'use client';

import { Footer } from '@/components/footer';
import Image from 'next/image';
import logoWalnut from '@/assets/walnut-logo-beta.svg';
import { Search } from '@/components/ui/search';
import Link from 'next/link';
import { HeaderNav } from '@/components/header';
import logoWalnutWhite from '@/assets/walnut-logo-beta-white.svg';

export const runtime = 'edge';

export default function Page() {
	return (
		<div className="min-h-screen flex flex-col">
			<HeaderNav isMainPage={true} />
			<main className="overflow-hidden flex flex-col items-center justify-center gap-10 flex-auto relative">
				<Image src={logoWalnut} alt="Walnut logo" unoptimized className="h-7 w-auto dark:hidden" />
				<Image
					src={logoWalnutWhite}
					alt="Walnut logo"
					unoptimized
					className="h-7 w-auto hidden dark:block"
				/>
				<div className="w-[38rem] max-w-[92%] text-center">
					<Search placeholder={`Search for transaction or contract`}></Search>
					<Link
						href={`/transactions?${new URLSearchParams({
							rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
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
