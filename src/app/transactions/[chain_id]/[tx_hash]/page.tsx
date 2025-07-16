'use client';

import { useEffect } from 'react';

export const runtime = 'edge';

export default function Page({ params }: { params: { chain_id: string; tx_hash: string } }) {
	useEffect(() => {
		window.location.href = `/transactions?chainId=${params.chain_id}&txHash=${params.tx_hash}`;
	}, [params.chain_id, params.tx_hash]);

	return null;
}
