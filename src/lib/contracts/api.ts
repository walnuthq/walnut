import { fetchApi } from '@/lib/utils';
import { ContractFunctions, GetContractResponse } from '.';

export async function fetchContractDataByAddress({
	contractAddress,
	includeSourceCode,
	rpcUrls
}: {
	contractAddress: string;
	includeSourceCode: boolean;
	rpcUrls: string[];
}): Promise<GetContractResponse> {
	const queryParams: Record<string, string> = {
		include_source_code: includeSourceCode ? 'true' : 'false'
	};
	if (rpcUrls.length > 0) {
		queryParams.rpc_urls = rpcUrls.join(',');
	}
	const contractData = await fetchApi<GetContractResponse>(`/v1/contracts/${contractAddress}`, {
		renameToCamelCase: true,
		queryParams
	});
	return contractData;
}

export async function fetchContractFunctions({
	contractAddress,
	network
}: {
	contractAddress: string;
	network: string;
}) {
	const contractData = await fetchApi<ContractFunctions>(
		`/v1/contracts/${contractAddress}/entrypoints?chain_id=${network}`
	);
	return contractData;
}
