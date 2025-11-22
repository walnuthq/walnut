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

const title = 'Walnut: Transaction Debugger and Simulator for EVM';
const description =
	'Open source transaction debugger for any EVM chain. Perfect for rollups who need customizations or ability to self-host.';
export const metadata: Metadata = generateMetadata(title, description, 'https://app.walnut.dev/');

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="h-full" suppressHydrationWarning>
			<body className={`${inter.className} h-full md:overflow-hidden`}>
				<ThemeProvider
					attribute="class"
					enableSystem
					defaultTheme="system"
					disableTransitionOnChange
				>
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
