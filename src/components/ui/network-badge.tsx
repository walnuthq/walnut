import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import optimismLogo from '@/assets/network-logos/optimism.svg';
import ethLogo from '@/assets/network-logos/eth.svg';
import arbitrumLogo from '@/assets/network-logos/arbitrum.svg';
import citreaLogo from '@/assets/network-logos/citrea.svg';
import unichainLogo from '@/assets/network-logos/unichain.svg';
import bobLogo from '@/assets/network-logos/bob.svg';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

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

	if (network.stack === 'Arbitrum' && !network.customNetworkName) {
		return {
			logo: arbitrumLogo,
			class:
				'bg-blue-100 border-blue-400 hover:!bg-blue-200 text-variable dark:hover:!bg-blue-600 dark:bg-opacity-40 dark:bg-blue-500 dark:text-white'
		};
	}

	if (network.stack === 'Citrea' && !network.customNetworkName) {
		return {
			logo: citreaLogo,
			class:
				'bg-orange-100 border-orange-400 hover:!bg-orange-200 text-orange-600 dark:hover:!bg-orange-600 dark:bg-opacity-40 dark:bg-orange-500 dark:text-orange-200'
		};
	}

	if (network.stack === 'Unichain' && !network.customNetworkName) {
		return {
			logo: unichainLogo,
			class:
				'bg-pink-100 border-pink-400 hover:!bg-pink-200 text-pink-600 dark:hover:!bg-pink-600 dark:bg-opacity-40 dark:bg-pink-500 dark:text-pink-200'
		};
	}

	if (network.stack === 'Bob' && !network.customNetworkName) {
		return {
			logo: bobLogo,
			class:
				'bg-orange-100 border-orange-400 hover:!bg-orange-200 text-orange-600 dark:hover:!bg-orange-600 dark:bg-opacity-40 dark:bg-orange-500 dark:text-orange-200'
		};
	}

	return {
		class:
			'bg-blue-100 border-blue-400 hover:!bg-blue-200 text-variable dark:hover:!bg-blue-600 dark:bg-opacity-40 dark:bg-blue-500 dark:text-white'
	};
}

function SingleNetworkBadge({
	network,
	withoutStack
}: {
	network: Network;
	withoutStack?: boolean;
}) {
	const style = getNetworkStyle(network);

	return (
		<Badge
			className={`px-2 py-1 text-xs border rounded-full w-fit flex items-center ${
				style.logo && 'space-x-1'
			} ${style.class}`}
		>
			{style.logo ? (
				<Image src={style.logo} alt={`${network.stack} logo`} className="w-4 h-4" />
			) : (
				<div className="h-4"></div>
			)}
			<span>{getNetworkDisplayName(network, withoutStack)}</span>
		</Badge>
	);
}

function getNetworkDisplayName(network: Network, withoutStack?: boolean) {
	if (network.customNetworkName) {
		return network.customNetworkName;
	}

	const style = getNetworkStyle(network);
	return (!withoutStack || !style.logo) && network.stack
		? `${network.stack} ${network.chain}`.trim()
		: network.chain || '';
}

