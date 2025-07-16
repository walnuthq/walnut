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
	isLoading
}: {
	simulationPayload?: SimulationPayloadWithCalldata | SimulationPayload;
	onChainChangedCallback: (chain: Chain) => void;
	selectedChain?: Chain;
	isLoading?: boolean;
}) {
	const { networks } = useSettings();

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
		return { chainId: 'SN_MAIN' };
	}

	const chainOptions = [
		{ value: 'SN_MAIN', label: 'SN_MAIN' },
		{ value: 'SN_SEPOLIA', label: 'SN_SEPOLIA' },
		...networks.map((network) => ({ value: network.networkName, label: network.networkName }))
	];

	const defaultChain = extractChain(networks, simulationPayload);
	const [_chain, _setChain] = useState<Chain>(defaultChain);

	function handleChainChange(value: string) {
		if (value === 'SN_MAIN' || value === 'SN_SEPOLIA') {
			_setChain({ chainId: value });
			onChainChangedCallback({ chainId: value });
		} else {
			const network = networks.find((n) => n.networkName === value);
			if (network) {
				_setChain({ network });
				onChainChangedCallback({ network });
			} else if (value === defaultChain.network?.networkName) {
				_setChain(defaultChain);
				onChainChangedCallback(defaultChain);
			}
		}
	}

	useEffect(() => {
		if (simulationPayload?.chainId) {
			_setChain({
				chainId: simulationPayload?.chainId
			});
			onChainChangedCallback({ chainId: simulationPayload?.chainId });
		} else {
			_setChain({ chainId: 'SN_MAIN' });
			onChainChangedCallback({ chainId: 'SN_MAIN' });
		}
	}, [simulationPayload]);

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
