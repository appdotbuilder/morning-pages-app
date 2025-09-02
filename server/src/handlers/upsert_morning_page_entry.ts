import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { type CreateMorningPageEntryInput, type MorningPageEntry } from '../schema';

export const upsertMorningPageEntry = async (input: CreateMorningPageEntryInput): Promise<MorningPageEntry> => {
  try {
    // Use PostgreSQL's ON CONFLICT functionality for upsert
    // If entry exists for the date, update content and word_count
    // If no entry exists, create a new one
    const result = await db.insert(morningPagesTable)
      .values({
        date: input.date,
        content: input.content,
        word_count: input.word_count,
        updated_at: new Date() // Set updated_at for new entries
      })
      .onConflictDoUpdate({
        target: morningPagesTable.date, // Conflict on unique date column
        set: {
          content: input.content,
          word_count: input.word_count,
          updated_at: new Date() // Update timestamp on conflict
        }
      })
      .returning()
      .execute();

    const entry = result[0];
    return {
      ...entry,
      date: new Date(entry.date), // Convert date string to Date object
      created_at: entry.created_at!, // TypeScript assertion - these are guaranteed by schema defaults
      updated_at: entry.updated_at!
    };
  } catch (error) {
    console.error('Morning page entry upsert failed:', error);
    throw error;
  }
};