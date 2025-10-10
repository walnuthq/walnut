'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NetworksList } from '@/components/settings-page/networks-list';

export function CustomNetworksCard() {
	return (
		<Card x-chunk="dashboard-04-chunk-1">
			<CardHeader>
				<CardTitle>Custom networks</CardTitle>
				<CardDescription>Coming soon...</CardDescription>
			</CardHeader>
		</Card>
	);
}
