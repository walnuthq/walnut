export function getContractCallId({
	parentContractCallId,
	contractCallIndex
}: {
	parentContractCallId?: string;
	contractCallIndex: number;
}) {
	return parentContractCallId
		? `${parentContractCallId}-${contractCallIndex}`
		: contractCallIndex.toString();
}

export function getInternalFunctionCallId({
	contractCallId,
	fp
}: {
	contractCallId: string;
	fp: number;
}) {
	return `${contractCallId}-fp-${fp}`;
}
