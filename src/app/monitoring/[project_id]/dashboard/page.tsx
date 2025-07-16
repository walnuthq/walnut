'use client';
import React, { useEffect, useState, useRef } from 'react';
import { HeaderNav } from '@/components/header';
import {
	getMonitoringErrorsApi,
	getMonitoringErrorsOverviewApi,
	MonitoringErrorsOverview,
	MonitoringErrorType
} from '@/app/api/monitoring-api-service';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorsTable } from '@/components/monitoring/errors-table';
import { Footer } from '@/components/footer';

export const runtime = 'edge';

const Dashboard = ({ params }: { params: { project_id: string } }) => {
	const [page, setPage] = useState<number>(1);
	const [totalPages, setTotalPages] = useState<number>(1);
	const [monitoringErrorsOverview, setMonitoringErrorsOverview] = useState<MonitoringErrorsOverview | undefined>(undefined);
	const [errors, setErrors] = useState<MonitoringErrorType[]>([]);
	const searchParams = useSearchParams();
	const router = useRouter();
	const [firstLoadDone, setFirstLoadDone] = useState<boolean>(false);
	let refreshInterval = useRef<any>(undefined);

	const getMonitoringErrors = async (page: number) => {
		const offset = (page - 1) * 10;
		const monitoringErrors = await getMonitoringErrorsApi(params.project_id, offset);
		setErrors(monitoringErrors);
	};

	const getMonitoringErrorsOverview = async () => {
		const monitoringErrorsOverview = await getMonitoringErrorsOverviewApi(params.project_id);
		setMonitoringErrorsOverview(monitoringErrorsOverview);
		setPagesDetails(monitoringErrorsOverview.totalErrorsCount);
	};

	const setPagesDetails = (totalErrorsCount: number) => {
		const totalPages = Math.ceil(totalErrorsCount / 10);
		setTotalPages(totalPages);
	};

	useEffect(() => {
		let currentPage = 1;
		try {
			currentPage = Number(searchParams.get('p') ?? 1);
			setPage(currentPage);
		} catch (error) {
			setPage(1);
		}
		getMonitoringErrorsOverview();
		getMonitoringErrors(page);
		setFirstLoadDone(true);
		updateRefreshInterval(currentPage);

		return () => {
			if (refreshInterval.current) {
				clearInterval(refreshInterval.current);
				refreshInterval.current = null;
			}
		};
	}, []);


	const updateRefreshInterval = (currentPage: number) => {
		if (refreshInterval.current) {
			clearInterval(refreshInterval.current);
			refreshInterval.current = null;
		}

		refreshInterval.current = setInterval(() => {
			if (currentPage === 1) {
				getMonitoringErrors(currentPage);
			}
			getMonitoringErrorsOverview();
		}, 10000);
	};

	useEffect(() => {
		if (!firstLoadDone) return;
		updateRefreshInterval(page);
		getMonitoringErrors(page);
	}, [page]);

	const handlePreviousPage = () => {
		setPage(page - 1);
	};

	const handleNextPage = () => {
		setPage(page + 1);
	};

	const openEventsPage = (error: MonitoringErrorType) => {
		router.push(`/monitoring/${params.project_id}/events/${error.id}`);
	};

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderNav />
			<main className="flex flex-col pb-4 sm:pb-6 lg:pb-8 flex-1">
				<section className="border-grid border-b px-4 sm:px-6 lg:px-8">
					<div className="container-wrapper">
						<div className="flex flex-col items-start gap-1 py-8 md:py-10 lg:py-12">
							<h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:leading-[1.1]">
								{monitoringErrorsOverview?.projectName ?? 'Monitoring'} Dashboard
							</h1>
						</div>
					</div>
				</section>
				<section className="flex flex-col gap-4 px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex flex-row gap-4">
						<Card className="basis-1/3">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-normal">Total failed transactions</CardTitle>
							</CardHeader>
							<CardContent className="">
								<div className="text-2xl font-bold">
									{monitoringErrorsOverview?.totalErrorsCount ?? 0}
								</div>
							</CardContent>
						</Card>
						<Card className="basis-1/3">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-normal">User addresses affected</CardTitle>
							</CardHeader>
							<CardContent className="">
								<div className="text-2xl font-bold">
									{monitoringErrorsOverview?.uniqueSendersCount ?? 0}
								</div>
							</CardContent>
						</Card>
						<Card className="basis-1/3">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-normal">Unique errors</CardTitle>
							</CardHeader>
							<CardContent className="">
								<div className="text-2xl font-bold">
									{monitoringErrorsOverview?.uniqueErrorsCount ?? 0}
								</div>
							</CardContent>
						</Card>
					</div>
					<div className="flex flex-row">
						<ErrorsTable
							errors={errors}
							onNext={page >= totalPages ? undefined : handleNextPage}
							onPrevious={page <= 1 ? undefined : handlePreviousPage}
							onErrorClick={openEventsPage}
						/>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
};

export default Dashboard;
