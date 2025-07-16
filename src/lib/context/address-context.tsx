'use client';

import React, { createContext, useReducer, ReactNode, Dispatch } from 'react';

interface AddressState {
	hoveredAddress: string | null;
}

interface AddressAction {
	type: 'SET_HOVERED_ADDRESS';
	payload: string | null;
}

const initialState: AddressState = {
	hoveredAddress: null
};

const addressReducer = (state: AddressState, action: AddressAction): AddressState => {
	switch (action.type) {
		case 'SET_HOVERED_ADDRESS':
			return { ...state, hoveredAddress: action.payload };
		default:
			return state;
	}
};

const AddressContext = createContext<{
	state: AddressState;
	dispatch: Dispatch<AddressAction>;
}>({ state: initialState, dispatch: () => null });

const AddressProvider = ({ children }: { children: ReactNode }) => {
	const [state, dispatch] = useReducer(addressReducer, initialState);

	return <AddressContext.Provider value={{ state, dispatch }}>{children}</AddressContext.Provider>;
};

export { AddressContext, AddressProvider };
