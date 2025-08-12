import { rm, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { type Address, type Hex } from 'viem';
import { type Metadata } from '@ethereum-sourcify/lib-sourcify';
import solc from '@/app/api/v1/solc';
import { type Contract } from '@/app/api/v1/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to check if solc version is compatible with pragma
export const isSolcVersionCompatible = (pragma: string, solcVersion: string): boolean => {
	// Extract version from pragma (e.g., "pragma solidity ^0.8.20;" -> "0.8.20")
	const pragmaMatch = pragma.match(/pragma\s+solidity\s+([^;]+);/);
	if (!pragmaMatch) return false;

	const versionSpec = pragmaMatch[1].trim();

	// Handle caret (^) versioning: ^0.8.20 means >=0.8.20 and <0.9.0
	if (versionSpec.startsWith('^')) {
		const minVersion = versionSpec.slice(1);
		const [major, minor, patch] = minVersion.split('.').map(Number);

		// Extract base version from solc (remove commit hash and nightly build info)
		const baseSolcVersion = solcVersion.split('+')[0];
		const [solcMajor, solcMinor, solcPatch] = baseSolcVersion.split('.').map(Number);

		// For caret versioning, major version must match exactly
		if (solcMajor !== major) return false;

		// Minor and patch must be >= specified version
		if (solcMinor < minor) return false;
		if (solcMinor === minor && solcPatch < patch) return false;

		return true;
	}

	// Handle exact version: 0.8.24 means exactly 0.8.24
	if (versionSpec.match(/^\d+\.\d+\.\d+$/)) {
		// For exact versions, we need to be more careful with nightly builds
		const baseSolcVersion = solcVersion.split('+')[0];
		return versionSpec === baseSolcVersion;
	}

	// Handle other version specifiers (>=, <=, etc.) - for now, be conservative
	return false;
};

// Function to check if contract requires 0.8.29+ for strict pragma
export const requiresStrictVersion = (pragma: string): boolean => {
	const pragmaMatch = pragma.match(/pragma\s+solidity\s+([^;]+);/);
	if (!pragmaMatch) return false;

	const versionSpec = pragmaMatch[1].trim();

	// If it's an exact version like "0.8.24", check if it's >= 0.8.29
	if (versionSpec.match(/^\d+\.\d+\.\d+$/)) {
		const [major, minor, patch] = versionSpec.split('.').map(Number);
		return major === 0 && minor === 8 && patch >= 29;
	}

	// If it's a caret version like "^0.8.20", check if it could require 0.8.29+
	if (versionSpec.startsWith('^')) {
		const minVersion = versionSpec.slice(1);
		const [major, minor, patch] = minVersion.split('.').map(Number);
		return major === 0 && minor === 8 && patch >= 29;
	}

	return false;
};

// Function to get clean solc version for comparison
export const getCleanSolcVersion = (solcVersion: string): string => {
	// Remove commit hash and nightly build info
	return solcVersion.split('+')[0];
};

// Function to check if solc version is nightly build
export const isNightlyBuild = (solcVersion: string): boolean => {
	return solcVersion.includes('+commit.') || solcVersion.includes('nightly');
};

// Function to find pragma directive in source files
export const findPragmaDirective = (
	sources: Array<{ path?: string; content: string }>
): string | null => {
	for (const source of sources) {
		if (source.path?.endsWith('.sol')) {
			// Check if this is a flattened file (has multiple pragma directives)
			const allPragmas = source.content.match(/pragma\s+solidity\s+[^;]+;/g);

			if (allPragmas && allPragmas.length > 1) {
				console.log(`⚠️ Flattened file detected with ${allPragmas.length} pragma directives`);
				console.log(`   Pragmas found: ${allPragmas.map((p) => p.trim()).join(', ')}`);

				// Take the first pragma directive (usually the main one)
				const mainPragma = allPragmas[0];
				return mainPragma;
			} else if (allPragmas && allPragmas.length === 1) {
				// Single pragma directive
				return allPragmas[0];
			}
		}
	}
	return null;
};

// Function to clean source file content from BOM and invisible characters
export const cleanSourceContent = (content: string): string => {
	// Remove BOM (Byte Order Mark) if present
	let cleaned = content;
	if (content.charCodeAt(0) === 0xfeff) {
		cleaned = content.slice(1);
	}

	// Remove other invisible characters that might interfere
	cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

	// Ensure proper line endings
	cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

	return cleaned;
};

// Function to extract solc version from pragma directive
export const extractSolcVersionFromPragma = (pragma: string): string | null => {
	const versionMatch = pragma.match(/pragma\s+solidity\s+([^;]+);/);
	if (versionMatch) {
		return versionMatch[1].trim();
	}
	return null;
};

// Main compilation function
export const compileContracts = async (
	verifiedContracts: Contract[],
	tmpDir: string
): Promise<{
	compiled: Array<{ address: Address; name?: string }>;
	ethdebugDirs: string[];
	cwd: string;
	compilationErrors: string[];
}> => {
	let ethdebugDirs: string[] = [];
	let cwd = process.env.PWD || '/tmp';
	let compilationErrors: string[] = [];
	let compiled: Array<{ address: Address; name?: string }> = [];

	// Try to compile all verified contracts with available sources
	if (verifiedContracts.length > 0) {
		// Process contracts sequentially to avoid overwhelming the system
		for (const contract of verifiedContracts) {
			try {
				// Create contract directory and write all source files first
				const contractDir = `${tmpDir}/${contract.address}`;
				await mkdir(contractDir, { recursive: true });

				// Write all source files
				const sourceFiles = contract.sources.filter((source) => source.path);
				await Promise.all(
					sourceFiles.map(async (source) => {
						const filename = `${contractDir}/${source.path}`;
						const parentDirectory = dirname(filename);
						await mkdir(parentDirectory, { recursive: true });

						// Clean source content before writing to disk
						let cleanedContent = cleanSourceContent(source.content);

						await writeFile(filename, cleanedContent);
					})
				);

				// Wait a bit before compilation to ensure files are written
				await sleep(400);

				// Find pragma directive after files are written to disk
				const pragmaDirective = findPragmaDirective(contract.sources);

				const metadataFile = contract.sources.find((source) =>
					source.path?.endsWith('metadata.json')
				);
				if (!metadataFile) {
					console.warn(`Contract ${contract.address}: Missing metadata.json`);
					compilationErrors.push(`Contract ${contract.address}: Missing metadata.json`);
					continue;
				}

				const metadata = JSON.parse(metadataFile.content) as Metadata;
				const [compilationTarget] = Object.keys(metadata.settings.compilationTarget);
				const solcVersion = metadata.compiler.version;

				// Check version compatibility if pragma is found
				if (pragmaDirective && solcVersion) {
					const cleanSolcVersion = getCleanSolcVersion(solcVersion);
					const isNightly = isNightlyBuild(solcVersion);
					const isCompatible = isSolcVersionCompatible(pragmaDirective, solcVersion);
					const needsStrictVersion = requiresStrictVersion(pragmaDirective);
					const isCurrentVersionStrict =
						cleanSolcVersion.startsWith('0.8.') && parseInt(cleanSolcVersion.split('.')[2]) >= 29;

					if (isNightly) {
						console.warn(
							`⚠️ WARNING: Using nightly build ${solcVersion}. Nightly builds may have compatibility issues with exact version requirements.`
						);
					}

					if (needsStrictVersion) {
						if (isCurrentVersionStrict) {
							console.log(
								`✅ Contract requires Solidity 0.8.29+ and current version meets requirement`
							);
						} else {
							console.warn(
								`⚠️ Contract requires Solidity 0.8.29+ but current version is ${cleanSolcVersion}`
							);
							console.warn(`This may cause compilation issues or missing debug data`);
						}
					}

					if (!isCompatible) {
						const errorMsg = `Contract ${contract.address}: Solc version ${solcVersion} is not compatible with pragma ${pragmaDirective}`;
						console.warn(`⚠️ ${errorMsg}`);

						if (isNightly) {
							console.warn(
								`💡 SUGGESTION: Try using a release version of solc instead of nightly build`
							);
							console.warn(`   Current: ${solcVersion}`);
							console.warn(`   Recommended: ${cleanSolcVersion} (release version)`);
						}

						compilationErrors.push(errorMsg);
					}
				}

				try {
					await solc({ compilationTarget, cwd: contractDir });

					// Check if debug directory was created and contains files
					const debugDir = `${contractDir}/debug`;
					try {
						// Ensure debug directory exists
						await mkdir(debugDir, { recursive: true });

						// Check if debug directory has content (indicating successful compilation)
						const debugFiles = await import('node:fs/promises').then((fs) => fs.readdir(debugDir));
						if (debugFiles.length > 0) {
							console.log(
								`✅ Successfully compiled ${contract.address} - debug data available (${debugFiles.length} files)`
							);
							compiled.push({ address: contract.address, name: contract.name });
						} else {
							console.warn(`⚠️ Contract ${contract.address} compiled but debug directory is empty`);
							compilationErrors.push(
								`Contract ${contract.address}: Debug directory is empty after compilation`
							);
						}
					} catch (debugError) {
						console.error(
							`❌ Debug directory creation failed for ${contract.address}:`,
							debugError
						);
						compilationErrors.push(`Contract ${contract.address}: Debug directory creation failed`);
					}
				} catch (solcError: any) {
					const errorMsg = `Contract ${contract.address}: Compilation failed - ${
						solcError?.message || String(solcError)
					}`;
					console.error(`❌ ${errorMsg}`);

					// Provide more specific error analysis
					if (solcError?.message) {
						const errorMessage = solcError.message;

						if (errorMessage.includes('requires different compiler version')) {
							console.error(`🔍 VERSION MISMATCH ANALYSIS:`);
							console.error(`   Contract pragma: ${pragmaDirective || 'Unknown'}`);
							console.error(`   Current solc: ${solcVersion || 'Unknown'}`);
							console.error(`   Clean version: ${getCleanSolcVersion(solcVersion || '')}`);

							if (isNightlyBuild(solcVersion || '')) {
								console.error(`💡 SOLUTION: Use release version of solc instead of nightly build`);
								console.error(
									`   Install: solc-select install ${getCleanSolcVersion(solcVersion || '')}`
								);
								console.error(`   Use: solc-select use ${getCleanSolcVersion(solcVersion || '')}`);
							} else if (pragmaDirective) {
								const pragmaMatch = pragmaDirective.match(/pragma\s+solidity\s+([^;]+);/);
								if (pragmaMatch) {
									const requiredVersion = pragmaMatch[1].trim();
									console.error(`💡 SOLUTION: Install and use solc version ${requiredVersion}`);
									console.error(`   Install: solc-select install ${requiredVersion}`);
									console.error(`   Use: solc-select use ${requiredVersion}`);
								}
							}
						} else if (errorMessage.includes('Source file not found')) {
							console.error(`🔍 MISSING SOURCE ANALYSIS:`);
							console.error(`   Check if all source files are properly written to: ${contractDir}`);
						} else if (errorMessage.includes('ParserError')) {
							console.error(`🔍 SYNTAX ERROR ANALYSIS:`);
							console.error(`   Check Solidity syntax in source files`);
						} else if (errorMessage.includes('PRAGMA unknown')) {
							console.error(`🔍 PRAGMA DETECTION ISSUE:`);
							console.error(`   Solc cannot detect pragma directive in source files`);
							console.error(`   This may indicate:`);
							console.error(`   - Source files not written correctly`);
							console.error(`   - File encoding issues`);
							console.error(`   - Missing or corrupted source files`);
							console.error(`   - Pragma directive not at the beginning of the file`);

							// Log the first few lines of the main source file for debugging
							const mainSourceFile = contract.sources.find((s) => s.path?.endsWith('.sol'));
							if (mainSourceFile) {
								const firstLines = mainSourceFile.content.split('\n').slice(0, 5).join('\n');
								console.error(`   First 5 lines of main source file:`);
								console.error(`   ${firstLines}`);
							}
						}
					}

					compilationErrors.push(errorMsg);
				}
			} catch (e: any) {
				const errorMsg = `Contract ${contract.address}: Setup failed - ${e?.message || String(e)}`;
				console.error(`❌ ${errorMsg}`);
				compilationErrors.push(errorMsg);
			}
		}

		// Only include debug dirs for successfully compiled contracts
		if (compiled.length === 1) {
			ethdebugDirs = [`${tmpDir}/${compiled[0].address}/debug`];
			cwd = `${tmpDir}/${compiled[0].address}`;
		} else if (compiled.length > 1) {
			ethdebugDirs = compiled.map((c) =>
				c.name
					? `${c.address}:${c.name}:${tmpDir}/${c.address}/debug`
					: `${c.address}:${tmpDir}/${c.address}/debug`
			);
			cwd = `${tmpDir}/${compiled[0].address}`;
		}

		// Log compilation results
		if (compiled.length === 0) {
			console.warn('No contracts were successfully compiled. Debug data will not be available.');
			console.warn('Compilation errors:', compilationErrors);
		} else {
			console.log(
				`Successfully compiled ${compiled.length} out of ${verifiedContracts.length} contracts`
			);
			if (compilationErrors.length > 0) {
				console.warn('Some contracts failed to compile:', compilationErrors);
			}
		}
	}

	return { compiled, ethdebugDirs, cwd, compilationErrors };
};
