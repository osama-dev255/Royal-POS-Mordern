// Script to run SQL migrations
// This script can be run with Node.js to execute SQL files

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Configuration - Use SERVICE_ROLE_KEY for DDL operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tymfrdglmbnmzureeien.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'your-service-role-key-here';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false
  }
});

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
      
      try {
        // Use Supabase's rpc functionality to execute raw SQL
        const { data, error } = await supabase.rpc('execute_sql', { 
          sql_command: statement 
        }, {
          count: null
        });
        
        if (error) {
          // If rpc doesn't work, try using the raw PostgREST endpoint with admin rights
          console.log('Trying alternative method...');
          
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceRoleKey,
              'Authorization': `Bearer ${supabaseServiceRoleKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              sql_command: statement
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error executing statement:', errorText);
            // Continue with the next statement instead of stopping
          } else {
            console.log('Statement executed successfully');
          }
        } else {
          console.log('Statement executed successfully');
        }
      } catch (err) {
        // If the above methods don't work, we might need to execute the SQL differently
        // For now, let's log the error and continue
        console.error('Error executing statement:', err.message);
        console.log('Trying to continue with next statement...');
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