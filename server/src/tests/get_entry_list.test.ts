import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { type DateRangeInput } from '../schema';
import { getEntryList } from '../handlers/get_entry_list';

// Test data for entries
const testEntries = [
  {
    date: '2024-01-01',
    content: 'New Year resolution entry with some content',
    word_count: 7
  },
  {
    date: '2024-01-02',
    content: '', // Empty content entry
    word_count: 0
  },
  {
    date: '2024-01-03',
    content: '   ', // Whitespace only entry
    word_count: 0
  },
  {
    date: '2024-01-05',
    content: 'Entry after gap with meaningful content',
    word_count: 6
  },
  {
    date: '2024-02-01',
    content: 'February entry for date range testing',
    word_count: 6
  }
];

describe('getEntryList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test entries
  const createTestEntries = async () => {
    for (const entry of testEntries) {
      await db.insert(morningPagesTable)
        .values({
          date: entry.date,
          content: entry.content,
          word_count: entry.word_count
        })
        .execute();
    }
  };

  it('should return all entries sorted by date descending when no filter provided', async () => {
    await createTestEntries();

    const result = await getEntryList();

    expect(result).toHaveLength(5);
    
    // Check ordering - most recent first
    expect(result[0].date).toEqual(new Date('2024-02-01'));
    expect(result[1].date).toEqual(new Date('2024-01-05'));
    expect(result[2].date).toEqual(new Date('2024-01-03'));
    expect(result[3].date).toEqual(new Date('2024-01-02'));
    expect(result[4].date).toEqual(new Date('2024-01-01'));

    // Check all required fields are present
    result.forEach(entry => {
      expect(entry.id).toBeDefined();
      expect(entry.date).toBeInstanceOf(Date);
      expect(typeof entry.word_count).toBe('number');
      expect(typeof entry.has_content).toBe('boolean');
    });
  });

  it('should correctly set has_content flag based on content', async () => {
    await createTestEntries();

    const result = await getEntryList();
    
    // Find entries by date to check has_content flag
    const jan1Entry = result.find(e => e.date.getTime() === new Date('2024-01-01').getTime());
    const jan2Entry = result.find(e => e.date.getTime() === new Date('2024-01-02').getTime());
    const jan3Entry = result.find(e => e.date.getTime() === new Date('2024-01-03').getTime());
    const jan5Entry = result.find(e => e.date.getTime() === new Date('2024-01-05').getTime());

    expect(jan1Entry?.has_content).toBe(true); // Has real content
    expect(jan2Entry?.has_content).toBe(false); // Empty content
    expect(jan3Entry?.has_content).toBe(false); // Whitespace only
    expect(jan5Entry?.has_content).toBe(true); // Has real content
  });

  it('should filter by start_date when provided', async () => {
    await createTestEntries();

    const filter: DateRangeInput = {
      start_date: '2024-01-03'
    };

    const result = await getEntryList(filter);

    expect(result).toHaveLength(3);
    
    // Should include entries from 2024-01-03 onwards
    const dates = result.map(e => e.date.toISOString().split('T')[0]);
    expect(dates).toContain('2024-02-01');
    expect(dates).toContain('2024-01-05');
    expect(dates).toContain('2024-01-03');
    
    // Should not include earlier entries
    expect(dates).not.toContain('2024-01-02');
    expect(dates).not.toContain('2024-01-01');
  });

  it('should filter by end_date when provided', async () => {
    await createTestEntries();

    const filter: DateRangeInput = {
      end_date: '2024-01-03'
    };

    const result = await getEntryList(filter);

    expect(result).toHaveLength(3);
    
    // Should include entries up to 2024-01-03
    const dates = result.map(e => e.date.toISOString().split('T')[0]);
    expect(dates).toContain('2024-01-03');
    expect(dates).toContain('2024-01-02');
    expect(dates).toContain('2024-01-01');
    
    // Should not include later entries
    expect(dates).not.toContain('2024-01-05');
    expect(dates).not.toContain('2024-02-01');
  });

  it('should filter by date range when both start_date and end_date provided', async () => {
    await createTestEntries();

    const filter: DateRangeInput = {
      start_date: '2024-01-02',
      end_date: '2024-01-05'
    };

    const result = await getEntryList(filter);

    expect(result).toHaveLength(3);
    
    // Should include entries within the range
    const dates = result.map(e => e.date.toISOString().split('T')[0]);
    expect(dates).toContain('2024-01-05');
    expect(dates).toContain('2024-01-03');
    expect(dates).toContain('2024-01-02');
    
    // Should not include entries outside the range
    expect(dates).not.toContain('2024-01-01');
    expect(dates).not.toContain('2024-02-01');
  });

  it('should return empty array when no entries exist', async () => {
    const result = await getEntryList();
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when date filter matches no entries', async () => {
    await createTestEntries();

    const filter: DateRangeInput = {
      start_date: '2024-03-01',
      end_date: '2024-03-31'
    };

    const result = await getEntryList(filter);
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle edge case where start_date equals end_date', async () => {
    await createTestEntries();

    const filter: DateRangeInput = {
      start_date: '2024-01-03',
      end_date: '2024-01-03'
    };

    const result = await getEntryList(filter);

    expect(result).toHaveLength(1);
    expect(result[0].date.toISOString().split('T')[0]).toBe('2024-01-03');
  });

  it('should preserve word_count values correctly', async () => {
    await createTestEntries();

    const result = await getEntryList();
    
    // Find specific entries and check their word counts
    const jan1Entry = result.find(e => e.date.getTime() === new Date('2024-01-01').getTime());
    const jan2Entry = result.find(e => e.date.getTime() === new Date('2024-01-02').getTime());
    const feb1Entry = result.find(e => e.date.getTime() === new Date('2024-02-01').getTime());

    expect(jan1Entry?.word_count).toBe(7);
    expect(jan2Entry?.word_count).toBe(0);
    expect(feb1Entry?.word_count).toBe(6);
  });
});