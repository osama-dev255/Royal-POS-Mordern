// Script to run the VAT and depreciation migration
// This script can be run with Node.js if you have the Supabase client installed

const { createClient } = require('@supabase/supabase-js');

// Replace with your Supabase URL and anon key
const supabaseUrl = process.env.SUPABASE_URL || 'https://tymfrdglmbnmzureeien.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  try {
    console.log('Running VAT and depreciation migration...');
    
    // Add VAT and depreciation columns to assets table
    const { error: assetsError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE assets 
        ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT NULL;
      `
    });
    
    if (assetsError) {
      console.error('Error adding columns to assets table:', assetsError);
    } else {
      console.log('Successfully added columns to assets table');
    }
    
    // Add VAT columns to asset_transactions table
    const { error: transactionsError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE asset_transactions 
        ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT NULL;
      `
    });
    
    if (transactionsError) {
      console.error('Error adding columns to asset_transactions table:', transactionsError);
    } else {
      console.log('Successfully added columns to asset_transactions table');
    }
    
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
runMigration();