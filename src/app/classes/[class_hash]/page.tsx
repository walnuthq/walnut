import { ClassPage } from '@/components/class-page';

export const runtime = 'edge';

export default async function Page({ params }: { params: Promise<{ class_hash: string }> }) {
	const { class_hash } = await params;
	return <ClassPage classHash={class_hash} />;
}
