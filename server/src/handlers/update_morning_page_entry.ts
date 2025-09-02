import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateMorningPageEntryInput, type MorningPageEntry } from '../schema';

export async function updateMorningPageEntry(input: UpdateMorningPageEntryInput): Promise<MorningPageEntry> {
  try {
    // Update the entry with new content and word count, and set updated_at to current time
    const result = await db.update(morningPagesTable)
      .set({
        content: input.content,
        word_count: input.word_count,
        updated_at: new Date() // Automatically update timestamp
      })
      .where(eq(morningPagesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Morning pages entry with id ${input.id} not found`);
    }

    const entry = result[0];
    return {
      ...entry,
      date: new Date(entry.date) // Convert string date to Date object
    };
  } catch (error) {
    console.error('Morning pages entry update failed:', error);
    throw error;
  }
}