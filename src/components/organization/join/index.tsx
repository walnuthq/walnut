'use client';

import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { HeaderNav } from '@/components/header';
import { Footer } from '@/components/footer';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	useSetGlobalOrganizationIdInUserContext,
	useUserContext
} from '@/lib/context/user-context-provider';
import { SignUpWithGithubButton } from '@/components/auth/sign-up-with-github-button';
import { toast } from '@/components/hooks/use-toast';
import {
	acceptInvitationApi,
	getInvitationDetailsApi,
	InvitationDetails
} from '@/app/api/monitoring-api-service';

export function JoinOrganizationByInvitationPage() {
	const { isLogged } = useUserContext();
	const searchParams = useSearchParams();
	const setGlobalOrganizationId = useSetGlobalOrganizationIdInUserContext();
	const [invitationDetails, setInvitationDetails] = React.useState<InvitationDetails | undefined>(
		undefined
	);
	const [buttonDisabled, setButtonDisabled] = React.useState(false);
	const router = useRouter();
	const redirectUri = `${process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''}${
		process.env.NEXT_PUBLIC_LOGTO_SIGN_UP_INVITATION_REDIRECT_URL
	}`;
	// After user signup, user is redirected to redirectUri (server action) and later redirected to redirectUriPage (page)
	const redirectUriPage = `${process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''}/organization/join`;
	const getInvitationDetails = useCallback(async () => {
		const invitationDetailsRes = await getInvitationDetailsApi(
			searchParams.get('organizationId') ?? '',
			searchParams.get('email') ?? ''
		);
		if (invitationDetailsRes) {
			setInvitationDetails(invitationDetailsRes);
		} else {
			toast({
				title: `Invitation is not valid`,
				description: 'Sorry, this is invitation is not valid.',
				className: 'text-red-500'
			});
			console.log('No active invitation');
			router.push('/');
		}
	}, [router, searchParams]);
	useEffect(() => {
		if (window) {
			const currentUrl = window.location.href;
			// If is not logged and is not on redirectUriPage (but comes from invitation link): save this invitation link in storage
			if (!isLogged && currentUrl !== redirectUriPage) {
				localStorage.setItem('redirectUri', window.location.href);
			} else {
				// If user signed up (or was redirect here after sign up -> redirect him to his invitation link
				const invitationLinkRedirectUri = localStorage.getItem('redirectUri')!;
				if (currentUrl !== invitationLinkRedirectUri) {
					window.location.href = invitationLinkRedirectUri;
				}
			}
			// don't fetch details when is not on invitation page (but redirectUriPage)
			if (currentUrl !== redirectUriPage) {
				getInvitationDetails();
			}
		}
	}, [getInvitationDetails, isLogged, redirectUriPage]);

	const acceptInvitation = async () => {
		setButtonDisabled(true);
		const organizationId = searchParams.get('organizationId') ?? '';
		const accepted = await acceptInvitationApi(
			organizationId,
			invitationDetails?.invitationId ?? ''
		);
		if (accepted) {
			setGlobalOrganizationId(organizationId);
			toast({
				title: `You joined ${invitationDetails?.inviterName}'s team!`,
				description: 'Welcome to the team!'
			});
			router.push('/');
		} else {
			setButtonDisabled(false);
			console.log('Inviation accept failed');
		}
	};
	return (
		<>
			<HeaderNav hideUserSection={true} />

			<main className="overflow-y-auto flex-grow h-screen flex flex-col">
				<Container className="max-w-6xl mx-auto flex-grow flex items-center justify-center">
					<div className="grid w-full max-w-md">
						{invitationDetails && (
							<Card x-chunk="dashboard-04-chunk-1">
								<CardHeader>
									<CardTitle className="text-center text-3xl flex flex-col items-center">
										<Avatar className="h-10 w-10 mb-2">
											<AvatarImage src={invitationDetails?.inviterAvatarSrc} />
										</Avatar>
										<span>{invitationDetails?.inviterName} invited you to join the team</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="text-center">
									{isLogged ? (
										<Button
											onClick={acceptInvitation}
											disabled={!invitationDetails || buttonDisabled}
										>
											Accept invitation
										</Button>
									) : (
										<SignUpWithGithubButton redirectUri={redirectUri}></SignUpWithGithubButton>
									)}
								</CardContent>
							</Card>
						)}
					</div>
				</Container>
			</main>

			<Footer />
		</>
	);
}
