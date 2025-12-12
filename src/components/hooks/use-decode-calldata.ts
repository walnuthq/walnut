import { useState } from 'react';

interface DecodedParameter {
	name: string;
	type_name: string;
	value: any;
}

interface DecodedCall {
	contract_address: string;
	function_selector: string;
	function_name: string;
	parameters: DecodedParameter[];
}

interface DecodedCalldata {
	decoded_calldata: DecodedCall[];
	raw_calldata: any[];
}

export function useDecodeCalldata() {
	const [decodeCalldata, setDecodeCalldata] = useState<DecodedCalldata | null>(null);

	return { decodeCalldata, setDecodeCalldata };
}

export type { DecodedCalldata, DecodedCall, DecodedParameter };
