import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';

const execFile = promisify(execFileCb);

const solc = async ({
	compilationTarget,
	cwd = process.env.PWD
}: {
	compilationTarget: string;
	cwd?: string;
}) => {
	try {
		const { stderr, stdout } = await execFile(
			'solc',
			[
				'--via-ir',
				'--debug-info',
				'ethdebug',
				'--ethdebug',
				'--ethdebug-runtime',
				'--bin',
				'--abi',
				'--overwrite',
				'-o',
				`${cwd}/debug`,
				compilationTarget
			],
			{ cwd }
		);
	} catch (err: any) {
		console.log('ERR', err);
		if (err?.stderr) {
			throw new Error(err.stderr);
		}
		throw err;
	}
};

export default solc;
