import { SimulationsPage } from '@/components/simulations-page';

export const runtime = 'edge';

export default async function Page({ params }: { params: { project_slug: string } }) {
	return <SimulationsPage projectSlug={params.project_slug} />;
}
