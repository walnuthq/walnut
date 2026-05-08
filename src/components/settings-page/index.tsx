'use client';

import { HeaderNav } from '../header';
import { Container } from '../ui/container';
import Link from 'next/link';
import { Footer } from '../footer';
import { CustomNetworksCard } from '@/components/settings-page/custom-networks-card';

export function SettingsPage() {
	return (
		<>
			<HeaderNav />
			<main className="overflow-y-auto flex-grow">
				<Container className="max-w-6xl mx-auto pt-6 pb-4">
					<h1 className="text-3xl font-semibold mb-8">Settings</h1>
					<div className="grid w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
						<nav
							className="grid gap-4 text-sm text-muted-foreground"
							// eslint-disable-next-line react/no-unknown-property
							x-chunk="dashboard-04-chunk-0"
						>
							<Link href="#" className="text-primary font-semibold">
								Custom networks
							</Link>
							<span>More settings coming soon...</span>
						</nav>
						<div className="grid gap-6">
							<CustomNetworksCard />
						</div>
					</div>
				</Container>
			</main>
			<Footer />
		</>
	);
}
