import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { morningPagesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateMorningPageEntryInput } from '../schema';
import { updateMorningPageEntry } from '../handlers/update_morning_page_entry';

describe('updateMorningPageEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update an existing morning pages entry', async () => {
    // Create a test entry first
    const createdResult = await db.insert(morningPagesTable)
      .values({
        date: '2024-01-15',
        content: 'Original content for my morning pages',
        word_count: 7
      })
      .returning()
      .execute();

    const originalEntry = createdResult[0];
    const originalUpdatedAt = originalEntry.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateMorningPageEntryInput = {
      id: originalEntry.id,
      content: 'Updated content with more words and thoughts about the day ahead',
      word_count: 12
    };

    const result = await updateMorningPageEntry(updateInput);

    // Verify the returned result
    expect(result.id).toEqual(originalEntry.id);
    expect(result.date).toEqual(new Date(originalEntry.date));
    expect(result.content).toEqual('Updated content with more words and thoughts about the day ahead');
    expect(result.word_count).toEqual(12);
    expect(result.created_at).toEqual(originalEntry.created_at); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true); // Should be newer timestamp
  });

  it('should save updated entry to database', async () => {
    // Create a test entry first
    const createdResult = await db.insert(morningPagesTable)
      .values({
        date: '2024-01-16',
        content: 'Initial morning pages entry',
        word_count: 4
      })
      .returning()
      .execute();

    const originalEntry = createdResult[0];

    const updateInput: UpdateMorningPageEntryInput = {
      id: originalEntry.id,
      content: 'Completely rewritten morning pages with new insights and reflections',
      word_count: 10
    };

    await updateMorningPageEntry(updateInput);

    // Query the database to verify changes were saved
    const updatedEntries = await db.select()
      .from(morningPagesTable)
      .where(eq(morningPagesTable.id, originalEntry.id))
      .execute();

    expect(updatedEntries).toHaveLength(1);
    const updatedEntry = updatedEntries[0];

    expect(updatedEntry.content).toEqual('Completely rewritten morning pages with new insights and reflections');
    expect(updatedEntry.word_count).toEqual(10);
    expect(updatedEntry.date).toEqual(originalEntry.date); // Date should remain unchanged (both are strings from DB)
    expect(updatedEntry.created_at).toEqual(originalEntry.created_at); // Created date should remain unchanged
    expect(updatedEntry.updated_at).toBeInstanceOf(Date);
    expect(updatedEntry.updated_at > originalEntry.updated_at).toBe(true);
  });

  it('should throw error when entry does not exist', async () => {
    const updateInput: UpdateMorningPageEntryInput = {
      id: 999, // Non-existent ID
      content: 'This should fail',
      word_count: 4
    };

    await expect(updateMorningPageEntry(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle empty content updates', async () => {
    // Create a test entry first
    const createdResult = await db.insert(morningPagesTable)
      .values({
        date: '2024-01-17',
        content: 'Some initial content',
        word_count: 3
      })
      .returning()
      .execute();

    const originalEntry = createdResult[0];

    const updateInput: UpdateMorningPageEntryInput = {
      id: originalEntry.id,
      content: '', // Empty content
      word_count: 0
    };

    const result = await updateMorningPageEntry(updateInput);

    expect(result.content).toEqual('');
    expect(result.word_count).toEqual(0);
    expect(result.id).toEqual(originalEntry.id);
  });

  it('should handle zero word count updates', async () => {
    // Create a test entry first
    const createdResult = await db.insert(morningPagesTable)
      .values({
        date: '2024-01-18',
        content: 'Initial content with several words',
        word_count: 5
      })
      .returning()
      .execute();

    const originalEntry = createdResult[0];

    const updateInput: UpdateMorningPageEntryInput = {
      id: originalEntry.id,
      content: 'New content',
      word_count: 0 // Zero word count should be valid
    };

    const result = await updateMorningPageEntry(updateInput);

    expect(result.content).toEqual('New content');
    expect(result.word_count).toEqual(0);
    expect(typeof result.word_count).toBe('number');
  });
});