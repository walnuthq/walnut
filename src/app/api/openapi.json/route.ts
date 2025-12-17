import { NextResponse } from 'next/server';

const openApiSpec = {
	openapi: '3.0.0',
	info: {
		title: 'Walnut EVM Simulation API',
		version: '1.0.0',
		description: 'API for simulating EVM transactions'
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
						example: 'https://eth-mainnet.g.alchemy.com/v2/...'
					},
					blockNumber: {
						type: 'integer',
						description: 'Block number to fork from',
						example: 12345678
					},
					from: {
						type: 'string',
						description: 'Transaction sender address',
						example: '0x123...'
					},
					to: {
						type: 'string',
						description: 'Transaction recipient address',
						example: '0x456...'
					},
					value: {
						type: 'string',
						description: 'Value to send in wei (hex string)',
						example: '0x0'
					},
					data: {
						type: 'string',
						description: 'Transaction data (hex string)',
						example: '0x'
					},
					transactionIndex: {
						type: 'integer',
						description: 'Index of transaction in the block (if simulating historical tx)',
						example: 5
					}
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
											description: 'URL to web UI for this simulation with calldata and parameters',
											example:
												'https://evm.walnut.dev/simulations?senderAddress=0x123...&calldata=0x1,0x456...,0x789...&transactionVersion=1&chainId=OP_SEPOLIA&blockNumber=12345678&value=11300000000000000'
										}
									}
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
