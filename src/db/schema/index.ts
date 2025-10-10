import { pgTable, text, timestamp, boolean, varchar, integer } from 'drizzle-orm/pg-core';

export const tenant = pgTable('tenant', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').unique().notNull(),
	githubEmails: text('githubEmails').array(),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const tenantRpcConfig = pgTable('tenantrpcconfig', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text('tenantId').references(() => tenant.id),
	rpcUrl: text('rpcUrl').notNull(),
	chainId: integer('chainId').notNull(),
	displayName: text('displayName'),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const user = pgTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull(),
	email: text('email').unique().notNull(),
	emailVerified: boolean('emailVerified').default(false).notNull(),
	name: text('name'),
	image: text('image'),
	tenantId: text('tenantId').references(() => tenant.id, { onDelete: 'set null' })
});

export const session = pgTable('session', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
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

export const account = pgTable('account', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
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

export const verification = pgTable('verification', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expiresAt').notNull()
});
