export interface SimulateRequest {
	rpcForkUrl: string;
	blockNumber: number;
	from: string;
	to: string;
	data?: string;
	value?: string;
	transactionIndex?: number; // Index of transaction in the block (0-based). If provided, will execute all previous transactions in the block first.
}

export interface EthDiff {
	[address: string]: string; // delta in wei
}

export interface TokenDiff {
	[tokenAddress: string]: {
		[address: string]: string; // delta in token units
	};
}

export interface TokenDeltaSummary {
	tokenAddress: string;
	totalDelta: string; // Sum of all deltas for this token (net change)
	eoaDeltas: {
		[eoaAddress: string]: string; // delta per EOA account
	};
}

export interface AssetChange {
	address: string;
	type: 'ETH' | 'ERC20';
	tokenAddress?: string;
	delta: string; // positive = received, negative = sent
}

export interface AssetSwap {
	inputAssets: AssetChange[]; // Assets sent (negative delta)
	outputAssets: AssetChange[]; // Assets received (positive delta)
}

export interface TokenInfoDetailed {
	standard: 'ERC20';
	type: 'Fungible';
	contract_address: string;
	symbol?: string;
	name?: string;
	decimals?: number;
	dollar_value: string;
}

export interface AssetChangeDetailed {
	token_info: TokenInfoDetailed;
	type: 'Transfer' | 'Burn';
	from: string;
	to?: string; // Optional for burns
	amount: string; // Formatted amount with decimals
	raw_amount: string; // Raw amount as string
	dollar_value: string;
	from_before_balance: string; // Hex string
	to_before_balance: string; // Hex string
}

export interface TokenTransfer {
	from: string;
	to: string;
	amount: string; // in token units (raw, not decimals)
	type: 'transfer' | 'burn'; // transfer if to is not 0x0, burn if to is 0x0
}

export interface TokenInfo {
	symbol?: string;
	name?: string;
	decimals?: number;
}

export interface TokenTransfers {
	[tokenAddress: string]: {
		transfers: TokenTransfer[];
		tokenInfo?: TokenInfo;
	};
}

export interface TouchedAddress {
	address: string;
	type: 'EOA' | 'Contract';
	tokenInfo?: TokenInfo; // Only if it's an ERC-20 token
}

export interface GasInfo {
	gasUsed: string; // Gas used in wei
	gasPrice?: string; // Gas price in wei (for legacy transactions)
	effectiveGasPrice?: string; // Effective gas price in wei (for EIP-1559)
	maxFeePerGas?: string; // Max fee per gas in wei (for EIP-1559)
	maxPriorityFeePerGas?: string; // Max priority fee per gas in wei (for EIP-1559)
	totalCost: string; // Total gas cost in wei (gasUsed * effectiveGasPrice)
}

export interface SimulateResponse {
	status: 'SUCCESS' | 'REVERTED';
	gasInfo: GasInfo;
	tokenTransfers: TokenTransfers; // Detailed token transfer events
	assetChanges: AssetChangeDetailed[]; // Detailed asset changes in new format
}
