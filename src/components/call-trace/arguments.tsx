import { ContractCall } from '@/lib/simulation';
import { shortenHash } from '@/lib/utils';
import React from 'react';

export function Arguments({ call }: { call: ContractCall }) {
	return (
		<>
			<span className="text-highlight_yellow">{'('}</span>
			{call?.argumentsNames ? (
				<span className="text-orange-500 dark:text-light_orange">
					{call.argumentsNames.join(', ')}
				</span>
			) : (
				call.argumentsNames && (
					<span className="text-orange-500 dark:text-light_orange">
						{call.argumentsNames.map((arg) => shortenHash(arg)).join(', ')}
					</span>
				)
			)}
			<span className="text-highlight_yellow">{')'}</span>
		</>
	);
}
