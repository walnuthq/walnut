'use client';

import { authClient } from '@/lib/auth-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function UserAvatar() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />;
	}

	return (
		<>
			{session?.user ? (
				<DropdownMenu>
					<DropdownMenuTrigger className="outline-none focus:outline-none">
						<Avatar className="h-8 w-8">
							{session.user.image && <AvatarImage src={session.user.image} />}
							<AvatarFallback className="text-sm uppercase bg-neutral-200">
								{session.user.email?.[0] || session.user.name?.[0] || 'U'}
							</AvatarFallback>
						</Avatar>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem onClick={() => authClient.signOut()}>Log out</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<Button onClick={() => authClient.signIn.social({ provider: 'github' })} variant="outline">
					Log in
				</Button>
			)}
		</>
	);
}
