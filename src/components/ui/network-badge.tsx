import React from 'react';
import { Badge } from '@/components/ui/badge';
import optimismLogo from '@/assets/network-logos/optimism.svg';
import ethLogo from '@/assets/network-logos/eth.svg';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Network {
	networkName: string;
}

interface NetworkBadgeProps {
	network?: Network;
}

function getNetworkStyle(name: string) {
	const prefix = name.split(' ')[0];

	if (prefix === 'OP') {
		return {
			logo: optimismLogo,
			class:
				'border-red-600 text-red-600 hover:!bg-red-200 dark:hover:!bg-red-600 bg-red-100 dark:bg-opacity-40 dark:bg-red-500 dark:text-white'
		};
	}

	if (/^ETH/i.test(name)) {
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

export function NetworkBadge({ network }: NetworkBadgeProps) {
	if (!network) return null;

	const style = getNetworkStyle(network.networkName);

	return (
		<TooltipProvider>
			<Tooltip delayDuration={100}>
				<TooltipTrigger>
					<Badge
						className={`px-2 py-1 ml-4 text-xs border rounded-full flex items-center space-x-1 ${style.class}`}
					>
						{style.logo && (
							<Image src={style.logo} alt={`${network.networkName} logo`} className="w-4 h-4" />
						)}
						<span> {network.networkName}</span>
					</Badge>
				</TooltipTrigger>
				<TooltipContent className="bg-background border-border text-black dark:text-white border">
					This transaction was executed on the “{network.networkName}” network.
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
