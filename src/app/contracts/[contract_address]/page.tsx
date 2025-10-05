import { ContractPage } from '@/components/contract-page';

export const runtime = 'edge';

export default async function Page({ params }: { params: Promise<{ contract_address: string }> }) {
	const { contract_address } = await params;
	return <ContractPage contractAddress={contract_address} />;
}
