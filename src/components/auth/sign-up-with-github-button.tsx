'use client';

import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export function SignUpWithGithubButton() {
	const handleGitHubLogin = () => {
		authClient.signIn.social({
			provider: 'github'
		});
	};

	return (
		<Button onClick={handleGitHubLogin} variant="outline">
			Sign up with GitHub
		</Button>
	);
}
