import { memo, useContext } from 'react';
import { DebuggerPayload } from '@/lib/debugger';
import { Loader } from '@/components/ui/loader';
import { DebuggerView } from './view';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { SOURCIFY_VERIFY_DOCS_URL } from '@/lib/config';
import { DebuggerContext } from '@/lib/context/debugger-context-provider';
import { usePathname } from 'next/navigation';

export const Debugger = memo(function Debugger({
	debuggerPayload
}: {
	debuggerPayload: DebuggerPayload | null;
}) {
	const context = useContext(DebuggerContext);

	const pathname = usePathname();

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
		return (
			<Alert className="m-4 w-fit">
				<ExclamationTriangleIcon className="h-5 w-5" />
				<AlertTitle>Debugger Error</AlertTitle>
				<AlertDescription>
					<p className="mt-2">
						This might be due to compilation issues. The transaction trace will still be available
						without debug information.
					</p>
				</AlertDescription>
			</Alert>
		);
	}

	if (!hasDebuggableContract && pathname !== '/demo' && pathname !== '/demo/simulation') {
		return (
			<Alert className="m-4 w-fit">
				<ExclamationTriangleIcon className="h-5 w-5" />
				<AlertTitle>No Source Code Available</AlertTitle>
				<AlertDescription>
					<p>
						The source code for the contract is missing. To enable the step-by-step debugger, verify
						the contract on Walnut by following{' '}
						<Link
							className="underline-offset-4 hover:underline text-blue-500"
							href={SOURCIFY_VERIFY_DOCS_URL}
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
