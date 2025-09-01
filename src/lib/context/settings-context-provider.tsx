'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUserContext } from '@/lib/context/user-context-provider';
import { toast } from '@/components/hooks/use-toast';
import {
	createNetworkApi,
	deleteNetworkApi,
	getNetworksApi
} from '@/app/api/monitoring-api-service';
import { isTrackingActive } from '@/app/api/tracking-service';
import { chainMapping, stackMapping, unknownPrefixesAsStarknet } from '../utils';

export interface Network {
	rpcUrl: string;
	networkName: string;
	id?: string;
	organizationId?: string;
}

export interface AddNetwork {
	rpcUrl: string;
	networkName: string;
}

type SettingsContextType = {
	networks: Network[];
	addNetwork: (network: AddNetwork) => void;
	removeNetwork: (network: Network) => void;
	getNetworkByRpcUrl: (rpcUrl: string) => Network | undefined;
	trackingActive: boolean;
	// informs if tracking flag was correctly set
	trackingFlagLoaded: boolean;
	parseChain: (chainString: string) => { stack?: string; chain?: string } | null;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [networks, setNetworks] = useState<Network[]>([]);
	const { isLogged, organizationId } = useUserContext();
	const [trackingActive, setTrackingActive] = useState<boolean>(true);
	const [trackingFlagLoaded, setTrackingFlagLoaded] = useState<boolean>(false);

	useEffect(() => {
		setTrackingActive(isTrackingActive());
		setTrackingFlagLoaded(true);
	}, []);

	const getNetworks = useCallback(async () => {
		const networks = await getNetworksApi(organizationId);
		if (networks) {
			setNetworks(networks);
		}
	}, [organizationId]);

	useEffect(() => {
		if (isLogged) {
			getNetworks();
		}
	}, [getNetworks, isLogged, organizationId]);

	const addNetwork = async (network: AddNetwork) => {
		const created = await createNetworkApi(network.networkName, network.rpcUrl, organizationId);
		if (created) {
			toast({
				title: `Network ${network.networkName} added!`,
				description: 'Network added successfully.'
			});
			await getNetworks();
		} else {
			toast({
				title: 'Add network failed!',
				description: 'There was an error while adding the network.',
				className: 'text-red-500'
			});
		}
	};

	const removeNetwork = async (network: Network) => {
		const deletedRes = await deleteNetworkApi(network.id ?? '', organizationId);
		if (deletedRes.succeed) {
			toast({
				title: `Network ${network.networkName} removed!`,
				description: 'Network removed successfully.'
			});
			await getNetworks();
		} else {
			if (deletedRes.responseCode === 400) {
				toast({
					title: 'Remove network failed!',
					description: 'This network is used by monitoring.',
					className: 'text-red-500'
				});
			} else {
				toast({
					title: 'Remove network failed!',
					description: 'There was an error while removing the network.',
					className: 'text-red-500'
				});
			}
		}
	};

	const parseChain = (chainString: string) => {
		const parts = chainString.toLowerCase().split('_');
		let stack: string | undefined;
		let chain: string | undefined;
		let isCustomNetwork = false;

		if (parts.length === 1) {
			const prefix = parts[0];
			stack = stackMapping[prefix];
			chain = chainMapping[prefix];
		} else if (parts.length === 2) {
			const [prefix, chainPart] = parts;

			if (stackMapping[prefix]) {
				stack = stackMapping[prefix];
			} else if (
				unknownPrefixesAsStarknet(prefix) &&
				(chainPart === 'sepolia' || chainPart === 'main' || chainPart === 'mainnet')
			) {
				stack = 'Starknet';
				isCustomNetwork = true;
			}

			chain = chainMapping[chainPart];
		}

		const result: Record<string, string> = {};

		if (stack) {
			result.stack = stack;
		} else {
			result.stack = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
		}

		if (chain) {
			result.chain = chain;
		} else {
			const chainPart = parts.length > 1 ? parts[1] : parts[0];
			result.chain = chainPart.charAt(0).toUpperCase() + chainPart.slice(1);
		}

		if (isCustomNetwork && parts.length === 2) {
			const [prefix, chainPart] = parts;
			const formattedPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
			const formattedChain =
				chainMapping[chainPart] || chainPart.charAt(0).toUpperCase() + chainPart.slice(1);
			result.customNetworkName = `${formattedPrefix} ${formattedChain}`;
		}

		return Object.keys(result).length > 0 ? result : null;
	};

	const getNetworkByRpcUrl = (rpcUrl: string): Network | undefined => {
		return networks.find((network) => network.rpcUrl === rpcUrl);
	};

	return (
		<SettingsContext.Provider
			value={{
				networks,
				addNetwork,
				removeNetwork,
				getNetworkByRpcUrl,
				trackingActive,
				trackingFlagLoaded,
				parseChain
			}}
		>
			{children}
		</SettingsContext.Provider>
	);
};

export const useSettings = () => {
	const context = useContext(SettingsContext);
	if (!context) {
		throw new Error('useSettings must be used within a SettingsProvider');
	}
	return context;
};
