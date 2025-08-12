'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export function UserAvatar() {
	const session = useSession();
	return (
		<>
			{session.status === 'authenticated' ? (
				<DropdownMenu>
					<DropdownMenuTrigger className="outline-none focus:outline-none">
						<Avatar className="h-8 w-8">
							{session.data.user?.image && <AvatarImage src={session.data.user.image} />}
							<AvatarFallback className="text-sm uppercase bg-neutral-200">
								{session.data.user?.email?.[0]}
							</AvatarFallback>
						</Avatar>
					</DropdownMenuTrigger>
					{/* <DropdownMenuContent>
						<DropdownMenuItem onClick={() => signOut()}>Log out</DropdownMenuItem>
					</DropdownMenuContent> */}
				</DropdownMenu>
			) : session.status === 'unauthenticated' ? (
				// <Button onClick={() => signIn('cognito')} variant="outline">
				// 	Log in
				// </Button>
				<></>
			) : (
				<></>
			)}
		</>
	);
}
