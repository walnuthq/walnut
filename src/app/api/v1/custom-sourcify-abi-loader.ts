import { headers } from 'next/headers';
import { whatsabi } from '@shazow/whatsabi';
import { type Metadata } from '@ethereum-sourcify/compilers-types';

class FetchError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

async function fetchJSON(url: string): Promise<any> {
	const { get } = await headers();
	const response = await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			Cookie: get('cookie') ?? ''
		}
	});
	if (!response.ok) {
		throw new FetchError(response.statusText, response.status);
	}
	return response.json();
}

function isSourcifyNotFound(error: any): boolean {
	return (
		// Sourcify returns strict CORS only if there is no result -_-
		error.message === 'Failed to fetch' || error.status === 404
	);
}

const emptyContractResult: whatsabi.loaders.ContractResult = {
	ok: false,

	abi: [],
	name: null,
	evmVersion: '',
	compilerVersion: '',
	runs: 0
};

export class CustomSourcifyABILoader extends whatsabi.loaders.SourcifyABILoader {
	baseURL: string;

	constructor(config?: { chainId?: number; baseURL: string }) {
		super({ chainId: config?.chainId });
		this.baseURL = config?.baseURL ?? 'https://sourcify.dev/server';
	}

	/* async loadContract(url: string): Promise<whatsabi.loaders.ContractResult> {
		try {
			const r = await fetchJSON(url);
			const files: Array<{ name: string; path: string; content: string }> = r.files ?? r;

			// Metadata is usually the first one
			const metadata = files.find((f) => f.name === 'metadata.json');
			if (metadata === undefined)
				throw new whatsabi.loaders.SourcifyABILoaderError('metadata.json not found');

			// Note: Sometimes metadata.json contains sources, but not always. So we can't rely on just the metadata.json
			const m = JSON.parse(metadata.content) as whatsabi.loaders.SourcifyContractMetadata;

			// Sourcify includes a title from the Natspec comments
			let name = m.output.devdoc?.title;
			if (!name && m.settings.compilationTarget) {
				// Try to use the compilation target name as a fallback
				const targetNames = Object.values(m.settings.compilationTarget);
				if (targetNames.length > 0) {
					name = targetNames[0];
				}
			}

			return {
				abi: m.output.abi,
				name: name ?? null,
				evmVersion: m.settings.evmVersion,
				compilerVersion: m.compiler.version,
				runs: m.settings.optimizer.runs,

				// TODO: Paths will have a sourcify prefix, do we want to strip it to help normalize? It doesn't break anything keeping the prefix, so not sure.
				// E.g. /contracts/full_match/1/0x1F98431c8aD98523631AE4a59f267346ea31F984/sources/contracts/interfaces/IERC20Minimal.sol
				// Can use stripPathPrefix helper to do this, but maybe we want something like getSources({ normalize: true })?
				getSources: async () =>
					files.map(({ path, content }) => {
						return { path, content };
					}),

				ok: true,
				loader: this,
				loaderResult: m
			};
		} catch (err: any) {
			if (isSourcifyNotFound(err)) return emptyContractResult;
			throw new whatsabi.loaders.SourcifyABILoaderError(
				'SourcifyABILoader load contract error: ' + err.message,
				{
					context: { url },
					cause: err
				}
			);
		}
	} */

	async loadContract(url: string): Promise<whatsabi.loaders.ContractResult> {
		try {
			const r = await fetchJSON(url);
			const { metadata: m, sources } = r as {
				// metadata: whatsabi.loaders.SourcifyContractMetadata;
				metadata: Metadata;
				sources: Record<string, { content: string }>;
			};

			// Sourcify includes a title from the Natspec comments
			let name = m.output.devdoc?.title;
			if (!name && m.settings.compilationTarget) {
				// Try to use the compilation target name as a fallback
				const targetNames = Object.values(m.settings.compilationTarget);
				if (targetNames.length > 0) {
					name = targetNames[0];
				}
			}

			return {
				abi: m.output.abi,
				name: name ?? null,
				evmVersion: m.settings.evmVersion,
				compilerVersion: m.compiler.version,
				runs: m.settings.optimizer?.runs,

				// TODO: Paths will have a sourcify prefix, do we want to strip it to help normalize? It doesn't break anything keeping the prefix, so not sure.
				// E.g. /contracts/full_match/1/0x1F98431c8aD98523631AE4a59f267346ea31F984/sources/contracts/interfaces/IERC20Minimal.sol
				// Can use stripPathPrefix helper to do this, but maybe we want something like getSources({ normalize: true })?
				getSources: async () =>
					Object.keys(sources).map((path) => ({ path, content: sources[path].content })),

				ok: true,
				loader: this,
				loaderResult: m
			};
		} catch (err: any) {
			if (isSourcifyNotFound(err)) return emptyContractResult;
			throw new whatsabi.loaders.SourcifyABILoaderError(
				'SourcifyABILoader load contract error: ' + err.message,
				{
					context: { url },
					cause: err
				}
			);
		}
	}

	/* async getContract(address: string): Promise<whatsabi.loaders.ContractResult> {
		{
			// Full match index includes verification settings that matches exactly
			const url = `${this.baseURL}/files/${this.chainId}/${address}`;
			const r = await this.loadContract(url);
			if (r.ok) return r;
		}

		{
			// Partial match index is for verified contracts whose settings didn't match exactly
			const url = `${this.baseURL}/files/${this.chainId}/${address}`;
			const r = await this.loadContract(url);
			if (r.ok) return r;
		}

		return emptyContractResult;
	} */

	async getContract(address: string): Promise<whatsabi.loaders.ContractResult> {
		// Full match index includes verification settings that matches exactly
		const url = `${this.baseURL}/v2/contract/${this.chainId}/${address}?fields=all`;
		const r = await this.loadContract(url);
		if (r.ok) return r;

		return emptyContractResult;
	}

	/* async loadABI(address: string): Promise<any[]> {
		{
			// Full match index includes verification settings that matches exactly
			const url = `${this.baseURL}/repository/contracts/full_match/${this.chainId}/${address}/metadata.json`;
			try {
				return (await fetchJSON(url)).output.abi;
			} catch (err: any) {
				if (!isSourcifyNotFound(err)) {
					throw new whatsabi.loaders.SourcifyABILoaderError(
						'SourcifyABILoader loadABI error: ' + err.message,
						{
							context: { address, url },
							cause: err
						}
					);
				}
			}
		}

		{
			// Partial match index is for verified contracts whose settings didn't match exactly
			const url = `${this.baseURL}/repository/contracts/partial_match/${this.chainId}/${address}/metadata.json`;
			try {
				return (await fetchJSON(url)).output.abi;
			} catch (err: any) {
				if (!isSourcifyNotFound(err)) {
					throw new whatsabi.loaders.SourcifyABILoaderError(
						'SourcifyABILoader loadABI error: ' + err.message,
						{
							context: { address, url },
							cause: err
						}
					);
				}
			}
		}

		return [];
	} */

	async loadABI(address: string): Promise<any[]> {
		const url = `${this.baseURL}/v2/contract/${this.chainId}/${address}?fields=abi`;
		try {
			return (await fetchJSON(url)).abi;
		} catch (err: any) {
			if (!isSourcifyNotFound(err)) {
				throw new whatsabi.loaders.SourcifyABILoaderError(
					'SourcifyABILoader loadABI error: ' + err.message,
					{
						context: { address, url },
						cause: err
					}
				);
			}
		}

		return [];
	}
}
