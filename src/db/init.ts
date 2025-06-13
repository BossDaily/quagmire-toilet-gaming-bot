import 'dotenv/config';
import { db } from './index';

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');
    
    // Test the database connection by trying to create a simple query
    await db.query.usersTable.findMany({ limit: 1 });
    console.log('✅ Database connection established successfully!');
    console.log('📊 Database is ready for use');
    
    console.log('Database initialization complete! 🎉');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
