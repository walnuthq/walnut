'use client';

import { SimulateTransactionPage } from '@/components/simulate-transaction/simulate-transaction-page';
import { SimulationPayload, parseContractCalls } from '@/lib/utils';
import { useEffect, useState } from 'react';

export const runtime = 'edge';

export default function Page({
	searchParams
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const [simulationPayload, setSimulationPayload] = useState<SimulationPayload | undefined>(
		undefined
	);
	const [isDemo, setIsDemo] = useState<string | undefined>(undefined);
	const [txHash, setTxHash] = useState<string | undefined>(undefined);
	const [resolvedSearchParams, setResolvedSearchParams] = useState<
		{ [key: string]: string | string[] | undefined } | undefined
	>(undefined);

	useEffect(() => {
		if (searchParams) {
			searchParams.then(setResolvedSearchParams);
		}
	}, [searchParams]);

	useEffect(() => {
		if (resolvedSearchParams && Object.keys(resolvedSearchParams).length > 0) {
			const senderAddress = resolvedSearchParams.senderAddress as string;
			const calldata = resolvedSearchParams.calldata as string;
			const blockNumber = resolvedSearchParams.blockNumber as string;
			const transactionVersion = resolvedSearchParams.transactionVersion as string;
			const chainId = resolvedSearchParams.chainId as string;
			const nonce = resolvedSearchParams.nonce as string;
			const txHashParams = resolvedSearchParams.txHash as string;
			const demoParam = resolvedSearchParams.demo as string;

			if (txHashParams) {
				setTxHash(txHashParams);
			}

			if (demoParam) {
				setIsDemo(demoParam);
			}

			if (senderAddress && calldata && transactionVersion) {
				const [address, initialCalldata] = calldata.split(',');

				// const calls = parseContractCalls(parsedCalldata);
				const calls = [{ address, function_name: '', calldata: initialCalldata }];

				const payload: SimulationPayload = {
					senderAddress,
					calls,
					transactionVersion: parseInt(transactionVersion),
					chainId: chainId || undefined
				};

				if (blockNumber && !isNaN(+blockNumber)) {
					payload.blockNumber = parseInt(blockNumber);
				}

				if (nonce) {
					payload.nonce = parseInt(nonce);
				}

				setSimulationPayload(payload);
			}
		}
	}, [resolvedSearchParams]);

	return (
		<SimulateTransactionPage
			isDemo={isDemo}
			txHash={txHash}
			simulationPayload={simulationPayload}
			title={simulationPayload && 'Re-simulate'}
			description={
				simulationPayload &&
				'Edit the transaction details below and click “Run Simulation” to re-simulate.'
			}
		/>
	);
}
