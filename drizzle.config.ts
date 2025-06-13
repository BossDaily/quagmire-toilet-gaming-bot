import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment variables from .env file
config({
  path: './src/.env'
});

export default defineConfig({
  out: './drizzle',
  schema: 'src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
  },
});
