import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthType } from './types';
import { db } from '@/db';
import { tenant, user } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function getServerSession(): Promise<AuthType | null> {
	const betterAuthResponse = await auth.api.getSession({
		headers: await headers()
	});

	if (!betterAuthResponse || !betterAuthResponse.user || !betterAuthResponse.session) {
		return null;
	}

	// Get tenant data and enrich session
	if (betterAuthResponse.user?.email) {
		const tenantData = await db
			.select()
			.from(tenant)
			.where(sql`${betterAuthResponse.user.email} = ANY(${tenant.githubEmails})`)
			.limit(1);

		if (tenantData.length > 0) {
			// Dodaj tenant podatke u session objekat
			(betterAuthResponse.session as AuthType['session'])!.tenant = {
				name: tenantData[0].name,
				rpcUrls: tenantData[0].rpcUrls,
				chainIds: tenantData[0].chainIds
			};
			// Ažuriraj tenantId u user tabeli
			await db
				.update(user)
				.set({ tenantId: tenantData[0].id })
				.where(eq(user.id, betterAuthResponse.user.id));
		}
	}

	const sessionWithTenant: AuthType = {
		user: betterAuthResponse.user,
		session: betterAuthResponse.session as AuthType['session']
	};

	return sessionWithTenant;
}

export async function requireAuth(): Promise<AuthType> {
	const session = await getServerSession();

	if (!session) {
		redirect('/login');
	}

	return session;
}
