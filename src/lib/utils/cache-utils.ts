export const CACHE_TTL_MS = 0; //15 * 60 * 1000; //cache time

export function safeStringify(value: any): string {
	return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v));
}

export function safeParse<T = any>(value: string): T {
	return JSON.parse(value, (_, v) => {
		if (typeof v === 'string' && /^\d+n$/.test(v)) {
			return BigInt(v.slice(0, -1));
		}
		return v;
	});
}

export function setCacheWithTTL(key: string, value: any) {
	const record = {
		timestamp: Date.now(),
		data: value
	};
	localStorage.setItem(key, safeStringify(record));
}

export function getCacheWithTTL<T = any>(key: string): T | null {
	const raw = localStorage.getItem(key);
	if (!raw) return null;

	try {
		const record = safeParse(raw);
		if (!record.timestamp || !record.data) return null;

		if (Date.now() - record.timestamp > CACHE_TTL_MS) {
			localStorage.removeItem(key);
			return null;
		}
		return record.data as T;
	} catch {
		localStorage.removeItem(key);
		return null;
	}
}
