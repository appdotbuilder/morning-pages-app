import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { type CreateMorningPageEntryInput, type MorningPageEntry } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const createMorningPageEntry = async (input: CreateMorningPageEntryInput): Promise<MorningPageEntry> => {
  try {
    // Use PostgreSQL's ON CONFLICT for upsert behavior - ensures one entry per date
    const result = await db.insert(morningPagesTable)
      .values({
        date: input.date, // date column expects string in YYYY-MM-DD format
        content: input.content,
        word_count: input.word_count,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`
      })
      .onConflictDoUpdate({
        target: morningPagesTable.date,
        set: {
          content: input.content,
          word_count: input.word_count,
          updated_at: sql`NOW()`
        }
      })
      .returning()
      .execute();

    // Convert the returned data to match the expected schema
    const entry = result[0];
    return {
      ...entry,
      date: new Date(entry.date), // Convert string date to Date object
      created_at: entry.created_at,
      updated_at: entry.updated_at
    };
  } catch (error) {
    console.error('Morning page entry creation failed:', error);
    throw error;
  }
};