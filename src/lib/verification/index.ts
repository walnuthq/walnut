import { safeFetchApi } from '@/lib/utils';
import { VerificationStatusResponse } from './types';

export async function fetchVerificationStatus(verificationId: string): Promise<{
	isError: boolean;
	response: VerificationStatusResponse;
}> {
	return safeFetchApi<VerificationStatusResponse>(`/v1/verification/${verificationId}/status`, {
		method: 'GET',
		renameToCamelCase: true
	});
}
