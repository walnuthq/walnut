import { NextResponse } from 'next/server';

const openApiSpec = {
	openapi: '3.0.0',
	info: {
		title: 'Walnut EVM Simulation API',
		version: '1.0.0',
		description: 'API for simulating EVM transactions and analyzing state changes.'
	},
	servers: [
		{
			url: 'http://localhost:3000',
			description: 'Local development server'
		},
		{
			url: 'https://walnut.dev',
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
			}
		}
	},
	security: [
		{
			ApiKeyAuth: []
		}
	],
	paths: {
		'/api/simulate': {
			post: {
				summary: 'Simulate an EVM transaction',
				description: 'Simulates a transaction on a forked chain and analyzes balance changes.',
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
										assetChanges: {
											type: 'array',
											items: {
												$ref: '#/components/schemas/AssetChange'
											}
										}
									}
								}
							}
						}
					},
					'500': {
						description: 'Simulation failed'
					}
				}
			}
		}
	}
};

export async function GET() {
	return NextResponse.json(openApiSpec);
}
