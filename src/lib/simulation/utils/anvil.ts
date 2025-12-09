import { spawn, ChildProcess } from 'child_process';
import { ethers } from 'ethers';
import { logger } from '../logger';

/**
 * Start anvil fork and wait for it to be ready
 * @param forkBlockNumber - Block number to fork from (defaults to blockNumber if not provided)
 */
export async function startAnvilFork(
	rpcForkUrl: string,
	blockNumber: number,
	forkBlockNumber?: number
): Promise<{ anvil: ChildProcess; provider: ethers.JsonRpcProvider }> {
	const forkBlock = forkBlockNumber ?? blockNumber;
	logger.info({ forkBlock, blockNumber }, 'Starting local anvil fork...');

	let anvilError = '';
	let anvilOutput = '';
	let anvilExited = false;
	let exitCode: number | null = null;

	// Check if anvil process starts successfully
	const anvil = spawn(
		'anvil',
		[
			'--fork-url',
			rpcForkUrl,
			'--fork-block-number',
			forkBlock.toString(),
			'--steps-tracing',
			'--silent'
		],
		{
			// Ensure we can see errors
			stdio: ['ignore', 'pipe', 'pipe']
		}
	);

	anvil.stdout?.on('data', (data) => {
		anvilOutput += data.toString();
		logger.debug({ stdout: data.toString() }, 'Anvil stdout');
	});

	anvil.stderr?.on('data', (data) => {
		anvilError += data.toString();
		logger.warn({ stderr: data.toString() }, 'Anvil stderr');
	});

	anvil.on('error', (err) => {
		logger.error({ err, rpcForkUrl, forkBlock }, 'Failed to spawn anvil process');
		// Check if it's ENOENT (command not found)
		if ((err as any).code === 'ENOENT') {
			throw new Error(
				'Anvil is not installed. Please install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup'
			);
		}
		throw new Error(`Failed to start anvil: ${err.message}`);
	});

	// Check if process exits immediately (indicates anvil not found or error)
	anvil.on('exit', (code, signal) => {
		anvilExited = true;
		exitCode = code;
		if (code !== null && code !== 0) {
			logger.error({ code, signal, anvilError, anvilOutput }, 'Anvil process exited unexpectedly');
		}
	});

	// Wait for anvil to be ready with retries
	// Increased timeout: 30 retries * 1s = 30 seconds max wait time
	const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545', undefined, {
		// Increase provider timeout
		staticNetwork: false
	});

	let retries = 5;
	const retryDelay = 1000; // 1 second between retries

	while (retries > 0) {
		// Check if anvil process exited
		if (anvilExited && exitCode !== 0) {
			anvil.kill();
			const errorMsg = anvilError
				? `Anvil process exited with code ${exitCode}. Error: ${anvilError}`
				: `Anvil process exited with code ${exitCode}. Check if anvil is installed and RPC URL is accessible.`;
			logger.error({ exitCode, anvilError, anvilOutput }, errorMsg);
			throw new Error(errorMsg);
		}

		try {
			// Try to get block number with timeout
			const blockNumber = await Promise.race([
				provider.getBlockNumber(),
				new Promise((_, reject) => setTimeout(() => reject(new Error('Provider timeout')), 2000))
			]);
			logger.info({ blockNumber }, 'Anvil is ready');
			break;
		} catch (err) {
			retries--;
			if (retries === 0) {
				anvil.kill();
				const errorMsg = anvilError
					? `Anvil failed to start. Error: ${anvilError}`
					: 'Connection timeout after 30 seconds. Check if anvil is installed and RPC URL is accessible.';
				logger.error({ anvilError, anvilOutput, retries: 0 }, errorMsg);
				throw new Error(errorMsg);
			}
			logger.debug(
				{ retries, error: err instanceof Error ? err.message : String(err) },
				'Waiting for anvil to start...'
			);
			await new Promise((r) => setTimeout(r, retryDelay));
		}
	}

	logger.info('Anvil fork ready.');
	return { anvil, provider };
}

/**
 * Create a snapshot and return snapshot ID
 */
export async function createSnapshot(provider: ethers.JsonRpcProvider): Promise<string> {
	logger.info('Taking snapshot...');
	const snapshotId: string = await provider.send('evm_snapshot', []);
	logger.info({ snapshotId }, 'Snapshot created.');
	return snapshotId;
}

/**
 * Revert to snapshot
 */
export async function revertSnapshot(
	provider: ethers.JsonRpcProvider,
	snapshotId: string
): Promise<void> {
	logger.info({ snapshotId }, 'Reverting snapshot...');
	await provider.send('evm_revert', [snapshotId]);
	logger.info('Snapshot reverted.');
}

/**
 * Execute all transactions in a block up to (but not including) transactionIndex
 * This is needed to get the correct state before a specific transaction in the block
 */
