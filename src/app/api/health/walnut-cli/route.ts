import type { NextRequest } from 'next/server';
import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';

export const runtime = 'nodejs';

const execFile = promisify(execFileCb);

export async function GET(request: NextRequest) {
	try {
		// Check if walnut-cli is available by trying to get its version
		const { stdout } = await execFile('walnut-cli', ['--version'], {
			timeout: 5000 // 5 second timeout
		});

		return new Response(
			JSON.stringify({
				status: 'ok',
				service: 'walnut-cli',
				message: 'CLI is running',
				version: stdout.trim()
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error) {
		console.error('walnut-cli health check failed:', error);

		return new Response(
			JSON.stringify({
				status: 'error',
				service: 'walnut-cli',
				message: `CLI is not available: ${error instanceof Error ? error.message : 'Unknown error'}`
			}),
			{
				status: 503,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
}

export async function HEAD(request: NextRequest) {
	try {
		await execFile('walnut-cli', ['--version'], { timeout: 5000 });
		return new Response(null, { status: 200 });
	} catch (error) {
		return new Response(null, { status: 503 });
	}
}
