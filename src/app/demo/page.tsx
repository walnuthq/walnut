'use client';

// import { extractChainId } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { TransactionPage } from './transaction-page';
import { ChainId } from '@/lib/types';

export const runtime = 'edge';

export default function Page() {
	const searchParams = useSearchParams();

	const txHash = '0xc1b5345f62e1170c3bc246d931f806db1becfb480a15e4085daf55d61c660ecb';
	const chainIdStr = 'ARBITRUM_ONE';

	if (txHash && chainIdStr) {
		// Pass through chain key as-is to support custom chains (no env RPC override here)
		return <TransactionPage txHash={txHash} chainId={chainIdStr as ChainId} />;
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
