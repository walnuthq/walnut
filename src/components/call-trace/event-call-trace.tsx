import React, { memo, useState } from 'react';
import { useCallTrace } from '@/lib/context/call-trace-context-provider';
import { CALL_NESTING_SPACE_BUMP, CallTypeChip, TraceLine } from '.';
import { InfoBox } from '@/components/ui/info-box';
import { EventCall, ContractCall, DataType } from '@/lib/simulation';
import { shortenHash } from '@/lib/utils';
import { DecodeDataTable } from '../decode-data-table';

export const EventCallTrace = memo(function EventCallTrace({
	eventCallId,
	nestingLevel
}: {
	eventCallId: number;
	nestingLevel: number;
}) {
	const {
		isExecutionFailed,
		toggleCallExpand,
		expandedCalls,
		contractCallsMap,
		eventCallsMap,
		traceLineElementRefs
	} = useCallTrace();

	const eventCall = eventCallsMap[eventCallId];
	const contractCall = contractCallsMap[eventCall.contractCallId];

	if (!traceLineElementRefs.current[eventCallId]) {
		traceLineElementRefs.current[eventCallId] = React.createRef<HTMLDivElement>();
	}

	return (
		<React.Fragment key={eventCallId}>
			<TraceLine
				className="py-0.5"
				isActive={expandedCalls[eventCallId]}
				onClick={() => toggleCallExpand(eventCallId)}
				ref={traceLineElementRefs.current[eventCallId]}
			>
				{CallTypeChip('Event')}

				{/* Error column */}
				{isExecutionFailed && <div className="w-5 mr-0.5"></div>}

				{/* Debug button */}
				<div className="w-5"></div>

				<div
					style={{ marginLeft: nestingLevel * CALL_NESTING_SPACE_BUMP }}
					className="flex flex-row items-center trace-line_content"
				>
					<div className={`w-5 h-5 p-1 mr-1`}></div>
					<span className="text-function_purple">{eventCall.name}</span> (
					{(eventCall.members ?? []).map((member, index) => (
						<span key={index}>
							<span className="">{member.name}</span>:&nbsp;
							<span className="text-typeColor">{member.type}</span>
							{index < (eventCall.members?.length ?? 0) - 1 && <span>,&nbsp;</span>}
						</span>
					))}
					)
				</div>
			</TraceLine>
			{expandedCalls[eventCallId] && (
				<EventCallDetails call={eventCall} contractCall={contractCall} />
			)}{' '}
		</React.Fragment>
	);
});

const EventCallDetails = memo(function EventCallDetails({
	call,
	contractCall
}: {
	call: EventCall;
	contractCall: ContractCall;
}) {
	let contractName: string | undefined = undefined;
	if (contractCall.contractName) {
		contractName = contractCall.contractName;
	} else if (contractCall.erc20TokenName || contractCall.erc20TokenSymbol) {
		contractName = [contractCall.erc20TokenName, `(${contractCall.erc20TokenSymbol})`].join(' ');
	} else if (contractCall.entryPointInterfaceName) {
		contractName = contractCall.entryPointInterfaceName.split('::').pop();
	}

	if (!contractName) {
		contractName = shortenHash(contractCall.entryPoint.storageAddress, 13);
	}
	const [displayFormat, setDisplayFormat] = useState<'auto' | 'raw'>('auto');
	const details: { name: string; value: string; isCopyable?: boolean; valueToCopy?: string }[] = [];

	details.push(
		{
			name: 'Contract Name',
			value: contractName
		},
		{
			name: 'Contract Address',
			value: contractCall.entryPoint.storageAddress
		}
		// {
		// 	name: 'Class Hash',
		// 	value: contractCall.entryPoint.classHash
		// }
	);

	if (contractCall.entryPointName) {
		details.push({
			name: 'Function Name',
			value: contractCall.entryPointName
		});
	}

	if (call.selector) {
		details.push({
			name: 'Event Selector',
			value: call.selector
		});
	}

	return (
		<div className="flex flex-col bg-sky-50 dark:bg-background border-y border-blue-400 py-1 px-4">
			<div className="md:w-[calc(100vw-7rem)]">
				<div className="">
					<InfoBox details={details} />
				</div>
				{call.datas && (
					<DecodeDataTable
						decodeData={call.datas}
						type={DataType.DATA}
						displayFormat={displayFormat}
						setDisplayFormat={setDisplayFormat}
					/>
				)}
			</div>
		</div>
	);
});
