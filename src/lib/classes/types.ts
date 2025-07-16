export interface Source {
	chainId?: string;
	rpcUrl?: string;
	value: string;
}

export interface GetClassResponse {
	verified: boolean;
	declaredSources: Source[];
	sourceCode?: Record<string, string>;
}
