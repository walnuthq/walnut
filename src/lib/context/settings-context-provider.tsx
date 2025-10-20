'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUserContext } from '@/lib/context/user-context-provider';
import { toast } from '@/components/hooks/use-toast';
// Monitoring API removed
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

	// Load networks from server (static networks always, + tenant networks if logged in)
	useEffect(() => {
		let cancelled = false;
		const loadNetworks = async () => {
			try {
				const res = await fetch('/api/v1/networks', { cache: 'no-store' });
				if (!res.ok) {
					console.error('Failed to fetch networks, status:', res.status);
					return;
				}
				const json = (await res.json()) as { networks: Network[] };
				if (!cancelled && json?.networks) {
					setNetworks(json.networks);
				}
			} catch (error) {
				console.error('Failed to load networks:', error);
			}
		};

		// Always load networks (static if not logged in, static + tenant if logged in)
		loadNetworks();

		return () => {
			cancelled = true;
		};
	}, [isLogged]);

	useEffect(() => {
		setTrackingActive(isTrackingActive());
		setTrackingFlagLoaded(true);
	}, []);

	// Network management functions removed - monitoring was removed

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
