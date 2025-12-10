'use client';

import { getDisplayNameForChainId } from '@/lib/networks';
import { ChainId } from '@/lib/types';
import AddressLink from '@/components/address-link';
import { Footer } from '@/components/footer';
import { HeaderNav } from '@/components/header';
import { L1TransactionDetails } from '@/components/transaction-page/l1-transaction-details';
import { TransactionDetails } from '@/components/transaction-page/l2-transaction-details';
import { Button } from '@/components/ui/button';
import CopyToClipboardElement from '@/components/ui/copy-to-clipboard';
import { NetworkBadge } from '@/components/ui/network-badge';
import { useSettings } from '@/lib/context/settings-context-provider';
import { useUserContext } from '@/lib/context/user-context-provider';
import { DebuggerPayload } from '@/lib/debugger';
import {
	TransactionSimulationResult,
	L1TransactionData,
	L2TransactionData
} from '@/lib/simulation';
import { shortenHash } from '@/lib/utils';

import { Container } from '@/components/ui/container';
import { Loader } from '@/components/ui/loader';
import Link from 'next/link';
import { PlayIcon, LinkIcon } from '@heroicons/react/24/outline';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import responseData from '@/lib/utils/demo_data/reverted_response.json';
import { CallTraceRoot } from './root';

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
	const [l2TxHash, setL2TxHash] = useState<string>();
	const [l1TxHash, setL1TxHash] = useState<string | undefined>();
	const [l1TxHashShort, setL1TxHashShort] = useState<string | undefined>();
	const [l2TxHashShort, setL2TxHashShort] = useState<string>();
	const router = useRouter();
	const { getNetworkByRpcUrl, parseChain } = useSettings();

	useEffect(() => {
		try {
			const data = responseData as unknown as TransactionSimulationResult;

			if ((data as any)?.l2TransactionData) {
				const l2Data = (data as any).l2TransactionData as L2TransactionData;

				setTransactionSimulation({ l2TransactionData: l2Data });
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

				if (l2Data.l2TxHash) {
					setL2TxHash(l2Data.l2TxHash);
					setL2TxHashShort(shortenHash(l2Data.l2TxHash));
				}
				if (l2Data.l1TxHash) {
					setL1TxHash(l2Data.l1TxHash);
					setL1TxHashShort(shortenHash(l2Data.l1TxHash));
				}
			} else if ((data as any)?.l1TransactionData) {
				const l1Data = (data as any).l1TransactionData as L1TransactionData;
				setTransactionSimulation({ l1TransactionData: l1Data });
				setL1TransactionData(l1Data);
			}
		} catch (e: any) {
			setError(e?.message || String(e));
		}
	}, [txHash]);

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
			params.set('demo', 'true');
			router.push(`/simulate-transaction?${params.toString()}`);
		}
	};

	let network = null;
	if (rpcUrl) {
		network = getNetworkByRpcUrl(rpcUrl);
	} else if (chainId) {
		network = { networkName: getDisplayNameForChainId(chainId), rpcUrl: '' };
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
											{<NetworkBadge network={{ stack: 'Arbitrum', chain: 'One' }} />}
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
										// disabled={l2TransactionData.transactionType !== 'INVOKE'}
										disabled
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

							<TransactionDetails transactionData={l2TransactionData} rpcUrl={rpcUrl} isDemo />

							<CallTraceRoot
								simulationResult={l2TransactionData.simulationResult}
								l2Flamegraph={l2TransactionData.flamechart}
								l1DataFlamegraph={l2TransactionData.l1DataFlamechart}
								debuggerPayload={debuggerPayload}
							/>
						</>
					) : l1TransactionData ? (
						<>
							{/* === L1 Transaction === */}
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
						<></>
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
