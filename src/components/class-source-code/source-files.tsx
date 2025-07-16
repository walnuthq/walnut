import { useState } from 'react';
import { CodeLocation } from '@/lib/simulation';
import { FilesExplorer } from '../code-viewer/file-explorer';
import { CodeViewer } from '../code-viewer/code-viewer';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable-panel';
import { ScrollArea } from '../ui/scroll-area';

export function SourceFiles({ sourceCode }: { sourceCode: { [key: string]: string } | undefined }) {
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
			{sourceCode ? (
				<ResizablePanelGroup
					direction="horizontal"
					className="w-full flex min-h-[500px] max-h-[500px] flex-row"
				>
					<ResizablePanel defaultSize={20} className="flex flex-col flex-grow">
						<FilesExplorer
							showTitle={false}
							classSourceCode={sourceCode}
							activeFile={activeFile}
							handleFileClick={handleFileClick}
						/>
					</ResizablePanel>
					<ResizableHandle withHandle className="w-[1px]" />
					<ResizablePanel defaultSize={80} className="flex flex-col flex-grow">
						{activeFile && (
							<div className="flex flex-col w-full h-full">
								<div className="flex gap-1 flex-row border-b  py-1 px-3 items-center">
									<File size={16} />
									{activeFile}
								</div>

								<CodeViewer content={sourceCode[activeFile]} codeLocation={initialCodeLocation} />
							</div>
						)}
					</ResizablePanel>
				</ResizablePanelGroup>
			) : (
				<div className="flex items-center justify-center w-full h-full">
					<Loader />
				</div>
			)}
		</div>
	);
}
