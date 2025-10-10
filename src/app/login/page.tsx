'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import logoWalnutWhite from '@/assets/walnut-white.svg';
import logoWalnut from '@/assets/walnut.svg';
import { SignUpWithGithubButton } from '@/components/auth/sign-up-with-github-button';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';

export const runtime = 'edge';

export default function Page() {
	const { data: session } = authClient.useSession();
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const currentTheme = theme;
	useEffect(() => {
		setTheme('light');
		return () => {
			if (currentTheme) setTheme(currentTheme);
		};
	}, [currentTheme, setTheme]);
	useEffect(() => {
		if (session) {
			router.push('/');
		}
	}, [session, router]);
	return (
		<>
			<div className="container relative h-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
				<div className="relative h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex hidden">
					<div className="absolute inset-0 bg-zinc-900" />
					<div className="relative z-20 flex items-center text-lg font-medium">
						<Image src={logoWalnutWhite} alt="Walnut logo" unoptimized className="h-10 w-auto" />
					</div>
					<div className="w-full mt-auto relative z-20 max-w-2xl pr-16 py-16">
						<figure className="relative isolate pt-6 sm:pt-12">
							<svg
								fill="none"
								viewBox="0 0 162 128"
								aria-hidden="true"
								className="absolute left-0 top-0 -z-10 h-32 stroke-white/20"
							>
								<path
									d="M65.5697 118.507L65.8918 118.89C68.9503 116.314 71.367 113.253 73.1386 109.71C74.9162 106.155 75.8027 102.28 75.8027 98.0919C75.8027 94.237 75.16 90.6155 73.8708 87.2314C72.5851 83.8565 70.8137 80.9533 68.553 78.5292C66.4529 76.1079 63.9476 74.2482 61.0407 72.9536C58.2795 71.4949 55.276 70.767 52.0386 70.767C48.9935 70.767 46.4686 71.1668 44.4872 71.9924L44.4799 71.9955L44.4726 71.9988C42.7101 72.7999 41.1035 73.6831 39.6544 74.6492C38.2407 75.5916 36.8279 76.455 35.4159 77.2394L35.4047 77.2457L35.3938 77.2525C34.2318 77.9787 32.6713 78.3634 30.6736 78.3634C29.0405 78.3634 27.5131 77.2868 26.1274 74.8257C24.7483 72.2185 24.0519 69.2166 24.0519 65.8071C24.0519 60.0311 25.3782 54.4081 28.0373 48.9335C30.703 43.4454 34.3114 38.345 38.8667 33.6325C43.5812 28.761 49.0045 24.5159 55.1389 20.8979C60.1667 18.0071 65.4966 15.6179 71.1291 13.7305C73.8626 12.8145 75.8027 10.2968 75.8027 7.38572C75.8027 3.6497 72.6341 0.62247 68.8814 1.1527C61.1635 2.2432 53.7398 4.41426 46.6119 7.66522C37.5369 11.6459 29.5729 17.0612 22.7236 23.9105C16.0322 30.6019 10.618 38.4859 6.47981 47.558L6.47976 47.558L6.47682 47.5647C2.4901 56.6544 0.5 66.6148 0.5 77.4391C0.5 84.2996 1.61702 90.7679 3.85425 96.8404L3.8558 96.8445C6.08991 102.749 9.12394 108.02 12.959 112.654L12.959 112.654L12.9646 112.661C16.8027 117.138 21.2829 120.739 26.4034 123.459L26.4033 123.459L26.4144 123.465C31.5505 126.033 37.0873 127.316 43.0178 127.316C47.5035 127.316 51.6783 126.595 55.5376 125.148L55.5376 125.148L55.5477 125.144C59.5516 123.542 63.0052 121.456 65.9019 118.881L65.5697 118.507Z"
									id="b56e9dab-6ccb-4d32-ad02-6b4bb5d9bbeb"
								/>
								<use x={86} href="#b56e9dab-6ccb-4d32-ad02-6b4bb5d9bbeb" />
							</svg>
							<blockquote className="text-lg/7 text-white">
								<p>
									We’re building Walnut to help smart contract developers create better and more
									resilient applications. If you need assistance,{' '}
									<a href="https://t.me/walnuthq" className="underline">
										reach out anytime
									</a>
									.
								</p>
							</blockquote>
							<figcaption className="mt-8 text-base flex items-center gap-4">
								<Avatar className="h-12 w-12">
									<AvatarImage src="https://pbs.twimg.com/profile_images/1165175389133688832/J6fWCiVz_400x400.jpg" />
									<AvatarFallback>Roman Mazur</AvatarFallback>
								</Avatar>
								<div>
									<div className="font-semibold text-white">Roman Mazur</div>

									<a
										href="https://twitter.com/romanmazur"
										className="mt-1 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-300"
									>
										<svg
											className="h-4 w-4"
											fill="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
										</svg>
										@romanmazur
									</a>
								</div>
							</figcaption>
						</figure>
					</div>
				</div>
				<div className="flex items-center justify-center min-h-screen p-4 lg:p-8">
					<div className="mx-auto flex w-full flex-col justify-center items-center space-y-3 sm:w-[450px]">
						<Image
							src={logoWalnut}
							alt="Walnut logo"
							unoptimized
							className="h-12 w-auto lg:hidden dark:hidden"
						/>
						<Image
							src={logoWalnutWhite}
							alt="Walnut logo"
							unoptimized
							className="h-12 w-auto lg:hidden hidden dark:block"
						/>
						<div className="flex flex-col space-y-2 text-center">
							<h1 className="text-2xl font-semibold tracking-tight">Sign up to Walnut</h1>
							<p className="text-md text-muted-foreground">
								Sign in with Github and start debugging.
							</p>
						</div>
						<div className="flex flex-col">
							<SignUpWithGithubButton />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
