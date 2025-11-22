import { useSettings } from '@/lib/context/settings-context-provider';
import { formatTimestampToUTC } from '@/lib/utils';
import { InfoBox, InfoBoxItem } from '../ui/info-box';
import { L2TransactionData } from '@/lib/simulation';
import { chain } from 'lodash';

export function TransactionDetails({
	transactionData,
	rpcUrl,
	isDemo
}: {
	transactionData: L2TransactionData;
	rpcUrl?: string;
	isDemo?: boolean;
}) {
	const { getNetworkByRpcUrl } = useSettings();
	let details: InfoBoxItem[] = [];

	// 1. Transaction Type (always first)
	/* if (transactionData.transactionType) {
		details.push({
			name: 'Transaction Type',
			value: <span className="text-variable">{transactionData.transactionType}</span>,
			isCopyable: true
		});
	} */

	// 2. Execution Status
	if (transactionData.simulationResult.executionResult.executionStatus === 'SUCCEEDED') {
		details.push({
			name: 'Execution status',
			value: (
				<span className="text-classGreen ">
					{transactionData.simulationResult.executionResult.executionStatus}
				</span>
			)
		});
	} else {
		details.push({
			name: 'Execution status',
			value: (
				<span className="text-red-600">
					{transactionData.simulationResult.executionResult.executionStatus}: &quot;
					{transactionData.simulationResult.executionResult.revertReason}&quot;
				</span>
			)
		});
	}

	// 3. Network details
	// if (rpcUrl) {
	// 	const network = getNetworkByRpcUrl(rpcUrl);
	// 	if (network) {
	// 		details.push({
	// 			name: 'Custom Network',
	// 			value: network.networkName
	// 		});
	// 	}
	// 	details.push({
	// 		name: 'RPC URL',
	// 		value: rpcUrl
	// 	});
	// }

	// 4. Chain and Block info
	if (transactionData.chainId) {
		details.push({
			name: 'Chain',
			value: transactionData.chainId
		});
	}

	if (transactionData.blockNumber) {
		const isSimulatedRevert =
			transactionData.simulationResult &&
			transactionData.simulationResult.executionResult.executionStatus === 'REVERTED' &&
			transactionData.l1TxHash;

		details.push({
			name: isSimulatedRevert ? 'Simulated at block' : 'Block',
			value: transactionData.blockNumber.toString(),
			isCopyable: true
		});
	}

	// 5. Position in block
	if (
		transactionData.transactionIndexInBlock !== undefined &&
		transactionData.transactionIndexInBlock !== null &&
		transactionData.totalTransactionsInBlock
	) {
		if (isDemo) {
			details.push({
				name: 'Position in block',
				value: `1st of 2`
			});
		} else {
			const index = transactionData.transactionIndexInBlock + 1;
			const suffix =
				index % 100 >= 11 && index % 100 <= 13
					? 'th'
					: index % 10 === 1
					? 'st'
					: index % 10 === 2
					? 'nd'
					: index % 10 === 3
					? 'rd'
					: 'th';

			details.push({
				name: 'Position in block',
				value: `${index}${suffix} out of ${transactionData.totalTransactionsInBlock}`
			});
		}
	}

	// 6. Timestamp
	if (transactionData.blockTimestamp) {
		if (isDemo)
			details.push({
				name: 'Timestamp',
				value: '19 Aug 2025'
			});
		else
			details.push({
				name: 'Timestamp',
				value: formatTimestampToUTC(transactionData.blockTimestamp)
			});
	}

	// 7. Addresses
	if (transactionData.senderAddress) {
		details.push({
			name: 'Sender',
			value: transactionData.senderAddress,
			isCopyable: true
		});
	}

	// 8. Transaction details
	if (transactionData.nonce) {
		details.push({
			name: 'Nonce',
			value: transactionData.nonce.toString()
		});
	}

	// 9. Value
	if (transactionData.value) {
		const valueNum = BigInt(transactionData.value);
		const ethValue = Number(valueNum) / 1e18;
		const formatter = new Intl.NumberFormat(navigator.language, {
			maximumFractionDigits: 6
		});
		details.push({
			name: 'Value',
			value:
				valueNum === BigInt(0)
					? '0'
					: `${formatter.format(ethValue)} ETH (${transactionData.value} wei)`,
			isCopyable: true
		});
	}

	// 9. Transaction version
	/* if (transactionData.transactionVersion) {
		details.push({
			name: 'Transaction Version',
			value: transactionData.transactionVersion.toString()
		});
	} */

	// 10. Fee
	if (transactionData.actualFee) {
		details.push({
			name: 'Actual Fee',
			value: transactionData.actualFee
		});
	} else if (transactionData.simulationResult.estimatedFee) {
		details.push({
			name: 'Estimated Fee',
			value: transactionData.simulationResult.estimatedFee
		});
	}

	// 11. Execution Resources
	if (
		transactionData.executionResources &&
		!(
			transactionData.executionResources.l1Gas === 0 &&
			transactionData.executionResources.l1DataGas === 0 &&
			transactionData.executionResources.l2Gas === 0
		)
	) {
		const { l1Gas, l1DataGas, l2Gas } = transactionData.executionResources;
		const formatter = new Intl.NumberFormat(navigator.language);
		details.push({
			name: 'L1 Gas',
			value: formatter.format(l1Gas)
		});
		details.push({
			name: 'L1 Data Gas',
			value: formatter.format(l1DataGas)
		});
		details.push({
			name: 'L2 Gas',
			value: formatter.format(l2Gas)
		});
	}

	return (
		<div className="mt-4">
			<InfoBox details={details} />
		</div>
	);
}
