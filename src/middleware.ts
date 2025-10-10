import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Router middleware. Configure here URLs to which user has/not have access (logged/not logged).
 */
export async function middleware(request: NextRequest) {
	// Check for auth session cookie
	const sessionCookie = request.cookies.get('better-auth.session_token');
	const isLogged = !!sessionCookie;

	const openPageOrGoToLoginIfNotLogged = async (url: URL) => {
		return isLogged
			? NextResponse.next()
			: NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''}/login`);
	};

	const url = new URL(request.url);
	switch (url.pathname) {
		case '/settings':
			return openPageOrGoToLoginIfNotLogged(url);
		default: {
			return NextResponse.next();
		}
	}
}
