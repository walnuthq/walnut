import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
	return new Response(JSON.stringify({ status: 'ok' }), {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}

export async function HEAD(request: NextRequest) {
	return new Response(null, { status: 200 });
}
