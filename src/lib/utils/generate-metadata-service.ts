export const generateMetadata = (title: string, description: string, pageUrl: string) => {
	return {
		title: title,
		description: description,
		keywords: [
			'Ethereum',
			'EVM',
			'Debugger',
			'Solidity',
			'Transaction',
			'Gas profiler',
			'Stack trace',
			'Debugging'
		],
		metadataBase: new URL('https://walnut.dev/'),
		openGraph: {
			title: title,
			description: description,
			images: [
				{
					url: 'https://walnut.dev/seo.png',
					width: 520,
					height: 160,
					alt: 'Walnut Logo'
				}
			],
			locale: 'en_US',
			type: 'website',
			url: pageUrl
		},
		twitter: {
			card: 'summary_large_image',
			title: title,
			description: description,
			images: ['https://walnut.dev/seo.png']
		},
		icons: {
			icon: '/favicon/favicon.ico',
			shortcut: '/favicon/favicon.ico',
			apple: '/favicon/apple-touch-icon.png'
		}
	};
};
