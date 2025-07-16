import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { type Hash } from 'viem';

const isAddressInUse = (port: number, hostname: string) =>
	new Promise<boolean>((resolve) => {
		const server = createServer();
		server.once('error', ({ code }: { code: string }) => {
			if (code === 'EADDRINUSE') {
				resolve(false);
			}
		});
		server.once('listening', () => {
			resolve(true);
			server.close();
		});
		server.listen(port, hostname);
	});

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
	/* const addressInUse = await isAddressInUse(port, hostname);
	if (addressInUse) {
		return;
	} */
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
