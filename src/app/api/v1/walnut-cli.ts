import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';
import { type DebugCallResponse } from '@/app/api/v1/types';
import { type Hash } from 'viem';

const execFile = promisify(execFileCb);

const walnutCli = async (
	rpcUrl: string,
	txHash: Hash,
	cwd = process.env.PWD
): Promise<DebugCallResponse> => {
	const { stdout } = await execFile(
		'walnut-cli',
		['trace', txHash, '--ethdebug-dir', `${cwd}/debug`, '--rpc', rpcUrl, '--json'],
		{ cwd }
	);
	return JSON.parse(stdout);
};

export default walnutCli;
