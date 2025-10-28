import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthType, TenantNetwork } from './types';
import { db } from '@/db';
import { tenant, tenantRpcConfig, user } from '@/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';

export async function getServerSession(): Promise<AuthType | null> {
	const betterAuthResponse = await auth.api.getSession({
		headers: await headers()
	});

	if (!betterAuthResponse || !betterAuthResponse.user || !betterAuthResponse.session) {
		return null;
	}

	// Get all tenant data and RPC configs for the user
	if (betterAuthResponse.user?.email) {
		try {
			// Find all tenants where user's email is in the githubEmails array
			const tenantsData = await db
				.select()
				.from(tenant)
				.where(sql`${betterAuthResponse.user.email} = ANY(${tenant.githubEmails})`);

			console.debug('[auth] user email:', betterAuthResponse.user.email);
			console.debug('[auth] tenants found:', tenantsData.length);

			let tenantNetworks: TenantNetwork[] = [];

			if (tenantsData.length > 0) {
				const tenantIds = tenantsData.map((t) => t.id);

				const rpcConfigs = await db
					.select()
					.from(tenantRpcConfig)
					.where(inArray(tenantRpcConfig.tenantId, tenantIds));
				// Create tenant networks array
				tenantNetworks = rpcConfigs.map((rpcConfig) => {
					const tenantInfo = tenantsData.find((t) => t.id === rpcConfig.tenantId);
					return {
						tenantId: rpcConfig.tenantId!,
						tenantName: tenantInfo?.name || 'Unknown Tenant',
						rpcUrl: rpcConfig.rpcUrl,
						chainId: rpcConfig.chainId,
						displayName: rpcConfig.displayName || `${tenantInfo?.name} - Chain ${rpcConfig.chainId}`
					};
				});

				// Update tenantId in user table (use first tenant if there are multiple)
				await db
					.update(user)
					.set({ tenantId: tenantsData[0].id })
					.where(eq(user.id, betterAuthResponse.user.id));
			}
			// Add tenant networks to session object
			(betterAuthResponse.session as AuthType['session'])!.tenantNetworks = tenantNetworks;
		} catch (error) {
			console.error('Error fetching tenant data:', error);
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
