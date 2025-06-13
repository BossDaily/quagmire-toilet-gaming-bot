import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Create the database client
const client = createClient({
  url: process.env.DB_FILE_NAME!
});

// Create the Drizzle database instance
export const db = drizzle({ client, schema });

// Export the schema for use in other files
export * from './schema';
