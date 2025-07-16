'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getLoggedUser } from '@/app/api/auth/auth-service';

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
	const [isLoaded, setIsLoaded] = useState(false);
	const [isLogged, setIsLogged] = useState(false);
	const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);
	const [name, setName] = useState('');
	const [organizationId, setOrganizationId] = useState('');
	const [isGlobalOrg, setIsGlobalOrg] = useState(false);

	useEffect(() => {
		const fetchUserProfile = async () => {
			try {
				const loggedUser = await getLoggedUser();
				if (loggedUser) {
					setIsLogged(true);
					setAvatarSrc(loggedUser.avatarSrc);
					setName(loggedUser.name);

					// User can or not belong to global org
					// If user does not belong to global org - his organizationId is his userId
					// If user belongs to global org - get his organizationId
					// Because currently Logto does not support refreshToken on demand,
					// we need to store user's organizationId after organization creaiton in localStorage before 1st refresh made automatically (~1h)
					// TODO Remove this localStorage when Logto introduces refreshToken on demand
					let userOrganizationId = loggedUser.userId;
					let isGlobalOrg = false;
					if (loggedUser.organizationIds.length > 0) {
						userOrganizationId = loggedUser.organizationIds[0];
						isGlobalOrg = true;
						localStorage.removeItem('organizationId');
					} else if (localStorage.getItem('organizationId') !== null) {
						userOrganizationId = localStorage.getItem('organizationId')!;
						isGlobalOrg = true;
					}
					setOrganizationId(userOrganizationId);
					setIsGlobalOrg(isGlobalOrg);
				} else {
					setIsLogged(false);
				}
			} catch (error) {
				console.error('Failed to fetch profile data', error);
				setIsLogged(false);
			} finally {
				setIsLoaded(true);
			}
		};
		fetchUserProfile();
	}, []);

	return (
		<UserContext.Provider value={{ isLoaded, isLogged, avatarSrc, name, organizationId, isGlobalOrg, setOrganizationId, setIsGlobalOrg }}>
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