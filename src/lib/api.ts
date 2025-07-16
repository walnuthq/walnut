import {
	CommonError,
	Project,
	SimulationResponse,
	SimulationsResponse,
	Transaction,
	SearchDataResponse
} from '@/lib/types';
import { fetchApi } from '@/lib/utils';
import { API_URL } from '@/lib/config';

export async function fetchSearchData({
	hash,
	rpcUrls
}: {
	hash: string;
	rpcUrls?: string[];
}): Promise<SearchDataResponse> {
	const queryParams: { rpc_urls?: string } = {};
	if (rpcUrls && rpcUrls.length > 0) queryParams.rpc_urls = rpcUrls.join(',');
	const searchDataResponse = await fetchApi<SearchDataResponse>(`/v1/search/${hash}`, {
		queryParams,
		renameToCamelCase: true
	});
	return searchDataResponse;
}

export function fetchCommonErrors({ projectSlug }: { projectSlug: string }) {
	return fetchApi<{ project: Project; common_errors: CommonError[] }>(
		'/v1/simulations/common-errors',
		{
			queryParams: { project_slug: projectSlug }
		}
	);
}

export function fetchSimulations({
	projectSlug,
	errorHash
}: {
	projectSlug?: string;
	errorHash?: string;
}) {
	const queryParams: { project_slug?: string; error_hash?: string } = {};
	if (projectSlug) queryParams.project_slug = projectSlug;
	if (errorHash) queryParams.error_hash = errorHash;
	return fetchApi<SimulationsResponse | null>('/v1/simulations', { queryParams });
}

export async function fetchSimulation(simulationId: string) {
	const res = await fetch(`${API_URL}/simulation/${simulationId}`);
	if (!res.ok) throw new Error('Failed to fetch data');
	return (await res.json()) as SimulationResponse;
}

export async function fetchTransaction(chainId: string, txHash: string) {
	const res = await fetch(`${API_URL}/${chainId}/tx/${txHash}`);
	if (!res.ok) throw new Error('Failed to fetch data');
	return (await res.json()) as Transaction;
}
