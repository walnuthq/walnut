'use server';
import { getLogtoContext } from '@logto/next/server-actions';
import { logtoClientNextConfig } from '@/app/api/logto-config';
import { isAuthorizationRequiredFeatureActive } from '@/app/api/feature-flag-service';

export interface LoggedUser {
	// User global organization IDs
	organizationIds: string[];
	// User unique ID
	userId: string;
	// User name from Github
	name: string;
	// User avatar src (link to Github avatar picture)
	avatarSrc?: string;
}

// If TEST_USER env variable is set, it will return this user
export const getLoggedUser = async (): Promise<LoggedUser | undefined> => {
	const testUser = process.env.TEST_USER ?? 'Testuser';
	if (testUser || !isAuthorizationRequiredFeatureActive()) {
		return {
			// Application will treat user as having global org, but won't be able to do any actions related with Logto (inviting members, generating API KEY, etc.)
			organizationIds: ['testuser-org'],
			userId: 'testuser',
			name: 'Testuser'
		};
	}
	const { claims } = await getLogtoContext(logtoClientNextConfig);
	if (claims) {
		return {
			organizationIds: claims.organizations ?? [],
			userId: claims.sub,
			// name can not exist when not set on Github
			name: claims.name ?? 'User',
			avatarSrc: claims.picture ?? undefined
		};
	}
};

export const isLogged = async (): Promise<boolean> => {
	const testUser = process.env.TEST_USER ?? 'Testuser';
	if (testUser) {
		return true;
	}
	if (!isAuthorizationRequiredFeatureActive()) {
		return true;
	}
	const { claims } = await getLogtoContext(logtoClientNextConfig);
	return !!claims;
};
