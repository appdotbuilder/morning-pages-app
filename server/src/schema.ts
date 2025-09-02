import { z } from 'zod';

// Morning pages entry schema
export const morningPageEntrySchema = z.object({
  id: z.number(),
  date: z.coerce.date(), // Entry date (YYYY-MM-DD)
  content: z.string(), // The actual morning pages content
  word_count: z.number().int().nonnegative(), // Word count for progress tracking
  created_at: z.coerce.date(), // When the entry was first created
  updated_at: z.coerce.date(), // Last time the entry was modified
});

export type MorningPageEntry = z.infer<typeof morningPageEntrySchema>;

// Input schema for creating morning pages entries
export const createMorningPageEntryInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'), // ISO date string
  content: z.string(), // Allow empty content for new entries
  word_count: z.number().int().nonnegative().default(0), // Auto-calculated word count
});

export type CreateMorningPageEntryInput = z.infer<typeof createMorningPageEntryInputSchema>;

// Input schema for updating morning pages entries
export const updateMorningPageEntryInputSchema = z.object({
  id: z.number(),
  content: z.string(), // Updated content
  word_count: z.number().int().nonnegative(), // Updated word count
});

export type UpdateMorningPageEntryInput = z.infer<typeof updateMorningPageEntryInputSchema>;

// Schema for streak information
export const streakInfoSchema = z.object({
  current_streak: z.number().int().nonnegative(), // Current consecutive days
  total_days: z.number().int().nonnegative(), // Total number of days with entries
  last_entry_date: z.string().nullable(), // Last date with an entry (YYYY-MM-DD format)
});

export type StreakInfo = z.infer<typeof streakInfoSchema>;

// Schema for entry list item (minimal info for list view)
export const entryListItemSchema = z.object({
  id: z.number(),
  date: z.coerce.date(),
  word_count: z.number().int().nonnegative(),
  has_content: z.boolean(), // Whether the entry has any content
});

export type EntryListItem = z.infer<typeof entryListItemSchema>;

// Schema for date filter queries
export const dateRangeInputSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type DateRangeInput = z.infer<typeof dateRangeInputSchema>;

// Schema for getting entry by date
export const getEntryByDateInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export type GetEntryByDateInput = z.infer<typeof getEntryByDateInputSchema>;