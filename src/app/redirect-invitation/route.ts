import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logtoClientNextConfig } from '@/app/api/logto-config';

// For Cloudflare
export const runtime = 'edge';

// This is a redirection endpoint from invitation link
// User signs up on redirection link page and after Github sign up, is redirect to this endpoint
// which later redirects to /organization/join page
export async function GET(request: NextRequest) {
    await handleSignIn(logtoClientNextConfig, new URL(request.url));
    redirect('/organization/join');
}