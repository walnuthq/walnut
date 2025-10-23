import { HeaderNav } from '@/components/header';
import { Container } from '@/components/ui/container';
import { getServerSession } from '@/lib/auth-server';
import { VERIFY_URL } from '@/lib/config';

const HowToVerifyPage = async () => {
	const authSession = await getServerSession();
	if (!authSession || authSession.session === null) {
		return null;
	}
	const tenantNetworks = authSession.session.tenantNetworks ?? [];
	const hasTenant = tenantNetworks.length > 0;
	const { chainId } = tenantNetworks[0] ?? { chainId: 1 };
	return (
		<>
			<HeaderNav />
			<main className="overflow-y-auto flex-grow">
				<Container className="max-w-6xl mx-auto pt-6 pb-4">
					<h1 className="text-3xl font-semibold mb-8">How to verify contracts on Walnut?</h1>
					<ul className="my-6 ml-6 list-disc [&>li]:mt-2">
						<li>
							If your chain is{' '}
							<a
								href="https://docs.sourcify.dev/docs/chains/"
								className="underline-offset-4 hover:underline text-blue-500"
								target="_blank"
								rel="noreferrer noopener"
							>
								supported on Sourcify
							</a>
							, please follow{' '}
							<a
								href="https://docs.sourcify.dev/docs/how-to-verify/"
								className="underline-offset-4 hover:underline text-blue-500"
								target="_blank"
								rel="noreferrer noopener"
							>
								this guide
							</a>{' '}
							to verify your contract on{' '}
							<a
								href="https://repo.sourcify.dev/"
								className="underline-offset-4 hover:underline text-blue-500"
								target="_blank"
								rel="noreferrer noopener"
							>
								the public Sourcify repo
							</a>
							.
						</li>
						{hasTenant ? (
							<li>
								You can{' '}
								<a
									href={`${VERIFY_URL}?chainId=${chainId}`}
									className="underline-offset-4 hover:underline text-blue-500"
									target="_blank"
									rel="noreferrer noopener"
								>
									verify your contracts privately or publicly
								</a>{' '}
								on the Walnut Sourcify repo.
							</li>
						) : (
							<li>
								You can{' '}
								<a
									href={VERIFY_URL}
									className="underline-offset-4 hover:underline text-blue-500"
									target="_blank"
									rel="noreferrer noopener"
								>
									verify your contracts
								</a>{' '}
								on the Walnut Sourcify repo.
							</li>
						)}
					</ul>
				</Container>
			</main>
		</>
	);
};

export default HowToVerifyPage;
