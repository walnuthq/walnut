import React from 'react';
import clsx from 'clsx';
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution.js';
import { CallType } from '@/lib/simulation';
export * from './root';

export const CALL_NESTING_SPACE_BUMP: number = 16; // in pixels

export const TraceLine = React.forwardRef<
	HTMLDivElement,
	React.ComponentPropsWithoutRef<'div'> & {
		isUnclickable?: boolean;
		isActive?: boolean;
		previewMod?: boolean;
	}
>(({ className, isUnclickable, isActive, previewMod = false, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={clsx(
				`${previewMod ? '' : ''} px-4 flex flex-row items-center font-mono border-y-2 ${
					isActive ? 'border-border trace-line--selected' : 'border-transparent'
				} ${isUnclickable ? '' : 'hover:bg-accent cursor-pointer'}`,
				className
			)}
			{...props}
		/>
	);
});
TraceLine.displayName = 'TraceLine';

type CallTypeChipKind = CallType | 'Function' | 'Error' | 'Event';
export function CallTypeChip(kind: CallTypeChipKind) {
	let callTypeCellClass: { [key: string]: string } = {
		['Call']:
			'bg-green-100 border-green-400 text-green-900 dark:bg-opacity-40 dark:bg-green-500 dark:text-white',
		['Delegate']:
			'bg-orange-100 border-orange-400 text-orange-900 dark:bg-opacity-40 dark:bg-orange-500 dark:text-white',
		['Event']:
			'bg-yellow-100 border-yellow-400 text-yellow-900 dark:bg-opacity-40 dark:bg-yellow-500 dark:text-white',
		['Error']:
			'border-red-600 text-red-600 bg-red-100 dark:bg-opacity-40 dark:bg-red-500 dark:text-white',
		['Function']:
			'bg-purple-100 border-purple-400 text-purple-900 dark:bg-opacity-40 dark:bg-purple-500 dark:text-white'
	};

	return (
		<>
			<div className="w-20 flex-none flex relative">
				<div
					className={`${callTypeCellClass[kind]} flex-auto border text-center rounded-sm inline-block px-1.5 py-0.5 mr-1`}
				>
					{kind.toUpperCase()}
				</div>
			</div>
		</>
	);
}
