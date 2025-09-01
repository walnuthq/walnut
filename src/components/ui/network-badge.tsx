import React from 'react';
import { Badge } from '@/components/ui/badge';
import optimismLogo from '@/assets/network-logos/optimism.svg';
import ethLogo from '@/assets/network-logos/eth.svg';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Network {
	stack?: string;
	chain?: string;
	customNetworkName?: string;
}

function getNetworkStyle(network: Network) {
	if (network.stack === 'Optimism' && !network.customNetworkName) {
		return {
			logo: optimismLogo,
			class:
				'border-red-600 text-red-600 hover:!bg-red-200 dark:hover:!bg-red-600 bg-red-100 dark:bg-opacity-40 dark:bg-red-500 dark:text-white'
		};
	}

	if (network.stack === 'Ethereum' && !network.customNetworkName) {
		return {
			logo: ethLogo,
			class:
				'bg-gray-100 border-gray-400 hover:!bg-gray-200  dark:hover:!bg-gray-600 text-gray-900 dark:bg-opacity-40 dark:bg-gray-500 dark:text-white'
		};
	}

	return {
		class:
			'bg-blue-100 border-blue-400 hover:!bg-blue-200 text-variable dark:hover:!bg-blue-600 dark:bg-opacity-40 dark:bg-blue-500 dark:text-white'
	};
}

export function NetworkBadge({
	network,
	withoutStack
}: {
	network: Network;
	withoutStack?: boolean;
}) {
	if (!network) return null;

	const style = getNetworkStyle(network);

	return (
		<TooltipProvider>
			<Tooltip delayDuration={100}>
				<TooltipTrigger>
					<Badge
						className={`px-2 py-1  ${
							!withoutStack ? 'ml-4' : 'my-0.5'
						} text-xs border rounded-full w-fit flex items-center ${style.logo && 'space-x-1'} ${
							style.class
						}`}
					>
						{style.logo ? (
							<Image src={style.logo} alt={`${network.stack} logo`} className="w-4 h-4" />
						) : (
							<div className="h-4"></div>
						)}
						{network.customNetworkName ? (
							<span>{network.customNetworkName}</span>
						) : (
							<span>
								{(!withoutStack || !style.logo) && network.stack} {network.chain}
							</span>
						)}
					</Badge>
				</TooltipTrigger>
				{!withoutStack && (
					<TooltipContent className="bg-background border-border text-black dark:text-white border">
						This transaction was executed on the “
						{network.customNetworkName
							? network.customNetworkName
							: `${network.stack} ${network.chain}`}
						” network.
					</TooltipContent>
				)}
			</Tooltip>
		</TooltipProvider>
	);
}
