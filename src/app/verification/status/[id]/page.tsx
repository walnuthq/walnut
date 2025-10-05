'use client';

import { VerificationStatusPage } from '@/components/verification-page/status';
import { useEffect, useState } from 'react';

export const runtime = 'edge';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
	const [id, setId] = useState<string>('');

	useEffect(() => {
		params
			.then(({ id }) => {
				setId(id);
			})
			.catch(console.error);
	}, [params]);

	if (!id) return null;
	return <VerificationStatusPage verificationId={id} />;
}
