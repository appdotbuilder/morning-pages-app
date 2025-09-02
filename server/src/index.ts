import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createMorningPageEntryInputSchema,
  updateMorningPageEntryInputSchema,
  getEntryByDateInputSchema,
  dateRangeInputSchema
} from './schema';

// Import handlers
import { createMorningPageEntry } from './handlers/create_morning_page_entry';
import { updateMorningPageEntry } from './handlers/update_morning_page_entry';
import { getEntryByDate } from './handlers/get_entry_by_date';
import { getEntryList } from './handlers/get_entry_list';
import { getStreakInfo } from './handlers/get_streak_info';
import { getTodaysEntry } from './handlers/get_todays_entry';
import { upsertMorningPageEntry } from './handlers/upsert_morning_page_entry';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Create a new morning pages entry
  createMorningPageEntry: publicProcedure
    .input(createMorningPageEntryInputSchema)
    .mutation(({ input }) => createMorningPageEntry(input)),

  // Update an existing morning pages entry
  updateMorningPageEntry: publicProcedure
    .input(updateMorningPageEntryInputSchema)
    .mutation(({ input }) => updateMorningPageEntry(input)),

  // Upsert (create or update) morning pages entry for a date
  upsertMorningPageEntry: publicProcedure
    .input(createMorningPageEntryInputSchema)
    .mutation(({ input }) => upsertMorningPageEntry(input)),

  // Get morning pages entry by specific date
  getEntryByDate: publicProcedure
    .input(getEntryByDateInputSchema)
    .query(({ input }) => getEntryByDate(input)),

  // Get today's morning pages entry
  getTodaysEntry: publicProcedure
    .query(() => getTodaysEntry()),

  // Get list of entries with optional date range filtering
  getEntryList: publicProcedure
    .input(dateRangeInputSchema.optional())
    .query(({ input }) => getEntryList(input)),

  // Get streak information (current streak, total days, last entry date)
  getStreakInfo: publicProcedure
    .query(() => getStreakInfo()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Morning Pages TRPC server listening at port: ${port}`);
}

start();