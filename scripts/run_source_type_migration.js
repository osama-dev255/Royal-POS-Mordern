/**
 * Script to run the 20260426_add_source_type_to_deliveries migration
 * This adds source_type and source_outlet_id columns to saved_delivery_notes table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  console.log('🚀 Running migration: 20260426_add_source_type_to_deliveries');
  
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '../migrations/20260426_add_source_type_to_deliveries.sql'),
    'utf8'
  );

  try {
    // Split the SQL file into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Some statements might fail if columns already exist, which is okay
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          throw error;
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Added source_type column to saved_delivery_notes');
    console.log('   - Added source_outlet_id column to saved_delivery_notes');
    console.log('   - Created indexes for faster queries');
    console.log('\n💡 Next steps:');
    console.log('   - Update existing delivery records with appropriate source_type values');
    console.log('   - Test the new source filter in the UI');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution if RPC is not available
async function runMigrationDirect() {
  console.log('🚀 Running migration using direct SQL execution');
  
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '../migrations/20260426_add_source_type_to_deliveries.sql'),
    'utf8'
  );

  try {
    const { error } = await supabase.from('saved_delivery_notes').select('*').limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Database connection successful');
    console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80));
    console.log('\n✅ Once you\'ve run the SQL, the migration is complete!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigrationDirect();
