import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { AlertCircle } from 'lucide-react';
import { getValidationErrors, hasValidationErrors } from '../../../lib/utils/validation-utils';

interface FieldAlertProps {
	senderAddress: string;
	contractCalls: Array<{ address: string; function_name: string; calldata: string }>;
	transactionVersion: number;
}

export function FieldAlert({ senderAddress, contractCalls, transactionVersion }: FieldAlertProps) {
	const errors = getValidationErrors(senderAddress, contractCalls, transactionVersion);

	if (!hasValidationErrors(errors)) {
		return null;
	}

	return (
		<Alert variant="destructive" className="mt-4">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>Your form contains errors. Scroll up to see them.</AlertDescription>
		</Alert>
	);
}
