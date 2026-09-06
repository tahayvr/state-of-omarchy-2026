import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Pre-launch email capture — one row per address, unique constraint keeps signups idempotent. */
export const waitlistSignups = sqliteTable('waitlist_signups', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	source: text('source'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	notifiedAt: integer('notified_at', { mode: 'timestamp_ms' })
});
