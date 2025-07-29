export interface Source {
	chainId?: string;
	rpcUrl?: string;
	value: string;
}

export interface GetContractResponse {
	verified: boolean;
	deployedSources: Source[];
	solidityVersion: string;
	classHash: string;
	sourceCode?: Record<string, string>;
}

interface FunctionInput {
	name: string;
	type: string;
}
interface FunctionOutput {
	type: string;
	name?: string;
}

interface FunctionData {
	name: string;
	inputs: FunctionInput[];
	outputs: FunctionOutput[];
	state_mutability: string;
}

type Selector = string;

type EntryPointItem = [Selector, FunctionData];

export interface ContractFunctions {
	entry_point_datas: EntryPointItem[];
}
