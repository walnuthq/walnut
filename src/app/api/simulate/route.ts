import { NextRequest, NextResponse } from 'next/server';
import { simulateTx } from '@/lib/simulation/services/simulate';
import { SimulateRequest } from '@/lib/simulation/types/simulate';
import { logger } from '@/lib/simulation/logger';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
	try {
		// 1. Validate API key using better-auth
		const apiKey = req.headers.get('api-key') || req.headers.get('x-api-key');

		if (!apiKey) {
			logger.warn('Missing API key in /api/simulate request');
			return NextResponse.json(
				{ error: 'API key is required. Please provide it in the "api-key" or "x-api-key" header.' },
				{ status: 401 }
			);
		}

		// 2. Verify API key with better-auth
		const verification = await auth.api.verifyApiKey({
			body: {
				key: apiKey
			}
		});

		if (!verification.valid || !verification.key) {
			logger.warn(
				{ apiKeyPrefix: apiKey.substring(0, 10), error: verification.error },
				'Invalid API key in /api/simulate'
			);
			return NextResponse.json({ error: 'Invalid or expired API key.' }, { status: 403 });
		}

		const userId = verification.key.userId;
		logger.info({ userId, apiKeyId: verification.key.id }, 'API key validated successfully');

		// 3. Parse request body
		const body = (await req.json()) as SimulateRequest;

		logger.info({ body, userId }, 'Received /api/simulate request');

		// 4. Execute simulation
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
