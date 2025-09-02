import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { type StreakInfo } from '../schema';
import { desc, count } from 'drizzle-orm';

export async function getStreakInfo(): Promise<StreakInfo> {
  try {
    // Get total number of entries
    const totalResult = await db.select({ 
      count: count(morningPagesTable.id) 
    })
      .from(morningPagesTable)
      .execute();

    const totalDays = totalResult[0]?.count || 0;

    // If no entries exist, return empty streak info
    if (totalDays === 0) {
      return {
        current_streak: 0,
        total_days: 0,
        last_entry_date: null
      };
    }

    // Get all entry dates sorted by date descending (most recent first)
    const entries = await db.select({
      date: morningPagesTable.date
    })
      .from(morningPagesTable)
      .orderBy(desc(morningPagesTable.date))
      .execute();

    // Get the most recent entry date
    const lastEntryDate = entries[0].date;

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Convert entries to Date objects and sort by date descending
    const entryDates = entries.map(entry => new Date(entry.date)).sort((a, b) => b.getTime() - a.getTime());

    // Find consecutive days counting backwards from the most recent entry
    let currentDate = new Date(entryDates[0]);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < entryDates.length; i++) {
      const entryDate = new Date(entryDates[i]);
      entryDate.setHours(0, 0, 0, 0);

      // Check if this entry date matches our expected consecutive date
      if (entryDate.getTime() === currentDate.getTime()) {
        currentStreak++;
        // Move to the previous day for next iteration
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // Break in consecutive days found
        break;
      }
    }

    return {
      current_streak: currentStreak,
      total_days: totalDays,
      last_entry_date: lastEntryDate
    };
  } catch (error) {
    console.error('Failed to get streak info:', error);
    throw error;
  }
}