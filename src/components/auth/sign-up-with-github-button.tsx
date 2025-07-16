import { Button } from '@/components/ui/button';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { githubSignIn } from '@/components/auth/sign-in-server-action';

export function SignUpWithGithubButton({ redirectUri }: { redirectUri?: string }) {
    return (
        <Button variant="outline" onClick={() => githubSignIn(redirectUri)}><GitHubLogoIcon className="mr-2 h-4 w-4"/>
            Sign in with Github
        </Button>
    );
}