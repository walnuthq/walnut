import { SimulationsPage } from '@/components/simulations-page';

export const runtime = 'edge';

export default async function Page({ params }: { params: { team_id: string } }) {
	return <SimulationsPage />;
}
