import { NextResponse } from 'next/server';

const openApiSpec = {
	openapi: '3.0.0',
	info: {
		title: 'Walnut Simulation API',
		version: '1.0.0',
		description: 'API for simulating transactions'
	},
	servers: [
		{
			url: 'https://evm.walnut.dev',
			description: 'Production server'
		}
	],
	components: {
		securitySchemes: {
			ApiKeyAuth: {
				type: 'apiKey',
				in: 'header',
				name: 'x-api-key'
			}
		},
		schemas: {
			SimulateRequest: {
				type: 'object',
				required: ['rpcForkUrl', 'blockNumber', 'from', 'to'],
				properties: {
					rpcForkUrl: {
						type: 'string',
						description: 'RPC URL to fork from',
						example: 'https://opt-sepolia.g.alchemy.com/v2/YOUR_API_KEY'
					},
					blockNumber: {
						type: 'integer',
						description: 'Block number to fork from',
						example: 36836401
					},
					from: {
						type: 'string',
						description: 'Transaction sender address',
						example: '0x9aa182ffdf5de49519ed4837528835de575e1c9c'
					},
					to: {
						type: 'string',
						description: 'Transaction recipient address',
						example: '0x7ad8a180f15c2062d613283f6905ada65a8c2768'
					},
					value: {
						type: 'string',
						description: 'Value to send in wei (hex string)',
						example: '0x0'
					},
					data: {
						type: 'string',
						description: 'Transaction data (hex string)',
						example:
							'0x1e67819e000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000090000000000000000000000004e3cbeb0e2bf6d2e20a5be7c321360637e05928700000000000000000000000000000000000000000000000000000000000000140000000000000000000000003f5801eaa86c6f6ef7c22651b78d61634ba3baef00000000000000000000000000000000000000000000000000000000000000140000000000000000000000002890603218d7bbecf26de6442143861b55f0f48f0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000efcd6ed6546bcd648d0522782064d314b24750a100000000000000000000000000000000000000000000000000000000000000c80000000000000000000000005589e2c7112eae6e191b66b15ad70acdc1cd62cd00000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000a4b43e6d279c3ff8cf9af5dc96b5832bc7a999f800000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000234bca05133bbd71f8dc47d0be092a1aa809ee7200000000000000000000000000000000000000000000000000000000000000140000000000000000000000000d07ba3917d511ac87fd63bae7d483a71cc11a3800000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000f6fb5c85793841fcc2648fed19237fa6499274650000000000000000000000000000000000000000000000000000000000000014'
					},
					transactionIndex: {
						type: 'integer',
						description: 'Index of transaction in the block (if simulating historical tx)',
						example: 5
					}
				},
				example: {
					rpcForkUrl: 'https://opt-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
					blockNumber: 36836401,
					from: '0x9aa182ffdf5de49519ed4837528835de575e1c9c',
					to: '0x7ad8a180f15c2062d613283f6905ada65a8c2768',
					value: '0x0',
					data: '0x1e67819e000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000090000000000000000000000004e3cbeb0e2bf6d2e20a5be7c321360637e05928700000000000000000000000000000000000000000000000000000000000000140000000000000000000000003f5801eaa86c6f6ef7c22651b78d61634ba3baef00000000000000000000000000000000000000000000000000000000000000140000000000000000000000002890603218d7bbecf26de6442143861b55f0f48f0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000efcd6ed6546bcd648d0522782064d314b24750a100000000000000000000000000000000000000000000000000000000000000c80000000000000000000000005589e2c7112eae6e191b66b15ad70acdc1cd62cd00000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000a4b43e6d279c3ff8cf9af5dc96b5832bc7a999f800000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000234bca05133bbd71f8dc47d0be092a1aa809ee7200000000000000000000000000000000000000000000000000000000000000140000000000000000000000000d07ba3917d511ac87fd63bae7d483a71cc11a3800000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000f6fb5c85793841fcc2648fed19237fa6499274650000000000000000000000000000000000000000000000000000000000000014'
				}
			},
			AssetChange: {
				type: 'object',
				properties: {
					token_info: {
						type: 'object',
						properties: {
							symbol: { type: 'string' },
							name: { type: 'string' },
							decimals: { type: 'integer' },
							dollar_value: { type: 'string' }
						}
					},
					type: { type: 'string', enum: ['Transfer', 'Burn'] },
					from: { type: 'string' },
					to: { type: 'string' },
					amount: { type: 'string' },
					dollar_value: { type: 'string' }
				}
			},
			ErrorResponse: {
				type: 'object',
				properties: {
					error: {
						type: 'string',
						description: 'Error message'
					},
					details: {
						type: 'string',
						description: 'Additional error details (optional)'
					}
				},
				required: ['error']
			}
		}
	},
	paths: {
		'/api/simulate': {
			post: {
				summary: 'Simulate',
				description:
					'Simulates a transaction on a forked chain and analyzes balance changes. Requires API key authentication via x-api-key header.',
				security: [
					{
						ApiKeyAuth: []
					}
				],
				requestBody: {
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/SimulateRequest'
							},
							example: {
								rpcForkUrl: 'https://opt-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
								blockNumber: 36836401,
								from: '0x9aa182ffdf5de49519ed4837528835de575e1c9c',
								to: '0x7ad8a180f15c2062d613283f6905ada65a8c2768',
								value: '0x0',
								data: '0x1e67819e000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000090000000000000000000000004e3cbeb0e2bf6d2e20a5be7c321360637e05928700000000000000000000000000000000000000000000000000000000000000140000000000000000000000003f5801eaa86c6f6ef7c22651b78d61634ba3baef00000000000000000000000000000000000000000000000000000000000000140000000000000000000000002890603218d7bbecf26de6442143861b55f0f48f0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000efcd6ed6546bcd648d0522782064d314b24750a100000000000000000000000000000000000000000000000000000000000000c80000000000000000000000005589e2c7112eae6e191b66b15ad70acdc1cd62cd00000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000a4b43e6d279c3ff8cf9af5dc96b5832bc7a999f800000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000234bca05133bbd71f8dc47d0be092a1aa809ee7200000000000000000000000000000000000000000000000000000000000000140000000000000000000000000d07ba3917d511ac87fd63bae7d483a71cc11a3800000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000f6fb5c85793841fcc2648fed19237fa6499274650000000000000000000000000000000000000000000000000000000000000014'
							}
						}
					}
				},
				responses: {
					'200': {
						description: 'Simulation successful',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										status: { type: 'string', enum: ['SUCCESS', 'REVERTED'] },
										gasInfo: {
											type: 'object',
											properties: {
												gasUsed: { type: 'string' },
												effectiveGasPrice: { type: 'string' },
												totalCost: { type: 'string' }
											}
										},
										tokenTransfers: {
											type: 'object',
											description: 'Detailed token transfer events'
										},
										assetChanges: {
											type: 'array',
											items: {
												$ref: '#/components/schemas/AssetChange'
											}
										},
										simulationUrl: {
											type: 'string',
											description: 'URL to web UI for this simulation with calldata and parameters'
										}
									}
								},
								example: {
									status: 'SUCCESS',
									gasInfo: {
										gasUsed: '0xdbe82',
										totalCost: '900738225184500',
										effectiveGasPrice: '1000000250'
									},
									tokenTransfers: {
										'0x59de0422ad8a22b3e71fb4692ddbcb413d65e19c': {
											transfers: [
												{
													from: '0x4e3cbeb0e2bf6d2e20a5be7c321360637e059287',
													to: '0x7ad8a180f15c2062d613283f6905ada65a8c2768',
													amount: '2204064148636355257',
													type: 'transfer'
												},
												{
													from: '0x7ad8a180f15c2062d613283f6905ada65a8c2768',
													to: '0x0000000000000000000000000000000000000000',
													amount: '2204064148636355257',
													type: 'burn'
												}
											],
											tokenInfo: {
												symbol: 'AI',
												name: 'AI',
												decimals: 18
											}
										},
										'0x9f0f782f90a6e21c57bb585a6ef164ebdec3e65e': {
											transfers: [
												{
													from: '0x3f5801eaa86c6f6ef7c22651b78d61634ba3baef',
													to: '0x7ad8a180f15c2062d613283f6905ada65a8c2768',
													amount: '1577783226857195896',
													type: 'transfer'
												},
												{
													from: '0x7ad8a180f15c2062d613283f6905ada65a8c2768',
													to: '0x0000000000000000000000000000000000000000',
													amount: '1577783226857195896',
													type: 'burn'
												}
											],
											tokenInfo: {
												symbol: 'NPC',
												name: 'NPC',
												decimals: 18
											}
										}
									},
									assetChanges: [
										{
											token_info: {
												standard: 'ERC20',
												type: 'Fungible',
												contract_address: '0x59de0422ad8a22b3e71fb4692ddbcb413d65e19c',
												symbol: 'AI',
												name: 'AI',
												decimals: 18,
												dollar_value: '0.15'
											},
											type: 'Transfer',
											from: '0x4e3cbeb0e2bf6d2e20a5be7c321360637e059287',
											amount: '2.204064148636355469',
											raw_amount: '2204064148636355257',
											dollar_value: '0.330609622295453',
											from_before_balance: '0x175620ba7d9f09ea9d89',
											to_before_balance: '0x0',
											to: '0x7ad8a180f15c2062d613283f6905ada65a8c2768'
										},
										{
											token_info: {
												standard: 'ERC20',
												type: 'Fungible',
												contract_address: '0x59de0422ad8a22b3e71fb4692ddbcb413d65e19c',
												symbol: 'AI',
												name: 'AI',
												decimals: 18,
												dollar_value: '0.15'
											},
											type: 'Burn',
											from: '0x7ad8a180f15c2062d613283f6905ada65a8c2768',
											amount: '2.204064148636355469',
											raw_amount: '2204064148636355257',
											dollar_value: '0.330609622295453',
											from_before_balance: '0x0',
											to_before_balance: '0x0'
										},
										{
											token_info: {
												standard: 'ERC20',
												type: 'Fungible',
												contract_address: '0x9f0f782f90a6e21c57bb585a6ef164ebdec3e65e',
												symbol: 'NPC',
												name: 'NPC',
												decimals: 18,
												dollar_value: '0.08'
											},
											type: 'Transfer',
											from: '0x3f5801eaa86c6f6ef7c22651b78d61634ba3baef',
											amount: '1.577783226857195853',
											raw_amount: '1577783226857195896',
											dollar_value: '0.126222658148576',
											from_before_balance: '0x10b4970a9ca40421748b',
											to_before_balance: '0x0',
											to: '0x7ad8a180f15c2062d613283f6905ada65a8c2768'
										},
										{
											token_info: {
												standard: 'ERC20',
												type: 'Fungible',
												contract_address: '0x9f0f782f90a6e21c57bb585a6ef164ebdec3e65e',
												symbol: 'NPC',
												name: 'NPC',
												decimals: 18,
												dollar_value: '0.08'
											},
											type: 'Burn',
											from: '0x7ad8a180f15c2062d613283f6905ada65a8c2768',
											amount: '1.577783226857195853',
											raw_amount: '1577783226857195896',
											dollar_value: '0.126222658148576',
											from_before_balance: '0x0',
											to_before_balance: '0x0'
										}
									],
									simulationUrl:
										'https://evm.walnut.dev/simulations?senderAddress=0x9aa182ffdf5de49519ed4837528835de575e1c9c&calldata=0x1%2C0x7ad8a180f15c2062d613283f6905ada65a8c2768%2C%2C0x1%2C0x1e67819e000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000090000000000000000000000004e3cbeb0e2bf6d2e20a5be7c321360637e05928700000000000000000000000000000000000000000000000000000000000000140000000000000000000000003f5801eaa86c6f6ef7c22651b78d61634ba3baef00000000000000000000000000000000000000000000000000000000000000140000000000000000000000002890603218d7bbecf26de6442143861b55f0f48f0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000efcd6ed6546bcd648d0522782064d314b24750a100000000000000000000000000000000000000000000000000000000000000c80000000000000000000000005589e2c7112eae6e191b66b15ad70acdc1cd62cd00000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000a4b43e6d279c3ff8cf9af5dc96b5832bc7a999f800000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000234bca05133bbd71f8dc47d0be092a1aa809ee7200000000000000000000000000000000000000000000000000000000000000140000000000000000000000000d07ba3917d511ac87fd63bae7d483a71cc11a3800000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000f6fb5c85793841fcc2648fed19237fa6499274650000000000000000000000000000000000000000000000000000000000000014&transactionVersion=1&chainId=OP_SEPOLIA&blockNumber=36836401&totalTransactionsInBlock=5'
								}
							}
						}
					},
					'401': {
						description: 'API key is missing or invalid',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/ErrorResponse'
								},
								example: {
									error:
										'API key is required. Please provide it in the "api-key" or "x-api-key" header.'
								}
							}
						}
					},
					'403': {
						description: 'Invalid or expired API key',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/ErrorResponse'
								},
								example: {
									error: 'Invalid or expired API key.'
								}
							}
						}
					},
					'500': {
						description: 'Simulation failed',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/ErrorResponse'
								},
								example: {
									error: 'Simulation failed',
									details: 'Additional error details'
								}
							}
						}
					}
				}
			}
		}
	}
};

export async function GET() {
	// CORS is handled by middleware.ts for all /api/* routes
	return NextResponse.json(openApiSpec);
}

// OPTIONS preflight is handled by middleware.ts
