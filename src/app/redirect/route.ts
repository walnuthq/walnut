import { redirect } from 'next/navigation';

// Default redirection endpoint after sign up with Github
export async function GET() {
	redirect('/');
}
