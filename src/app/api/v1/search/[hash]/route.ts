import { createPublicClient, http, type GetTransactionErrorType, type Hash } from 'viem';
import { type NextRequest, NextResponse } from 'next/server';
import { type SearchDataResponse, type SearchData } from '@/lib/types';

export const GET = async (
	request: NextRequest,
	{ params: { hash } }: { params: { hash: Hash } }
) => {
	const rpcUrls = request.nextUrl.searchParams.get('rpc_urls')!.split(',');
	const transactions: (SearchData | undefined)[] = await Promise.all(
		rpcUrls.map(async (rpcUrl) => {
			const client = createPublicClient({ transport: http(rpcUrl) });
			try {
				const transaction = await client.getTransaction({ hash });
				return { source: { rpcUrl, chainId: undefined }, hash: transaction.hash };
			} catch (error) {
				const { name, message } = error as GetTransactionErrorType;
				console.error(name, message);
			}
		})
	);
	const response: SearchDataResponse = {
		transactions: transactions.filter((transaction: SearchData | undefined) => !!transaction),
		classes: [],
		contracts: []
	};
	return NextResponse.json(response);
};
