'use client';

import { SimulationPage } from '@/components/simulation-page';
import { extractSimulationPayloadWithCalldata } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export const runtime = 'edge';

export default function Page() {
	const searchParams = useSearchParams();

	const simulationPayload = extractSimulationPayloadWithCalldata(searchParams);
	return <SimulationPage simulationPayload={simulationPayload} />;
}
