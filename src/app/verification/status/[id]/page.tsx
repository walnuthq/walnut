'use client';

import { VerificationStatusPage } from '@/components/verification-page/status';

export const runtime = 'edge';

export default function Page({ params }: { params: { id: string } }) {
	return <VerificationStatusPage verificationId={params.id} />;
}
