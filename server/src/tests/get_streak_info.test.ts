import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { getStreakInfo } from '../handlers/get_streak_info';

describe('getStreakInfo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no entries exist', async () => {
    const result = await getStreakInfo();

    expect(result.current_streak).toBe(0);
    expect(result.total_days).toBe(0);
    expect(result.last_entry_date).toBeNull();
  });

  it('should calculate basic streak info for single entry', async () => {
    // Create a single entry
    await db.insert(morningPagesTable).values({
      date: '2024-01-15',
      content: 'Single entry',
      word_count: 10
    }).execute();

    const result = await getStreakInfo();

    expect(result.current_streak).toBe(1);
    expect(result.total_days).toBe(1);
    expect(result.last_entry_date).toBe('2024-01-15');
  });

  it('should calculate consecutive streak correctly', async () => {
    // Create consecutive entries for 5 days
    const dates = ['2024-01-11', '2024-01-12', '2024-01-13', '2024-01-14', '2024-01-15'];
    
    for (const date of dates) {
      await db.insert(morningPagesTable).values({
        date,
        content: `Entry for ${date}`,
        word_count: 20
      }).execute();
    }

    const result = await getStreakInfo();

    expect(result.current_streak).toBe(5);
    expect(result.total_days).toBe(5);
    expect(result.last_entry_date).toBe('2024-01-15');
  });

  it('should handle broken streak correctly', async () => {
    // Create entries with a gap: 10th, 11th, 13th, 14th, 15th (missing 12th)
    const dates = ['2024-01-10', '2024-01-11', '2024-01-13', '2024-01-14', '2024-01-15'];
    
    for (const date of dates) {
      await db.insert(morningPagesTable).values({
        date,
        content: `Entry for ${date}`,
        word_count: 15
      }).execute();
    }

    const result = await getStreakInfo();

    // Current streak should be 3 (13th, 14th, 15th) as the most recent consecutive days
    expect(result.current_streak).toBe(3);
    expect(result.total_days).toBe(5);
    expect(result.last_entry_date).toBe('2024-01-15');
  });

  it('should handle non-consecutive entries correctly', async () => {
    // Create scattered entries with no consecutive days
    const dates = ['2024-01-01', '2024-01-03', '2024-01-06', '2024-01-10'];
    
    for (const date of dates) {
      await db.insert(morningPagesTable).values({
        date,
        content: `Entry for ${date}`,
        word_count: 25
      }).execute();
    }

    const result = await getStreakInfo();

    // Current streak should be 1 (only the most recent entry)
    expect(result.current_streak).toBe(1);
    expect(result.total_days).toBe(4);
    expect(result.last_entry_date).toBe('2024-01-10');
  });

  it('should handle entries in mixed order', async () => {
    // Insert entries in non-chronological order
    const entriesData = [
      { date: '2024-01-13', content: 'Third entry', word_count: 30 },
      { date: '2024-01-11', content: 'First entry', word_count: 20 },
      { date: '2024-01-14', content: 'Fourth entry', word_count: 25 },
      { date: '2024-01-12', content: 'Second entry', word_count: 35 }
    ];

    for (const entry of entriesData) {
      await db.insert(morningPagesTable).values(entry).execute();
    }

    const result = await getStreakInfo();

    // Should still calculate consecutive streak correctly (4 days: 11-14)
    expect(result.current_streak).toBe(4);
    expect(result.total_days).toBe(4);
    expect(result.last_entry_date).toBe('2024-01-14');
  });

  it('should calculate partial streak at the beginning', async () => {
    // Create entries where only the first few are consecutive
    const dates = ['2024-01-10', '2024-01-11', '2024-01-12', '2024-01-15', '2024-01-16'];
    
    for (const date of dates) {
      await db.insert(morningPagesTable).values({
        date,
        content: `Entry for ${date}`,
        word_count: 40
      }).execute();
    }

    const result = await getStreakInfo();

    // Current streak should be 2 (15th and 16th, the most recent consecutive days)
    expect(result.current_streak).toBe(2);
    expect(result.total_days).toBe(5);
    expect(result.last_entry_date).toBe('2024-01-16');
  });

  it('should handle single isolated entry after consecutive streak', async () => {
    // Create consecutive entries then a gap then one more entry
    const dates = ['2024-01-10', '2024-01-11', '2024-01-12', '2024-01-20'];
    
    for (const date of dates) {
      await db.insert(morningPagesTable).values({
        date,
        content: `Entry for ${date}`,
        word_count: 18
      }).execute();
    }

    const result = await getStreakInfo();

    // Current streak should be 1 (only the most recent entry on 20th)
    expect(result.current_streak).toBe(1);
    expect(result.total_days).toBe(4);
    expect(result.last_entry_date).toBe('2024-01-20');
  });
});