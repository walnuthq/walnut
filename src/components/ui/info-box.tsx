import { copyToClipboard } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import CopyToClipboardElement from './copy-to-clipboard';
import AddressLink from '../address-link';

export interface InfoBoxItem {
	name: string;
	value: React.ReactNode;
	isCopyable?: boolean;
	valueToCopy?: string;
}

export function InfoBox({ details }: { details: InfoBoxItem[] }) {
	return (
		<Card>
			<CardContent className="p-2 text-xs flex gap-x-3 flex-wrap leading-loose overflow-x-auto">
				{details.map(
					({ name, value, isCopyable, valueToCopy }) =>
						value && (
							<span key={name} className="whitespace-nowrap">
								<span className="text-neutral-500">{name}:</span>{' '}
								<CopyToClipboardElement
									value={
										isCopyable && valueToCopy
											? valueToCopy
											: typeof value === 'string'
											? value
											: null
									}
									toastDescription={`${name} has been copied.`}
									className={`rounded-sm font-mono ${
										typeof value === 'string' && value.startsWith('0x') ? 'py-1 px-0' : 'px-1'
									} ${isCopyable ? 'cursor-pointer' : ''}`}
								>
									{typeof value === 'string' && value.startsWith('0x') ? (
										<AddressLink address={value} addressClassName="">
											{value}
										</AddressLink>
									) : (
										value
									)}
								</CopyToClipboardElement>
							</span>
						)
				)}
			</CardContent>
		</Card>
	);
}
