'use client';

import { TransactionPage } from '@/components/transaction-page';
import { extractChainId } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export const runtime = 'edge';

export default function Page() {
	const searchParams = useSearchParams();

	const txHash = searchParams.get('txHash');
	const chainIdStr = searchParams.get('chainId');
	let rpcUrl = searchParams.get('rpcUrl');

	// TODO: Fix this on Dojo side and remove this
	if (rpcUrl && !isValidUrl(rpcUrl)) {
		rpcUrl = decodeURIComponent(rpcUrl);
	}

	if (txHash && chainIdStr) {
		const chainId = extractChainId(chainIdStr);
		return <TransactionPage txHash={txHash} chainId={chainId} />;
	} else if (txHash && rpcUrl) {
		return <TransactionPage txHash={txHash} rpcUrl={rpcUrl} />;
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
