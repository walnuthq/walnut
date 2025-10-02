'use client';

import { extractSimulationPayloadWithCalldata } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { SimulationPage } from './simulation-page';

export const runtime = 'edge';

export default function Page() {
	return <SimulationPage />;
}
