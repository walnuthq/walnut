import { NextResponse } from 'next/server';
import { triggerManualCleanup } from '@/app/api/v1/utils/transaction-processing';

export const POST = async () => {
	try {
		const result = await triggerManualCleanup();

		if (result.success) {
			return NextResponse.json(result);
		} else {
			return NextResponse.json(result, { status: 500 });
		}
	} catch (error: any) {
		return NextResponse.json(
			{
				success: false,
				error: error?.message || 'Unknown error during cleanup'
			},
			{ status: 500 }
		);
	}
};

export const GET = async () => {
	try {
		const result = await triggerManualCleanup();

		if (result.success) {
			return NextResponse.json(result);
		} else {
			return NextResponse.json(result, { status: 500 });
		}
	} catch (error: any) {
		return NextResponse.json(
			{
				success: false,
				error: error?.message || 'Unknown error during cleanup'
			},
			{ status: 500 }
		);
	}
};
