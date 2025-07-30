import React from 'react';
import { CALL_NESTING_SPACE_BUMP, CallTypeChip, TraceLine } from '.';

export function ErrorTraceLine({
	errorMessage,
	nestingLevel,
	executionFailed
}: {
	errorMessage: string;
	nestingLevel: number;
	executionFailed: boolean;
}) {
	return (
		<React.Fragment>
			{
				<TraceLine className={``} isUnclickable>
					{CallTypeChip('Error')}
					{executionFailed && <div className="w-5 mr-0.5"></div>}

					{/* Debug button */}
					<div className="w-5"></div>

					<div
						style={{ marginLeft: nestingLevel * CALL_NESTING_SPACE_BUMP }}
						className="flex flex-row items-center"
					>
						<div className={`w-5 h-5 p-1 mr-1`}></div>
						<span className="text-red-600">Error message: {errorMessage}</span>
					</div>
				</TraceLine>
			}
		</React.Fragment>
	);
}
