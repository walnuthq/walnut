import { ContractCall } from '@/lib/simulation';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ContractCallSignature } from './signature';
import { useSettings } from '@/lib/context/settings-context-provider';

const ErrorAlert = ({ contractCallError }: { contractCallError: ContractCall | undefined }) => {
	const errorDescription = contractCallError?.errorMessage;
	return (
		<Alert variant="compact" className="w-fit my-2 border-red-600 dark:text-white">
			<ExclamationTriangleIcon className="h-5 w-5 !text-red-600" color="red" />
			<AlertTitle className="!font-light">Error message: </AlertTitle>
			<AlertDescription>
				<span className="text-red-600">{errorDescription}</span> in{' '}
				{contractCallError && <ContractCallSignature contractCall={contractCallError} />}
			</AlertDescription>
		</Alert>
	);
};

export default ErrorAlert;
