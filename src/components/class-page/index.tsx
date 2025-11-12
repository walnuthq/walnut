'use client';

import { useEffect, useState } from 'react';
import { HeaderNav } from '../header';
import { Container } from '../ui/container';
import { Footer } from '../footer';
import { Loader } from '../ui/loader';
import { InfoBoxItem, InfoBox } from '../ui/info-box';
import { Error } from '../ui/error';
import { ClassSourceCode } from '@/components/class-source-code';
import { fetchClassDataByHash, GetClassResponse } from '@/lib/classes';
import { useSettings } from '@/lib/context/settings-context-provider';
import { shortenHash } from '@/lib/utils';
import CopyToClipboardElement from '../ui/copy-to-clipboard';
import AddressLink from '../address-link';
import { ServerError } from '../ui/server-error';

export function ClassPage({ classHash }: { classHash: string }) {
	const { networks } = useSettings();
	const [classData, setClassData] = useState<GetClassResponse>();
	const [error, setError] = useState<any>();

	useEffect(() => {
		if (!networks) return;
		const fetchData = async () => {
			try {
				setClassData(
					await fetchClassDataByHash({
						classHash,
						includeSourceCode: true,
						rpcUrls: networks.map((n) => n.rpcUrl)
					})
				);
			} catch (error: any) {
				setError(error);
			}
		};

		fetchData();
	}, [classHash, networks]);

	return (
		<>
			<HeaderNav />
			<main className="overflow-y-auto flex-grow flex-col flex justify-between">
				<Container className="py-6">
					<div className="flex flex-row items-baseline justify-between">
						<h1 className="text-base font-medium leading-6 mt-4 mb-2 mr-2 flex flex-nowrap items-center">
							Class{' '}
							<CopyToClipboardElement
								value={classHash}
								toastDescription="The address has been copied."
								className="hidden lg:block p-0"
							>
								<AddressLink address={classHash}>{classHash}</AddressLink>
							</CopyToClipboardElement>
							<CopyToClipboardElement
								value={classHash}
								toastDescription="The address has been copied."
								className="lg:hidden p-0"
							>
								<AddressLink address={classHash}>{shortenHash(classHash)}</AddressLink>
							</CopyToClipboardElement>
						</h1>
					</div>
					{classData && <ClassDetails classData={classData} />}
					{classData ? (
						<ClassSourceCode
							isClassVerified={classData.verified}
							sourceCode={classData.sourceCode ?? {}}
							isContract={false}
						/>
					) : error ? (
						error.status === 500 ? (
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

function ClassDetails({ classData }: { classData: GetClassResponse }) {
	const { networks } = useSettings();

	const details: InfoBoxItem[] = [
		{
			name: 'Verified on Walnut',
			value: classData.verified.toString()
		}
	];

	if (classData.declaredSources.length > 0) {
		const declaredOnNetworks = [];
		for (const source of classData.declaredSources) {
			if (source.chainId) {
				declaredOnNetworks.push(source.chainId);
			} else {
				const networkInSettings = (networks ?? []).find(
					(network) => network.rpcUrl === source.rpcUrl
				);
				if (networkInSettings) {
					declaredOnNetworks.push(networkInSettings.networkName);
				} else {
					declaredOnNetworks.push(source.rpcUrl);
				}
			}
		}
		details.push({
			name: 'Declared on networks',
			value: declaredOnNetworks.join(', ')
		});
	}

	return (
		<div className="mt-4">
			<InfoBox details={details} />
		</div>
	);
}
