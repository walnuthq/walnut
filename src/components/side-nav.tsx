'use client';

import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';

export function SideNav() {
	const pathname = usePathname();

	const pages = [
		{ name: 'Home', path: '/' },
		{ name: 'Transaction', path: '/transactions', path2: '/tx' },
		{ name: 'Wallets', path: '/wallets', isComingSoon: true },
		{ name: 'Simulator', path: '/simulator', isComingSoon: true },
		{ name: 'Contracts', path: '/contracts', isComingSoon: true }
	];

	return (
		<Card className="px-2 py-6 rounded-md flex flex-col gap-1 w-60 min-w-[15rem] self-start">
			{pages.map((page) => {
				return page.isComingSoon ? (
					<Button
						variant={'ghost'}
						className={`justify-start w-full pl-6 ${pathname === page.path ? 'bg-muted' : ''}`}
						disabled={true}
					>
						{page.name}
					</Button>
				) : (
					<Link href={page.path} className="w-full" key={page.name}>
						<Button
							variant={'ghost'}
							className={`justify-start w-full pl-6 ${
								pathname === page.path || (page.path2 && pathname.startsWith(page.path2))
									? 'bg-muted'
									: ''
							}`}
						>
							{page.name}
						</Button>
					</Link>
				);
			})}
		</Card>
	);
}
