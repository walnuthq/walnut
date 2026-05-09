const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const jiti = require('jiti')(__filename, {
	alias: {
		'@': path.resolve(__dirname, '../src')
	}
});

const {
	rawDebugCallResponseToDebugCallResponse
} = jiti('../src/app/api/v1/soldb.ts');
const { buildDebuggerInfo } = jiti(
	'../src/app/api/v1/debug-transaction/convert-response.ts'
);

const ROOT_ADDRESS = '0x1111111111111111111111111111111111111111';
const CHILD_ADDRESS = '0x2222222222222222222222222222222222222222';
const SOURCE = `pragma solidity ^0.8.0;

contract Caller {
    function callPing(uint256 value) public returns (uint256) {
        return value + 1;
    }
}
`;

const makeEntryPoint = (address) => ({
	classHash: address,
	codeAddress: address,
	entryPointType: 'EXTERNAL',
	entryPointSelector: '0x00',
	calldata: [],
	storageAddress: address,
	callerAddress: ROOT_ADDRESS,
	callType: 'Call',
	initialGas: 100000
});

const makeContractCall = ({ callId, address, parentCallId = 0, childrenCallIds = [] }) => ({
	callId,
	parentCallId,
	childrenCallIds,
	functionCallId: null,
	eventCallIds: [],
	entryPoint: makeEntryPoint(address),
	result: {
		Success: {
			retData: []
		}
	},
	contractName: 'Caller',
	entryPointName: 'callPing',
	entryPointSelector: '0x00',
	entryPointInterfaceName: null,
	isErc20Token: false,
	classHash: address,
	isDeepestPanicResult: false,
	resultTypes: null,
	argumentsNames: null,
	argumentsTypes: null,
	calldataDecoded: null,
	decodedResult: null,
	codeLocation: null,
	callDebuggerDataAvailable: true,
	debuggerTraceStepIndex: null,
	isHidden: false
});

const makeRawSoldbJson = () => ({
	schemaVersion: 1,
	status: 'SUCCESS',
	error: null,
	backend: 'replay',
	capabilities: {
		opcode_steps: true,
		call_trace: true
	},
	traceCall: {
		type: 'CALL',
		callId: 0,
		parentCallId: null,
		childrenCallIds: [1],
		from: ROOT_ADDRESS,
		to: ROOT_ADDRESS,
		value: '0x0',
		gas: '0x186a0',
		gasUsed: '0x7530',
		input: '0x1234',
		output: '0x',
		logs: [],
		calls: [
			{
				type: 'CALL',
				callId: 1,
				parentCallId: 0,
				childrenCallIds: [],
				from: ROOT_ADDRESS,
				to: CHILD_ADDRESS,
				value: '0x0',
				gas: '0x1000',
				gasUsed: '0x800',
				input: '0xabcd',
				output: '0x',
				logs: []
			}
		]
	},
	steps: [
		{
			step: 0,
			pc: 4,
			op: 'PUSH1',
			traceCallIndex: 1
		},
		{
			step: 1,
			pc: 8,
			op: 'STOP'
		}
	],
	contracts: {
		[ROOT_ADDRESS]: {
			pcToSourceMappings: {
				4: '0:80:0',
				8: '26:88:0'
			},
			sourcePaths: {
				0: 'contracts/Caller.sol'
			},
			sources: {
				0: SOURCE
			},
			debugAvailable: true,
			abi: [
				{
					type: 'function',
					name: 'callPing',
					inputs: [{ name: 'value', type: 'uint256' }],
					outputs: [{ name: '', type: 'uint256' }],
					stateMutability: 'nonpayable'
				}
			]
		}
	}
});

test('normalizes enriched soldb trace JSON without losing nested call metadata', () => {
	const normalized = rawDebugCallResponseToDebugCallResponse(makeRawSoldbJson());

	assert.equal(normalized.status, 'success');
	assert.equal(normalized.backend, 'replay');
	assert.equal(normalized.traceCall.callId, 0);
	assert.deepEqual(normalized.traceCall.childrenCallIds, [1]);
	assert.equal(normalized.traceCall.calls.length, 1);
	assert.equal(normalized.traceCall.calls[0].callId, 1);
	assert.equal(normalized.traceCall.calls[0].parentCallId, 0);
	assert.equal(normalized.steps[0].traceCallIndex, 1);
	assert.equal(normalized.steps[1].traceCallIndex, 0);
	assert.equal(normalized.contracts[ROOT_ADDRESS].debugAvailable, true);
	assert.equal(normalized.contracts[ROOT_ADDRESS].sourcePaths[0], 'contracts/Caller.sol');
	assert.equal(normalized.contracts[ROOT_ADDRESS].sources[0], SOURCE);
	assert.equal(normalized.contracts[ROOT_ADDRESS].abi[0].name, 'callPing');
});

test('builds debugger data from soldb embedded sources and step traceCallIndex', () => {
	const normalized = rawDebugCallResponseToDebugCallResponse(makeRawSoldbJson());
	const result = buildDebuggerInfo({
		steps: normalized.steps,
		contracts: normalized.contracts,
		sourcifyContracts: [],
		contractCallsMap: {
			0: makeContractCall({ callId: 0, address: ROOT_ADDRESS, childrenCallIds: [1] }),
			1: makeContractCall({ callId: 1, address: ROOT_ADDRESS, parentCallId: 0 })
		},
		functionCallsMap: {}
	});

	const contractData = result.simulationDebuggerData.contractDebuggerData[ROOT_ADDRESS];
	assert.equal(contractData.sourceCode['contracts/Caller.sol'], SOURCE);
	assert.ok(contractData.pcToCodeInfo[4]);
	assert.ok(contractData.pcToCodeInfo[8]);
	assert.ok(
		result.simulationDebuggerData.debuggerTrace.some(
			(entry) => entry.withLocation?.pcIndex === 4 && entry.withLocation.contractCallId === 1
		)
	);
	assert.ok(
		result.simulationDebuggerData.debuggerTrace.some(
			(entry) => entry.withLocation?.pcIndex === 8 && entry.withLocation.contractCallId === 0
		)
	);
});
