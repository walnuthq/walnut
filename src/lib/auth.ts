import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET || 'fallback-secret-key-change-in-production',
	baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
	trustedOrigins: ['http://localhost:3000'],
	cookie: {
		secure: false,
		sameSite: 'lax'
	},
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	emailAndPassword: {
		enabled: true
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60
		}
	},
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!
		}
	},
	plugins: [nextCookies()],
	logger: {
		level: 'debug',
		log: (level: string, message: string, ...args: any[]) => {
			console.log(`[Better Auth ${level.toUpperCase()}]`, message, ...args);
		}
	}
});
