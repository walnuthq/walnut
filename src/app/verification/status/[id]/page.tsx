import { VerificationStatusPage } from '@/components/verification-page/status';

export const runtime = 'edge';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	return <VerificationStatusPage verificationId={id} />;
}
