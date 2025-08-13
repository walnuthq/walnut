import { type Address } from 'viem';

export interface DebugDirectoryInfo {
	exists: boolean;
	fileCount: number;
	files: string[];
	path: string;
}

export interface DebugDirectoryVerificationResult {
	validDirs: string[];
	invalidDirs: string[];
	verificationDetails: Record<string, DebugDirectoryInfo>;
	totalValid: number;
	totalInvalid: number;
}

/**
 * Verifies debug directories exist and contain valid content
 * @param ethdebugDirs - Array of debug directory paths
 * @returns Promise<DebugDirectoryVerificationResult>
 */
export const verifyDebugDirectories = async (
	ethdebugDirs: string[]
): Promise<DebugDirectoryVerificationResult> => {
	const result: DebugDirectoryVerificationResult = {
		validDirs: [],
		invalidDirs: [],
		verificationDetails: {},
		totalValid: 0,
		totalInvalid: 0
	};

	if (ethdebugDirs.length === 0) {
		console.warn('No debug directories to verify');
		return result;
	}

	console.log('\n--- Verifying debug directories ---');
	console.log('ethdebugDirs', ethdebugDirs);

	for (const debugDir of ethdebugDirs) {
		try {
			const fs = await import('node:fs/promises');
			const exists = await fs
				.access(debugDir)
				.then(() => true)
				.catch(() => false);

			if (exists) {
				const files = await fs.readdir(debugDir);
				const fileCount = files.length;

				const dirInfo: DebugDirectoryInfo = {
					exists: true,
					fileCount,
					files: files.slice(0, 10), // Limit to first 10 files for logging
					path: debugDir
				};

				result.verificationDetails[debugDir] = dirInfo;

				if (fileCount > 0) {
					console.log(`✅ Debug dir exists: ${debugDir} (${fileCount} files)`);
					if (fileCount <= 10) {
						console.log(`  Files: ${files.join(', ')}`);
					} else {
						console.log(`  Files: ${files.slice(0, 5).join(', ')}... and ${fileCount - 5} more`);
					}
					result.validDirs.push(debugDir);
					result.totalValid++;
				} else {
					console.warn(`⚠️ Debug dir exists but is empty: ${debugDir}`);
					result.invalidDirs.push(debugDir);
					result.totalInvalid++;
				}
			} else {
				console.error(`❌ Debug dir does not exist: ${debugDir}`);
				result.verificationDetails[debugDir] = {
					exists: false,
					fileCount: 0,
					files: [],
					path: debugDir
				};
				result.invalidDirs.push(debugDir);
				result.totalInvalid++;
			}
		} catch (error) {
			console.error(`❌ Error checking debug dir ${debugDir}:`, error);
			result.verificationDetails[debugDir] = {
				exists: false,
				fileCount: 0,
				files: [],
				path: debugDir
			};
			result.invalidDirs.push(debugDir);
			result.totalInvalid++;
		}
	}

	console.log('--- End debug directory verification ---\n');
	console.log(
		`Summary: ${result.totalValid} valid, ${result.totalInvalid} invalid debug directories`
	);

	return result;
};

/**
 * Logs compilation and debug directory status for contracts
 * @param compiled - Array of successfully compiled contracts
 * @param verifiedContracts - Array of all verified contracts
 * @param compilationErrors - Array of compilation errors
 * @param ethdebugDirs - Array of debug directory paths
 */
export const logCompilationStatus = (
	compiled: Array<{ address: Address; name?: string }>,
	verifiedContracts: Array<{ address: Address; name?: string }>,
	compilationErrors: string[],
	ethdebugDirs: string[]
): void => {
	console.log('ETHDEBUG dirs:', ethdebugDirs);
	console.log('Compiled contracts count:', compiled.length);
	console.log(
		'Compiled contracts:',
		compiled.map((c: { address: Address; name?: string }) => ({
			address: c.address,
			name: c.name
		}))
	);

	// Log compilation results
	if (compiled.length === 0) {
		console.warn('No contracts were successfully compiled. Debug data will not be available.');
		console.warn('Compilation errors:', compilationErrors);

		// If we have verified contracts but none compiled, this is a significant issue
		if (verifiedContracts.length > 0) {
			console.error(
				'CRITICAL: All verified contracts failed to compile. Debug data will not be available.'
			);
		}
	} else {
		console.log(
			`Successfully compiled ${compiled.length} out of ${verifiedContracts.length} contracts`
		);
		if (compilationErrors.length > 0) {
			console.warn('Some contracts failed to compile:', compilationErrors);
		}
	}

	// Log debug directory status
	if (ethdebugDirs.length === 0) {
		console.warn('No debug directories available - running walnut-cli without debug data');
	} else {
		console.log(`Debug directories available for ${ethdebugDirs.length} contracts`);
		console.log('Debug directory paths:');
		ethdebugDirs.forEach((dir, index) => {
			console.log(`  ${index + 1}. ${dir}`);
		});
	}
};
