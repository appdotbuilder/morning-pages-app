import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { getTodaysEntry } from '../handlers/get_todays_entry';

describe('getTodaysEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no entry exists for today', async () => {
    const result = await getTodaysEntry();
    expect(result).toBeNull();
  });

  it('should return today\'s entry when it exists', async () => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Create an entry for today
    const testContent = 'Today I am grateful for the morning sun and the opportunity to write.';
    const wordCount = 15;

    await db.insert(morningPagesTable)
      .values({
        date: todayString,
        content: testContent,
        word_count: wordCount
      })
      .execute();

    const result = await getTodaysEntry();

    expect(result).not.toBeNull();
    expect(result!.content).toEqual(testContent);
    expect(result!.word_count).toEqual(wordCount);
    expect(result!.date).toBeInstanceOf(Date);
    expect(result!.date.toISOString().split('T')[0]).toEqual(todayString);
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return correct entry when multiple entries exist for different dates', async () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    // Create entries for today and yesterday
    await db.insert(morningPagesTable)
      .values([
        {
          date: yesterdayString,
          content: 'Yesterday\'s entry',
          word_count: 10
        },
        {
          date: todayString,
          content: 'Today\'s entry',
          word_count: 20
        }
      ])
      .execute();

    const result = await getTodaysEntry();

    expect(result).not.toBeNull();
    expect(result!.content).toEqual('Today\'s entry');
    expect(result!.word_count).toEqual(20);
    expect(result!.date.toISOString().split('T')[0]).toEqual(todayString);
  });

  it('should return entry with all required fields properly typed', async () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    await db.insert(morningPagesTable)
      .values({
        date: todayString,
        content: 'A meaningful morning pages entry with reflection and gratitude.',
        word_count: 50
      })
      .execute();

    const result = await getTodaysEntry();

    expect(result).not.toBeNull();
    
    // Verify all field types match the schema
    expect(typeof result!.id).toBe('number');
    expect(result!.date).toBeInstanceOf(Date);
    expect(typeof result!.content).toBe('string');
    expect(typeof result!.word_count).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Verify specific values
    expect(result!.content).toEqual('A meaningful morning pages entry with reflection and gratitude.');
    expect(result!.word_count).toEqual(50);
  });

  it('should handle timezone consistency correctly', async () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Create entry at different time of day
    const entryTime = new Date();
    entryTime.setHours(23, 59, 59, 999); // Almost end of day

    await db.insert(morningPagesTable)
      .values({
        date: todayString,
        content: 'Late night entry',
        word_count: 5,
        created_at: entryTime,
        updated_at: entryTime
      })
      .execute();

    const result = await getTodaysEntry();

    expect(result).not.toBeNull();
    expect(result!.date.toISOString().split('T')[0]).toEqual(todayString);
    expect(result!.content).toEqual('Late night entry');
  });
});