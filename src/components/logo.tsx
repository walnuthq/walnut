import Image, { type ImageProps } from 'next/image';

import logoWalnut from '@/assets/wlnt-logo-beta-bw.svg';

export function Logo({ src, alt, ...props }: Partial<ImageProps>) {
	return <Image src={src ?? logoWalnut} alt={alt ?? 'Walnut logo'} unoptimized {...props} />;
}
