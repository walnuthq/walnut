import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === 'GET' || req.method === 'HEAD') {
		res.status(200).end();
	} else {
		res.setHeader('Allow', ['GET', 'HEAD']);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}
