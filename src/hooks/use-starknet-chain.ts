import { usePathname } from 'next/navigation';
import { ChainId } from '@/lib/types';

export function useStarknetChain(): { chainId: ChainId; chainName: string } {
	const path = usePathname();
	const isSepolia = path.includes('SN_SEPOLIA');
	const chainId = isSepolia ? ChainId.SN_SEPOLIA : ChainId.SN_MAIN;
	return { chainId, chainName: isSepolia ? 'Sepolia' : 'Mainnet' };
}
