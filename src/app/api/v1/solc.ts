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
		if (stderr && stderr.includes('Source file requires different compiler version')) {
			const pragmaMatch = stderr.match(/pragma solidity ([^;]+);/);
			const pragma = pragmaMatch ? pragmaMatch[1] : 'unknown';
			throw new Error(
				`Debugging is only supported with solc >0.8.29, but your file uses pragma solidity ${pragma}.`
			);
		}
		if (stderr) {
			console.error(stderr);
		}
	} catch (err: any) {
		if (err?.stderr && err.stderr.includes('Source file requires different compiler version')) {
			const pragmaMatch = err.stderr.match(/pragma solidity ([^;]+);/);
			const pragma = pragmaMatch ? pragmaMatch[1] : 'unknown';
			throw new Error(
				`Debugging is only supported with solc >0.8.29, but your file uses pragma solidity ${pragma}.`
			);
		}
		throw err;
	}
};

export default solc;
