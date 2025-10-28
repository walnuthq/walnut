import { pgSchema, text, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core';

const schema = pgSchema('walnut');

export const tenant = schema.table('tenant', {
	id: uuid().primaryKey().defaultRandom(),
	name: text('name').unique().notNull(),
	githubEmails: text('githubEmails').array(),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const tenantRpcConfig = schema.table('tenantrpcconfig', {
	id: uuid().primaryKey().defaultRandom(),
	tenantId: uuid('tenantId').references(() => tenant.id),
	rpcUrl: text('rpcUrl').notNull(),
	chainId: integer('chainId').notNull(),
	displayName: text('displayName'),
	nativeToken: text('nativeToken'),
	nativeTokenSymbol: text('nativeTokenSymbol'),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const user = schema.table('user', {
	id: text('id').primaryKey(),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull(),
	email: text('email').unique().notNull(),
	emailVerified: boolean('emailVerified').default(false).notNull(),
	name: text('name'),
	image: text('image'),
	tenantId: uuid('tenantId').references(() => tenant.id, { onDelete: 'set null' })
});

export const session = schema.table('session', {
	id: text('id').primaryKey(),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull(),
	expiresAt: timestamp('expiresAt').notNull(),
	token: text('token').unique().notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent')
});

export const account = schema.table('account', {
	id: text('id').primaryKey(),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
	refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
	scope: text('scope'),
	password: text('password')
});

export const verification = schema.table('verification', {
	id: text('id').primaryKey(),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expiresAt').notNull()
});
