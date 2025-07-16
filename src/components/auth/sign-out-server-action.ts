'use server';

import { signOut } from '@logto/next/server-actions';
import { logtoClientNextConfig } from '@/app/api/logto-config';

export async function githubSignOut() {
    await signOut(logtoClientNextConfig);
}