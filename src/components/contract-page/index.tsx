'use client';

import { useEffect, useState } from 'react';
import { HeaderNav } from '../header';
import { Container } from '../ui/container';
import { Footer } from '../footer';
import { Loader } from '../ui/loader';
import { InfoBoxItem, InfoBox } from '../ui/info-box';
import { Error } from '../ui/error';
import { fetchContractDataByAddress, GetContractResponse } from '@/lib/contracts';
import { ClassSourceCode } from '@/components/class-source-code';
import { useSettings } from '@/lib/context/settings-context-provider';
import { shortenHash } from '@/lib/utils';
import CopyToClipboardElement from '../ui/copy-to-clipboard';
import AddressLink from '../address-link';

export function ContractPage({ contractAddress }: { contractAddress: string }) {
	const { networks } = useSettings();
	const [contractData, setContractData] = useState<GetContractResponse>();
	const [error, setError] = useState<string | undefined>();

	useEffect(() => {
		if (!networks) return;
		const fetchData = async () => {
			try {
				setContractData(
					await fetchContractDataByAddress({
						contractAddress,
						includeSourceCode: true,
						rpcUrls: networks.map((n) => n.rpcUrl)
					})
				);
			} catch (error: any) {
				setError(error.toString());
			}
		};

		fetchData();
	}, [contractAddress, networks]);

	return (
		<>
			<HeaderNav />
			<main className="overflow-y-auto flex-grow flex-col flex justify-between">
				<Container className="py-6">
					<div className="flex flex-row items-baseline justify-between">
						<h1 className="text-base font-medium leading-6 mt-4 mb-2 mr-2 flex flex-nowrap items-center">
							Contract{' '}
							<CopyToClipboardElement
								value={contractAddress}
								toastDescription="The address has been copied."
								className="hidden lg:block p-0"
							>
								<AddressLink address={contractAddress}>{contractAddress}</AddressLink>
							</CopyToClipboardElement>
							<CopyToClipboardElement
								value={contractAddress}
								toastDescription="The address has been copied."
								className="lg:hidden p-0"
							>
								<AddressLink address={contractAddress}>{shortenHash(contractAddress)}</AddressLink>
							</CopyToClipboardElement>
						</h1>
					</div>
					{contractData && <ContractDetails contractData={contractData} />}
					{contractData ? (
						<ClassSourceCode
							isClassVerified={contractData.verified}
							sourceCode={contractData.sourceCode ?? {}}
							isContract={true}
						/>
					) : error ? (
						<Error message={error} />
					) : (
						<Loader randomQuote={false} />
					)}
				</Container>
				<Footer />
			</main>
		</>
	);
}

function ContractDetails({ contractData }: { contractData: GetContractResponse }) {
	const { networks } = useSettings();

	const details: InfoBoxItem[] = [
		{
			name: 'Class hash',
			value: contractData.classHash
		},
		{
			name: 'Verified on Walnut',
			value: contractData.verified.toString()
		}
	];

	if (contractData.deployedSources.length > 0) {
		const deployedOnNetworks = [];
		for (const source of contractData.deployedSources) {
			if (source.chainId) {
				deployedOnNetworks.push(source.chainId);
			} else {
				const networkInSettings = (networks ?? []).find(
					(network) => network.rpcUrl === source.rpcUrl
				);
				if (networkInSettings) {
					deployedOnNetworks.push(networkInSettings.networkName);
				} else {
					deployedOnNetworks.push(source.rpcUrl);
				}
			}
		}
		details.push({
			name: 'Deployed on networks',
			value: deployedOnNetworks.join(', ')
		});
	}

	return (
		<div className="mt-4">
			<InfoBox details={details} />
		</div>
	);
}
