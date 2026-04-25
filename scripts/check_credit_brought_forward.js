/**
 * Diagnostic script to check and update credit_brought_forward in saved_delivery_notes
 * Run this to verify the column exists and see current values
 */

const { createClient } = require('@supabase/supabase-js');
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

async function checkCreditBroughtForward() {
  console.log('🔍 Checking credit_brought_forward column in saved_delivery_notes...\n');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('saved_delivery_notes')
      .select('id, delivery_note_number, customer, total, credit_brought_forward')
      .limit(10);

    if (error) {
      console.error('❌ Error querying database:', error.message);
      
      if (error.message.includes('credit_brought_forward')) {
        console.log('\n⚠️  The credit_brought_forward column does NOT exist in the database!');
        console.log('\n📋 You need to run the migration first:');
        console.log('   1. Open Supabase Dashboard');
        console.log('   2. Go to SQL Editor');
        console.log('   3. Run the SQL from: migrations/20260426_add_credit_brought_forward_to_deliveries.sql');
        console.log('\n   Or copy this SQL:');
        console.log('─'.repeat(80));
        console.log(`
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS credit_brought_forward DECIMAL(15, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_saved_delivery_notes_credit_brought_forward 
ON saved_delivery_notes(credit_brought_forward) 
WHERE credit_brought_forward > 0;

COMMENT ON COLUMN saved_delivery_notes.credit_brought_forward IS 'Credit amount brought forward from previous deliveries for this customer';
        `.trim());
        console.log('─'.repeat(80));
      }
      
      process.exit(1);
    }

    console.log('✅ Column exists! Here are the first 10 deliveries:\n');
    console.log('─'.repeat(80));
    console.log(`ID | Note Number | Customer | Total | Credit Brought Forward`);
    console.log('─'.repeat(80));

    data.forEach(delivery => {
      const creditValue = delivery.credit_brought_forward;
      const hasCredit = creditValue && creditValue !== 0;
      
      console.log(
        `${delivery.id.substring(0, 8)}... | ${delivery.delivery_note_number} | ${delivery.customer} | ${delivery.total} | ${hasCredit ? creditValue : '0 (no credit)'}`
      );
    });

    console.log('─'.repeat(80));
    
    const deliveriesWithCredit = data.filter(d => d.credit_brought_forward && d.credit_brought_forward !== 0);
    console.log(`\n📊 Summary:`);
    console.log(`   Total deliveries checked: ${data.length}`);
    console.log(`   Deliveries with credit > 0: ${deliveriesWithCredit.length}`);
    console.log(`   Deliveries with credit = 0: ${data.length - deliveriesWithCredit.length}`);

    if (deliveriesWithCredit.length === 0) {
      console.log('\n⚠️  No deliveries have credit_brought_forward > 0');
      console.log('\n💡 To test the feature, you can update a delivery manually:');
      console.log('   UPDATE saved_delivery_notes');
      console.log('   SET credit_brought_forward = 50000');
      console.log('   WHERE delivery_note_number = \'YOUR_DELIVERY_NOTE_NUMBER\';');
    }

    console.log('\n✅ Database check complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the check
checkCreditBroughtForward();
