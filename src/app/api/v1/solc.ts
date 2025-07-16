import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';

const execFile = promisify(execFileCb);

const solc = async (compilationTarget: string, cwd = process.env.PWD) => {
	const { stderr } = await execFile(
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
	console.error(stderr);
};

export default solc;
