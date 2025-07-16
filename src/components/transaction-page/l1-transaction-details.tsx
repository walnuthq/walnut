import { useSettings } from '@/lib/context/settings-context-provider';
import { InfoBox, InfoBoxItem } from '../ui/info-box';
import { L1TransactionData } from '@/lib/simulation';

export function L1TransactionDetails({
	transactionData,
	rpcUrl
}: {
	transactionData: L1TransactionData;
	rpcUrl?: string;
}) {
	const { getNetworkByRpcUrl } = useSettings();
	let details: InfoBoxItem[] = [];

	// 1. Transaction Type (always first)
	if (transactionData.transactionType) {
		details.push({
			name: 'Transaction Type',
			value: <span className="text-variable">{transactionData.transactionType}</span>,
			isCopyable: true
		});
	}

	// 2. Execution Status
	if (transactionData.status) {
		details.push({
			name: 'Execution status',
			value: (
				<span
					className={transactionData.status === 'SUCCEEDED' ? 'text-classGreen ' : 'text-red-600'}
				>
					{transactionData.status}
				</span>
			)
		});
	}

	// 3. Network details
	if (rpcUrl) {
		const network = getNetworkByRpcUrl(rpcUrl);
		if (network) {
			details.push({
				name: 'Custom Network',
				value: network.networkName
			});
		}
		details.push({
			name: 'RPC URL',
			value: rpcUrl
		});
	}

	// 4. Chain and Block info
	if (transactionData.chainId) {
		details.push({
			name: 'Chain',
			value: transactionData.chainId
		});
	}

	if (transactionData.blockNumber) {
		details.push({
			name: 'Block',
			value: transactionData.blockNumber.toString(),
			isCopyable: true
		});
	}

	// 5. Addresses
	if (transactionData.senderAddress) {
		details.push({
			name: 'Sender',
			value: transactionData.senderAddress,
			isCopyable: true
		});
	}

	if (transactionData.receiverAddress) {
		details.push({
			name: 'Receiver',
			value: transactionData.receiverAddress,
			isCopyable: true
		});
	}

	return (
		<div className="mt-4">
			<InfoBox details={details} />
		</div>
	);
}
