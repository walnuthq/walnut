import { ClassPage } from '@/components/class-page';

export const runtime = 'edge';

export default async function Page({ params }: { params: { class_hash: string } }) {
	return <ClassPage classHash={params.class_hash} />;
}
