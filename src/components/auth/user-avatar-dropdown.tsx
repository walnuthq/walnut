import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { ArrowRightEndOnRectangleIcon } from '@heroicons/react/24/solid';
import { performLogout } from '@/lib/utils/auth-utils';
import starknetLogo from '@/assets/network-logos/strk.svg';
import {
	Cog6ToothIcon,
	PlayIcon,
	MoonIcon,
	SunIcon,
	DevicePhoneMobileIcon,
	CheckBadgeIcon,
	DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { VERIFY_URL, REPO_URL } from '@/lib/config';
import Image from 'next/image';
import { navigation } from '../footer';

const UserAvatarDropdown = ({ avatarSrc, userName }: { avatarSrc?: string; userName: string }) => {
	const { theme, setTheme } = useTheme();
	return (
		<div className=" text-left flex w-full">
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger>
					<Avatar className="h-8 w-8">
						<AvatarImage src={avatarSrc} />
						<AvatarFallback>{userName?.charAt(0) ?? 'U'}</AvatarFallback>
					</Avatar>
				</DropdownMenuTrigger>

				<DropdownMenuContent className="w-fit mr-4 sm:mr-6 lg:mr-8">
					<div className="px-2 py-1.5">
						<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</p>
					</div>
					<Link href={`/simulate-transaction`}>
						<DropdownMenuItem className="cursor-pointer">
							<PlayIcon className="mr-1 h-4 w-4" />
							<span>Simulate transaction</span>
						</DropdownMenuItem>
					</Link>
					<a href={VERIFY_URL} target="_blank" rel="noreferrer noopener">
						<DropdownMenuItem className="cursor-pointer">
							<CheckBadgeIcon className="mr-1 h-4 w-4" />
							<span>Verify contracts</span>
						</DropdownMenuItem>
					</a>
					<a href={REPO_URL} target="_blank" rel="noreferrer noopener">
						<DropdownMenuItem className="cursor-pointer">
							<DocumentMagnifyingGlassIcon className="mr-1 h-4 w-4" />
							<span>Contract Viewer</span>
						</DropdownMenuItem>
					</a>
					<Link href="/settings">
						<DropdownMenuItem className="cursor-pointer">
							<Cog6ToothIcon className="mr-1 h-4 w-4" />
							<span>Settings</span>
						</DropdownMenuItem>
					</Link>
					<Link href="https://app.walnut.dev" target="_blank">
						<DropdownMenuItem className="cursor-pointer">
							<Image src={starknetLogo} alt="straknet" className="mr-2 h-4 w-4" />
							<span>Switch to Starknet</span>
						</DropdownMenuItem>
					</Link>

					<DropdownMenuSeparator />
					<div className="px-2 py-1.5">
						<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Links</p>
					</div>
					{navigation.map((item) => (
						<a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer">
							<DropdownMenuItem className="cursor-pointer">
								<item.icon className="mr-2 h-4 w-4" aria-hidden="true" />
								<span>{item.name}</span>
							</DropdownMenuItem>
						</a>
					))}

					<DropdownMenuSeparator />

					<div className="px-2 py-1.5">
						<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Theme</p>
					</div>
					<DropdownMenuItem
						onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
						className="cursor-pointer"
					>
						{theme === 'dark' ? (
							<SunIcon className="mr-1 h-4 w-4" />
						) : (
							<MoonIcon className="mr-1 h-4 w-4" />
						)}
						<div>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</div>
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => setTheme('system')}
						className="cursor-pointer flex items-center"
					>
						<DevicePhoneMobileIcon className="mr-1 h-4 w-4" />
						<div>System theme</div>
					</DropdownMenuItem>

					<DropdownMenuItem onClick={performLogout} className="cursor-pointer">
						<ArrowRightEndOnRectangleIcon className="mr-1 h-4 w-4"></ArrowRightEndOnRectangleIcon>
						<span>Log out</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
};

export default UserAvatarDropdown;
