'use client';

import React from 'react';
import { EventsList } from '@/components/call-trace/event-entries';
import { Loader } from '@/components/ui/loader';
import { Error } from '@/components/ui/error';
import { useEvents } from '@/lib/context/events-context-provider';

interface EventsTabProps {
	txHash: string;
	shouldLoad?: boolean;
}

export function EventsTab({ txHash, shouldLoad = true }: EventsTabProps) {
	const { events, loading, error } = useEvents();

	// Don't render anything if we shouldn't load yet
	if (!shouldLoad) {
		return null;
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4">
				<Error message={error} />
			</div>
		);
	}

	return <EventsList events={events} />;
}
