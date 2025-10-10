import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Network, useSettings } from '@/lib/context/settings-context-provider';
import { SimulationPayloadWithCalldata } from '@/lib/simulation';
import { SimulationPayload } from '@/lib/utils';
import { useEffect, useState } from 'react';

export interface Chain {
	chainId?: string;
	network?: Network;
}

export function NetworksSelect({
	simulationPayload,
	onChainChangedCallback,
	selectedChain,
	isLoading,
	isDemo
}: {
	simulationPayload?: SimulationPayloadWithCalldata | SimulationPayload;
	onChainChangedCallback: (chain: Chain) => void;
	selectedChain?: Chain;
	isLoading?: boolean;
	isDemo?: string;
}) {
	const { networks } = useSettings();

	const defaultChain = extractChain(networks, simulationPayload);

	const [_chain, _setChain] = useState<Chain>(defaultChain);

	useEffect(() => {
		if (simulationPayload?.chainId) {
			_setChain({
				chainId: simulationPayload?.chainId
			});
			onChainChangedCallback({ chainId: simulationPayload?.chainId });
		} else if (networks.length > 0) {
			// Use the first available network as default
			const defaultNetwork = networks[0];
			_setChain({ network: defaultNetwork });
			onChainChangedCallback({ network: defaultNetwork });
		}
	}, [simulationPayload, networks]);

	if (isDemo)
		return (
			<Select value={'Arbitrum One'}>
				<SelectTrigger className="col-span-3 font-mono">
					Arbitrum One
					<SelectValue placeholder="Select a chain" />
				</SelectTrigger>
			</Select>
		);

	function extractChain(
		networks: Network[],
		simulationPayload?: SimulationPayloadWithCalldata | SimulationPayload
	): Chain {
		if (simulationPayload) {
			if (simulationPayload.chainId) {
				return {
					chainId: simulationPayload.chainId
				};
			} else if (simulationPayload.rpcUrl) {
				const network = networks.find((n) => n.rpcUrl === simulationPayload.rpcUrl);
				if (network) return { network };
				else
					return {
						network: { networkName: simulationPayload.rpcUrl, rpcUrl: simulationPayload.rpcUrl }
					};
			}
		}
		// Return first available network or empty chain if no networks available
		return networks.length > 0 ? { network: networks[0] } : {};
	}

	// Deduplicate networks by networkName to prevent duplicate keys
	const uniqueNetworks = networks.filter(
		(network, index, self) => index === self.findIndex((n) => n.networkName === network.networkName)
	);

	const chainOptions = uniqueNetworks.map((network) => ({
		value: network.networkName,
		label: network.networkName
	}));

	function handleChainChange(value: string) {
		const network = networks.find((n) => n.networkName === value);
		if (network) {
			_setChain({ network });
			onChainChangedCallback({ network });
		} else if (value === defaultChain.network?.networkName) {
			_setChain(defaultChain);
			onChainChangedCallback(defaultChain);
		}
	}

	return (
		<Select
			disabled={isLoading}
			value={_chain.chainId ?? _chain.network?.networkName}
			onValueChange={(value) => handleChainChange(value)}
		>
			<SelectTrigger className="col-span-3 font-mono">
				<SelectValue placeholder="Select a chain" />
			</SelectTrigger>
			<SelectContent>
				{chainOptions.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
