'use client';

import { TransactionPage } from '@/components/transaction-page';
import { useSearchParams } from 'next/navigation';

export const runtime = 'edge';

export default function Page() {
	const searchParams = useSearchParams();

	const txHash = searchParams.get('txHash');
	const chainIdStr = searchParams.get('chainId');

	if (txHash && chainIdStr) {
		// Pass through chain key as-is to support custom chains (no env RPC override here)
		return <TransactionPage txHash={txHash} chainId={chainIdStr as any} />;
	} else {
		return <div>Page not found</div>;
	}
}

const isValidUrl = (urlString: string) => {
	try {
		new URL(urlString);
		return true;
	} catch (e) {
		return false;
	}
};
