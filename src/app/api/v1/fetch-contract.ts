import { type Abi, type Address, type PublicClient } from 'viem';
import { whatsabi } from '@shazow/whatsabi';
import { type Contract } from '@/app/api/v1/types';
import {
	getChainKeyByNumber,
	getExplorerApiForChain,
	getVerificationTypeForChain
} from '@/lib/networks';

const fetchContract = async (
	address: Address,
	publicClient: PublicClient,
	chainId: number
): Promise<Contract> => {
	const bytecode = await publicClient.getCode({ address });
	if (!bytecode) {
		throw new Error(`Error: no bytecode found for ${address}`);
	}

	const chainKey = getChainKeyByNumber(chainId);
	const verificationType = chainKey ? getVerificationTypeForChain(chainKey) : 'sourcify';

	// Try blockscout verification method first
	if (verificationType === 'blockscout') {
		const explorer = chainKey ? getExplorerApiForChain(chainKey) : undefined;
		if (explorer && explorer.type === 'blockscout_v2') {
			try {
				const res = await fetch(`${explorer.baseUrl}/api/v2/smart-contracts/${address}`);
				if (res.ok) {
					const json = await res.json();
					// Blockscout v2 returns ABI and sometimes sources in varying shapes
					const abi: Abi | undefined = json?.abi ?? json?.result?.abi ?? json?.smart_contract?.abi;
					const name: string = json?.name ?? json?.implementation_name ?? address;
					// Try to collect source files if available
					let sources: { path: string; content: string }[] = [];

					// First try: check if we have file_path + source_code combination (main contract)
					if (json?.file_path && json?.source_code && typeof json.source_code === 'string') {
						sources = [
							{
								path: String(json.file_path),
								content: String(json.source_code)
							}
						];
					}
					// Second try: check if source_code is an object with files
					else if (json?.source_code && typeof json.source_code === 'object') {
						const sourceCodeObj = json.source_code as Record<string, any>;
						// Check if it has a 'files' property
						if (sourceCodeObj.files && Array.isArray(sourceCodeObj.files)) {
							sources = sourceCodeObj.files
								.filter((f: any) => f?.path && (f?.content || f?.source_code))
								.map((f: any) => ({
									path: String(f.path),
									content: String(f.content ?? f.source_code)
								}));
						} else {
							// If no files array, treat source_code as individual files
							for (const [path, content] of Object.entries(sourceCodeObj)) {
								if (typeof content === 'string' && path !== 'files') {
									sources.push({ path, content });
								}
							}
						}
					}

					// Third try: check other possible locations for files
					else if (sources.length === 0) {
						const filesArr = json?.files || json?.smart_contract?.files || json?.result?.files;
						if (Array.isArray(filesArr)) {
							sources = filesArr
								.filter((f: any) => f?.path && (f?.content || f?.source_code))
								.map((f: any) => ({
									path: String(f.path),
									content: String(f.content ?? f.source_code)
								}));
						}
					}

					// Fourth try: if source_code is a string (raw Solidity code), treat it as a single file
					else if (
						sources.length === 0 &&
						json?.source_code &&
						typeof json.source_code === 'string'
					) {
						sources = [
							{
								path: `${address}.sol`,
								content: json.source_code
							}
						];
					}

					// Fifth try: check additional_sources array and combine with main source
					if (json?.additional_sources && Array.isArray(json.additional_sources)) {
						const additionalSources = json.additional_sources
							.filter((f: any) => f?.file_path && f?.source_code)
							.map((f: any) => ({
								path: String(f.file_path),
								content: String(f.source_code)
							}));

						// Combine main source with additional sources
						sources = [...sources, ...additionalSources];
					}

					// If still no sources, try dedicated Blockscout v2 source-code endpoint
					if (sources.length === 0) {
						try {
							const srcRes = await fetch(
								`${explorer.baseUrl}/api/v2/smart-contracts/${address}/source-code`
							);
							if (srcRes.ok) {
								const srcJson = await srcRes.json();
								const srcFiles = (srcJson as any)?.files || (srcJson as any)?.result?.files;
								if (Array.isArray(srcFiles)) {
									sources = srcFiles
										.filter((f: any) => f?.path && (f?.content || f?.source_code))
										.map((f: any) => ({
											path: String(f.path),
											content: String(f.content ?? f.source_code)
										}));
								}
							}
						} catch {}
					}
					if (abi && Array.isArray(abi)) {
						const anyVerifiedFlag = Boolean(
							json?.verified ||
								json?.is_verified ||
								json?.smart_contract?.is_verified ||
								json?.result?.is_verified
						);
						const verified = anyVerifiedFlag || sources.length > 0;

						// Generate metadata.json if we have sources but no metadata
						if (sources.length > 0) {
							const mainSource = sources.find(
								(s) => !s.path.includes('@openzeppelin') && !s.path.includes('node_modules')
							);

							// Get compiler version from Blockscout response
							const compilerVersion =
								json?.compiler_version ||
								json?.smart_contract?.compiler_version ||
								json?.result?.compiler_version ||
								'0.8.30+commit.unknown';

							// Use existing compiler_settings from Blockscout if available
							const existingSettings =
								json?.compiler_settings || json?.smart_contract?.compiler_settings;

							if (mainSource) {
								const metadata = {
									compiler: {
										version: compilerVersion
									},
									language: 'Solidity',
									output: {
										abi: abi,
										devdoc: { kind: 'dev', methods: {}, version: 1 },
										userdoc: { kind: 'user', methods: {}, version: 1 }
									},
									settings: {
										compilationTarget: {
											[mainSource.path]:
												mainSource.path.split('/').pop()?.split('.')[0] || 'Contract'
										},
										evmVersion: existingSettings?.evmVersion || 'paris',
										libraries: existingSettings?.libraries || {},
										metadata: { bytecodeHash: 'ipfs' },
										optimizer: existingSettings?.optimizer || { enabled: false, runs: 200 },
										remappings: existingSettings?.remappings || [],
										viaIR: existingSettings?.viaIR || true
									},
									sources: Object.fromEntries(
										sources
											.filter((s) => s.path !== 'metadata.json')
											.map((s) => [
												s.path,
												{
													keccak256: `0x${Math.random().toString(16).slice(2, 66)}`,
													license: 'MIT',
													urls: []
												}
											])
									),
									version: 1
								};

								// Add metadata.json as a source
								sources.push({
									path: 'metadata.json',
									content: JSON.stringify(metadata, null, 2)
								});
							} else {
								// Use the first source file as compilation target
								const firstSource = sources[0];
								const metadata = {
									compiler: {
										version: compilerVersion
									},
									language: 'Solidity',
									output: {
										abi: abi,
										devdoc: { kind: 'dev', methods: {}, version: 1 },
										userdoc: { kind: 'user', methods: {}, version: 1 }
									},
									settings: {
										compilationTarget: {
											[firstSource.path]:
												firstSource.path.split('/').pop()?.split('.')[0] || 'Contract'
										},
										evmVersion: existingSettings?.evmVersion || 'paris',
										libraries: existingSettings?.libraries || {},
										metadata: { bytecodeHash: 'ipfs' },
										optimizer: existingSettings?.optimizer || { enabled: false, runs: 200 },
										remappings: existingSettings?.remappings || [],
										viaIR: existingSettings?.viaIR || true
									},
									sources: Object.fromEntries(
										sources
											.filter((s) => s.path !== 'metadata.json')
											.map((s) => [
												s.path,
												{
													keccak256: `0x${Math.random().toString(16).slice(2, 66)}`,
													license: 'MIT',
													urls: []
												}
											])
									),
									version: 1
								};

								// Add metadata.json as a source
								sources.push({
									path: 'metadata.json',
									content: JSON.stringify(metadata, null, 2)
								});
							}
						} else {
							// Even without sources, try to create minimal metadata.json if we have compiler version
							const compilerVersion =
								json?.compiler_version ||
								json?.smart_contract?.compiler_version ||
								json?.result?.compiler_version;

							if (compilerVersion) {
								const minimalMetadata = {
									compiler: {
										version: compilerVersion
									},
									language: 'Solidity',
									output: {
										abi: abi,
										devdoc: { kind: 'dev', methods: {}, version: 1 },
										userdoc: { kind: 'user', methods: {}, version: 1 }
									},
									settings: {
										compilationTarget: {
											'Contract.sol': 'Contract'
										},
										evmVersion: 'paris',
										libraries: {},
										metadata: { bytecodeHash: 'ipfs' },
										optimizer: { enabled: false, runs: 200 },
										remappings: [],
										viaIR: true
									},
									sources: {},
									version: 1
								};

								// Add minimal metadata.json as a source
								sources.push({
									path: 'metadata.json',
									content: JSON.stringify(minimalMetadata, null, 2)
								});
							} else {
								console.warn(
									`[FETCH-CONTRACT] Blockscout v2 - Contract ${address}: No compiler version found, cannot create metadata.json`
								);
							}
						}
						return {
							address,
							bytecode,
							name,
							sources,
							abi,
							verified,
							verificationSource: 'blockscout'
						};
					}
				}
			} catch (e) {
				console.warn(
					`[FETCH-CONTRACT] Blockscout v2 - Failed to get source code for address: ${address}:`,
					e
				);
			}
		} else {
			console.warn(`[FETCH-CONTRACT] Blockscout - No explorer configured for chain ${chainId}`);
		}
	}

	// Handle sourcify verificationType if configured
	if (verificationType === 'sourcify') {
		try {
			const provider = whatsabi.providers.WithCachedCode(publicClient, {
				[address]: bytecode
			});

			const result = await whatsabi.autoload(address, {
				provider,
				abiLoader: new whatsabi.loaders.SourcifyABILoader({ chainId }),
				loadContractResult: true
			});

			if (result.contractResult) {
				const [sources, proxyResult] = await Promise.all([
					result.contractResult.getSources && result.contractResult.getSources(),
					result.followProxies && result.followProxies()
				]);

				if (proxyResult && proxyResult.contractResult) {
					result.contractResult.abi = proxyResult.contractResult.abi;
				}

				const filteredSources = sources
					? sources
							.filter(({ path }) => path)
							.map(({ path, content }) => ({
								path: whatsabi.loaders.SourcifyABILoader.stripPathPrefix(`/${path}`),
								content
							}))
					: [];
				const isVerified = filteredSources.length > 0;
				return {
					address,
					bytecode,
					name: result.contractResult.name ?? address,
					sources: filteredSources,
					abi: result.contractResult.abi,
					verified: isVerified,
					verificationSource: 'sourcify'
				};
			}
		} catch (error) {
			console.warn(
				`[FETCH-CONTRACT] Sourcify - Failed to get source code for address: ${address}:`,
				error
			);
		}
	}

	const finalResult = {
		address,
		bytecode,
		name: address,
		sources: [],
		abi: [] as Abi,
		verified: false,
		verificationSource: undefined
	};

	return finalResult;
};

export default fetchContract;
