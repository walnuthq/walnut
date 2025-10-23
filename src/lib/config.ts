export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
export const VERIFY_URL =
	process.env.NODE_ENV === 'production'
		? 'https://verify.walnut.dev'
		: 'http://verify.walnut.local';
export const SOURCIFY_URL =
	process.env.NODE_ENV === 'production'
		? 'https://sourcify.walnut.dev'
		: 'http://sourcify.walnut.local';
