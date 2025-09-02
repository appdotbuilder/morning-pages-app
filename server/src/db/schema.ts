import { serial, text, pgTable, timestamp, integer, date, boolean } from 'drizzle-orm/pg-core';

export const morningPagesTable = pgTable('morning_pages', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(), // Entry date (YYYY-MM-DD), unique constraint ensures one entry per day
  content: text('content').notNull(), // The actual morning pages content
  word_count: integer('word_count').notNull().default(0), // Word count for progress tracking
  created_at: timestamp('created_at').defaultNow().notNull(), // When the entry was first created
  updated_at: timestamp('updated_at').defaultNow().notNull(), // Last time the entry was modified
});

// TypeScript types for the table schema
export type MorningPageEntry = typeof morningPagesTable.$inferSelect; // For SELECT operations
export type NewMorningPageEntry = typeof morningPagesTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { morningPages: morningPagesTable };