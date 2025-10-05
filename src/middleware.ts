import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isLogged } from '@/app/api/auth/auth-service';

/**
 * Router middleware. Configure here URLs to which user has/not have access (logged/not logged).
 */
export async function middleware(request: NextRequest) {
	const isUserLogged = await isLogged();
	const openPageOrGoToLoginIfNotLogged = async (url: URL) => {
		return isUserLogged
			? NextResponse.next()
			: NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''}/login`);
	};
	const url = new URL(request.url);
	switch (url.pathname) {
		case '/':
		case '/settings':
			return openPageOrGoToLoginIfNotLogged(url);
		default: {
			return NextResponse.next();
		}
	}
}
