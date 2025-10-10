import { authClient } from '@/lib/auth-client';

/**
 * Performs logout and redirects to login page
 */
export async function performLogout(): Promise<void> {
	try {
		await authClient.signOut();
		// Redirect to login page after successful logout
		window.location.href = '/login';
	} catch (error) {
		console.error('Logout failed:', error);
		// Even if logout fails, redirect to login page
		window.location.href = '/login';
	}
}
