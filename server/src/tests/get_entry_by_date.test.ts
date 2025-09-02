import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { type GetEntryByDateInput } from '../schema';
import { getEntryByDate } from '../handlers/get_entry_by_date';

describe('getEntryByDate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return entry for existing date', async () => {
    // Create test entry
    const testDate = '2024-01-15';
    const testContent = 'This is my morning pages entry for today. I feel grateful and ready to start the day.';
    const testWordCount = 17;

    await db.insert(morningPagesTable)
      .values({
        date: testDate,
        content: testContent,
        word_count: testWordCount,
      })
      .execute();

    // Test input
    const input: GetEntryByDateInput = {
      date: testDate
    };

    // Execute handler
    const result = await getEntryByDate(input);

    // Validate result
    expect(result).not.toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.date).toBeInstanceOf(Date);
    expect(result!.date.toISOString().split('T')[0]).toEqual(testDate);
    expect(result!.content).toEqual(testContent);
    expect(result!.word_count).toEqual(testWordCount);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existing date', async () => {
    // Test with date that has no entry
    const input: GetEntryByDateInput = {
      date: '2024-12-25'
    };

    const result = await getEntryByDate(input);

    expect(result).toBeNull();
  });

  it('should return correct entry when multiple entries exist', async () => {
    // Create multiple test entries
    const entries = [
      { date: '2024-01-01', content: 'New year entry', word_count: 3 },
      { date: '2024-01-02', content: 'Second day entry', word_count: 3 },
      { date: '2024-01-03', content: 'Third day entry', word_count: 3 }
    ];

    for (const entry of entries) {
      await db.insert(morningPagesTable)
        .values(entry)
        .execute();
    }

    // Query for specific date
    const input: GetEntryByDateInput = {
      date: '2024-01-02'
    };

    const result = await getEntryByDate(input);

    // Should return only the entry for the requested date
    expect(result).not.toBeNull();
    expect(result!.date.toISOString().split('T')[0]).toEqual('2024-01-02');
    expect(result!.content).toEqual('Second day entry');
    expect(result!.word_count).toEqual(3);
  });

  it('should handle empty content entries', async () => {
    // Create entry with empty content
    const testDate = '2024-02-14';
    await db.insert(morningPagesTable)
      .values({
        date: testDate,
        content: '',
        word_count: 0,
      })
      .execute();

    const input: GetEntryByDateInput = {
      date: testDate
    };

    const result = await getEntryByDate(input);

    expect(result).not.toBeNull();
    expect(result!.content).toEqual('');
    expect(result!.word_count).toEqual(0);
    expect(result!.date.toISOString().split('T')[0]).toEqual(testDate);
  });

  it('should handle valid date formats correctly', async () => {
    // Test with different but valid date format
    const testDate = '2024-12-01';
    await db.insert(morningPagesTable)
      .values({
        date: testDate,
        content: 'December entry',
        word_count: 2,
      })
      .execute();

    const input: GetEntryByDateInput = {
      date: testDate
    };

    const result = await getEntryByDate(input);

    expect(result).not.toBeNull();
    expect(result!.date).toBeInstanceOf(Date);
    expect(result!.date.getFullYear()).toEqual(2024);
    expect(result!.date.getMonth()).toEqual(11); // December is month 11 (0-indexed)
    expect(result!.date.getDate()).toEqual(1);
  });
});