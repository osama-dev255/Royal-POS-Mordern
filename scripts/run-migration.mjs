// Script to run SQL migrations
// This script can be run with Node.js to execute SQL files

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tymfrdglmbnmzureeien.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration(sqlFilePath) {
  try {
    console.log(`Running migration: ${sqlFilePath}`);
    
    // Read the SQL file
    const sqlContent = readFileSync(resolve(sqlFilePath), 'utf8');
    
    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      console.log('Executing:', statement.substring(0, 50) + '...');
      
      // For CREATE TABLE and other DDL statements, we need to use a different approach
      // Let's try to execute the statement directly
      try {
        // This is a simplified approach - in a real production environment,
        // you'd want to use a proper database connection with admin privileges
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            query: statement
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error executing statement:', errorText);
        } else {
          console.log('Statement executed successfully');
        }
      } catch (err) {
        console.error('Error executing statement:', err);
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Get the migration file from command line arguments
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Please provide a migration file path');
  console.error('Usage: node run-migration.mjs migrations/your-migration.sql');
  process.exit(1);
}

// Run the migration
runMigration(migrationFile);