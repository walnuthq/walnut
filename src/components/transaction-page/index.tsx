'use client';

import { useEffect, useState } from 'react';
import { HeaderNav } from '../header';
import { Container } from '../ui/container';
import { Footer } from '../footer';
import { Loader } from '../ui/loader';
import {
	simulateCustomNetworkTransactionByHash,
	simulateTransactionByHash,
	TransactionSimulationResult,
	L1TransactionData,
	L2TransactionData
} from '@/lib/simulation';
import { shortenHash } from '@/lib/utils';
import { DebuggerPayload } from '@/lib/debugger';
import { TransactionDetails } from './l2-transaction-details';
import { L1TransactionDetails } from './l1-transaction-details';
import { ChainId } from '@/lib/types';
import { CallTraceRoot } from '@/components/call-trace';
import { Button } from '../ui/button';
import { PlayIcon, LinkIcon } from '@heroicons/react/24/outline';
import { Error } from '../ui/error';
import { useSettings } from '@/lib/context/settings-context-provider';
import CopyToClipboardElement from '../ui/copy-to-clipboard';
import { useUserContext } from '@/lib/context/user-context-provider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCacheWithTTL, setCacheWithTTL } from '@/lib/utils/cache-utils';
import AddressLink from '../address-link';
import { NetworkBadge } from '../ui/network-badge';
import { getDisplayNameForChainId } from '@/lib/networks';

