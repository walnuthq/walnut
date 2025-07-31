import { usePathname } from 'next/navigation';
import { ChainId } from '@/lib/types';

export function useEthereumChain(): { chainId: ChainId; chainName: string } {
	const path = usePathname();
	const isSepolia = path.includes('SEPOLIA');
	const chainId = isSepolia ? ChainId.ETH_SEPOLIA : ChainId.ETH_MAIN;
	return { chainId, chainName: isSepolia ? 'Sepolia' : 'Mainnet' };
}
