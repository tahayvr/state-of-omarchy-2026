import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

/** One row per user per edition — the unique constraint IS the one-vote rule. */
export const responses = sqliteTable(
	'responses',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		editionId: text('edition_id').notNull(),
		surveyVersion: integer('survey_version').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		source: text('source'),
		startedAt: integer('started_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }),
		completion: integer('completion').notNull().default(0),
		userAgent: text('user_agent'),
		locale: text('locale')
	},
	(table) => [unique('responses_edition_user_unique').on(table.editionId, table.userId)]
);

/**
 * Normalized answers. Conventions (see survey-plan.md):
 * - single: one row with option_id
 * - multiple: one row per selected option_id
 * - Other write-in: option_id 'other' + text_value
 * - scale/nps: number_value
 * - text: text_value; text_list: one row per item (text_value + position)
 * - country: option_id = iso2 (or skip id)
 *
 * Writes are delete-then-insert per (response, question) in a transaction,
 * so saves are idempotent without relying on a conflict clause.
 */
export const answers = sqliteTable('answers', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	responseId: text('response_id')
		.notNull()
		.references(() => responses.id, { onDelete: 'cascade' }),
	questionId: text('question_id').notNull(),
	optionId: text('option_id'),
	numberValue: integer('number_value'),
	textValue: text('text_value'),
	position: integer('position')
});
