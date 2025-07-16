import { ChainId } from '@/lib/types';
import { fetchApi } from '@/lib/utils';
import { GetClassResponse } from '.';

export async function fetchClassDataByHash({
	classHash,
	includeSourceCode,
	rpcUrls
}: {
	classHash: string;
	includeSourceCode: boolean;
	rpcUrls: string[];
}): Promise<GetClassResponse> {
	const queryParams: Record<string, string> = {
		include_source_code: includeSourceCode ? 'true' : 'false'
	};
	if (rpcUrls.length > 0) {
		queryParams.rpc_urls = rpcUrls.join(',');
	}
	const contractData = await fetchApi<GetClassResponse>(`/v1/classes/${classHash}`, {
		renameToCamelCase: true,
		queryParams
	});
	return contractData;
}
