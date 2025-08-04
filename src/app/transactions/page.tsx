'use client';

import { TransactionPage } from '@/components/transaction-page';
import { extractChainId } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export const runtime = 'edge';

export default function Page() {
	const searchParams = useSearchParams();

	const txHash = searchParams.get('txHash');
	const chainIdStr = searchParams.get('chainId');

	if (txHash && chainIdStr) {
		const chainId = extractChainId(chainIdStr);
		return (
			<TransactionPage
				txHash={txHash}
				chainId={chainId}
				rpcUrl={process.env.NEXT_PUBLIC_RPC_URL!}
			/>
		);
	} else if (txHash) {
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
