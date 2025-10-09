import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function Page({
	params
}: {
	params: Promise<{ chain_id: string; tx_hash: string }>;
}) {
	const { chain_id, tx_hash } = await params;

	redirect(`/transactions?chainId=${chain_id}&txHash=${tx_hash}`);
}
