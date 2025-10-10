import { redirect } from 'next/navigation';

// This is a redirection endpoint from invitation link
// User signs up on redirection link page and after Github sign up, is redirect to this endpoint
// which later redirects to /organization/join page
export async function GET() {
	redirect('/organization/join');
}