export function NetworkBadge({
	network,
	networks,
	title,
	withoutStack,
	className,
	type
}: {
	network?: Network;
	networks?: Network[];
	withoutStack?: boolean;
	className?: string;
	title?: string;
	type?: string;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const contentRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (!isOpen) return;

		const closeIfOutside = (e: Event) => {
			const target = e.target as Node | null;
			if (contentRef.current && target && contentRef.current.contains(target)) return;
			setIsOpen(false);
		};

		const opts: AddEventListenerOptions = { passive: true, capture: true };

		document.addEventListener('scroll', closeIfOutside, opts);
		document.addEventListener('touchmove', closeIfOutside, opts);
		document.addEventListener('wheel', closeIfOutside, opts);
		window.addEventListener('resize', closeIfOutside);

		return () => {
			document.removeEventListener('scroll', closeIfOutside, opts);
			document.removeEventListener('touchmove', closeIfOutside, opts);
			document.removeEventListener('wheel', closeIfOutside, opts);
			window.removeEventListener('resize', closeIfOutside);
		};
	}, [isOpen]);
	const networksToRender = networks || (network ? [network] : []);

	if (!networksToRender.length) return null;

	if (networksToRender.length === 1) {
		const singleNetwork = networksToRender[0];
		const style = getNetworkStyle(singleNetwork);

		return (
			<TooltipProvider>
				<Tooltip delayDuration={100}>
					<TooltipTrigger asChild>
						<button className="focus:outline-none text-xs">
							<Badge
								className={`px-2 py-1 ${
									withoutStack && 'my-0.5'
								} text-xs border rounded-full w-fit flex items-center ${
									style.logo && 'space-x-1'
								} ${style.class} ${className} cursor-pointer hover:opacity-80 transition-opacity `}
							>
								{style.logo ? (
									<Image src={style.logo} alt={`${singleNetwork.stack} logo`} className="w-4 h-4" />
								) : (
									<div className="h-4"></div>
								)}
								<span>{getNetworkDisplayName(singleNetwork, withoutStack)}</span>
							</Badge>
						</button>
					</TooltipTrigger>
					{!withoutStack && (
						<TooltipContent
							className="bg-background border-border text-black dark:text-white border"
							side="top"
							sideOffset={5}
						>
							{type && type === 'contract' ? (
								<div className="text-xs">
									This contract was found on the {getNetworkDisplayName(singleNetwork, false)}{' '}
									network.
								</div>
							) : (
								<div className="text-xs">
									This transaction was executed on the {getNetworkDisplayName(singleNetwork, false)}{' '}
									network.
								</div>
							)}
						</TooltipContent>
					)}
				</Tooltip>
			</TooltipProvider>
		);
	}

	const uniqueNetworks = networksToRender.filter(
		(network, index, arr) =>
			arr.findIndex((n) => getNetworkDisplayName(n) === getNetworkDisplayName(network)) === index
	);

	const logos = uniqueNetworks.map((net) => getNetworkStyle(net).logo).filter(Boolean);

	const badgeStyle =
		uniqueNetworks.length > 0
			? getNetworkStyle(uniqueNetworks[0]).class
			: 'bg-blue-100 border-blue-400 hover:!bg-blue-200 text-variable dark:hover:!bg-blue-600 dark:bg-opacity-40 dark:bg-blue-500 dark:text-white';

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button className="focus:outline-none">
					<Badge
						className={`px-2 py-1 ${
							withoutStack && 'my-0.5'
						} text-xs border rounded-full w-fit flex items-center space-x-1 ${badgeStyle} ${className} cursor-pointer hover:opacity-80 transition-opacity min-w-[6rem] text-center`}
					>
						{logos.length > 0 && (
							<div className="flex items-center -space-x-1 text-center justify-center">
								{logos.slice(0, 3).map((logo, index) => (
									<div
										key={index}
										className="relative flex items-center justify-center w-4 h-4 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
										style={{ zIndex: logos.length - index }}
									>
										<Image src={logo} alt="Network logo" className="w-3 h-3" />
									</div>
								))}
								{logos.length > 3 && (
									<div className="relative flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-xs font-bold">
										+{logos.length - 3}
									</div>
								)}
							</div>
						)}
						<span className="ml-1">
							{uniqueNetworks.length === 1
								? getNetworkDisplayName(uniqueNetworks[0], withoutStack)
								: `${uniqueNetworks.length} Networks`}
						</span>
					</Badge>
				</button>
			</PopoverTrigger>
			{!withoutStack && (
				<PopoverContent
					ref={contentRef}
					className="w-auto max-w-xs p-3"
					side="bottom"
					sideOffset={5}
				>
					<div className="text-xs text-center ">{title}</div>

					<div className="space-y-2">
						<div className="flex flex-wrap gap-2">
							{uniqueNetworks.map((net, index) => (
								<SingleNetworkBadge key={index} network={net} withoutStack={false} />
							))}
						</div>
					</div>
				</PopoverContent>
			)}
		</Popover>
	);
}
