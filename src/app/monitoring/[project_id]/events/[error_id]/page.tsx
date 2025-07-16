'use client';
import React, { useEffect, useRef, useState } from 'react';
import { HeaderNav } from '@/components/header';
import {
	getMonitoringErrorEventsOverviewApi,
	getMonitoringEventsApi,
	MonitoringErrorEventsOverview,
	MonitoringEventType
} from '@/app/api/monitoring-api-service';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/footer';
import { EventsTable } from '@/components/monitoring/events-table';
import { Button } from '@/components/ui/button';
import { ArrowUturnLeftIcon } from '@heroicons/react/16/solid';

export const runtime = 'edge';

const EventsPage = ({ params }: { params: { project_id: string; error_id: string } }) => {
	const [page, setPage] = useState<number>(1);
	const [totalPages, setTotalPages] = useState<number>(1);
	const [monitoringEventsOverview, setMonitoringEventsOverview] = useState<
		MonitoringErrorEventsOverview | undefined
	>(undefined);
	const [events, setEvents] = useState<MonitoringEventType[]>([]);
	const searchParams = useSearchParams();
	const router = useRouter();

	const [firstLoadDone, setFirstLoadDone] = useState<boolean>(false);

	const getMonitoringEvents = async (page: number) => {
		const offset = (page - 1) * 10;
		const monitoringEvents = await getMonitoringEventsApi(
			params.project_id,
			params.error_id,
			offset
		);
		setEvents(monitoringEvents);
	};

	const getMonitoringErrorOverview = async () => {
		const overview = await getMonitoringErrorEventsOverviewApi(params.project_id, params.error_id);
		setMonitoringEventsOverview(overview);
		setPagesDetails(overview.totalCount);
	};

	const setPagesDetails = (totalEventsCount: number) => {
		const totalPages = Math.ceil(totalEventsCount / 10);
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
		getMonitoringErrorOverview();
		getMonitoringEvents(page);
		setFirstLoadDone(true);
		updateRefreshInterval(currentPage);

		return () => {
			if (refreshInterval.current) {
				clearInterval(refreshInterval.current);
				refreshInterval.current = null;
			}
		};
	}, []);

	let refreshInterval = useRef<any>(undefined);

	const updateRefreshInterval = (currentPage: number) => {
		if (refreshInterval.current) {
			clearInterval(refreshInterval.current);
			refreshInterval.current = null;
		}

		refreshInterval.current = setInterval(() => {
			if (currentPage === 1) {
				getMonitoringEvents(currentPage);
			}
			getMonitoringErrorOverview();
		}, 10000);
	};

	useEffect(() => {
		if (!firstLoadDone) return;
		updateRefreshInterval(page);
		getMonitoringEvents(page);
	}, [page]);

	const handlePreviousPage = () => {
		setPage(page - 1);
	};

	const handleNextPage = () => {
		setPage(page + 1);
	};

	const goBack = () => {
		router.push(`/monitoring/${params.project_id}/dashboard`);
	};

	return (
		<div className="min-h-screen flex flex-col">
			<HeaderNav />
			<main className="flex flex-col pb-4 sm:pb-6 lg:pb-8 flex-1">
				<section className="border-grid border-b px-4 sm:px-6 lg:px-8">
					<div className="container-wrapper">
						<div className="flex flex-col items-start gap-1 py-8 md:py-10 lg:py-8">
							<Button variant="outline" className="text-sm px-3 py-1 h-auto mb-2" onClick={goBack}>
								<ArrowUturnLeftIcon className="mr-2 h-4 w-4" /> Back
							</Button>
							<h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:leading-[1.1]">
								Error details
							</h1>
							<h2 className="text-1xl font-semibold text-red-600">
								{monitoringEventsOverview?.error ?? ''}
							</h2>
							{/* <p className="text-balance text-lg font-light text-foreground">
								{getNetworkName(monitoringEventsOverview?.network)}
							</p> */}
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
									{monitoringEventsOverview?.totalCount ?? 0}
								</div>
								{/*<p className="text-xs text-muted-foreground">+20.1% from last week</p>*/}
							</CardContent>
						</Card>
						<Card className="basis-1/3">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-normal">User addresses affected</CardTitle>
							</CardHeader>
							<CardContent className="">
								<div className="text-2xl font-bold">
									{monitoringEventsOverview?.uniqueSendersCount ?? 0}
								</div>
								{/*<p className="text-xs text-muted-foreground">+20.1% from last week</p>*/}
							</CardContent>
						</Card>
						<Card className="basis-1/3  ">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-normal">First incident recorded</CardTitle>
							</CardHeader>
							<CardContent className="">
								<div className="text-2xl font-bold ">
									{' '}
									{monitoringEventsOverview?.firstOccurrenceDate.toLocaleString()}
								</div>
							</CardContent>
						</Card>
					</div>
					<div className="flex flex-row">
						<EventsTable
							events={events}
							onNext={page >= totalPages ? undefined : handleNextPage}
							onPrevious={page <= 1 ? undefined : handlePreviousPage}
						/>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
};

export default EventsPage;
