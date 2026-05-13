import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';
import { ContractCallEvent, DecodedItem } from '@/lib/simulation/types';
import { processTransactionRequest } from '@/app/api/v1/utils/transaction-processing';
import { getSupportedNetworks } from '@/lib/get-supported-networks';
import { getRpcUrlForChainOptimized } from '@/lib/public-network-utils';
import { soldbListEvents } from '@/app/api/v1/soldb';

interface SoldbEventData {
	index: number;
	address: string;
	topics: string[];
	data: string;
	event: string;
	signature: string;
	decoded_data?: string[] | string;
	param_count?: number;
	event_name?: string;
	contract_name?: string;
	datas?: Array<{
		name: string;
		type: string;
		value: string;
	}>;
}

interface SoldbEventsResponse {
	transaction_hash: string;
	events: SoldbEventData[];
	total_events: number;
}

function transformSoldbEventToContractCallEvent(
	soldbEvent: SoldbEventData,
	index: number
): ContractCallEvent {
	// Use signature if event name is empty
	const eventName = soldbEvent.event || soldbEvent.signature;

	// Use datas directly if available (from verified contracts), otherwise transform decoded_data
	let datas: DecodedItem[] | null = null;

	if (soldbEvent.datas) {
		// Transform datas to match DecodedItem format (type -> typeName)
		datas = soldbEvent.datas.map((item) => ({
			name: item.name,
			typeName: item.type, // Convert 'type' to 'typeName'
			value: item.value
		}));
	}

	return {
		contractCallId: index,
		contractAddress: soldbEvent.address,
		contractName: soldbEvent.contract_name || soldbEvent.address, // Use address as name if no contract name available
		functionCallId: 0, // Not available in soldb response
		name: eventName,
		selector: soldbEvent.signature,
		datas: datas
	};
}

export const GET = async (
	request: NextRequest,
	{ params }: { params: Promise<{ tx_hash: string }> }
) => {
	const authSession = await getServerSession();

	try {
		const { tx_hash } = await params;

		// Validate transaction hash format
		if (!tx_hash || !tx_hash.match(/^0x[a-fA-F0-9]{64}$/)) {
			return NextResponse.json({ error: 'Invalid transaction hash format' }, { status: 400 });
		}

		// Get chainId from query parameters (optional)
		let chainId = request.nextUrl.searchParams.get('chainId');
		console.log('chainId', chainId);
		let rpcUrl = '';

		// If chainId is provided, try to get RPC URL from supported networks
		if (chainId) {
			try {
				// Try to get RPC URL using the optimized function
				const resolvedRpcUrl = getRpcUrlForChainOptimized(chainId, authSession?.session || null);
				console.log('resolvedRpcUrl', resolvedRpcUrl);
				rpcUrl = resolvedRpcUrl;
			} catch (error: any) {
				console.warn('Failed to resolve RPC URL for chainId:', chainId, error);

				// Check if this is a tenant network that requires authentication
				if (error?.message && error.message.includes('Authentication required')) {
					return NextResponse.json(
						{ error: 'Authentication required for this network' },
						{ status: 401 }
					);
				}

				// Try fallback to getSupportedNetworks
				try {
					const supportedNetworks = getSupportedNetworks(authSession?.session || null);
					const network = supportedNetworks.find((n) => n.key === chainId);
					if (network && network.rpcEnvVar) {
						rpcUrl = network.rpcEnvVar;
					}
				} catch (fallbackError) {
					console.warn('Failed to get RPC URL from supported networks:', fallbackError);
				}
			}
		}

		let ethdebugDirs: string[] = [];
		let cwd: string | undefined;

		console.log('chainId', chainId);
		console.log('rpcUrl', rpcUrl);
		// Only use processTransactionRequest if we have both chainId and rpcUrl
		if (chainId && rpcUrl) {
			try {
				const result = await processTransactionRequest({
					txHash: tx_hash as `0x${string}`,
					chainId: chainId as any,
					rpcUrl: rpcUrl as any
				});
				ethdebugDirs = result.ethdebugDirs || [];
				cwd = result.cwd;
			} catch (error) {
				console.warn('Failed to process transaction for ethdebug dirs:', error);
				// Continue without ethdebug dirs
			}
		}

		try {
			const soldbResponse: SoldbEventsResponse = await soldbListEvents({
				txHash: tx_hash,
				rpcUrl,
				ethdebugDirs,
				cwd
			});

			// Transform soldb events to ContractCallEvent format
			const contractCallEvents: ContractCallEvent[] = soldbResponse.events.map((event, index) =>
				transformSoldbEventToContractCallEvent(event, index)
			);

			// Return in the format expected by EventsList component
			return NextResponse.json({
				events: contractCallEvents,
				total_events: soldbResponse.total_events,
				transaction_hash: soldbResponse.transaction_hash
			});
		} catch (execError: any) {
			console.error('soldb execution error:', execError);

			return NextResponse.json(
				{
					error: execError.userMessage || execError.message || 'Failed to fetch events',
					...(execError.details && { details: execError.details }),
					...(execError.code && { code: execError.code })
				},
				{ status: execError.statusCode || 500 }
			);
		}
	} catch (error: any) {
		console.error('API error:', error);
		return NextResponse.json(
			{
				error: 'Internal server error',
				details: error.message
			},
			{ status: 500 }
		);
	}
};
