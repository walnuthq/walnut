export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
export const VERIFY_DOCS_URL = 'https://docs.walnut.dev/walnut-evm/verify-evm-contracts-in-walnut';
export const SOURCIFY_URL =
	process.env.NODE_ENV === 'production'
		? 'https://sourcify.walnut.dev'
		: 'http://sourcify.walnut.local';
export const VERIFY_URL =
	process.env.NODE_ENV === 'production'
		? 'https://verify.walnut.dev'
		: 'http://verify.walnut.local';
export const REPO_URL =
	process.env.NODE_ENV === 'production' ? 'https://repo.walnut.dev' : 'http://repo.walnut.local';
