'use client';

import { SimulateTransactionPage } from '@/components/simulate-transaction/simulate-transaction-page';
import { SimulationPayload, parseContractCalls } from '@/lib/utils';
import { useEffect, useState } from 'react';

export const runtime = 'edge';

export default function Page({
	searchParams
}: {
	searchParams?: { [key: string]: string | string[] | undefined };
}) {
	const [simulationPayload, setSimulationPayload] = useState<SimulationPayload | undefined>(
		undefined
	);
	const [txHash, setTxHash] = useState<string | undefined>(undefined);
	useEffect(() => {
		if (searchParams && Object.keys(searchParams).length > 0) {
			const senderAddress = searchParams.senderAddress as string;
			const calldata = searchParams.calldata as string;
			const blockNumber = searchParams.blockNumber as string;
			const transactionVersion = searchParams.transactionVersion as string;
			const chainId = searchParams.chainId as string;
			const rpcUrl = searchParams.rpcUrl as string;
			const nonce = searchParams.nonce as string;
			const txHashParams = searchParams.txHash as string;

			if (txHashParams) {
				setTxHash(txHashParams);
			}

			if ((chainId || rpcUrl) && senderAddress && calldata && transactionVersion) {
				const parsedCalldata = calldata.split(',');

				const calls = parseContractCalls(parsedCalldata);

				const payload: SimulationPayload = {
					senderAddress,
					calls,
					transactionVersion: parseInt(transactionVersion),
					chainId: chainId || undefined,
					rpcUrl: rpcUrl || undefined
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
	}, [searchParams]);

	return (
		<SimulateTransactionPage
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
