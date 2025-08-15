import { type Address } from 'viem';
import { type Contract } from '@/app/api/v1/types';
import { type CompilationStatus, type CompilationSummary } from '@/lib/simulation';

/**
 * Creates a compilation summary from contracts and compilation results
 * @param verifiedContracts - Array of verified contracts
 * @param compiled - Array of successfully compiled contracts
 * @param compilationErrors - Array of compilation error messages
 * @returns CompilationSummary
 */
export const createCompilationSummary = (
	verifiedContracts: Contract[],
	compiled: Array<{ address: Address; name?: string }>,
	compilationErrors: string[]
): CompilationSummary => {
	const contractStatuses: CompilationStatus[] = [];
	const successfulAddresses = new Set(compiled.map((c) => c.address));

	// Process all verified contracts
	for (const contract of verifiedContracts) {
		if (successfulAddresses.has(contract.address)) {
			contractStatuses.push({
				address: contract.address,
				status: 'success',
				verificationSource: contract.verificationSource
			});
		} else {
			// Find specific error for this contract
			const contractError = compilationErrors.find((error) => error.includes(contract.address));

			contractStatuses.push({
				address: contract.address,
				status: 'failed',
				error: contractError || 'Compilation failed',
				verificationSource: contract.verificationSource
			});
		}
	}

	return {
		totalContracts: verifiedContracts.length,
		successfulCompilations: compiled.length,
		failedCompilations: verifiedContracts.length - compiled.length,
		compilationErrors,
		contractStatuses
	};
};

/**
 * Gets compilation status for a specific contract address
 * @param address - Contract address to check
 * @param compilationSummary - Compilation summary object
 * @returns CompilationStatus | undefined
 */
export const getContractCompilationStatus = (
	address: Address,
	compilationSummary: CompilationSummary
): CompilationStatus | undefined => {
	return compilationSummary.contractStatuses.find((status) => status.address === address);
};

/**
 * Checks if a contract is debuggable (verified and successfully compiled)
 * @param address - Contract address to check
 * @param compilationSummary - Compilation summary object
 * @returns boolean
 */
export const isContractDebuggable = (
	address: Address,
	compilationSummary: CompilationSummary
): boolean => {
	const status = getContractCompilationStatus(address, compilationSummary);
	return status?.status === 'success';
};

/**
 * Gets compilation error for a specific contract address
 * @param address - Contract address to check
 * @param compilationSummary - Compilation summary object
 * @returns string | undefined
 */
export const getContractCompilationError = (
	address: Address,
	compilationSummary: CompilationSummary
): string | undefined => {
	const status = getContractCompilationStatus(address, compilationSummary);
	return status?.status === 'failed' ? status.error : undefined;
};
