import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logtoClientNextConfig } from '@/app/api/logto-config';

// For Cloudflare
export const runtime = 'edge';

// Default redirection endpoint after sign up with Github
export async function GET(request: NextRequest) {
    await handleSignIn(logtoClientNextConfig, new URL(request.url));
    redirect('/');
}