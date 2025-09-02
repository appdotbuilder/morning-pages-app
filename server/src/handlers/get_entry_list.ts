import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { type EntryListItem, type DateRangeInput } from '../schema';
import { and, desc, gte, lte, SQL } from 'drizzle-orm';

export async function getEntryList(input?: DateRangeInput): Promise<EntryListItem[]> {
  try {
    // Build conditions array for date filtering
    const conditions: SQL<unknown>[] = [];

    if (input?.start_date) {
      conditions.push(gte(morningPagesTable.date, input.start_date));
    }

    if (input?.end_date) {
      conditions.push(lte(morningPagesTable.date, input.end_date));
    }

    // Execute query with or without where clause
    const results = conditions.length === 0 
      ? await db.select({
          id: morningPagesTable.id,
          date: morningPagesTable.date,
          word_count: morningPagesTable.word_count,
          content: morningPagesTable.content
        })
        .from(morningPagesTable)
        .orderBy(desc(morningPagesTable.date))
        .execute()
      : await db.select({
          id: morningPagesTable.id,
          date: morningPagesTable.date,
          word_count: morningPagesTable.word_count,
          content: morningPagesTable.content
        })
        .from(morningPagesTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(morningPagesTable.date))
        .execute();

    // Transform results to match EntryListItem schema
    return results.map(entry => ({
      id: entry.id,
      date: new Date(entry.date), // Convert date string to Date object
      word_count: entry.word_count,
      has_content: entry.content.trim().length > 0 // Check if content exists and is not just whitespace
    }));
  } catch (error) {
    console.error('Failed to get entry list:', error);
    throw error;
  }
}