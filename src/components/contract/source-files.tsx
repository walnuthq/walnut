import { useState } from 'react';
import { CodeLocation } from '@/lib/simulation';
import { CodeViewer } from '@/components/code-viewer/code-viewer';
import { Loader } from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { FilesExplorer } from '@/components/code-viewer/file-explorer';
import { SOURCIFY_VERIFY_DOCS_URL } from '@/lib/config';

export function SourceFiles({
	isClassVerified,
	sourceCode
}: {
	isClassVerified: boolean;
	sourceCode: { [key: string]: string } | undefined;
}) {
	const [activeFile, setActiveFile] = useState<string | undefined>('Scarb.toml');

	const initialCodeLocation: CodeLocation = {
		start: { line: 0, col: 0 },
		end: { line: 0, col: 0 },
		filePath: activeFile ? activeFile : ''
	};

	const handleFileClick = (file: string) => {
		setActiveFile(file);
	};

	return (
		<div className="flex text-xs">
			{isClassVerified ? (
				sourceCode ? (
					<div className="w-full h-[500px] flex flex-row ">
						<FilesExplorer
							className="w-[200px] border-r border-neutral-200"
							showTitle={false}
							classSourceCode={sourceCode}
							activeFile={activeFile}
							handleFileClick={handleFileClick}
						/>
						<div className="flex flex-col flex-grow">
							{activeFile && (
								<CodeViewer content={sourceCode[activeFile]} codeLocation={initialCodeLocation} />
							)}
						</div>
					</div>
				) : (
					<div className="flex items-center justify-center w-full h-full">
						<Loader />
					</div>
				)
			) : (
				<Alert className="mx-4 w-fit">
					<ExclamationTriangleIcon className="h-5 w-5" />
					<AlertTitle>No source code for this contract</AlertTitle>
					<AlertDescription>
						<p>
							<span>Follow </span>
							<a
								href={SOURCIFY_VERIFY_DOCS_URL}
								className="text-blue-500 cursor-pointer"
								target="_blank"
								rel="noopener noreferrer"
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
