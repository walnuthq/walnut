import { memo, useContext } from 'react';
import { DebuggerPayload } from '@/lib/debugger';
import { DebuggerContext, DebuggerContextProvider } from '@/lib/context/debugger-context-provider';
import { Loader } from '@/components/ui/loader';
import { DebuggerView } from './view';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { WALNUT_VERIFY_DOCS_URL } from '@/lib/config';

export const Debugger = memo(function Debugger({
	debuggerPayload
}: {
	debuggerPayload: DebuggerPayload | null;
}) {
	const context = useContext(DebuggerContext);

	if (!context) {
		return (
			<Alert className="m-4 py-4 w-fit min-w-[2rem] flex items-center gap-4">
				<span className="h-6 w-6 block rounded-full border-4 dark:border-t-accent_2 border-t-gray-800 animate-spin" />
				<div className="flex flex-col">
					<AlertTitle>Loading</AlertTitle>
					<AlertDescription>Please wait, debugger is loading</AlertDescription>
				</div>
			</Alert>
		);
	}

	const { currentStep, loading, error, hasDebuggableContract } = context;

	if (loading) {
		return (
			<Alert className="m-4 py-4 w-fit min-w-[2rem] flex items-center gap-4">
				<span className="h-6 w-6 block rounded-full border-4 dark:border-t-accent_2 border-t-gray-800 animate-spin" />
				<div className="flex flex-col">
					<AlertTitle>Loading</AlertTitle>
					<AlertDescription>Please wait, debugger is loading</AlertDescription>
				</div>
			</Alert>
		);
	}

	if (error) {
		throw new Error('Failed to fetch debugger data');
	}

	if (!hasDebuggableContract) {
		return (
			<Alert className="m-4 w-fit">
				<ExclamationTriangleIcon className="h-5 w-5" />
				<AlertTitle>No Source Code Available</AlertTitle>
				<AlertDescription>
					<p>
						The source code for the contract is missing. To enable the step-by-step debugger, verify
						the contract on Walnut by following{' '}
						<Link
							className="underline-offset-4 hover:underline text-function_pink"
							href={WALNUT_VERIFY_DOCS_URL}
						>
							this guide
						</Link>
						.
					</p>
				</AlertDescription>
			</Alert>
		);
	}

	if (!currentStep) return null;

	return <DebuggerView />;
});
