'use client';

import { useEffect, useState } from 'react';

export const runtime = 'edge';

export default function Page({
	params
}: {
	params: Promise<{ chain_id: string; tx_hash: string }>;
}) {
	const [resolvedParams, setResolvedParams] = useState<{
		chain_id: string;
		tx_hash: string;
	} | null>(null);

	useEffect(() => {
		params.then(setResolvedParams).catch(console.error);
	}, [params]);

	useEffect(() => {
		if (resolvedParams) {
			window.location.href = `/transactions?chainId=${resolvedParams.chain_id}&txHash=${resolvedParams.tx_hash}`;
		}
	}, [resolvedParams]);

	return null;
}
