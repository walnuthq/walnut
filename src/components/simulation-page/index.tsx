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
import { ServerError } from '../ui/server-error';
import { FetchError } from '@/lib/utils';
import {
	decodeCalldata,
	fetchABIFromInternalAPI,
	fetchABIFromSourcify
} from '@/lib/calldata-utils';

export function SimulationPage({
	simulationPayload
}: {
	simulationPayload?: SimulationPayloadWithCalldata;
}) {
	const [l2TransactionData, setL2TransactionData] = useState<L2TransactionData>();
	const [debuggerPayload, setDebuggerPayload] = useState<DebuggerPayload | null>(null);
	const [error, setError] = useState<FetchError | undefined>();
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const { trackingActive, trackingFlagLoaded } = useSettings();
	const router = useRouter();
	const { parseChain, getNetworkByRpcUrl } = useSettings();
	useEffect(() => {
		const fetchData = async () => {
			if (!simulationPayload) {
				setError({ message: 'Invalid simulation parameters' });
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
				// Extract error message and status from error
				const errorMessage = err?.message || err?.toString() || 'An error occurred';
				const errorStatus = err?.status || err?.response?.status || undefined;
				setError({
					message: errorMessage,
					status: errorStatus
				});
			} finally {
				setIsLoading(false);
			}
		};

		if (trackingFlagLoaded) {
			fetchData();
		}
	}, [simulationPayload, trackingActive, trackingFlagLoaded]);

	// Decode calldata when l2TransactionData is available
	useEffect(() => {
		const decodeAndLogCalldata = async () => {
			if (!l2TransactionData) return;

			try {
				// Get the first contract call to extract contract address
				const contractCallsMap = l2TransactionData.simulationResult?.contractCallsMap;
				if (!contractCallsMap || Object.keys(contractCallsMap).length === 0) {
					console.log('DECODED CALLDATA: No contract calls found');
					return;
				}

				// Get the first contract call
				const firstCallId = Object.keys(contractCallsMap)[0];
				const firstContractCall = contractCallsMap[firstCallId];
				const contractAddress = firstContractCall?.entryPoint?.codeAddress;

				// Get the first calldata from the array
				const rawCalldata = l2TransactionData.calldata?.[0];
				if (!rawCalldata || !rawCalldata.startsWith('0x')) {
					console.log('DECODED CALLDATA: No valid calldata found');
					return;
				}

				// Get chainId
				const chainId = l2TransactionData.chainId || simulationPayload?.chainId;
				if (!chainId) {
					console.log('DECODED CALLDATA: No chainId available');
					return;
				}

				// Try to fetch ABI from internal API first, then Sourcify
				let abi = null;
				if (contractAddress) {
					abi = await fetchABIFromInternalAPI(contractAddress, chainId);
					if (!abi) {
						abi = await fetchABIFromSourcify(contractAddress, chainId);
					}
				}

				// Decode calldata
				const decoded = await decodeCalldata(rawCalldata, contractAddress, abi || undefined);

				if (decoded) {
					console.log('DECODED CALLDATA:', {
						rawCalldata,
						contractAddress: contractAddress || 'Unknown',
						functionName: decoded.functionName,
						args: decoded.args,
						argsWithTypes: decoded.argsWithTypes,
						abi: abi ? 'Available' : 'Not available'
					});
				} else {
					console.log('DECODED CALLDATA: Failed to decode calldata');
				}
			} catch (error) {
				console.warn('Error decoding calldata:', error);
			}
		};

		decodeAndLogCalldata();
	}, [l2TransactionData, simulationPayload?.chainId]);

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
		// Show error if it exists (with or without status)
		const errorMessage = error.message || error.toString();
		content =
			error.status && error.status >= 500 && error.status < 600 ? (
				<ServerError message={errorMessage} />
			) : (
				<Error message={errorMessage} />
			);
	} else if (l2TransactionData) {
		content = (
			<>
				<div className="hidden md:block">
					<TransactionDetails transactionData={l2TransactionData} />
				</div>
				<CallTraceRoot transactionData={l2TransactionData} debuggerPayload={debuggerPayload} />
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
			// Use value from transactionData if available, otherwise from simulationPayload
			const valueToUse = l2TransactionData.value || simulationPayload?.value;
			if (valueToUse) params.set('value', valueToUse);
			// Include transactionIndexInBlock and totalTransactionsInBlock for precise re-simulation
			if (
				l2TransactionData.transactionIndexInBlock !== undefined &&
				l2TransactionData.transactionIndexInBlock !== null
			) {
				params.set('transactionIndexInBlock', l2TransactionData.transactionIndexInBlock.toString());
			}
			if (
				l2TransactionData.totalTransactionsInBlock !== undefined &&
				l2TransactionData.totalTransactionsInBlock !== null
			) {
				params.set(
					'totalTransactionsInBlock',
					l2TransactionData.totalTransactionsInBlock.toString()
				);
			}
			router.push(`/simulate-transaction?${params.toString()}`);
		} else if (simulationPayload) {
			const params = new URLSearchParams();
			params.set('senderAddress', simulationPayload.senderAddress);

			if (simulationPayload.calldata && simulationPayload.calldata.length > 0) {
				params.set('calldata', simulationPayload.calldata.join(','));
			}

			if (simulationPayload.transactionVersion)
				params.set('transactionVersion', simulationPayload.transactionVersion.toString());
			if (simulationPayload.blockNumber)
				params.set('blockNumber', simulationPayload.blockNumber.toString());
			if (simulationPayload?.chainId) params.set('chainId', simulationPayload.chainId);
			else if (simulationPayload?.rpcUrl) params.set('rpcUrl', simulationPayload.rpcUrl || '');
			if (simulationPayload.totalTransactionsInBlock)
				params.set(
					'totalTransactionsInBlock',
					simulationPayload.totalTransactionsInBlock.toString()
				);
			if (simulationPayload.value) params.set('value', simulationPayload.value.toString());
			if (simulationPayload.transactionIndexInBlock)
				params.set('transactionIndexInBlock', simulationPayload.transactionIndexInBlock.toString());

			router.push(`/simulate-transaction?${params.toString()}`);
		}
	};

	return (
		<>
			<HeaderNav />
			<main className="h-full flex flex-col overflow-hidden  short:overflow-scroll">
				<Container className="py-4 sm:py-6 lg:py-8 h-full flex flex-col short:min-h-[600px]">
					<div className="lg:flex flex-row items-baseline justify-between">
						<div className="flex flex-col gap-2 mt-4 mb-2 mr-2">
							<h1 className="text-base font-medium leading-6">
								<div className="flex flex-wrap items-center gap-2">
									<span>Transaction simulation</span>

									<div className="hidden md:block">
										{chainDetails && <NetworkBadge network={chainDetails} />}
									</div>
								</div>
							</h1>
						</div>
						<div className="flex md:hidden gap-2 justify-between">
							{chainDetails && <NetworkBadge network={chainDetails} />}
							<Button variant="outline" disabled={isLoading} onClick={handleReSimulateClick}>
								<PlayIcon className="h-4 w-4 mr-2" />
								Re-simulate
							</Button>
						</div>
						<div className="hidden md:flex gap-2">
							<Button variant="outline" disabled={isLoading} onClick={handleReSimulateClick}>
								<PlayIcon className="h-4 w-4 mr-2" /> Re-simulate
							</Button>
						</div>
					</div>
					<div className="flex-1 flex flex-col overflow-hidden min-h-0 ">{content}</div>
				</Container>
			</main>
			<div className="hidden md:block">
				{' '}
				<Footer />
			</div>
		</>
	);
}
