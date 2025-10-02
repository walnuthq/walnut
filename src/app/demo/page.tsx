'use client';

// import { extractChainId } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { TransactionPage } from './transaction-page';

export const runtime = 'edge';

export default function Page() {
	const searchParams = useSearchParams();

	const txHash = '0x1362ee26050935178c2f491dbe2a5f0d277903cb5d77fa9e6e30d8b2db31a541';
	const chainIdStr = '42161';

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
