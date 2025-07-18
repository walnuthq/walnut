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
import { githubSignOut } from '@/components/auth/sign-out-server-action';
import {
	Cog6ToothIcon,
	PlayIcon,
	MoonIcon,
	SunIcon,
	DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';

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
					<Link href={`/simulate-transaction`}>
						<DropdownMenuItem className="cursor-pointer">
							<PlayIcon className="mr-1 h-4 w-4" />
							<span>Simulate transaction</span>
						</DropdownMenuItem>
					</Link>
					<Link href="/settings">
						<DropdownMenuItem className="cursor-pointer">
							<Cog6ToothIcon className="mr-1 h-4 w-4" />
							<span>Settings</span>
						</DropdownMenuItem>
					</Link>
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

					<DropdownMenuItem onClick={() => githubSignOut()} className="cursor-pointer">
						<ArrowRightEndOnRectangleIcon className="mr-1 h-4 w-4"></ArrowRightEndOnRectangleIcon>
						<span>Log out</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
};

export default UserAvatarDropdown;
