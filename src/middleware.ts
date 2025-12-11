import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Router middleware. Configure here URLs to which user has/not have access (logged/not logged).
 */
export async function middleware(request: NextRequest) {
	// Allowed origins for CORS
	const allowedOrigins =
		process.env.NODE_ENV === 'production'
			? ['https://verify.walnut.dev', 'https://evm.walnut.dev', 'https://docs.walnut.dev']
			: [
					'http://verify.walnut.local',
					'http://evm.walnut.local',
					'http://localhost:5050',
					'http://localhost:3000',
					'http://127.0.0.1:3000'
			  ];

	// Handle CORS for API routes
	if (request.nextUrl.pathname.startsWith('/api/')) {
		const origin = request.headers.get('origin');
		const referer = request.headers.get('referer');
		const requestOrigin = request.nextUrl.origin;

		// Determine CORS origin
		let corsOrigin: string | null = null;

		if (origin) {
			// Origin header is present - check if it's allowed
			if (allowedOrigins.includes(origin)) {
				corsOrigin = origin;
			}
		} else {
			// No origin header - could be same-origin request
			// Check if request is from allowed domain
			if (allowedOrigins.includes(requestOrigin)) {
				corsOrigin = requestOrigin;
			} else if (referer) {
				// Check referer as fallback
				try {
					const refererUrl = new URL(referer);
					const refererOrigin = refererUrl.origin;
					if (allowedOrigins.includes(refererOrigin)) {
						corsOrigin = refererOrigin;
					}
				} catch {
					// Invalid referer URL, ignore
				}
			}
		}

		// Handle preflight OPTIONS requests
		if (request.method === 'OPTIONS') {
			const response = new NextResponse(null, { status: 200 });
			if (corsOrigin) {
				response.headers.set('Access-Control-Allow-Origin', corsOrigin);
				response.headers.set('Access-Control-Allow-Credentials', 'true');
			}
			response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
			response.headers.set(
				'Access-Control-Allow-Headers',
				'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
			);
			return response;
		}

		// For actual requests, add CORS headers
		const response = NextResponse.next();
		if (corsOrigin) {
			response.headers.set('Access-Control-Allow-Origin', corsOrigin);
			response.headers.set('Access-Control-Allow-Credentials', 'true');
		}
		response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
		response.headers.set(
			'Access-Control-Allow-Headers',
			'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
		);
		return response;
	}

	// Check for auth session cookie
	const sessionCookie = request.cookies.get(
		`${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}better-auth.session_token`
	);
	const isLogged = !!sessionCookie;

	const openPageOrGoToLoginIfNotLogged = async (url: URL) => {
		return isLogged
			? NextResponse.next()
			: NextResponse.redirect(
					`${
						process.env.NODE_ENV === 'production'
							? 'https://evm.walnut.dev'
							: 'http://evm.walnut.local'
					}/login`
			  );
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

// Matcher to apply middleware only to specific routes
export const config = {
	matcher: ['/api/:path*', '/settings']
};
