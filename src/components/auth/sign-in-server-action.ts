'use server';

import { signIn } from '@logto/next/server-actions';
import { logtoClientNextConfig } from '@/app/api/logto-config';

export async function githubSignIn(redirectUri?: string) {
    await signIn(logtoClientNextConfig, {
        redirectUri: redirectUri ?? `${process.env.NEXT_PUBLIC_APP_BASE_URL}${process.env.LOGTO_SIGN_UP_MAIN_REDIRECT_URL}`,
        directSignIn: { method: 'social', target: 'github' }
    });
}