'use client';

import { TransactionPage } from '@/components/transaction-page';
// import { extractChainId } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export const runtime = 'edge';

export default function Page() {
	const searchParams = useSearchParams();

	const txHash = searchParams.get('txHash');
	const chainIdStr = searchParams.get('chainId');

	if (txHash && chainIdStr) {
		// Pass through chain key as-is to support custom chains (no env RPC override here)
		return <TransactionPage txHash={txHash} chainId={chainIdStr as any} />;
	} else if (txHash) {
		// Fallback legacy behavior if only txHash is present
		return <TransactionPage txHash={txHash} rpcUrl={process.env.NEXT_PUBLIC_RPC_URL!} />;
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
