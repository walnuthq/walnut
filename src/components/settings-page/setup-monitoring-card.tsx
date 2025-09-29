'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Chain, NetworksSelect } from '@/components/networks-select';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CopyInputButton } from '@/components/settings-page/copy-input-button';
import {
	useSetGlobalOrganizationIdInUserContext,
	useUserContext
} from '@/lib/context/user-context-provider';
import { useSettings } from '@/lib/context/settings-context-provider';
import { toast } from '@/components/hooks/use-toast';
import {
	createMonitoringApiKeyApi,
	createOrganizationApi,
	getMonitoringApiKey
} from '@/app/api/monitoring-api-service';

export function SetupMonitoringCard({
	changeTabCallback
}: {
	changeTabCallback: (tab: 'networks' | 'monitoring' | 'members') => void;
}) {
	const { organizationId, isGlobalOrg } = useUserContext();
	const setOrganizationId = useSetGlobalOrganizationIdInUserContext();
	const [chain, setChain] = useState<Chain | undefined>(undefined);
	const [initialChain, setInitialChain] = useState<Chain | undefined>(undefined);
	const [canApiKeyBeGenerated, setCanApiKeyBeGenerated] = useState<boolean>(false);
	const [apiKey, _setApiKey] = useState<string>('');
	const { networks } = useSettings();

	const onChainChangedCallback = (chain: Chain) => {
		setChain(chain);
	};

	const getApiKey = useCallback(async () => {
		const apiKeyRes = await getMonitoringApiKey(organizationId);
		if (apiKeyRes) {
			_setApiKey(apiKeyRes.apiKey);
			const chain: Chain = {
				chainId: apiKeyRes.network !== 'CUSTOM' ? apiKeyRes.network : undefined,
				network:
					apiKeyRes.network === 'CUSTOM'
						? networks.find((n) => n.id === apiKeyRes.customNetworkId)
						: undefined
			};
			setInitialChain(chain);
			// if not exists yet, can generate new
		} else {
			setCanApiKeyBeGenerated(true);
		}
	}, [networks, organizationId]);

	useEffect(() => {
		getApiKey();
	}, [getApiKey]);

	useEffect(() => {
		if (chain !== initialChain) {
			setCanApiKeyBeGenerated(true);
		} else {
			setCanApiKeyBeGenerated(false);
		}
	}, [chain, initialChain]);

	const generateApiKey = async () => {
		if (chain) {
			// disable button
			setCanApiKeyBeGenerated(false);
			try {
				let organizationIdToUse = organizationId;
				if (!isGlobalOrg) {
					const newOrganizationId = await createOrganizationApi();
					if (!newOrganizationId) {
						toast({
							title: `API KEY generation failed!`,
							description: 'Sorry there was a problem while generating API KEY. Please try again.',
							className: 'text-red-500'
						});
						return;
					}
					setOrganizationId(newOrganizationId);
					organizationIdToUse = newOrganizationId;
				}
				const chainId: 'OP_MAIN' | 'OP_SEPOLIA' | 'CUSTOM' = (chain.chainId as any) ?? 'CUSTOM';
				const apiKeyRes = await createMonitoringApiKeyApi(
					chainId,
					organizationIdToUse,
					chain.network?.id
				);
				if (apiKeyRes) {
					toast({
						title: `API KEY generated!`,
						description: 'You can now use the API KEY to setup your client.'
					});
					_setApiKey(apiKeyRes);
				} else {
					setCanApiKeyBeGenerated(true);
				}
			} catch (err) {
				setCanApiKeyBeGenerated(true);
				throw err;
			}
		}
	};

	return (
		<Card x-chunk="dashboard-04-chunk-1">
			<CardHeader>
				<CardTitle>Setup monitoring</CardTitle>
				<CardDescription>
					Setup monitoring by generating API KEY and specifying the network you want to monitor.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="w-full flex flex-col gap-12">
					{/*{apiKey !== '' && (*/}
					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-3">
							<Label htmlFor="name">Name</Label>
							<NetworksSelect
								onChainChangedCallback={onChainChangedCallback}
								selectedChain={initialChain}
							/>
							<p className="text-muted-foreground text-sm -mt-2">
								If your network is not listed, you can add in&nbsp;
								<Link
									onClick={() => changeTabCallback('networks')}
									className="underline"
									href="/settings"
								>
									custom networks
								</Link>
								.
							</p>
						</div>
						{apiKey !== '' && (
							<div className="flex flex-col gap-3">
								<Label htmlFor="rpcUrl">API KEY</Label>
								<div className="flex items-center gap-2">
									<Input
										id="apiKey"
										readOnly={true}
										type="text"
										className="w-full bg-gray-100"
										value={apiKey}
										onChange={(e) => _setApiKey(e.target.value)}
									/>
									<CopyInputButton text={apiKey} />
								</div>
							</div>
						)}
						<div className="flex justify-end">
							<Button onClick={generateApiKey} disabled={!canApiKeyBeGenerated}>
								{`${apiKey === '' ? 'Generate' : 'Regenerate'} API KEY`}
							</Button>
						</div>
					</div>
					{/*)}*/}
				</div>
			</CardContent>
		</Card>
	);
}
