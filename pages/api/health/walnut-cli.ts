import type { NextApiRequest, NextApiResponse } from 'next';
import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';

const execFile = promisify(execFileCb);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === 'GET') {
		try {
			const { detailed } = req.query;

			// Execute walnut-cli --version
			const { stdout } = await execFile('walnut-cli', ['--version'], {
				timeout: 5000
			});

			if (detailed === 'true') {
				// Return detailed response
				res.status(200).json({
					status: 'ok',
					service: 'walnut-cli',
					message: 'CLI is running',
					version: stdout.trim()
				});
			} else {
				// Return only status code
				res.status(200).end();
			}
		} catch (error) {
			console.error('walnut-cli health check failed:', error);

			if (req.query.detailed === 'true') {
				res.status(503).json({
					status: 'error',
					service: 'walnut-cli',
					message: `CLI is not available: ${
						error instanceof Error ? error.message : 'Unknown error'
					}`
				});
			} else {
				res.status(503).end();
			}
		}
	} else if (req.method === 'HEAD') {
		try {
			await execFile('walnut-cli', ['--version'], { timeout: 5000 });
			res.status(200).end();
		} catch (error) {
			res.status(503).end();
		}
	} else {
		res.setHeader('Allow', ['GET', 'HEAD']);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}
