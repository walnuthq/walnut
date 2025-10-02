'use client';

import { useEffect, useState } from 'react';
import { SimulationPayloadWithCalldata, L2TransactionData } from '@/lib/simulation';
import { DebuggerPayload } from '@/lib/debugger';

import { useSettings } from '@/lib/context/settings-context-provider';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/ui/loader';
import { TransactionDetails } from '@/components/transaction-page/l2-transaction-details';
import { CallTraceRoot } from '../root';
import { HeaderNav } from '@/components/header';
import { Container } from '@/components/ui/container';
import { NetworkBadge } from '@/components/ui/network-badge';
import { Button } from '@/components/ui/button';
import { PlayIcon } from 'lucide-react';
import { Footer } from '@/components/footer';

import simulationData from '@/lib/utils/demo_data/simulation_response.json';

export function SimulationPage({
	simulationPayload
}: {
	simulationPayload?: SimulationPayloadWithCalldata;
}) {
	const [l2TransactionData, setL2TransactionData] = useState<L2TransactionData>();
	const [debuggerPayload, setDebuggerPayload] = useState<DebuggerPayload | null>(null);
	const [error, setError] = useState<string | undefined>();
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();
	const { parseChain, getNetworkByRpcUrl } = useSettings();

	useEffect(() => {
		const minLoadingTime = setTimeout(() => {
			setIsLoading(false);
		}, 3000);

		try {
			const data = simulationData as any;

			if (data?.l2TransactionData) {
				const l2Data = data.l2TransactionData as L2TransactionData;
				setL2TransactionData(l2Data);

				const payload: DebuggerPayload = {
					chainId: l2Data.chainId ?? null,
					blockNumber: l2Data.blockNumber ?? null,
					blockTimestamp: l2Data.blockTimestamp,
					nonce: l2Data.nonce,
					senderAddress: l2Data.senderAddress,
					calldata: l2Data.calldata,
					transactionVersion: l2Data.transactionVersion,
					transactionType: l2Data.transactionType,
					transactionIndexInBlock: l2Data.transactionIndexInBlock ?? null,
					totalTransactionsInBlock: l2Data.totalTransactionsInBlock ?? null,
					l1TxHash: l2Data.l1TxHash ?? null,
					l2TxHash: l2Data.l2TxHash ?? null
				};
				setDebuggerPayload(payload);
			}
		} catch (e: any) {
			setError(e?.message || String(e));
		}

		return () => clearTimeout(minLoadingTime);
	}, []);

	const network = simulationPayload?.rpcUrl ? getNetworkByRpcUrl(simulationPayload?.rpcUrl) : null;
	const chainDetails = network?.networkName
		? parseChain(network?.networkName)
		: simulationPayload?.chainId
		? parseChain(simulationPayload?.chainId)
		: undefined;

	let content = null;
	if (isLoading) {
		content = <Loader />;
	} else if (error) {
		// content = <Error message={error} />;
	} else if (l2TransactionData) {
		content = (
			<>
				<TransactionDetails transactionData={l2TransactionData} />
				<CallTraceRoot
					simulationResult={l2TransactionData.simulationResult}
					l2Flamegraph={l2TransactionData?.flamechart}
					l1DataFlamegraph={l2TransactionData?.l1DataFlamechart}
					debuggerPayload={debuggerPayload}
				/>
			</>
		);
	}

	const handleReSimulateClick = () => {
		if (l2TransactionData) {
			const params = new URLSearchParams();
			params.set('senderAddress', l2TransactionData.senderAddress);

			if (l2TransactionData.calldata && l2TransactionData.calldata.length > 0) {
				params.set('calldata', l2TransactionData.calldata.join(','));
			}

			if (l2TransactionData.transactionVersion)
				params.set('transactionVersion', l2TransactionData.transactionVersion.toString());
			if (l2TransactionData.blockNumber)
				params.set('blockNumber', l2TransactionData.blockNumber.toString());
			if (simulationPayload?.chainId) params.set('chainId', simulationPayload.chainId);
			router.push(`/simulate-transaction?${params.toString()}`);
		}
	};

	return (
		<>
			<HeaderNav />
			<main className="h-full flex flex-col overflow-hidden  short:overflow-scroll">
				<Container className="py-4 sm:py-6 lg:py-8 h-full flex flex-col short:min-h-[600px]">
					<div className="flex flex-col md:flex-row gap-2 mt-4 mb-2 items-baseline justify-between flex-none">
						<h1 className="text-xl font-medium leading-6 mb-2">
							Transaction simulation {chainDetails && <NetworkBadge network={chainDetails} />}
						</h1>
						<Button
							variant="outline"
							disabled={!l2TransactionData}
							className="w-fit"
							onClick={handleReSimulateClick}
						>
							<PlayIcon className="h-4 w-4" /> Re-simulate
						</Button>
					</div>
					<div className="flex-1 flex flex-col overflow-hidden min-h-0 ">{content}</div>
				</Container>
			</main>
			<Footer />
		</>
	);
}
