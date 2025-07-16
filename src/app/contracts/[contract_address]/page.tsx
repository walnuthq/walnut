import { ContractPage } from '@/components/contract-page';

export const runtime = 'edge';

export default async function Page({ params }: { params: { contract_address: string } }) {
	return <ContractPage contractAddress={params.contract_address} />;
}
