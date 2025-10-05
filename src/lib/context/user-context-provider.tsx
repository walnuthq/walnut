'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

interface UserContextType {
	isLoaded: boolean;
	isLogged: boolean;
	avatarSrc?: string;
	name: string;
	organizationId: string;
	// if there are more members, is global org
	isGlobalOrg: boolean;
	setOrganizationId: (organizationId: string) => void;
	setIsGlobalOrg: (isGlobalOrg: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { data: session, isPending } = authClient.useSession();
	const [organizationId, setOrganizationId] = useState('');
	const [isGlobalOrg, setIsGlobalOrg] = useState(false);

	useEffect(() => {
		// User can or not belong to global org
		// If user does not belong to global org - his organizationId is his userId
		// If user belongs to global org - get his organizationId
		if (session?.user) {
			let userOrganizationId = session.user.id;
			let isGlobalOrg = false;

			// Check if user has organization data (you might need to extend Better Auth user model)
			// For now, we'll use localStorage as fallback
			if (localStorage.getItem('organizationId') !== null) {
				userOrganizationId = localStorage.getItem('organizationId')!;
				isGlobalOrg = true;
			}
			setOrganizationId(userOrganizationId);
			setIsGlobalOrg(isGlobalOrg);
		}
	}, [session]);

	const isLoaded = !isPending;
	const isLogged = !!session;
	const avatarSrc = session?.user?.image || undefined;
	const name = session?.user?.name || '';

	return (
		<UserContext.Provider
			value={{
				isLoaded,
				isLogged,
				avatarSrc,
				name,
				organizationId,
				isGlobalOrg,
				setOrganizationId,
				setIsGlobalOrg
			}}
		>
			{children}
		</UserContext.Provider>
	);
};

export const useUserContext = (): UserContextType => {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error('useUserContext must be used within a UserProvider');
	}
	return context;
};

export const useSetGlobalOrganizationIdInUserContext = () => {
	const context = useContext(UserContext);
	if (!context) {
		throw new Error('useSetOrganizationId must be used within a UserProvider');
	}

	return (organizationId: string) => {
		//todo remove when Logto introduces refreshToken on demand
		localStorage.setItem('organizationId', organizationId);
		context.setOrganizationId(organizationId);
		context.setIsGlobalOrg(true);
	};
};
