import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';

export const GET = async () => {
	const authSession = await getServerSession();
	return NextResponse.json(authSession);
};
