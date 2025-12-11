import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/simulation/logger';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user, apiKey } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/admin/api-keys
 * Create a new API key for a user (Admin only)
 *
 * Headers:
 * - x-admin-token: Admin secret token (required)
 *
 * Body:
 * {
 *   "userId": "user_id",
 *   "name": "My API Key",
 *   "expiresIn": 2592000 // optional, in seconds (e.g., 30 days = 2592000)
 * }
 *
 * Example:
 * curl -X POST http://localhost:3000/api/admin/api-keys \
 *   -H "Content-Type: application/json" \
 *   -H "x-admin-token: your-secret-token" \
 *   -d '{"userId": "user_123", "name": "Production API Key", "expiresIn": 2592000}'
 */

export async function POST(req: NextRequest) {
	try {
		// 1. Verify admin secret token
		const adminToken = req.headers.get('x-admin-token');
		const expectedToken = process.env.ADMIN_SECRET_TOKEN;

		if (!expectedToken) {
			logger.error('ADMIN_SECRET_TOKEN not configured in environment');
			return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
		}

		if (!adminToken || adminToken !== expectedToken) {
			logger.warn(
				{ providedToken: adminToken?.substring(0, 10) },
				'Unauthorized admin API key creation attempt'
			);
			return NextResponse.json({ error: 'Unauthorized. Invalid admin token.' }, { status: 401 });
		}

		// 2. Parse request body
		const body = await req.json();
		const { userId, name, expiresIn } = body;

		if (!userId || !name) {
			return NextResponse.json({ error: 'userId and name are required' }, { status: 400 });
		}

		// 2.5. Get user's tenantId before creating API key (optional - can be null for public users)
		const userRecord = await db
			.select({ tenantId: user.tenantId })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		if (!userRecord.length) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// tenantId is optional - can be null for users without tenant assignment
		const tenantId = userRecord[0].tenantId || null;

		// 3. Create API key using better-auth plugin
		const result = await auth.api.createApiKey({
			body: {
				userId,
				name,
				expiresIn,
				prefix: 'wlt' // Keep the 'wlt_' prefix for consistency
			}
		});

		// 4. Update API key with tenantId if available (better-auth doesn't support custom fields)
		// tenantId can be null for public users without tenant assignment
		if (tenantId) {
			await db.update(apiKey).set({ tenantId }).where(eq(apiKey.id, result.id));
		}

		logger.info({ userId, name, keyId: result.id, tenantId }, 'Admin created API key');

		return NextResponse.json({
			success: true,
			apiKey: result.key, // Return the unhashed key - this is the only time it will be shown
			keyId: result.id,
			userId: result.userId,
			name: result.name,
			expiresAt: result.expiresAt,
			message: 'API key created successfully. Save it securely - it will not be shown again.'
		});
	} catch (err) {
		logger.error(err, 'Error creating API key');
		const errorDetails = err instanceof Error ? { message: err.message } : String(err);
		return NextResponse.json(
			{ error: 'Failed to create API key', details: errorDetails },
			{ status: 500 }
		);
	}
}
