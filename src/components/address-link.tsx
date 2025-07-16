import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';

import { SquareArrowOutUpRight } from 'lucide-react';
import { AddressContext } from '@/lib/context/address-context';

interface AddressLinkProps {
	addressClassName?: string;
	address: string;
	children: React.ReactNode;
}

const AddressLink = ({ addressClassName, address, children }: AddressLinkProps) => {
	const { state, dispatch } = useContext(AddressContext);

	const handleMouseEnter = () => {
		dispatch({ type: 'SET_HOVERED_ADDRESS', payload: address });
	};

	const handleMouseLeave = () => {
		dispatch({ type: 'SET_HOVERED_ADDRESS', payload: null });
	};

	return (
		<span
			className={`text-primary dark:hover:brightness-150 hover:brightness-125`}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<span className={`relative p-1 ${addressClassName}`}>
				{children}
				<span
					className={`pointer-events-none absolute inset-0 rounded border border-dashed border-yellow-900 bg-yellow-900  dark:border-highlight_yellow dark:bg-opacity-5 bg-opacity-5 transition-opacity ${
						state.hoveredAddress === address ? 'opacity-100' : 'opacity-0'
					}`}
				></span>
			</span>
		</span>
	);
};

export default AddressLink;
