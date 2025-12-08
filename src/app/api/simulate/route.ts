import { NextRequest, NextResponse } from 'next/server';
import { simulateTx } from '@/lib/simulation/services/simulate';
import { SimulateRequest } from '@/lib/simulation/types/simulate';
import { logger } from '@/lib/simulation/logger';

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as SimulateRequest;

		logger.info({ body }, 'Received /api/simulate request');

		const result = await simulateTx(body);

		return NextResponse.json(result);
	} catch (err) {
		logger.error(err, 'Error in /api/simulate');
		const errorDetails =
			err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
		return NextResponse.json(
			{ error: 'Simulation failed', details: errorDetails },
			{ status: 500 }
		);
	}
}
