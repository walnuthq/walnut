import { useCallTrace } from '@/lib/context/call-trace-context-provider';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { FlameNode } from './flamegraph';

const FlameGraph = dynamic(() => import('./flamegraph'), {
	ssr: false,
	loading: () => (
		<Alert className="m-4 py-4 w-fit min-w-[2rem] flex items-center gap-4">
			<span className="h-6 w-6 block rounded-full border-4 dark:border-t-accent_2 border-t-gray-800 animate-spin" />
			<div className="flex flex-col">
				<AlertTitle>Loading</AlertTitle>
				<AlertDescription>Please wait, flamegraph is loading</AlertDescription>
			</div>
		</Alert>
	)
});

const FLAMEGRAPH_ERRORS = {
	L2_NOT_SUPPORTED: {
		title: 'L2 Gas Profiling is not supported',
		description: ''
	},
	L1_DATA_NOT_SUPPORTED: {
		title: 'L1 Data Gas Profiling is not supported',
		description: ''
	},
	BOTH_NOT_SUPPORTED: {
		title: 'Flamegraph is not supported',
		description: ''
	}
} as const;

const ErrorAlert = ({
	error
}: {
	error: (typeof FLAMEGRAPH_ERRORS)[keyof typeof FLAMEGRAPH_ERRORS];
}) => (
	<Alert className="m-4 w-fit">
		<ExclamationTriangleIcon className="h-5 w-5" />
		<AlertTitle>{error.title}</AlertTitle>
		<AlertDescription>{error.description}</AlertDescription>
	</Alert>
);

export function GasProfiler({
	l2Flamegraph,
	l1DataFlamegraph
}: {
	l2Flamegraph: FlameNode | undefined;
	l1DataFlamegraph: FlameNode | undefined;
}) {
	const { chosenCallName } = useCallTrace();
	const isL2FlamegraphEmpty =
		!l2Flamegraph || !l2Flamegraph.children || l2Flamegraph.children.length === 0;
	const isL1DataFlamegraphEmpty =
		!l1DataFlamegraph || !l1DataFlamegraph.children || l1DataFlamegraph.children.length === 0;
	const isBothEmpty = isL2FlamegraphEmpty && isL1DataFlamegraphEmpty;

	return (
		<div className="flex flex-col">
			{!isL2FlamegraphEmpty && (
				<div className="px-4">
					<div className="gap-2 flex flex-col pt-2 pb-4  border-b">
						<div className="font-medium text-sm">L2 Flamegraph</div>
						<div className="">
							<FlameGraph data={l2Flamegraph} activeName={chosenCallName} />
						</div>
					</div>
				</div>
			)}
			{isL2FlamegraphEmpty && !isL1DataFlamegraphEmpty && (
				<ErrorAlert error={FLAMEGRAPH_ERRORS.L2_NOT_SUPPORTED} />
			)}

			{!isL1DataFlamegraphEmpty && (
				<div className="px-4">
					<div className="gap-2 flex flex-col pt-2 pb-4 border-b">
						<div className="font-medium text-sm">L1 Data Flamegraph</div>
						<div className="">
							<FlameGraph data={l1DataFlamegraph} activeName={chosenCallName} />
						</div>
					</div>
				</div>
			)}
			{isL1DataFlamegraphEmpty && !isL2FlamegraphEmpty && (
				<ErrorAlert error={FLAMEGRAPH_ERRORS.L1_DATA_NOT_SUPPORTED} />
			)}

			{isBothEmpty && <ErrorAlert error={FLAMEGRAPH_ERRORS.BOTH_NOT_SUPPORTED} />}
		</div>
	);
}