export async function executePreviousTransactions(
	provider: ethers.JsonRpcProvider,
	rpcForkUrl: string,
	blockNumber: number,
	transactionIndex: number
): Promise<void> {
	if (transactionIndex <= 0) {
		// No previous transactions to execute
		return;
	}

	logger.info({ blockNumber, transactionIndex }, 'Executing previous transactions in block...');

	// Create a temporary provider to fetch block data from original RPC
	const originalProvider = new ethers.JsonRpcProvider(rpcForkUrl);

	try {
		// Get specific block with transactions
		const block = await originalProvider.getBlock(blockNumber, true);
		if (!block || !block.transactions) {
			logger.warn(
				{ blockNumber },
				'Could not fetch block transactions, skipping previous transaction execution'
			);
			return;
		}

		// Extract transaction hashes (block.transactions can be TransactionResponse[] or string[])
		const txHashes: string[] = block.transactions.map((tx) =>
			typeof tx === 'string' ? tx : (tx as any).hash
		);

		if (txHashes.length < transactionIndex) {
			logger.warn(
				{ blockNumber, transactionIndex, totalTransactions: txHashes.length },
				'Transaction index exceeds block transactions, skipping previous transaction execution'
			);
			return;
		}

		await executeTransactions(provider, originalProvider, txHashes.slice(0, transactionIndex));
	} catch (error) {
		logger.error({ error, blockNumber, transactionIndex }, 'Error executing previous transactions');
		throw error;
	} finally {
		originalProvider.destroy();
	}
}

/**
 * Execute a list of transaction hashes using debug_traceCall with stateDiff
 * This simulates transactions and applies state changes from stateDiff
 */
async function executeTransactions(
	provider: ethers.JsonRpcProvider,
	originalProvider: ethers.JsonRpcProvider,
	transactionHashes: string[]
): Promise<void> {
	for (let i = 0; i < transactionHashes.length; i++) {
		const txHash = transactionHashes[i];
		try {
			// Get transaction details from original RPC (not the fork)
			const tx = await originalProvider.getTransaction(txHash);
			if (!tx) {
				logger.warn({ txHash, index: i }, 'Transaction not found, skipping');
				continue;
			}

			// Build call object for debug_traceCall
			const call: any = {
				from: tx.from.toLowerCase(),
				value: tx.value.toString(),
				data: tx.data
			};

			if (tx.to) {
				call.to = tx.to.toLowerCase();
			}

			// Use debug_traceCall with stateDiff to simulate transaction
			const trace = await provider.send('debug_traceCall', [
				call,
				'latest',
				{
					tracer: 'callTracer',
					tracerConfig: {
						withLog: true,
						stateDiff: true
					}
				}
			]);

			// Log trace and stateDiff for debugging
			const traceAny = trace as any;
			logger.info(
				{
					txHash,
					index: i,
					traceError: traceAny?.error,
					traceGasUsed: traceAny?.gasUsed,
					traceGas: traceAny?.gas,
					stateDiffPreview: traceAny?.stateDiff
						? JSON.stringify(traceAny.stateDiff, null, 2).substring(0, 2000)
						: null,
					stateDiffKeys: traceAny?.stateDiff ? Object.keys(traceAny.stateDiff) : []
				},
				'Traced previous transaction with stateDiff'
			);

			// Apply state changes from stateDiff
			if (traceAny?.stateDiff) {
				await applyStateDiff(provider, traceAny.stateDiff, tx);
			} else {
				logger.warn(
					{ txHash, index: i },
					'No stateDiff in trace, transaction may not have changed state'
				);
			}

			logger.debug({ txHash, index: i }, 'Applied state changes from stateDiff');
		} catch (error) {
			logger.error(
				{ error, txHash, index: i },
				'Error processing previous transaction, continuing...'
			);
			// Continue with next transaction even if one fails
		}
	}

	logger.info(
		{ count: transactionHashes.length },
		'Finished applying state changes from previous transactions'
	);
}

/**
 * Apply state changes from stateDiff to the provider
 * stateDiff structure: { address: { balance: { "*": { from: "...", to: "..." } }, storage: { slot: { "*": { from: "...", to: "..." } } } } }
 */
async function applyStateDiff(
	provider: ethers.JsonRpcProvider,
	stateDiff: any,
	tx: any
): Promise<void> {
	for (const [address, changes] of Object.entries(stateDiff)) {
		const addrChanges = changes as any;

		// Apply balance changes
		if (addrChanges.balance) {
			const balanceChange = addrChanges.balance['*'];
			if (balanceChange && balanceChange.to) {
				const newBalance = balanceChange.to;
				await provider.send('anvil_setBalance', [address, newBalance]);
				logger.debug(
					{ address, oldBalance: balanceChange.from, newBalance },
					'Applied balance change'
				);
			}
		}

		// Apply nonce changes
		if (addrChanges.nonce) {
			const nonceChange = addrChanges.nonce['*'];
			if (nonceChange && nonceChange.to) {
				const newNonce = nonceChange.to;
				await provider.send('anvil_setNonce', [address, newNonce]);
				logger.debug({ address, oldNonce: nonceChange.from, newNonce }, 'Applied nonce change');
			}
		}

		// Apply storage changes
		if (addrChanges.storage) {
			for (const [slot, slotChange] of Object.entries(addrChanges.storage)) {
				const change = (slotChange as any)['*'];
				if (change && change.to) {
					const storageSlot = slot.startsWith('0x') ? slot : '0x' + slot;
					const newValue = change.to.startsWith('0x') ? change.to : '0x' + change.to;
					await provider.send('anvil_setStorageAt', [address, storageSlot, newValue]);
					logger.debug(
						{ address, slot: storageSlot, oldValue: change.from, newValue },
						'Applied storage change'
					);
				}
			}
		}
	}
}