export function TransactionPage({
	txHash,
	chainId,
	rpcUrl
}: {
	txHash: string;
	chainId?: ChainId;
	rpcUrl?: string;
}) {
	const [transactionSimulation, setTransactionSimulation] = useState<TransactionSimulationResult>();
	const [l1TransactionData, setL1TransactionData] = useState<L1TransactionData>();
	const [l2TransactionData, setL2TransactionData] = useState<L2TransactionData>();
	const [debuggerPayload, setDebuggerPayload] = useState<DebuggerPayload | null>(null);
	const { isLogged } = useUserContext();
	const [error, setError] = useState<string | undefined>();
	const { trackingActive, trackingFlagLoaded } = useSettings();
	const [l2TxHash, setL2TxHash] = useState<string>();
	const [l1TxHash, setL1TxHash] = useState<string | undefined>();
	const [l1TxHashShort, setL1TxHashShort] = useState<string | undefined>();
	const [l2TxHashShort, setL2TxHashShort] = useState<string>();
	const router = useRouter();
	const [showIO, setShowIO] = useState(false);
	const { getNetworkByRpcUrl, parseChain } = useSettings();
	useEffect(() => {
		const fetchData = async () => {
			try {
				const skipTracking = !trackingActive;
				const cacheKey = `${chainId || rpcUrl}:${txHash}`;
				const cached = getCacheWithTTL<TransactionSimulationResult>(cacheKey);

				if (cached) {
					setTransactionSimulation(cached);
					if (cached.l2TransactionData) {
						setL2TransactionData(cached.l2TransactionData);
						const l2 = cached.l2TransactionData;

						const debuggerPayload: DebuggerPayload = {
							chainId: l2.chainId ?? null,
							blockNumber: l2.blockNumber ?? null,
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
						if (l2.l2TxHash) {
							setL2TxHash(l2.l2TxHash);
							setL2TxHashShort(shortenHash(l2.l2TxHash));
						}
						if (l2.l1TxHash) {
							setL1TxHash(l2.l1TxHash);
							setL1TxHashShort(shortenHash(l2.l1TxHash));
						}
					} else if (cached.l1TransactionData) {
						setL1TransactionData(cached.l1TransactionData);
					}
					return;
				}

				if (!chainId) {
					setError('ChainId must be provided to simulate transaction');
					return;
				}

				let simulation: TransactionSimulationResult;

				// Prefer chain-based resolution; fallback to explicit rpcUrl if provided
				simulation = await simulateCustomNetworkTransactionByHash({
					txHash,
					chainKey: chainId,
					rpcUrl: rpcUrl,
					skipTracking
				});

				setCacheWithTTL(cacheKey, simulation);
				setTransactionSimulation(simulation);

				if (simulation.l2TransactionData) {
					setL2TransactionData(simulation.l2TransactionData);
					const l2 = simulation.l2TransactionData;

					const debuggerPayload: DebuggerPayload = {
						chainId: l2.chainId ?? null,
						blockNumber: l2.blockNumber ?? null,
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
					if (l2.l2TxHash) {
						setL2TxHash(l2.l2TxHash);
						setL2TxHashShort(shortenHash(l2.l2TxHash));
					}
					if (l2.l1TxHash) {
						setL1TxHash(l2.l1TxHash);
						setL1TxHashShort(shortenHash(l2.l1TxHash));
					}
				} else if (simulation.l1TransactionData) {
					setL1TransactionData(simulation.l1TransactionData);
				}
			} catch (error: any) {
				setError(error.toString());
			}
		};

		if (trackingFlagLoaded) {
			fetchData();
		}
	}, [chainId, txHash, rpcUrl, trackingFlagLoaded, trackingActive]);

	const handleReSimulateClick = () => {
		if (l2TransactionData) {
			const params = new URLSearchParams();
			params.set('txHash', txHash);
			params.set('senderAddress', l2TransactionData.senderAddress);

			if (l2TransactionData.calldata && l2TransactionData.calldata.length > 0) {
				params.set('calldata', l2TransactionData.calldata.join(','));
			}

			if (l2TransactionData.transactionVersion)
				params.set('transactionVersion', l2TransactionData.transactionVersion.toString());
			if (l2TransactionData.blockNumber)
				params.set('blockNumber', l2TransactionData.blockNumber.toString());
			if (chainId) params.set('chainId', chainId);
			router.push(`/simulate-transaction?${params.toString()}`);
		}
	};

	// Determine network for display - support both chainId and rpcUrl
	let network = null;
	if (rpcUrl) {
		network = getNetworkByRpcUrl(rpcUrl);
	} else if (chainId) {
		// Create network object from chainId for display purposes
		network = {
			networkName: getDisplayNameForChainId(chainId),
			rpcUrl: ''
		};
	}

	const chainDetails = chainId
		? parseChain(chainId)
		: network?.networkName
		? parseChain(network?.networkName)
		: l2TransactionData?.chainId
		? parseChain(l2TransactionData?.chainId)
		: undefined;

	return (
		<>
			<HeaderNav />
			<main className="h-full flex flex-col overflow-hidden short:overflow-scroll">
				<Container className="py-4 sm:py-6 lg:py-8 h-full flex flex-col short:min-h-[600px]">
					{l2TransactionData ? (
						<>
							{/* === L2 Transaction === */}
							<div className="lg:flex flex-row items-baseline justify-between">
								<div className="flex flex-col gap-2 mt-4 mb-2 mr-2">
									{l2TxHash && (
										<h1 className="text-base font-medium leading-6 flex flex-nowrap items-center">
											Transaction{' '}
											<CopyToClipboardElement
												value={l2TxHash}
												toastDescription="The address has been copied."
												className="hidden lg:block p-0"
											>
												<AddressLink address={l2TxHash}>{l2TxHash}</AddressLink>
											</CopyToClipboardElement>
											<CopyToClipboardElement
												value={l2TxHash}
												toastDescription="The address has been copied."
												className="lg:hidden p-0"
											>
												<AddressLink address={l2TxHash}>{l2TxHashShort}</AddressLink>
											</CopyToClipboardElement>
											{chainDetails && <NetworkBadge network={chainDetails} />}
										</h1>
									)}
									{l1TxHash && (
										<h2 className="text-base leading-6 flex flex-nowrap items-center">
											Corresponding L1 Transaction{' '}
											<CopyToClipboardElement
												value={l1TxHash}
												toastDescription="The address has been copied."
												className="hidden lg:block p-0"
											>
												{l1TxHash}
											</CopyToClipboardElement>
											<CopyToClipboardElement
												value={l1TxHash}
												toastDescription="The address has been copied."
												className="lg:hidden p-0"
											>
												{l1TxHashShort}
											</CopyToClipboardElement>
											{chainDetails && <NetworkBadge network={chainDetails} />}
										</h2>
									)}
								</div>
								{isLogged ? (
									<Button
										onClick={handleReSimulateClick}
										variant="outline"
										disabled={l2TransactionData.transactionType !== 'INVOKE'}
									>
										<PlayIcon className="h-4 w-4 mr-2" /> Re-simulate
									</Button>
								) : (
									<Link href="/login">
										<Button variant="outline">
											<PlayIcon className="mr-2 h-4 w-4" /> Re-simulate transaction
										</Button>
									</Link>
								)}
							</div>
							<TransactionDetails transactionData={l2TransactionData} rpcUrl={rpcUrl} />
							<CallTraceRoot
								simulationResult={l2TransactionData.simulationResult}
								l2Flamegraph={l2TransactionData.flamechart}
								l1DataFlamegraph={l2TransactionData.l1DataFlamechart}
								debuggerPayload={debuggerPayload}
							/>
						</>
					) : l1TransactionData ? (
						<>
							{/* === L1 Transaction Dat === */}
							<div className="lg:flex flex-row items-baseline justify-between">
								<div className="flex flex-col gap-2 mt-4 mb-2 mr-2">
									{l1TransactionData.l1TxHash && (
										<h1 className="text-base font-medium leading-6 flex flex-nowrap items-center">
											L1 Transaction{' '}
											<CopyToClipboardElement
												value={l1TransactionData.l1TxHash}
												toastDescription="The address has been copied."
												className="hidden lg:block"
											>
												{l1TransactionData.l1TxHash}
											</CopyToClipboardElement>
											<CopyToClipboardElement
												value={l1TransactionData.l1TxHash}
												toastDescription="The address has been copied."
												className="lg:hidden"
											>
												{shortenHash(l1TransactionData.l1TxHash)}
											</CopyToClipboardElement>
											{chainDetails && <NetworkBadge network={chainDetails} />}
										</h1>
									)}
								</div>
								{isLogged ? (
									<Button onClick={handleReSimulateClick} variant="outline" disabled>
										<PlayIcon className="h-4 w-4 mr-2" /> Re-simulate
									</Button>
								) : (
									<Link href="/login">
										<Button variant="outline">
											<PlayIcon className="mr-2 h-4 w-4" /> Re-simulate transaction
										</Button>
									</Link>
								)}
							</div>
							<L1TransactionDetails transactionData={l1TransactionData} rpcUrl={rpcUrl} />
							{l1TransactionData.messageHashes && l1TransactionData.messageHashes.length > 0 && (
								<div className="mt-4">
									<div className="rounded-xl border bg-card">
										<div className="p-4">
											<h3 className="text-sm mb-2">
												Cross-Chain Source: Transactions on the Source Chain
											</h3>
											<p className="text-muted-foreground text-[0.7rem] mb-2">
												{l1TransactionData.messageHashes.length > 1
													? `This L1 transaction was triggered by ${l1TransactionData.messageHashes.length} messages sent from the Source Chain.`
													: 'This L1 transaction was triggered by a message sent from the Source Chain.'}
											</p>
											<div className="flex flex-col gap-1 text-xs">
												{l1TransactionData.messageHashes.map((hash, index) => {
													const isSepolia = l1TransactionData.chainId
														?.toLowerCase()
														.includes('sepolia');
													const voyagerUrl = isSepolia
														? `https://sepolia.voyager.online/message/${hash}`
														: `https://voyager.online/message/${hash}`;

													return (
														<div
															key={index}
															className="flex items-baseline gap-2 whitespace-nowrap"
														>
															{l1TransactionData.messageHashes.length > 1 && (
																<span className="text-muted-foreground">Message {index + 1}:</span>
															)}
															<div className="flex items-center gap-1">
																<CopyToClipboardElement
																	value={hash}
																	toastDescription="Message hash copied"
																	className="font-mono cursor-pointer rounded-sm py-1 px-0"
																>
																	<AddressLink address={hash}>
																		<span className="hidden lg:inline">{hash}</span>
																		<span className="lg:hidden">{shortenHash(hash)}</span>
																	</AddressLink>
																</CopyToClipboardElement>
																<a
																	href={voyagerUrl}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="font-bold text-lg underline "
																	title="View on Voyager"
																>
																	<LinkIcon className="h-4 w-4" />
																</a>
															</div>
														</div>
													);
												})}
											</div>
										</div>
									</div>
								</div>
							)}
						</>
					) : error ? (
						<Error message={error} />
					) : (
						<>
							<div className="lg:flex flex-row items-baseline justify-between">
								<div className="flex flex-col gap-2 mt-4 mb-2 mr-2">
									<h1 className="text-base font-medium leading-6 flex flex-nowrap items-center">
										Transaction{' '}
										<CopyToClipboardElement
											value={txHash}
											toastDescription="The address has been copied."
											className="hidden lg:block p-0"
										>
											<AddressLink address={txHash}>{txHash}</AddressLink>
										</CopyToClipboardElement>
										<CopyToClipboardElement
											value={txHash}
											toastDescription="The address has been copied."
											className="lg:hidden p-0"
										>
											<AddressLink address={txHash}>{shortenHash(txHash)}</AddressLink>
										</CopyToClipboardElement>
										{chainDetails && <NetworkBadge network={chainDetails} />}
									</h1>
								</div>
								<Button variant="outline" disabled>
									<PlayIcon className="h-4 w-4 mr-2" /> Re-simulate
								</Button>
							</div>
							<Loader />
						</>
					)}
				</Container>
			</main>
			<Footer />
		</>
	);
}
