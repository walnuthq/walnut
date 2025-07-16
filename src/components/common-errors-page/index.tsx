'use client';

import { HeaderNav } from '@/components/header';
import { Container } from '@/components/ui/container';
import { Footer } from '@/components/footer';
import { useEffect, useState } from 'react';
import { Project, CommonError } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { fetchCommonErrors } from '@/lib/api';
import CommonErrorsTable from '@/components/errors-table';

export function CommonErrorsPage({ projectSlug }: { projectSlug: string }) {
	const [commonErrors, setCommonErrors] = useState<CommonError[]>();
	const [project, setProject] = useState<Project>();

	useEffect(() => {
		const fetchData = async () => {
			try {
				const { project, common_errors } = await fetchCommonErrors({ projectSlug });
				setCommonErrors(common_errors);
				setProject(project);
			} catch (error) {
				console.log('Error fetching data');
			}
		};

		fetchData();
	}, [projectSlug]);

	return (
		<>
			<HeaderNav />
			<Container className="px-4 sm:px-6 lg:px-8">
				<main className="bg-white border-x border-b shadow-sm border-neutral-200 px-4 py-8 flex flex-col gap-4">
					{project && commonErrors ? (
						<>
							<h1 className="text-xl font-medium leading-6">
								{project.name}&apos;s the most common errors for the last 7 days
							</h1>
							<CommonErrorsTable
								commonErrors={commonErrors.filter((e) => e.error_message !== '')}
								projectSlug={project.slug}
							/>
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
