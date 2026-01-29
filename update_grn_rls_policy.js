// Script to update RLS policies for saved_grns table
import dotenv from 'dotenv';
dotenv.config();

const { createClient } = await import('@supabase/supabase-js');

// Replace with your Supabase URL and anon key
const supabaseUrl = process.env.SUPABASE_URL || 'https://tymfrdglmbnmzureeien.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateRLSPolicies() {
  try {
    console.log('Updating RLS policies for saved_grns table...');
    
    // Drop existing policies if they exist
    const dropPolicyResult = await supabase.rpc('execute_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can view their own saved GRNs" ON saved_grns;
        DROP POLICY IF EXISTS "Users can insert their own saved GRNs" ON saved_grns;
        DROP POLICY IF EXISTS "Users can update their own saved GRNs" ON saved_grns;
        DROP POLICY IF EXISTS "Users can delete their own saved GRNs" ON saved_grns;
        
        -- Create new permissive policies for development
        CREATE POLICY "Enable read access for all users" ON saved_grns FOR SELECT USING (true);
        CREATE POLICY "Enable insert access for all users" ON saved_grns FOR INSERT WITH CHECK (true);
        CREATE POLICY "Enable update access for all users" ON saved_grns FOR UPDATE USING (true);
        CREATE POLICY "Enable delete access for all users" ON saved_grns FOR DELETE USING (true);
        
        -- Refresh the schema cache
        NOTIFY pgrst, 'reload schema';
      `
    });
    
    if (dropPolicyResult.error) {
      console.error('Error updating policies:', dropPolicyResult.error);
    } else {
      console.log('Successfully updated RLS policies for saved_grns table');
    }
  } catch (error) {
    console.error('Error updating RLS policies:', error);
  }
}

// Run the update
updateRLSPolicies();