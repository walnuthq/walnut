'use client';

import * as React from 'react';
import { HeaderNav } from '@/components/header';
import { Footer } from '@/components/footer';
import { Container } from '@/components/ui/container';

export function JoinOrganizationByInvitationPage() {
	// Organization invitation functionality removed - monitoring was removed
	return (
		<>
			<HeaderNav hideUserSection={true} />
			<main className="overflow-y-auto flex-grow h-screen flex flex-col">
				<Container className="max-w-6xl mx-auto flex-grow flex items-center justify-center">
					<div className="text-center">
						<h1 className="text-3xl font-semibold mb-4">Organization Features</h1>
						<p className="text-muted-foreground">
							Organization and monitoring features coming soon.
						</p>
					</div>
				</Container>
			</main>
			<Footer />
		</>
	);
}
