'use client';

import React from 'react';
import { EventsList } from '@/components/call-trace/event-entries';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ContractCallEvent } from '@/lib/simulation';

interface EventsTabProps {
	shouldLoad?: boolean;
	events: ContractCallEvent[];
	loading: boolean;
}

export function EventsTab({ shouldLoad = true, events, loading }: EventsTabProps) {
	// Don't render anything if we shouldn't load yet
	if (!shouldLoad) {
		return null;
	}

	if (loading) {
		return (
			<Alert className="m-4 py-4 w-fit min-w-[2rem] flex items-center gap-4">
				<span className="h-6 w-6 block rounded-full border-4 dark:border-t-accent_2 border-t-gray-800 animate-spin" />
				<div className="flex flex-col">
					<AlertTitle>Loading</AlertTitle>
					<AlertDescription>Please wait, events are loading</AlertDescription>
				</div>
			</Alert>
		);
	}

	return <EventsList events={events} />;
}
