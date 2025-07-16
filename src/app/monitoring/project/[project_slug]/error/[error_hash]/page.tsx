import { SimulationsWithErrorPage } from '@/components/simulations-page/simulations-with-error';

export const runtime = 'edge';

export default async function Page({
	params
}: {
	params: { project_slug: string; error_hash: string };
}) {
	return (
		<SimulationsWithErrorPage projectSlug={params.project_slug} errorHash={params.error_hash} />
	);
}
