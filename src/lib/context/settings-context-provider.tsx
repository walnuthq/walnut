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
				trackingFlagLoaded
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
