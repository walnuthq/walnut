import { JSX, SVGProps } from 'react';
import { Container } from '@/components/ui/container';
import { Separator } from '@/components/ui/separator';

export const navigation = [
	{
		name: 'Telegram',
		href: 'https://t.me/walnuthq', // Replace with your actual Telegram link
		icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
			<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
				<path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
			</svg>
		)
	},
	{
		name: 'Twitter',
		href: 'https://twitter.com/walnut_dev',
		icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
			<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
				<path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
			</svg>
		)
	},
	{
		name: 'GitHub',
		href: 'https://github.com/walnuthq',
		icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
			<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
				<path
					fillRule="evenodd"
					d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
					clipRule="evenodd"
				/>
			</svg>
		)
	}
];

export function Footer() {
	return (
		<footer className="flex-none">
			<Container className="py-1 border-t ">
				<div className="flex flex-col md:flex-row md:justify-between md:items-center">
					<div className="flex space-x-12 mb-4 md:mb-0 text-xs"></div>
					<div className="flex justify-end space-x-4 items-center">
						{/* <div className="flex justify-end mb-4 md:mb-0">
							<a
								href="https://docs.walnut.dev"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-500 hover:underline text-xs"
							>
								Docs
							</a>
						</div>
						<Separator orientation="vertical" className="h-4 mb-4 md:mb-0" /> */}
						<div className="flex justify-center space-x-4 items-center mb-4 md:mb-0">
							{navigation.map((item) => (
								<a
									key={item.name}
									href={item.href}
									target="_blank"
									rel="noopener noreferrer"
									className="text-gray-400 hover:text-gray-500"
								>
									<span className="sr-only">{item.name}</span>
									<item.icon className="h-5 w-5" aria-hidden="true" />
								</a>
							))}
						</div>
					</div>
				</div>
			</Container>
		</footer>
	);
}
