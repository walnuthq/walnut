'use client';

import { useEffect, useState, useCallback } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import { fetchVerificationStatus } from '@/lib/verification';
import {
	VerificationRequestRow,
	VerificationStatus,
	VerificationStatusRow
} from '@/lib/verification/types';
import { HeaderNav } from '../header';
import { Container } from '../ui/container';
import { Footer } from '../footer';
import { Error } from '../ui/error';
import { Loader } from '../ui/loader';

export function VerificationStatusPage({ verificationId }: { verificationId: string }) {
	const [verificationRows, setVerificationRows] = useState<VerificationStatusRow[]>([]);
	const [verificationRequest, setVerificationRequest] = useState<VerificationRequestRow | null>(
		null
	);
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetchStatus = useCallback(async () => {
		const response = await fetchVerificationStatus(verificationId);
		if (response.isError) {
			if (response.response.errorMessage) {
				setError(response.response.errorMessage);
			} else {
				setError('Error fetching verification status');
			}
			setIsLoading(false);
			return;
		}
		setVerificationRows(response.response.verificationStatuses);
		setVerificationRequest(response.response.verificationRequest ?? null);
		setIsPending(
			response.response.verificationRequest?.status === 'pending' ||
				response.response.verificationStatuses.some(
					(row) => row.status === VerificationStatus.pending
				)
		);
		setError(null);
		setIsLoading(false);
	}, [verificationId]);

	useEffect(() => {
		fetchStatus();
		const interval = setInterval(() => {
			if (isPending) {
				fetchStatus();
			}
		}, 5000);

		return () => clearInterval(interval);
	}, [fetchStatus, isPending]);

	const formatOutput = (output: string): string => {
		try {
			const parsed = JSON.parse(output);
			// If the parsed result is still a string, it means the JSON might be double-encoded.
			if (typeof parsed === 'string') {
				try {
					const doubleParsed = JSON.parse(parsed);
					return JSON.stringify(doubleParsed, null, 2);
				} catch {
					// If second parse fails, fallback to unescaping newline sequences.
					return parsed.replace(/\\n/g, '\n');
				}
			}
			return JSON.stringify(parsed, null, 2);
		} catch (err) {
			// If initial parsing fails, simply replace literal "\n" escapes with line breaks.
			return output.replace(/\\n/g, '\n');
		}
	};

	return (
		<>
			<HeaderNav />
			<main className="overflow-y-auto flex-grow">
				<Container className="py-6">
					{isLoading ? (
						<Loader randomQuote={false} />
					) : (
						<>
							{error ? (
								<Error message={error} />
							) : (
								<div className="flex flex-col gap-4">
									<div className="font-mono text-sm">Verification ID: {verificationId}</div>
									{verificationRows.length === 0 &&
										verificationRequest &&
										verificationRequest.status === 'pending' && (
											<div className="rounded border">
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Status</TableHead>
															<TableHead>Message</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														<TableRow key={verificationRequest.id}>
															<TableCell className="text-blue-500">
																{verificationRequest.status}
															</TableCell>
															<TableCell>{'Project is being processed. Please wait.'}</TableCell>
														</TableRow>
													</TableBody>
												</Table>
											</div>
										)}
									{verificationRequest && verificationRequest.status === 'failed' ? (
										<Error
											errorTitle="Verification failed"
											title={false}
											message={formatOutput(verificationRequest.message ?? 'Verification failed')}
										/>
									) : (
										verificationRows.length > 0 && (
											<div className="rounded border">
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Status</TableHead>
															<TableHead>Class hash</TableHead>
															<TableHead>Build profiles</TableHead>
															<TableHead>Message</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{verificationRows.map((row) => (
															<TableRow key={row.id}>
																<TableCell
																	className={
																		row.status === VerificationStatus.success
																			? 'text-green-500'
																			: row.status === VerificationStatus.failed
																			? 'text-red-500'
																			: 'text-blue-500'
																	}
																>
																	{row.status}
																</TableCell>
																<TableCell className="font-mono">{row.classHash}</TableCell>
																<TableCell className="font-mono">
																	{row.profiles?.join(', ') || ''}
																</TableCell>
																<TableCell>{row.message}</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										)
									)}
								</div>
							)}
						</>
					)}
				</Container>
			</main>
			<Footer />
		</>
	);
}
