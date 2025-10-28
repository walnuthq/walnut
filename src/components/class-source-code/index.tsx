import { SourceFiles } from './source-files';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { VERIFY_DOCS_URL } from '@/lib/config';

export function ClassSourceCode({
	isClassVerified,
	sourceCode,
	isContract
}: {
	isClassVerified: boolean;
	sourceCode: Record<string, string>;
	isContract: boolean;
}) {
	return (
		<div className="mt-12">
			<h2 className="text-sm font-medium mb-2">{isContract ? 'Contract' : 'Class'} Source Code</h2>
			{isClassVerified && sourceCode ? (
				<Card>
					<SourceFiles sourceCode={sourceCode} />
				</Card>
			) : (
				<Alert className="w-fit">
					<ExclamationTriangleIcon className="h-5 w-5" />
					<AlertTitle>No source code for this {isContract ? 'contract' : 'class'}</AlertTitle>
					<AlertDescription>
						<p>
							<span>Follow </span>
							<a
								href={VERIFY_DOCS_URL}
								className="underline-offset-4 hover:underline text-blue-500"
								target="_blank"
								rel="noreferrer noopener"
							>
								this guide
							</a>
							<span> to verify the source code.</span>
						</p>
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
