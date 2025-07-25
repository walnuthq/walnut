'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NetworksList } from '@/components/settings-page/networks-list';

export function CustomNetworksCard() {
	return (
		<Card x-chunk="dashboard-04-chunk-1">
			<CardHeader>
				<CardTitle>Custom networks</CardTitle>
				<CardDescription>
					By default, Walnut supports <strong>sn_main</strong> and{' '}
					<strong>sn_sepolia</strong>. You can add custom networks to expand transaction
					search, debugging, and simulation functionality to those networks.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<NetworksList/>
			</CardContent>
		</Card>
	);
}
