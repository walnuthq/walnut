'use client';

import { HeaderNav } from '../header';
import { Container } from '../ui/container';
import { Footer } from '../footer';
import { useEffect, useState } from 'react';
import {
	simulateTransactionByData,
	SimulationPayloadWithCalldata,
	TransactionSimulationResult,
	L2TransactionData
} from '@/lib/simulation';
import { DebuggerPayload } from '@/lib/debugger';
import { Button } from '../ui/button';
import { PlayIcon } from '@heroicons/react/24/outline';
import { TransactionDetails } from '../transaction-page/l2-transaction-details';
import { CallTraceRoot } from '../call-trace';
import { Loader } from '../ui/loader';
import { Error } from '../ui/error';
import { useSettings } from '@/lib/context/settings-context-provider';
import { useRouter } from 'next/navigation';
import { getCacheWithTTL, safeStringify, setCacheWithTTL } from '@/lib/utils/cache-utils';
import { NetworkBadge } from '../ui/network-badge';
export function SimulationPage({
	simulationPayload
}: {
	simulationPayload?: SimulationPayloadWithCalldata;
}) {
	const [l2TransactionData, setL2TransactionData] = useState<L2TransactionData>();
	const [debuggerPayload, setDebuggerPayload] = useState<DebuggerPayload | null>(null);
	const [error, setError] = useState<string | undefined>();
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const { trackingActive, trackingFlagLoaded } = useSettings();
	const router = useRouter();
	const { parseChain, getNetworkByRpcUrl } = useSettings();
	useEffect(() => {
		const fetchData = async () => {
			if (!simulationPayload) {
				setError('Invalid simulation parameters');
				return;
			}

			try {
				setIsLoading(true);
				const skipTracking = !trackingActive;

				const cacheKey = `simulation:${safeStringify(simulationPayload)}`;
				const cached = getCacheWithTTL<TransactionSimulationResult>(cacheKey);
				if (cached) {
					if (cached.l2TransactionData) {
						setL2TransactionData(cached.l2TransactionData);
						const l2 = cached.l2TransactionData;
						const debuggerPayload: DebuggerPayload = {
							chainId: l2.chainId ?? null,
							blockNumber: l2.blockNumber.toString() === 'Latest' ? null : l2.blockNumber,
							blockTimestamp: l2.blockTimestamp,
							nonce: l2.nonce,
							senderAddress: l2.senderAddress,
							calldata: l2.calldata,
							transactionVersion: l2.transactionVersion,
							transactionType: l2.transactionType,
							transactionIndexInBlock: l2.transactionIndexInBlock ?? null,
							totalTransactionsInBlock: l2.totalTransactionsInBlock ?? null,
							l1TxHash: l2.l1TxHash ?? null,
							l2TxHash: l2.l2TxHash ?? null
						};
						setDebuggerPayload(debuggerPayload);
					}
					setIsLoading(false);
					return;
				}

				const simulation = await simulateTransactionByData(simulationPayload, skipTracking);
				setCacheWithTTL(cacheKey, simulation);

				if (simulation.l2TransactionData) {
					setL2TransactionData(simulation.l2TransactionData);
					const l2 = simulation.l2TransactionData;
					const debuggerPayload: DebuggerPayload = {
						chainId: l2.chainId ?? null,
						blockNumber: l2.blockNumber.toString() === 'Latest' ? null : l2.blockNumber,
						blockTimestamp: l2.blockTimestamp,
						nonce: l2.nonce,
						senderAddress: l2.senderAddress,
						calldata: l2.calldata,
						transactionVersion: l2.transactionVersion,
						transactionType: l2.transactionType,
						transactionIndexInBlock: l2.transactionIndexInBlock ?? null,
						totalTransactionsInBlock: l2.totalTransactionsInBlock ?? null,
						l1TxHash: l2.l1TxHash ?? null,
						l2TxHash: l2.l2TxHash ?? null
					};
					setDebuggerPayload(debuggerPayload);
				}
			} catch (err: any) {
				setError(err.toString());
			} finally {
				setIsLoading(false);
			}
		};

		if (trackingFlagLoaded) {
			fetchData();
		}
	}, [simulationPayload, trackingActive, trackingFlagLoaded]);
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
		content = <Error message={error} />;
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
							disabled={isLoading}
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
