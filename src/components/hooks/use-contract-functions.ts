import { useState, useEffect } from 'react';
import { fetchContractFunctions } from '@/lib/contracts';
import { validateHexFormat } from '../../lib/utils/validation-utils';
import { SimpleContractCall } from '@/lib/utils';
import { Chain } from '@/components/networks-select';

export function useContractFunctions(
	chain: Chain | undefined,
	contractCalls: SimpleContractCall[]
) {
	const [contractCallsFunctions, setContractCallsFunctions] = useState<{ [key: string]: any }>({});
	const [isLoadingFunctions, setIsLoadingFunctions] = useState<{ [key: string]: boolean }>({});
	const [contractFetchErrors, setContractFetchErrors] = useState<{ [key: string]: string }>({});
	const [isLoading, setIsLoading] = useState(false);

	const fetchFunctionsForContractAddress = async (
		contractAddress: string,
		chainIdOverride?: string
	) => {
		const chainId = chainIdOverride || chain?.networkName || (chain?.network as any)?.chainId;

		if (!chainId || !validateHexFormat(contractAddress)) {
			return;
		}

		if (isLoadingFunctions[contractAddress]) {
			return;
		}

		if (contractCallsFunctions[contractAddress]) {
			return;
		}

		setIsLoadingFunctions((prev) => ({
			...prev,
			[contractAddress]: true
		}));

		setContractFetchErrors((prev) => {
			const { [contractAddress]: removed, ...rest } = prev;
			return rest;
		});

		try {
			const result = await fetchContractFunctions({
				contractAddress,
				network: chainId
			});

			if (result && result.entry_point_datas) {
				setContractCallsFunctions((prev) => ({
					...prev,
					[contractAddress]: result.entry_point_datas
				}));
			} else {
				setContractFetchErrors((prev) => ({
					...prev,
					[contractAddress]: 'Contract address not found'
				}));
			}
		} catch (error) {
			let errorMessage = 'Contract address not found';

			if (error instanceof Error) {
				if (error.message === 'ABI not found for contract address') {
					errorMessage = 'Contract address not found';
				} else {
					errorMessage = 'Failed to load contract';
				}
			}

			setContractFetchErrors((prev) => ({
				...prev,
				[contractAddress]: errorMessage
			}));

			setContractCallsFunctions((prev) => {
				const { [contractAddress]: removed, ...rest } = prev;
				return rest;
			});
		} finally {
			setIsLoadingFunctions((prev) => ({
				...prev,
				[contractAddress]: false
			}));
		}
	};

	useEffect(() => {
		const initializeContractFunctions = async () => {
			if (chain && contractCalls && contractCalls.length > 0) {
				const validContracts = contractCalls.filter(
					(call) => call.address && validateHexFormat(call.address)
				);

				if (validContracts.length > 0) {
					setIsLoading(true);
					const uniqueContracts = Array.from(
						new Map(validContracts.map((call) => [call.address, call])).values()
					);
					try {
						await Promise.all(
							uniqueContracts.map((call) => fetchFunctionsForContractAddress(call.address))
						);
					} finally {
						setIsLoading(false);
					}
				}
			}
		};
		initializeContractFunctions();
	}, [chain, contractCalls]);

	const resetContractFunctions = () => {
		setContractCallsFunctions({});
		setIsLoadingFunctions({});
		setContractFetchErrors({});
	};

	return {
		contractCallsFunctions,
		isLoadingFunctions,
		contractFetchErrors,
		isLoading,
		fetchFunctionsForContractAddress,
		resetContractFunctions
	};
}
