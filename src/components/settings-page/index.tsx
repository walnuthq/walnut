'use client';

import { HeaderNav } from '../header';
import { Container } from '../ui/container';
import Link from 'next/link';
import { Footer } from '../footer';
import { useState } from 'react';
import { CustomNetworksCard } from '@/components/settings-page/custom-networks-card';
import { SetupMonitoringCard } from '@/components/settings-page/setup-monitoring-card';
import { OrganizationMembersCard } from '@/components/settings-page/organization-members-card';
import { isMonitoringFeatureActive } from '@/app/api/feature-flag-service';

export function SettingsPage() {

	const [view, setView] = useState<'networks' | 'monitoring' | 'members'>('networks');
	const changeTabCallback = (tab: 'networks' | 'monitoring' | 'members') => {
		setView(tab);
	};
	return (
		<>
			<HeaderNav />
			<main className="overflow-y-auto flex-grow">
				<Container className="max-w-6xl mx-auto pt-6 pb-4">
					<h1 className="text-3xl font-semibold mb-8">
						{ isMonitoringFeatureActive() ? "Settings for your team" : "Settings" }
					</h1>
					<div className="grid w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
						<nav
							className="grid gap-4 text-sm text-muted-foreground"
							// eslint-disable-next-line react/no-unknown-property
							x-chunk="dashboard-04-chunk-0"
						>
							<Link href="#" className={`text-primary ${view === 'networks' ? 'font-semibold' : ''}`} onClick={() => setView('networks')}>
								Custom networks
							</Link>
							{isMonitoringFeatureActive() && <Link href="#" className={`text-primary ${view === 'monitoring' ? 'font-semibold' : ''}`} onClick={() => setView('monitoring')}>
								Monitoring
							</Link>}
							{isMonitoringFeatureActive() && <Link href="#" className={`text-primary ${view === 'members' ? 'font-semibold' : ''}`} onClick={() => setView('members')}>
								Team Members
							</Link>}
							<span>More settings coming soon...</span>
						</nav>
						<div className="grid gap-6">
							{(() => {
								switch (view) {
									case 'networks':
										return <CustomNetworksCard />;
									case 'monitoring':
										return <SetupMonitoringCard changeTabCallback={changeTabCallback} />;
									case 'members':
										return <OrganizationMembersCard />;
									default:
										return <div></div>;
								}
							})()}
						</div>
					</div>
				</Container>
			</main>
			<Footer />
		</>
	);
}
