import { SimulateTransactionPage } from '@/components/simulate-transaction/simulate-transaction-page';
import { SimulationPayload, parseContractCalls } from '@/lib/utils';

export const runtime = 'edge';

export default async function Page({
	searchParams
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	let simulationPayload: SimulationPayload | undefined = undefined;
	let isDemo: string | undefined = undefined;
	let txHash: string | undefined = undefined;

	if (searchParams) {
		const resolvedSearchParams = await searchParams;

		if (Object.keys(resolvedSearchParams).length > 0) {
			const senderAddress = resolvedSearchParams.senderAddress as string;
			const calldata = resolvedSearchParams.calldata as string;
			const blockNumber = resolvedSearchParams.blockNumber as string;
			const transactionVersion = resolvedSearchParams.transactionVersion as string;
			const chainId = resolvedSearchParams.chainId as string;
			const nonce = resolvedSearchParams.nonce as string;
			const value = resolvedSearchParams.value as string;
			const txHashParams = resolvedSearchParams.txHash as string;
			const demoParam = resolvedSearchParams.demo as string;

			if (txHashParams) {
				txHash = txHashParams;
			}

			if (demoParam) {
				isDemo = demoParam;
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

				if (value) {
					payload.value = value;
				}

				simulationPayload = payload;
			}
		}
	}

	return (
		<SimulateTransactionPage
			isDemo={isDemo}
			txHash={txHash}
			simulationPayload={simulationPayload}
			title={simulationPayload && 'Re-simulate'}
			description={
				simulationPayload &&
				'Edit the transaction details below and click "Run Simulation" to re-simulate.'
			}
		/>
	);
}
