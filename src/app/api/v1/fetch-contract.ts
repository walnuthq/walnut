import { type Abi, type Address, type PublicClient } from 'viem';
import { whatsabi } from '@shazow/whatsabi';
import { type Contract } from '@/app/api/v1/types';

const fetchContract = async (
	address: Address,
	publicClient: PublicClient,
	chainId: number
): Promise<Contract> => {
	const bytecode = await publicClient.getCode({ address });
	if (!bytecode) {
		throw new Error(`Error: no bytecode found for ${address}`);
	}
	const provider = whatsabi.providers.WithCachedCode(publicClient, {
		[address]: bytecode
	});
	const result = await whatsabi.autoload(address, {
		provider,
		abiLoader: new whatsabi.loaders.SourcifyABILoader({ chainId }),
		loadContractResult: true
	});
	if (result.contractResult) {
		const [sources, proxyResult] = await Promise.all([
			result.contractResult.getSources && result.contractResult.getSources(),
			result.followProxies && result.followProxies()
		]);
		if (proxyResult && proxyResult.contractResult) {
			result.contractResult.abi = proxyResult.contractResult.abi;
		}
		const filteredSources = sources
			? sources
					.filter(({ path }) => path)
					.map(({ path, content }) => ({
						path: whatsabi.loaders.SourcifyABILoader.stripPathPrefix(`/${path}`),
						content
					}))
			: [];

		const isVerified = filteredSources.length > 0;
		return {
			address,
			bytecode,
			name: result.contractResult.name ?? address,
			sources: filteredSources,
			abi: result.contractResult.abi,
			verified: isVerified
		};
	}
	return {
		address,
		bytecode,
		name: address,
		sources: [],
		abi: result.abi as Abi,
		verified: false
	};
};

export default fetchContract;
