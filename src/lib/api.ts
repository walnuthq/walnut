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
	chains
}: {
	hash: string;
	chains?: string[];
}): Promise<SearchDataResponse> {
	const searchDataResponse = await fetchApi<SearchDataResponse>(`/v1/search/${hash}`, {
		method: chains ? 'POST' : 'GET',
		data: chains ? { chains } : undefined,
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
