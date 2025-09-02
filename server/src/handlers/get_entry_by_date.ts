import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetEntryByDateInput, type MorningPageEntry } from '../schema';

export async function getEntryByDate(input: GetEntryByDateInput): Promise<MorningPageEntry | null> {
  try {
    // Query for entry matching the specific date
    const results = await db.select()
      .from(morningPagesTable)
      .where(eq(morningPagesTable.date, input.date))
      .execute();

    // Return the entry if found, null otherwise
    if (results.length === 0) {
      return null;
    }

    const entry = results[0];
    
    // Return the entry with proper type conversion
    return {
      ...entry,
      date: new Date(entry.date), // Convert date string to Date object
      created_at: entry.created_at, // Already a Date object from timestamp column
      updated_at: entry.updated_at, // Already a Date object from timestamp column
    };
  } catch (error) {
    console.error('Failed to get entry by date:', error);
    throw error;
  }
}