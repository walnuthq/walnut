import { API_URL } from '@/lib/config';
import { authClient } from '@/lib/auth-client';
import camelcaseKeys from 'camelcase-keys';

const CLASS_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;
const DOTS_SLASH_REGEX = /[./]/;
const CAMELCASE_EXCLUDE = [CLASS_HASH_REGEX, DOTS_SLASH_REGEX];

interface FetchApiParams {
	init?: RequestInit | undefined;
	data?: unknown;
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	queryParams?: { [key: string]: string | number };
	renameToCamelCase?: boolean;
}

async function makeApiRequest(input: string, params?: FetchApiParams) {
	input = API_URL + input;
	const body = params?.data ? JSON.stringify(params?.data) : params?.init?.body;
	const method = params?.method ?? params?.init?.method ?? 'GET';
	let headers: HeadersInit = { 'Content-Type': 'application/json', ...params?.init?.headers };
	// Get session token from Better Auth
	const session = await authClient.getSession();
	const authToken = session.data?.session?.token;
	if (authToken)
		headers = {
			Authorization: `Bearer ${authToken}`,
			...headers
		};
	let queryString = '';
	if (params?.queryParams) {
		queryString = `?${Object.entries(params?.queryParams)
			.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
			.join('&')}`;
	}
	const init: RequestInit | undefined = {
		...params?.init,
		body: method !== 'GET' ? body : undefined,
		headers,
		method
	};
	return fetch(input + queryString, init);
}

export async function fetchApi<ResponseDataType>(
	input: string,
	params?: FetchApiParams
): Promise<ResponseDataType> {
	const response = await makeApiRequest(input, params);
	if (!response.ok) {
		let errorMsg = await response.text();
		try {
			const json = JSON.parse(errorMsg);
			if (json.error) errorMsg = json.error;
		} catch {}

		// Create error with status code for better error handling
		const error = new Error(errorMsg);
		(error as any).status = response.status;
		throw error;
	} else {
		if (params?.renameToCamelCase)
			return camelcaseKeys(await response.json(), {
				deep: true,
				exclude: CAMELCASE_EXCLUDE
			}) as ResponseDataType;
		else return response.json() as Promise<ResponseDataType>;
	}
}

export async function safeFetchApi<ResponseDataType>(
	input: string,
	params?: FetchApiParams
): Promise<{ isError: boolean; response: ResponseDataType }> {
	const response = await makeApiRequest(input, params);
	const isError = !response.ok;
	if (params?.renameToCamelCase)
		return {
			isError,
			response: camelcaseKeys(await response.json(), {
				deep: true,
				exclude: CAMELCASE_EXCLUDE
			}) as ResponseDataType
		};
	else return { isError, response: (await response.json()) as ResponseDataType };
}
