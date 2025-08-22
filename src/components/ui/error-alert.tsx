import { ContractCall, FunctionCall } from '@/lib/simulation';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ContractCallSignature } from './signature';
import { FnName } from './function-name';

const ErrorAlert = ({ callError }: { callError: ContractCall | FunctionCall | undefined }) => {
	const errorDescription = callError?.errorMessage;
	return (
		<Alert variant="compact" className="w-fit my-2 border-red-600 dark:text-white">
			<ExclamationTriangleIcon className="h-5 w-5 !text-red-600" color="red" />
			<AlertTitle className="!font-light">Error message: </AlertTitle>
			<AlertDescription>
				<span className="text-red-600">{errorDescription}</span> in{' '}
				{callError && 'classHash' in callError ? (
					<ContractCallSignature contractCall={callError} />
				) : (
					callError?.fnName && <FnName fnName={callError?.fnName} />
				)}
			</AlertDescription>
		</Alert>
	);
};

export default ErrorAlert;
