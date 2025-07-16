'use client';

import { HeaderNav } from '@/components/header';
import { Container } from '@/components/ui/container';
import { Footer } from '@/components/footer';
import { useEffect, useState } from 'react';
import { SimulationsResponse } from '@/lib/types';
import { fetchSimulations } from '@/lib/api';
import { Loader } from '@/components/ui/loader';
import { Stats } from '@/components/stats';
import { SimulationsTable } from '@/components/sims-table';

export function SimulationsPage({ projectSlug }: { projectSlug?: string }) {
	const [simulationsData, setSimulationsData] = useState<SimulationsResponse | null>();

	useEffect(() => {
		const fetchData = async () => {
			try {
				setSimulationsData(await fetchSimulations({ projectSlug }));
			} catch (error) {
				console.log('Error fetching data');
			}
		};

		fetchData();
	}, [projectSlug]);

	useEffect(() => {
		if (!projectSlug && simulationsData?.project?.slug) {
			const newUrl = `/monitoring/project/${simulationsData.project.slug}`;
			window.history.pushState(null, '', newUrl);
		}
	}, [projectSlug, simulationsData]);

	return (
		<>
			<HeaderNav />
			<Container className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<main className="bg-white border-x border-b shadow-sm border-neutral-200 px-4 py-8 flex flex-col gap-12">
					{simulationsData && (
						<div>
							<h1 className="text-xl font-medium leading-6 mb-2">
								Monitoring for project: {simulationsData.project.name}
							</h1>
							<h2>Explore transaction simulations initiated from your web application</h2>
						</div>
					)}
					{simulationsData && simulationsData.simulations.length > 0 && (
						<div>
							<h2 className="text-l font-medium leading-6 mb-4">Overview: last 7 days</h2>
							<Stats stats={simulationsData.stats} project={simulationsData.project} />
						</div>
					)}

					<div>
						<div>
							<h2 className="text-l font-medium leading-6 mb-4">Latest simulations</h2>

							{simulationsData?.simulations ? (
								simulationsData.simulations.length <= 0 ? (
									<>No simulations found</>
								) : (
									<SimulationsTable simulations={simulationsData.simulations} />
								)
							) : simulationsData === null ? (
								<>Your account is not associated with any project</>
							) : (
								<Loader />
							)}
						</div>
					</div>
				</main>
			</Container>
			<Footer />
		</>
	);
}
