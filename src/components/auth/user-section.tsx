import React from 'react';
import UserAvatarDropdown from '@/components/auth/user-avatar-dropdown';
import { SignUpWithGithubButton } from '@/components/auth/sign-up-with-github-button';
import { authClient } from '@/lib/auth-client';

export function UserSection() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<div>
			{isPending ? (
				<div></div>
			) : session ? (
				<UserAvatarDropdown
					avatarSrc={session.user.image || ''}
					userName={session.user.name || ''}
				/>
			) : (
				<SignUpWithGithubButton />
			)}
		</div>
	);
}
