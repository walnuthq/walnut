import React, { memo } from 'react';
import { useCallTrace } from '@/lib/context/call-trace-context-provider';
import { CALL_NESTING_SPACE_BUMP, CallTypeChip, TraceLine } from '.';
import { shortenHash } from '@/lib/utils';
import { InfoBox } from '@/components/ui/info-box';
import { DataType, ContractCallEvent, DecodedItem } from '@/lib/simulation';
import { DecodeDataTable } from '../decode-data-table';
import AddressLink from '../address-link';

export function EventsList({ events }: { events: ContractCallEvent[] }) {
	const { toggleCallExpand, traceLineElementRefs, expandedCalls } = useCallTrace();

	if (events.length === 0) {
		return <div className="px-4 py-2 text-sm">No events emitted during this transaction.</div>;
	}

	return events.map((event, index) => {
		const key: any = `event-${index}`;
		if (!traceLineElementRefs.current[key]) {
			traceLineElementRefs.current[key] = React.createRef<HTMLDivElement>();
		}

		const contractName = event.contractName?.startsWith('0x')
			? shortenHash(event.contractName)
			: event.contractName;

		return (
			<React.Fragment key={key}>
				<TraceLine
					className="py-0.5"
					isActive={expandedCalls[key]}
					onClick={() => {
						toggleCallExpand(key);
					}}
					ref={traceLineElementRefs.current[key]}
				>
					{CallTypeChip('Event')}
					<div
						style={{ marginLeft: CALL_NESTING_SPACE_BUMP }}
						className="flex flex-row items-center trace-line_content"
					>
						{event.contractName && (
							<AddressLink
								addressClassName="text-variable whitespace-nowrap"
								address={event?.contractAddress}
							>
								{contractName}
							</AddressLink>
						)}
						{'.'}
						<span className="text-function_pink">{event.name}</span>
						<span className="text-highlight_yellow">{'('}</span>
						{(event.datas ?? []).map((param: DecodedItem, index: number) => (
							<span key={index}>
								<span className="text-classGreen">{param.name}</span>:&nbsp;
								<span className="text-typeColor">{param.typeName}</span>
								{index < (event.datas?.length ?? 0) - 1 && <span>,&nbsp;</span>}
							</span>
						))}
						<span className="text-highlight_yellow">{')'}</span>
					</div>
				</TraceLine>
				{expandedCalls[key] && <EventDetails call={event} />}
			</React.Fragment>
		);
	});
}

const EventDetails = memo(function EventCallDetails({ call }: { call: ContractCallEvent }) {
	const details: { name: string; value: string; isCopyable?: boolean; valueToCopy?: string }[] = [];

	details.push(
		{
			name: 'Contract Address',
			value: call.contractAddress
		},
		{ name: 'Event Selector', value: call.selector }
	);

	return (
		<div className="flex flex-col bg-sky-50 border-y dark:bg-background border-blue-400 py-2 px-4 ">
			<div className="w-[calc(100vw-4rem)] sm:w-[calc(100vw-7rem)]">
				<div className=""></div>
				<InfoBox details={details} />
				{call.datas && <DecodeDataTable decodeData={call.datas} type={DataType.DATAS} />}
			</div>
		</div>
	);
});
