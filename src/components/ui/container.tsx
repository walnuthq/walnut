import clsx from 'clsx';

export function Container({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div className={clsx('w-full px-4 sm:px-6 lg:px-8', className)} {...props} />;
}
