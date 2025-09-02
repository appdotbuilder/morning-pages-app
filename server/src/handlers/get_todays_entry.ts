import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { type MorningPageEntry } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTodaysEntry(): Promise<MorningPageEntry | null> {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Query for today's entry
    const results = await db.select()
      .from(morningPagesTable)
      .where(eq(morningPagesTable.date, todayString))
      .execute();

    // Return the entry if found, null otherwise
    if (results.length === 0) {
      return null;
    }

    const entry = results[0];
    return {
      ...entry,
      // Convert date string to Date object for schema compliance
      date: new Date(entry.date),
      created_at: entry.created_at,
      updated_at: entry.updated_at
    };
  } catch (error) {
    console.error('Get today\'s entry failed:', error);
    throw error;
  }
}