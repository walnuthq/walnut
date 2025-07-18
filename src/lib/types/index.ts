export enum ChainId {
	SN_MAIN = 'SN_MAIN',
	SN_SEPOLIA = 'SN_SEPOLIA',
	ETH_MAIN = 'ETH_MAIN',
	ETH_SEPOLIA = 'ETH_SEPOLIA'
}

export interface CommonError {
	error_message: string;
	error_count: number;
	error_contract_address: string;
}

export interface SimulationListItem {
	wallet_address: string;
	created_at: number;
	chain_id: string;
	id: string;
	status: 'success' | 'failure' | 'simulating';
	error_message: string;
}

export interface Stats {
	failure_simulations: number;
	total_simulations: number;
	unique_wallet_count: number;
	common_errors: CommonError[];
}

export interface Project {
	id: number;
	name: string;
	slug: string;
}

export interface SimulationsResponse {
	simulations: SimulationListItem[];
	stats: Stats;
	project: Project;
}

export interface Simulation {
	id: string;
	team_id: number;
	chain_id: string;
	block_at: number;
	transaction_version: number;
	nonce: number;
	max_fee: string;
	cairo_version: string;
	wallet_address: string;
	calldata: string[];
	created_at: number;
	updated_at: number;
	status: string;
}

export interface SimulationResponse {
	trace: { execute_invocation: Call };
	simulation: Simulation;
	classes: { [key: string]: { code: string } };
}

export enum ValueFormatType {
	DECIMAL = 'DECIMAL',
	TEXT = 'TEXT'
}

export interface CallIoDecoded {
	name?: string;
	type?: string;
	value: string | CallIoDecoded[];
	value_formats?: Record<ValueFormatType, string | number>;
}

export interface CallEventDecoded {
	name: string;
	order?: number;
	data: CallIoDecoded[];
}

export interface Call {
	entry_point_selector: string;
	contract_address: string;
	class_hash: string;
	call_type: string;
	function_name?: string;
	inputs_decoded?: CallIoDecoded[];
	outputs_decoded?: CallIoDecoded[];
	calls: Call[];
	class_alias?: string;
	events_decoded?: CallEventDecoded[];
	error_message?: string;
	contract_data?: ContractData;
	contract_display_name: string;
}

export interface Trace {
	execute_invocation: Call;
}

export enum FinalityStatus {
	RECEIVED = 'RECEIVED',
	REJECTED = 'REJECTED',
	ACCEPTED_ON_L2 = 'ACCEPTED_ON_L2',
	ACCEPTED_ON_L1 = 'ACCEPTED_ON_L1'
}

export enum ExecutionStatus {
	SUCCEEDED = 'SUCCEEDED',
	REVERTED = 'REVERTED'
}

export interface Status {
	finality_status: FinalityStatus;
	execution_status: ExecutionStatus;
	error_reason: string;
}

export interface TransactionData {
	type: string;
	nonce: string;
	sender_address: string;
	version: string;
	max_fee: string;
	calldata: string;
	signature: string;
}
export interface ContractData {
	address: string;
	block_number: number;
	block_hash: string;
	is_account: boolean;
	type: number;
	creation_timestamp: number;
	class_hash: string;
	nonce?: number;
	version?: string;
	token_name?: string;
	token_symbol?: string;
	class_alias?: string;
	contract_alias?: string;
	verified_timestamp?: number;
}

export interface TransactionReceipt {
	actual_fee: string;
	block_hash: string;
	block_number: number;
}

export interface Transaction {
	trace: Trace;
	status: Status;
	data: TransactionData;
	receipt: TransactionReceipt;
	classes: { [key: string]: { code: string } };
}

export interface SearchData {
	source: { chainId: string; rpcUrl: undefined } | { chainId: undefined; rpcUrl: string };
	hash: string;
}

export interface SearchDataResponse {
	transactions: SearchData[];
	classes: SearchData[];
	contracts: SearchData[];
}

export const systemsTypeNames = [
	'Const',
	'Step',
	'Hole',
	'RangeCheck',
	'RangeCheck96',
	'Pedersen',
	'Bitwise',
	'EcOp',
	'AddMod',
	'MulMod',
	'System',
	'GasBuiltin',
	'Poseidon',
	'PanicResult'
];
