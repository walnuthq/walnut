import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { ContractCall } from '@/lib/simulation';

type FileSystemNode = {
	name: string;
	path: string;
	type: 'file' | 'directory';
	children?: Record<string, FileSystemNode>;
};

const buildFileTree = (files: string[]): FileSystemNode => {
	const root: FileSystemNode = {
		name: 'root',
		path: '',
		type: 'directory',
		children: {}
	};

	for (const filePath of files) {
		const parts = filePath.split('/');
		let currentNode = root;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			const isFile = i === parts.length - 1;
			const currentPath = parts.slice(0, i + 1).join('/');

			if (!currentNode.children) {
				currentNode.children = {};
			}

			if (!currentNode.children[part]) {
				currentNode.children[part] = {
					name: part,
					path: currentPath,
					type: isFile ? 'file' : 'directory'
				};

				if (!isFile) {
					currentNode.children[part].children = {};
				}
			}

			currentNode = currentNode.children[part];
		}
	}

	return root;
};

const getParentFolders = (filePath: string): string[] => {
	const parts = filePath.split('/');
	const folders: string[] = [];

	for (let i = 0; i < parts.length - 1; i++) {
		folders.push(parts.slice(0, i + 1).join('/'));
	}

	return folders;
};

const FileSystemItem = memo(function FileSystemItem({
	node,
	level = 0,
	activeFile,
	handleFileClick,
	expandedFolders,
	onToggleFolder,
	contract,
	contractCall
}: {
	node: FileSystemNode;
	level?: number;
	activeFile?: string;
	handleFileClick: (filePath: string) => void;
	expandedFolders: Set<string>;
	onToggleFolder: (path: string) => void;
	contract?: ContractCall;
	contractCall?: ContractCall;
}) {
	const isFile = node.type === 'file';
	const isExpanded = expandedFolders.has(node.path);
	const isActive = activeFile === node.path;

	const toggleFolder = useCallback(() => {
		if (!isFile) {
			onToggleFolder(node.path);
		}
	}, [isFile, node.path, onToggleFolder]);

	const handleClick = useCallback(() => {
		if (isFile) {
			handleFileClick(node.path);
		} else {
			toggleFolder();
		}
	}, [isFile, node.path, handleFileClick, toggleFolder]);

	return (
		<div>
			<div
				className={cn(
					'flex items-center py-1 px-2 cursor-pointer hover:bg-accent select-none',
					isActive && contract?.callId === contractCall?.callId && 'bg-accent_2'
				)}
				style={{
					paddingLeft: contract?.callId
						? `${level * 8 + (isFile ? 36 : 16)}px`
						: `${level * 8 + (isFile ? 24 : 4)}px`
				}}
				onClick={handleClick}
			>
				{!isFile && (
					<span className="mr-1">
						{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
					</span>
				)}
				<span className="mr-1">{isFile ? <File size={16} /> : <Folder size={16} />}</span>
				<span className="truncate">{node.name}</span>
			</div>

			{!isFile && isExpanded && node.children && (
				<div>
					{Object.values(node.children)
						.sort((a, b) => {
							if (a.type !== b.type) {
								return a.type === 'directory' ? -1 : 1;
							}
							return a.name.localeCompare(b.name);
						})
						.map((childNode) => (
							<FileSystemItem
								key={childNode.path}
								node={childNode}
								level={level + 1}
								activeFile={activeFile}
								handleFileClick={handleFileClick}
								expandedFolders={expandedFolders}
								onToggleFolder={onToggleFolder}
								contract={contract}
								contractCall={contractCall}
							/>
						))}
				</div>
			)}
		</div>
	);
});

export const FilesExplorer = memo(function FilesExplorer({
	showTitle = true,
	classSourceCode,
	activeFile,
	handleFileClick,
	className,
	contract,
	contractCall
}: {
	showTitle?: boolean;
	classSourceCode: { [key: string]: string };
	activeFile?: string;
	handleFileClick: (filePath: string) => void;
	className?: string;
	contract?: ContractCall;
	contractCall?: ContractCall;
}) {
	const files = Object.keys(classSourceCode);

	const initialExpandedFolders = useMemo(() => {
		const expanded = new Set<string>();
		if (activeFile) {
			const parentFolders = getParentFolders(activeFile);
			parentFolders.forEach((folder) => expanded.add(folder));
		}
		return expanded;
	}, []);

	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(initialExpandedFolders);

	useEffect(() => {
		if (activeFile) {
			setExpandedFolders((prev) => {
				const newSet = new Set(prev);
				const parentFolders = getParentFolders(activeFile);
				parentFolders.forEach((folder) => newSet.add(folder));
				return newSet;
			});
		}
	}, [activeFile]);

	const fileTree = useMemo(() => buildFileTree(files), [files]);

	const handleToggleFolder = useCallback((path: string) => {
		setExpandedFolders((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(path)) {
				newSet.delete(path);
			} else {
				newSet.add(path);
			}
			return newSet;
		});
	}, []);

	return (
		<div className={cn('w-full h-full flex flex-col', className)}>
			{showTitle && <div className="uppercase px-2 my-2 font-medium">Source files</div>}
			<ScrollArea className="flex-1">
				<div>
					{fileTree.children &&
						Object.values(fileTree.children)
							.sort((a, b) => {
								if (a.type !== b.type) {
									return a.type === 'directory' ? -1 : 1;
								}
								return a.name.localeCompare(b.name);
							})
							.map((node) => (
								<FileSystemItem
									key={node.path}
									node={node}
									contract={contract}
									contractCall={contractCall}
									activeFile={activeFile}
									handleFileClick={handleFileClick}
									expandedFolders={expandedFolders}
									onToggleFolder={handleToggleFolder}
								/>
							))}
				</div>
				<ScrollBar orientation="horizontal" />
				<ScrollBar orientation="vertical" />
			</ScrollArea>
		</div>
	);
});
