import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { type Hash } from 'viem';

const waitForOutput = ({ stdout }: ChildProcessWithoutNullStreams, output: string) =>
	new Promise<void>((resolve) => {
		stdout.on('data', (data) => {
			// console.log(data);
			if (data.includes(output)) {
				resolve();
			}
		});
	});

export const spawnAnvil = async ({
	hostname = '127.0.0.1',
	port = 8545,
	rpcUrl,
	txHash,
	blockNumber = BigInt(0)
}: {
	hostname?: string;
	port?: number;
	rpcUrl: string;
	txHash?: Hash;
	blockNumber?: bigint;
}) => {
	const anvil = spawn('anvil', [
		'--port',
		port.toString(),
		'--fork-url',
		rpcUrl,
		txHash ? '--fork-transaction-hash' : '--fork-block-number',
		txHash ? txHash : blockNumber.toString(),
		'--steps-tracing'
	]);
	/* process.on('exit', () => {
		console.log('process EXIT');
		anvil.kill();
	}); */
	await waitForOutput(anvil, `Listening on ${hostname}:${port}`);
	return anvil;
};
