import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SettingsContextProvider } from '@/lib/context/settings-context-provider';
import { Toaster } from '@/components/ui/toaster';
import { UserContextProvider } from '@/lib/context/user-context-provider';
import { generateMetadata } from '@/lib/utils/generate-metadata-service';
import { ThemeProvider } from 'next-themes';
import { AddressProvider } from '@/lib/context/address-context';

const inter = Inter({ subsets: ['latin'] });

const title = 'Debugger for Starknet smart contract developers | Walnut';
const description =
	'Delve deeper into Cairo transaction execution with our state-of-the-art debugger. Swiftly identify bugs and pinpoint areas for enhancement.';
export const metadata: Metadata = generateMetadata(
	title,
	description,
	'https://www.walnut.network/debugger'
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="h-full">
			<body className={`${inter.className} h-full md:overflow-hidden`}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
					<UserContextProvider>
						<SettingsContextProvider>
							<AddressProvider>
								<div className="flex flex-col h-full w-full max-h-screen">{children}</div>
							</AddressProvider>
						</SettingsContextProvider>
						<Toaster />
					</UserContextProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
