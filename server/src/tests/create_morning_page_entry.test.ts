import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { type CreateMorningPageEntryInput } from '../schema';
import { createMorningPageEntry } from '../handlers/create_morning_page_entry';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateMorningPageEntryInput = {
  date: '2024-01-15',
  content: 'This is my morning pages entry. I am writing about my thoughts and feelings.',
  word_count: 15
};

describe('createMorningPageEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new morning page entry', async () => {
    const result = await createMorningPageEntry(testInput);

    // Basic field validation
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.content).toEqual(testInput.content);
    expect(result.word_count).toEqual(15);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save entry to database', async () => {
    const result = await createMorningPageEntry(testInput);

    // Query database to verify entry was saved
    const entries = await db.select()
      .from(morningPagesTable)
      .where(eq(morningPagesTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].date).toEqual('2024-01-15'); // Date stored as string in DB
    expect(entries[0].content).toEqual(testInput.content);
    expect(entries[0].word_count).toEqual(15);
    expect(entries[0].created_at).toBeInstanceOf(Date);
    expect(entries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle empty content with zero word count', async () => {
    const emptyInput: CreateMorningPageEntryInput = {
      date: '2024-01-16',
      content: '',
      word_count: 0
    };

    const result = await createMorningPageEntry(emptyInput);

    expect(result.content).toEqual('');
    expect(result.word_count).toEqual(0);
    expect(result.date).toEqual(new Date('2024-01-16'));
  });

  it('should update existing entry for same date (upsert behavior)', async () => {
    // Create initial entry
    const initialResult = await createMorningPageEntry(testInput);

    // Create another entry for the same date with different content
    const updateInput: CreateMorningPageEntryInput = {
      date: '2024-01-15', // Same date
      content: 'Updated morning pages content with more thoughts and reflections.',
      word_count: 10
    };

    const updatedResult = await createMorningPageEntry(updateInput);

    // Should have same ID (updated, not created new)
    expect(updatedResult.id).toEqual(initialResult.id);
    expect(updatedResult.content).toEqual(updateInput.content);
    expect(updatedResult.word_count).toEqual(10);
    expect(updatedResult.date).toEqual(new Date('2024-01-15'));

    // Verify only one entry exists in database
    const allEntries = await db.select()
      .from(morningPagesTable)
      .where(eq(morningPagesTable.date, '2024-01-15'))
      .execute();

    expect(allEntries).toHaveLength(1);
    expect(allEntries[0].content).toEqual(updateInput.content);
    expect(allEntries[0].word_count).toEqual(10);

    // Updated_at should be more recent than created_at for updates
    expect(updatedResult.updated_at.getTime()).toBeGreaterThanOrEqual(updatedResult.created_at.getTime());
  });

  it('should create multiple entries for different dates', async () => {
    const firstEntry: CreateMorningPageEntryInput = {
      date: '2024-01-15',
      content: 'First entry content',
      word_count: 3
    };

    const secondEntry: CreateMorningPageEntryInput = {
      date: '2024-01-16',
      content: 'Second entry content',
      word_count: 3
    };

    const result1 = await createMorningPageEntry(firstEntry);
    const result2 = await createMorningPageEntry(secondEntry);

    // Should have different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.date).toEqual(new Date('2024-01-15'));
    expect(result2.date).toEqual(new Date('2024-01-16'));

    // Verify both entries exist in database
    const allEntries = await db.select()
      .from(morningPagesTable)
      .execute();

    expect(allEntries).toHaveLength(2);
  });

  it('should preserve created_at when updating existing entry', async () => {
    // Create initial entry
    const initialResult = await createMorningPageEntry(testInput);
    const originalCreatedAt = initialResult.created_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    // Update the same entry
    const updateInput: CreateMorningPageEntryInput = {
      date: '2024-01-15',
      content: 'Updated content',
      word_count: 2
    };

    const updatedResult = await createMorningPageEntry(updateInput);

    // created_at should remain the same
    expect(updatedResult.created_at.getTime()).toEqual(originalCreatedAt.getTime());
    // updated_at should be more recent
    expect(updatedResult.updated_at.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
  });
});