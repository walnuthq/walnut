export interface VerificationRequestRow {
	id: string;
	status?: 'pending' | 'success' | 'failed';
	message?: string;
	createdAt: string;
	updatedAt: string;
	solidityVersion?: string;
	packageName?: string;
}

export interface VerificationStatusResponse {
	verificationRequest?: VerificationRequestRow | null;
	verificationStatuses: VerificationStatusRow[];
	errorMessage?: string;
}

export interface VerificationStatusRow {
	primaryId: number;
	id: string;
	network?: string;
	classHash?: string;
	status: VerificationStatus;
	message?: string;
	projectId?: number;
	createdAt: string;
	updatedAt: string;
	profiles: [string];
}

export enum VerificationStatus {
	pending = 'Pending',
	success = 'Success',
	failed = 'Failed'
}
