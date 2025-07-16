import type { Project, Stats } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import {
	ExclamationTriangleIcon,
	CubeTransparentIcon,
	WalletIcon,
	ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import CommonErrorsTable from './errors-table';

export function Stats({ stats, project }: { stats: Stats; project: Project }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total simulations</CardTitle>
						<CubeTransparentIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total_simulations}</div>
						{/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Failed simulations</CardTitle>
						<ExclamationTriangleIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.failure_simulations}</div>
						{/* <p className="text-xs text-muted-foreground">+180.1% from last month</p> */}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Unique wallets</CardTitle>
						<WalletIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.unique_wallet_count}</div>
						{/* <p className="text-xs text-muted-foreground">+19% from last month</p> */}
					</CardContent>
				</Card>
			</div>
			{stats.common_errors && stats.common_errors.length > 0 && (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<a href={`/monitoring/project/${project.slug}/errors`}>
							<CardTitle className="text-sm font-medium flex flex-row gap-2 items-center cursor-pointer border-b hover:border-secondary-foreground/80 border-transparent">
								<span>Most repeated errors</span>
								<ArrowTopRightOnSquareIcon className="h-4 w-4" />
							</CardTitle>
						</a>
						{/* <WalletIcon className="h-4 w-4 text-muted-foreground" /> */}
					</CardHeader>
					<CardContent>
						<CommonErrorsTable
							commonErrors={stats.common_errors.filter((e) => e.error_message !== '').slice(0, 5)}
							projectSlug={project.slug}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
