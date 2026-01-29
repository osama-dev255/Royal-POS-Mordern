// Test script to verify the GRN database insertion fix
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// Use the environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testGRNInsert() {
  console.log('=== Testing GRN Database Insert Fix ===\n');

  // Test data without the problematic 'date' field
  const testData = {
    user_id: '2bc2f689-4a1b-47c3-a150-201842d4c47a', // This should be the actual authenticated user ID
    grn_number: 'TEST-GRN-FIX-' + Date.now(),
    supplier_name: 'Test Supplier',
    po_number: 'TEST-PO-' + Date.now(),
    status: 'completed'
  };

  console.log('1. Testing minimal insert without date field...');
  console.log('Inserting test data:', JSON.stringify(testData, null, 2));

  try {
    const { data, error } = await supabase
      .from('saved_grns')
      .insert([testData])
      .select();

    if (error) {
      console.error('❌ Insert failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      
      // Check if it's an RLS issue
      if (error.code === '42501' || error.message.includes('row-level security')) {
        console.log('\n💡 This is likely an RLS policy issue. The user_id might not match the authenticated user.');
      }
    } else {
      console.log('✅ Insert successful!');
      console.log('Inserted data:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Unexpected error during insert:', err);
  }

  console.log('\n2. Testing schema - checking if date column exists...');
  try {
    // Try to select from the table to see the schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('saved_grns')
      .select('column_name, data_type')
      .limit(1);

    if (schemaError) {
      console.log('Could not retrieve schema info:', schemaError.message);
    } else {
      console.log('Schema check completed');
    }
  } catch (err) {
    console.log('Schema check not possible with this approach');
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testGRNInsert();