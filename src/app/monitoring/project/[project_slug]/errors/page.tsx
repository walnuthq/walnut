import { CommonErrorsPage } from '@/components/common-errors-page';

export const runtime = 'edge';

export default async function Page({ params }: { params: { project_slug: string } }) {
	return <CommonErrorsPage projectSlug={params.project_slug} />;
}
