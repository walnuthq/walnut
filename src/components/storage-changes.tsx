import { useCallTrace } from '@/lib/context/call-trace-context-provider';
import { shortenHash } from '@/lib/utils';
import React, { useMemo } from 'react';
import CopyToClipboardElement from './ui/copy-to-clipboard';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AddressLink from './address-link';

interface StorageChangesProps {
	// Define your props here if needed
}

const StorageChanges: React.FC<StorageChangesProps> = (props) => {
	const { simulationResult, contractCallsMap } = useCallTrace();

	const storageChanges = useMemo(() => {
		const combined: Record<
			string,
			{
				contractName?: string;
				storageChanges: Record<string, string[]>;
			}
		> = {};
		for (const [contractCallId, storageChanges] of Object.entries(
			simulationResult.storageChanges
		)) {
			const call = contractCallsMap[parseInt(contractCallId)];
			const contractAddress = call.entryPoint.codeAddress;
			if (!combined[contractAddress]) {
				let contractName: string | undefined = undefined;
				if (call.contractName) {
					contractName = call.contractName;
				} else if (call.erc20TokenName || call.erc20TokenSymbol) {
					contractName = [call.erc20TokenName, `(${call.erc20TokenSymbol})`].join(' ');
				} else if (call.entryPointInterfaceName) {
					contractName = call.entryPointInterfaceName.split('::').pop();
				}

				// if (!contractName) {
				// 	contractName = shortenHash(call.entryPoint.storageAddress, 13);
				// }
				combined[contractAddress] = {
					contractName,
					storageChanges: {}
				};
			}
			Object.assign(combined[contractAddress].storageChanges, storageChanges);
		}
		return combined;
	}, [contractCallsMap, simulationResult.storageChanges]);

	if (Object.entries(storageChanges).length > 0) {
		return (
			<div className="flex flex-col gap-4 p-4">
				{Object.entries(storageChanges).map(
					([contractAddress, { contractName, storageChanges }]) => {
						return (
							<div key={contractAddress} className="flex flex-col border-b pb-4 gap-1">
								<div className="flex flex-row items-baseline gap-2">
									{contractName ? (
										<>
											<a
												href={`/contracts/${contractAddress}`}
												className="font-bold text-lg underline"
											>
												<AddressLink address={contractAddress}>{contractName}</AddressLink>
											</a>
											<CopyToClipboardElement
												className="font-mono text-gray-400"
												toastDescription="The address has been copied."
												value={contractAddress}
											>
												<AddressLink address={contractAddress}>
													{shortenHash(contractAddress, 13)}
												</AddressLink>
											</CopyToClipboardElement>
										</>
									) : (
										<>
											<span className="font-bold text-lg">Contract address:</span>

											<AddressLink address={contractAddress} addressClassName="font-mono">
												{shortenHash(contractAddress, 13)}
											</AddressLink>
										</>
									)}
								</div>
								<div className="flex flex-col gap-2">
									{Object.entries(storageChanges).map(([storageAddress, [before, after]]) => (
										<div key={storageAddress} className="flex flex-col gap-1">
											<div className="flex flex-row items-center gap-2">
												<span className="text-gray-400">Key:</span>
												<CopyToClipboardElement
													className="font-mono"
													toastDescription="The key has been copied."
													value={storageAddress}
												>
													<AddressLink address={storageAddress} addressClassName="font-mono">
														{storageAddress}
													</AddressLink>
												</CopyToClipboardElement>
											</div>
											<div className="flex flex-col pl-4">
												<div className="flex flex-row gap-2">
													<span className="text-gray-400">Before:</span>
													<span className="font-mono">{before}</span>
												</div>
												<div className="flex flex-row gap-2">
													<span className="text-gray-400">After:</span>
													<span className="font-mono">{after}</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						);
					}
				)}
			</div>
		);
	} else {
		return (
			<Alert className="m-4 w-fit">
				<ExclamationTriangleIcon className="h-5 w-5" />
				<AlertTitle>No storage changes.</AlertTitle>
				<AlertDescription>No contract storage changes in this transaction.</AlertDescription>
			</Alert>
		);
	}
};

export default StorageChanges;
