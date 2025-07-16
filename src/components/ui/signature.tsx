import { ContractCall } from '@/lib/simulation';
import { getContractName, shortenHash } from '@/lib/utils';
import AddressLink from '../address-link';

export function ContractCallSignature({
	contractCall,
	displayContractName = true,
	displayFunctionName = true,
	variant = 'trace-line'
}: {
	contractCall: ContractCall;
	displayContractName?: boolean;
	displayFunctionName?: boolean;
	variant?: 'trace-line' | 'search-result';
}) {
	const contractName = getContractName({ contractCall });
	return (
		<>
			{displayContractName && (
				<AddressLink
					address={contractCall?.entryPoint.storageAddress}
					addressClassName={`${variant === 'search-result' ? '' : 'text-classGreen'}`}
				>
					{contractName}
				</AddressLink>
			)}
			{displayFunctionName && (
				<>
					{displayContractName && displayFunctionName && <> {'.'}</>}

					<span className={`${variant === 'search-result' ? '' : 'text-function_purple'}`}>
						{contractCall?.entryPointName ??
							shortenHash(contractCall.entryPoint.entryPointSelector, 13)}
					</span>
				</>
			)}
		</>
	);
}
