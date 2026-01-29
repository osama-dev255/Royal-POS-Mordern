// Simple GRN database test
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGRNDatabase() {
  console.log('=== GRN Database Test ===\n');
  
  try {
    // Test 1: Check if table exists
    console.log('1. Checking if saved_grns table exists...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('saved_grns')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Table access error:', tableError.message);
      console.log('Error code:', tableError.code);
      return;
    }
    console.log('✓ Table exists and accessible\n');
    
    // Test 2: Try minimal insert
    console.log('2. Testing minimal insert...');
    const testData = {
      user_id: '2bc2f689-4a1b-47c3-a150-201842d4c47a', // Your user ID from console log
      grn_number: 'TEST-GRN-' + Date.now(),
      supplier_name: 'Test Supplier',
      po_number: 'TEST-PO-' + Date.now(),
      status: 'completed'
    };
    
    console.log('Inserting test data:', testData);
    
    const { data: insertData, error: insertError } = await supabase
      .from('saved_grns')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      console.log('Error code:', insertError.code);
      console.log('Error details:', insertError.details);
      return;
    }
    
    console.log('✓ Insert successful');
    console.log('Inserted record:', insertData);
    
    // Test 3: Try to retrieve the inserted record
    console.log('\n3. Testing retrieval...');
    const { data: retrievedData, error: retrieveError } = await supabase
      .from('saved_grns')
      .select('*')
      .eq('grn_number', testData.grn_number);
    
    if (retrieveError) {
      console.log('❌ Retrieval failed:', retrieveError.message);
    } else {
      console.log('✓ Retrieval successful');
      console.log('Retrieved record:', retrievedData);
    }
    
    // Test 4: Clean up test data
    console.log('\n4. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('saved_grns')
      .delete()
      .eq('grn_number', testData.grn_number);
    
    if (deleteError) {
      console.log('⚠ Cleanup failed:', deleteError.message);
    } else {
      console.log('✓ Test data cleaned up');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
  }
}

testGRNDatabase();