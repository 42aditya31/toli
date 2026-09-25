import { defineConfig } from 'drizzle-kit';

// The phone's SQLite schema lives in packages/schema (03 §10); migrations are generated here.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: '../../packages/schema/src/local.ts',
  out: './drizzle',
});
