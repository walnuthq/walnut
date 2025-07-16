import React from 'react';
import UserAvatarDropdown from '@/components/auth/user-avatar-dropdown';
import { SignUpWithGithubButton } from '@/components/auth/sign-up-with-github-button';
import { useUserContext } from '@/lib/context/user-context-provider';

export function UserSection() {
    const { isLoaded, isLogged, avatarSrc, name } = useUserContext();
    return (
        <div>
            {isLoaded ? (isLogged ? <UserAvatarDropdown avatarSrc={avatarSrc} userName={name}/> : <SignUpWithGithubButton/>) : <div></div>}
        </div>
    );
}