export function FnName({
	fnName,
	variant = 'trace-line'
}: {
	fnName: string | null;
	variant?: 'trace-line' | 'search-result';
}) {
	if (fnName) {
		const splittedFnName = fnName.split('::');
		return (
			<>
				{splittedFnName.length >= 2 ? (
					<>
						<span className={`${variant === 'trace-line' && 'text-function_purple'}`}>
							{splittedFnName[splittedFnName.length - 2]}
						</span>
						::
						<span className={`${variant === 'trace-line' && 'text-function_pink'}`}>
							{splittedFnName[splittedFnName.length - 1]}
						</span>
					</>
				) : (
					<span className={`${variant === 'trace-line' && 'text-function_pink'}`}>{fnName}</span>
				)}
			</>
		);
	} else {
		return (
			<span className={`${variant === 'search-result' ? 'text-gray-500' : 'text-function_pink'}`}>
				Unknown function
			</span>
		);
	}
}
