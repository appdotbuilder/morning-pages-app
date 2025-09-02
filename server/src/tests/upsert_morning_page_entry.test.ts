import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { type CreateMorningPageEntryInput } from '../schema';
import { upsertMorningPageEntry } from '../handlers/upsert_morning_page_entry';
import { eq } from 'drizzle-orm';

// Test input for creating a new entry
const testInput: CreateMorningPageEntryInput = {
  date: '2024-01-15',
  content: 'This is my first morning pages entry. I woke up feeling refreshed and ready to tackle the day.',
  word_count: 18
};

describe('upsertMorningPageEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new morning page entry', async () => {
    const result = await upsertMorningPageEntry(testInput);

    // Validate returned entry structure
    expect(result.id).toBeDefined();
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.toISOString().slice(0, 10)).toEqual('2024-01-15');
    expect(result.content).toEqual(testInput.content);
    expect(result.word_count).toEqual(18);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save new entry to database', async () => {
    const result = await upsertMorningPageEntry(testInput);

    // Verify entry was saved to database
    const entries = await db.select()
      .from(morningPagesTable)
      .where(eq(morningPagesTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].date).toEqual('2024-01-15');
    expect(entries[0].content).toEqual(testInput.content);
    expect(entries[0].word_count).toEqual(18);
    expect(entries[0].created_at).toBeInstanceOf(Date);
    expect(entries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update existing entry when date already exists', async () => {
    // First, create an entry
    const initialResult = await upsertMorningPageEntry(testInput);
    const originalCreatedAt = initialResult.created_at;
    const originalUpdatedAt = initialResult.updated_at;

    // Wait a small amount to ensure updated_at changes
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update the same date with new content
    const updatedInput: CreateMorningPageEntryInput = {
      date: '2024-01-15', // Same date
      content: 'Updated content for my morning pages. I decided to add more thoughts about my goals.',
      word_count: 16
    };

    const updatedResult = await upsertMorningPageEntry(updatedInput);

    // Should have same ID and created_at, but updated content and updated_at
    expect(updatedResult.id).toEqual(initialResult.id);
    expect(updatedResult.date.toISOString().slice(0, 10)).toEqual('2024-01-15');
    expect(updatedResult.content).toEqual(updatedInput.content);
    expect(updatedResult.word_count).toEqual(16);
    expect(updatedResult.created_at).toEqual(originalCreatedAt);
    expect(updatedResult.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should verify only one entry exists after update', async () => {
    // Create initial entry
    await upsertMorningPageEntry(testInput);

    // Update the same date
    const updatedInput: CreateMorningPageEntryInput = {
      date: '2024-01-15',
      content: 'Completely new content',
      word_count: 3
    };

    await upsertMorningPageEntry(updatedInput);

    // Verify only one entry exists for this date
    const entries = await db.select()
      .from(morningPagesTable)
      .where(eq(morningPagesTable.date, '2024-01-15'))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].content).toEqual('Completely new content');
    expect(entries[0].word_count).toEqual(3);
  });

  it('should handle entries with empty content', async () => {
    const emptyInput: CreateMorningPageEntryInput = {
      date: '2024-01-16',
      content: '',
      word_count: 0
    };

    const result = await upsertMorningPageEntry(emptyInput);

    expect(result.content).toEqual('');
    expect(result.word_count).toEqual(0);
    expect(result.date.toISOString().slice(0, 10)).toEqual('2024-01-16');
  });

  it('should handle multiple different dates', async () => {
    const entry1Input: CreateMorningPageEntryInput = {
      date: '2024-01-10',
      content: 'First entry content',
      word_count: 3
    };

    const entry2Input: CreateMorningPageEntryInput = {
      date: '2024-01-11',
      content: 'Second entry content',
      word_count: 3
    };

    // Create two entries with different dates
    const result1 = await upsertMorningPageEntry(entry1Input);
    const result2 = await upsertMorningPageEntry(entry2Input);

    // Should have different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.date.toISOString().slice(0, 10)).toEqual('2024-01-10');
    expect(result2.date.toISOString().slice(0, 10)).toEqual('2024-01-11');

    // Verify both entries exist in database
    const allEntries = await db.select()
      .from(morningPagesTable)
      .execute();

    expect(allEntries).toHaveLength(2);
    
    // Find entries by date to verify content
    const entry1 = allEntries.find(e => e.date === '2024-01-10');
    const entry2 = allEntries.find(e => e.date === '2024-01-11');

    expect(entry1?.content).toEqual('First entry content');
    expect(entry2?.content).toEqual('Second entry content');
  });

  it('should update entry from empty to filled content', async () => {
    // Create entry with empty content first
    const emptyInput: CreateMorningPageEntryInput = {
      date: '2024-01-20',
      content: '',
      word_count: 0
    };

    const initialResult = await upsertMorningPageEntry(emptyInput);

    // Then update with actual content
    const filledInput: CreateMorningPageEntryInput = {
      date: '2024-01-20',
      content: 'Now I have something to write about. My morning started with meditation.',
      word_count: 13
    };

    const updatedResult = await upsertMorningPageEntry(filledInput);

    // Should be same entry, updated
    expect(updatedResult.id).toEqual(initialResult.id);
    expect(updatedResult.content).toEqual(filledInput.content);
    expect(updatedResult.word_count).toEqual(13);
    expect(updatedResult.created_at).toEqual(initialResult.created_at);
    expect(updatedResult.updated_at.getTime()).toBeGreaterThan(initialResult.updated_at.getTime());
  });
});