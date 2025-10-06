'use client';

import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';

export function IndexNav() {
	const { data: session } = authClient.useSession();
	return (
		<div className="absolute top-4 right-4 gap-2 flex flex-row">
			<UserAvatar />
		</div>
	);
}
