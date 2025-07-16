'use client';

import { HeaderNav } from '@/components/header';
import { Container } from '@/components/ui/container';
import { Footer } from '@/components/footer';
import { useEffect, useMemo, useState } from 'react';
import { SimulationsResponse } from '@/lib/types';
import { fetchSimulations } from '@/lib/api';
import { Loader } from '@/components/ui/loader';
import { SimulationsTable } from '@/components/sims-table';

export function SimulationsWithErrorPage({
	projectSlug,
	errorHash
}: {
	projectSlug: string;
	errorHash: string;
}) {
	const [simulationsData, setSimulationsData] = useState<SimulationsResponse | null>();
	const [fetchError, setFetchError] = useState<Error | null>(null);

	const errorMessage = useMemo(() => {
		return simulationsData?.simulations?.[0]?.error_message;
	}, [simulationsData]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setSimulationsData(await fetchSimulations({ projectSlug, errorHash }));
			} catch (error) {
				console.log('Error fetching data');
				setFetchError(new Error('Error fetching data'));
			}
		};

		fetchData();
	}, [projectSlug, errorHash]);

	return (
		<>
			<HeaderNav />
			<Container className="px-4 sm:px-6 lg:px-8">
				<main className="bg-white border-x border-b shadow-sm border-neutral-200 px-4 py-8 flex flex-col gap-8">
					{fetchError ? (
						<div>{fetchError.message}</div>
					) : simulationsData ? (
						<>
							<h1 className="text-xl font-medium leading-6">{simulationsData.project.name}</h1>
							<div>
								<h2 className="text-l font-medium leading-6 mb-4">Error message</h2>
								<div className="font-mono text-sm">{errorMessage}</div>
							</div>
							<div>
								<h2 className="text-l font-medium leading-6 mb-4">
									Simulations from the last 7 days with the same error message
								</h2>
								{simulationsData.simulations.length <= 0 ? (
									<>No simulations found</>
								) : (
									<SimulationsTable simulations={simulationsData.simulations} />
								)}
							</div>
						</>
					) : (
						<Loader />
					)}
				</main>
			</Container>
			<Footer />
		</>
	);
}
