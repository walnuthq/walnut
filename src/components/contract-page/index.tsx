'use client';

import { useEffect, useState } from 'react';
import { HeaderNav } from '../header';
import { Container } from '../ui/container';
import { Footer } from '../footer';
import { Loader } from '../ui/loader';
import { Error } from '../ui/error';
import { fetchContractDataByAddress, GetContractResponse } from '@/lib/contracts';
import { useSettings } from '@/lib/context/settings-context-provider';
import { FetchError, shortenHash } from '@/lib/utils';
import CopyToClipboardElement from '../ui/copy-to-clipboard';
import AddressLink from '../address-link';
import { ServerError } from '../ui/server-error';
import { NetworkBadge } from '@/components/ui/network-badge';
import { InfoBox, InfoBoxItem } from '../ui/info-box';
import { ClassSourceCode } from '@/components/class-source-code';
import { VerifiedBadge } from '../ui/verified-badge';
import { NonVerifiedBadge } from '../ui/non-verified-badge';

export function ContractPage({ contractAddress }: { contractAddress: string }) {
	const { networks, parseChain } = useSettings();
	const [contractData, setContractData] = useState<GetContractResponse>();
	const [error, setError] = useState<FetchError | undefined>();

	useEffect(() => {
		if (!networks) return;
		let cancelled = false;
		const fetchData = async () => {
			try {
				setError(undefined);
				setContractData(undefined);
				const data = await fetchContractDataByAddress({
					contractAddress,
					includeSourceCode: true,
					rpcUrls: networks.map((network) => network.rpcUrl)
				});
				if (!cancelled) {
					setContractData(data);
				}
			} catch (fetchError) {
				if (!cancelled) {
					setError(fetchError as FetchError);
				}
			}
		};

		fetchData();

		return () => {
			cancelled = true;
		};
	}, [contractAddress, networks]);

	return (
		<>
			<HeaderNav />
			<main className="overflow-y-auto flex-grow flex-col flex justify-between">
				<Container className="py-6">
					<div className="flex items-center gap-4 mt-4 mb-2 mr-2">
						<h1 className="text-base font-medium leading-6  flex flex-nowrap items-center">
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
						{contractData && getNetworkBadge(contractData.deployedSources, parseChain)}
						{contractData && (contractData.verified ? <VerifiedBadge /> : <NonVerifiedBadge />)}
					</div>
					{contractData && (
						<>
							<ContractDetails contractData={contractData} />
							{/* <ClassSourceCode
								isClassVerified={contractData.verified}
								sourceCode={contractData.sourceCode ?? {}}
								isContract={true}
							/> */}
						</>
					)}
					{contractData ? null : error && error.status ? (
						error.status >= 500 && error.status < 600 ? (
							<ServerError message={error.toString()} />
						) : (
							<Error message={error.toString()} />
						)
					) : (
						<Loader randomQuote={false} />
					)}
				</Container>
				<Footer />
			</main>
		</>
	);
}

type ParseChainFn = ReturnType<typeof useSettings>['parseChain'];

function ContractDetails({ contractData }: { contractData: GetContractResponse }) {
	const details: InfoBoxItem[] = [
		{
			name: 'Class hash',
			value: contractData.classHash || 'N/A',
			isCopyable: Boolean(contractData.classHash),
			valueToCopy: contractData.classHash
		},
		// {
		// 	name: 'Solidity version',
		// 	value: contractData.solidityVersion || 'Unknown'
		// },
		{
			name: 'Verification',
			value: contractData.verified ? 'Verified on Sourcify' : 'Not verified'
		}
	];

	if (contractData.deployedSources.length > 0) {
		details.push({
			name: 'Networks detected',
			value: contractData.deployedSources.map((source) => source.value).join(', ')
		});
	}

	return (
		<div className="mt-6">
			<InfoBox details={details} />
		</div>
	);
}

function getNetworkBadge(
	deployedSources: GetContractResponse['deployedSources'],
	parseChain: ParseChainFn
) {
	const networksArray = deployedSources
		.map((source) => {
			const identifier = source.chainId || source.value || source.rpcUrl;
			const parsed = identifier ? parseChain(identifier) : null;
			if (parsed) return parsed;

			const label = source.value || source.rpcUrl || 'Custom network';
			return {
				stack: label,
				chain: '',
				customNetworkName: label
			};
		})
		.filter(Boolean);

	return networksArray.length > 0 ? (
		<NetworkBadge
			type="contract"
			networks={networksArray as Parameters<typeof NetworkBadge>[0]['networks']}
		/>
	) : null;
}
