import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	PropsWithChildren
} from 'react';
import { ContractCallEvent } from '@/lib/simulation/types';

interface EventsContextType {
	events: ContractCallEvent[];
	loading: boolean;
	error: string | null;
	hasLoaded: boolean;
	refetch: () => void;
}

const EventsContext = createContext<EventsContextType | null>(null);

export const useEvents = () => {
	const context = useContext(EventsContext);
	if (!context) {
		throw new Error('useEvents must be used within an EventsContextProvider');
	}
	return context;
};

interface EventsContextProviderProps {
	children: React.ReactNode;
	txHash: string;
	chainId?: string;
	rpcUrl?: string;
	shouldLoad?: boolean;
}

export const EventsContextProvider = ({
	children,
	txHash,
	chainId,
	rpcUrl,
	shouldLoad = true
}: EventsContextProviderProps) => {
	const [events, setEvents] = useState<ContractCallEvent[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasLoaded, setHasLoaded] = useState(false);

	// Cache functions
	const getEventsCacheKey = (txHash: string) => {
		return `events:${txHash}`;
	};

	const getCachedEvents = (key: string) => {
		try {
			const cached = localStorage.getItem(key);
			if (cached) {
				const parsed = JSON.parse(cached);
				// Check if cache is still valid (e.g., 5 minutes)
				if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
					return parsed.data;
				}
			}
		} catch (e) {
			console.warn('Failed to read events from cache:', e);
		}
		return null;
	};

	const setCachedEvents = (key: string, data: ContractCallEvent[]) => {
		try {
			const cacheData = {
				data,
				timestamp: Date.now()
			};
			localStorage.setItem(key, JSON.stringify(cacheData));
		} catch (e) {
			console.warn('Failed to cache events:', e);
		}
	};

	const fetchEvents = useCallback(async () => {
		if (!txHash || hasLoaded) {
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const cacheKey = getEventsCacheKey(txHash);
			const cached = getCachedEvents(cacheKey);

			if (cached) {
				setEvents(cached);
				setHasLoaded(true);
				setLoading(false);
				return;
			}

			const url = new URL(`/api/v1/events/${txHash}`, window.location.origin);
			if (chainId) url.searchParams.set('chainId', chainId);
			if (rpcUrl) url.searchParams.set('rpcUrl', rpcUrl);

			const response = await fetch(url.toString());

			if (!response.ok) {
				const errorData = (await response.json()) as { error?: string };
				throw new globalThis.Error(errorData.error || `HTTP ${response.status}`);
			}

			const data = await response.json();
			setEvents(data.events);
			setCachedEvents(cacheKey, data.events);
			setHasLoaded(true);
		} catch (err: unknown) {
			console.error('Error fetching events:', err);
			const errorMessage = err instanceof globalThis.Error ? err.message : 'Failed to fetch events';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [txHash, hasLoaded, chainId, rpcUrl]);

	const refetch = () => {
		setHasLoaded(false);
		setError(null);
		fetchEvents();
	};

	useEffect(() => {
		// Always load events when txHash is available, regardless of shouldLoad
		if (!hasLoaded && txHash) {
			fetchEvents();
		}
	}, [hasLoaded, txHash, chainId, rpcUrl, fetchEvents]);

	const contextValue: EventsContextType = {
		events,
		loading,
		error,
		hasLoaded,
		refetch
	};

	return <EventsContext.Provider value={contextValue}>{children}</EventsContext.Provider>;
};
