/**
 * Script to update existing GRN totals in localStorage and database
 * Run this script to fix GRNs that have 0.00 displayed instead of actual total
 */

async function updateExistingGRNTotals() {
  console.log('=== Updating Existing GRN Totals ===\n');

  try {
    // Import required modules
    const { createClient } = require('@supabase/supabase-js');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Environment variables not set. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('1. Updating localStorage GRNs...');
    
    // Read localStorage data
    const savedGRNsRaw = localStorage.getItem('savedGRNs');
    if (savedGRNsRaw) {
      let grns = JSON.parse(savedGRNsRaw);
      let updatedLocalStorageCount = 0;
      
      grns = grns.map(grn => {
        // Check if total is missing or 0 and needs recalculation
        const needsUpdate = !grn.total || grn.total === 0;
        
        if (needsUpdate && grn.data && grn.data.items) {
          const calculatedTotal = grn.data.items.reduce((sum, item) => {
            return sum + Number(item.totalWithReceivingCost || item.total || 0);
          }, 0);
          
          if (calculatedTotal > 0) {
            grn.total = calculatedTotal;
            updatedLocalStorageCount++;
            console.log(`  ✓ Updated localStorage GRN ${grn.name}: ${calculatedTotal}`);
          }
        }
        return grn;
      });
      
      if (updatedLocalStorageCount > 0) {
        localStorage.setItem('savedGRNs', JSON.stringify(grns));
        console.log(`✓ Updated ${updatedLocalStorageCount} localStorage GRNs with calculated totals\n`);
      } else {
        console.log('  No localStorage GRNs needed updating\n');
      }
    } else {
      console.log('  No localStorage GRNs found\n');
    }

    console.log('2. Updating database GRNs...');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('  ❌ Authentication error:', authError.message);
      return;
    }
    
    if (!user) {
      console.log('  ❌ No authenticated user found. Please log in first.');
      return;
    }
    
    console.log(`  User authenticated: ${user.email || user.id}`);

    // Get all GRNs for this user
    const { data: dbGRNs, error: selectError } = await supabase
      .from('saved_grns')
      .select('id, items, total_amount')
      .eq('user_id', user.id);
    
    if (selectError) {
      console.log('  ❌ Database query error:', selectError.message);
      return;
    }
    
    if (!dbGRNs || dbGRNs.length === 0) {
      console.log('  No database GRNs found for this user');
      return;
    }

    let updatedDbCount = 0;
    
    for (const dbGRN of dbGRNs) {
      try {
        // Parse the items data (it's stored as JSONB)
        let items;
        if (typeof dbGRN.items === 'string') {
          items = JSON.parse(dbGRN.items);
        } else {
          items = dbGRN.items;
        }
        
        if (Array.isArray(items)) {
          // Calculate total from items
          const calculatedTotal = items.reduce((sum, item) => {
            return sum + Number(item.totalWithReceivingCost || item.total || 0);
          }, 0);
          
          // Update the record if the calculated total is different from stored total
          if (calculatedTotal !== dbGRN.total_amount && calculatedTotal > 0) {
            const { error: updateError } = await supabase
              .from('saved_grns')
              .update({ total_amount: calculatedTotal })
              .eq('id', dbGRN.id);
            
            if (updateError) {
              console.log(`  ❌ Error updating GRN ${dbGRN.id}:`, updateError.message);
            } else {
              updatedDbCount++;
              console.log(`  ✓ Updated database GRN ${dbGRN.id}: ${calculatedTotal}`);
            }
          }
        }
      } catch (parseError) {
        console.log(`  ⚠ Error processing GRN ${dbGRN.id}:`, parseError.message);
      }
    }
    
    console.log(`\n✓ Updated ${updatedDbCount} database GRNs with calculated totals`);
    console.log('\n=== GRN Total Update Complete ===');
    
  } catch (error) {
    console.error('❌ Unexpected error during GRN total update:', error.message);
  }
}

// For browser environment
if (typeof window !== 'undefined' && window.supabase) {
  // Running in browser
  async function updateGRNTotalsBrowser() {
    console.log('=== Updating Existing GRN Totals (Browser Version) ===\n');

    try {
      console.log('1. Updating localStorage GRNs...');
      
      // Read localStorage data
      const savedGRNsRaw = localStorage.getItem('savedGRNs');
      if (savedGRNsRaw) {
        let grns = JSON.parse(savedGRNsRaw);
        let updatedLocalStorageCount = 0;
        
        grns = grns.map(grn => {
          // Check if total is missing or 0 and needs recalculation
          const needsUpdate = !grn.total || grn.total === 0;
          
          if (needsUpdate && grn.data && grn.data.items) {
            const calculatedTotal = grn.data.items.reduce((sum, item) => {
              return sum + Number(item.totalWithReceivingCost || item.total || 0);
            }, 0);
            
            if (calculatedTotal > 0) {
              grn.total = calculatedTotal;
              updatedLocalStorageCount++;
              console.log(`  ✓ Updated localStorage GRN ${grn.name}: ${calculatedTotal}`);
            }
          }
          return grn;
        });
        
        if (updatedLocalStorageCount > 0) {
          localStorage.setItem('savedGRNs', JSON.stringify(grns));
          console.log(`✓ Updated ${updatedLocalStorageCount} localStorage GRNs with calculated totals\n`);
        } else {
          console.log('  No localStorage GRNs needed updating\n');
        }
      } else {
        console.log('  No localStorage GRNs found\n');
      }

      console.log('2. Updating database GRNs...');
      
      // Get current user
      const { data: { user }, error: authError } = await window.supabase.auth.getUser();
      
      if (authError) {
        console.log('  ❌ Authentication error:', authError.message);
        return;
      }
      
      if (!user) {
        console.log('  ❌ No authenticated user found. Please log in first.');
        return;
      }
      
      console.log(`  User authenticated: ${user.email || user.id}`);

      // Get all GRNs for this user
      const { data: dbGRNs, error: selectError } = await window.supabase
        .from('saved_grns')
        .select('id, items, total_amount')
        .eq('user_id', user.id);
      
      if (selectError) {
        console.log('  ❌ Database query error:', selectError.message);
        return;
      }
      
      if (!dbGRNs || dbGRNs.length === 0) {
        console.log('  No database GRNs found for this user');
        return;
      }

      let updatedDbCount = 0;
      
      for (const dbGRN of dbGRNs) {
        try {
          // Parse the items data (it's stored as JSONB)
          let items;
          if (typeof dbGRN.items === 'string') {
            items = JSON.parse(dbGRN.items);
          } else {
            items = dbGRN.items;
          }
          
          if (Array.isArray(items)) {
            // Calculate total from items
            const calculatedTotal = items.reduce((sum, item) => {
              return sum + Number(item.totalWithReceivingCost || item.total || 0);
            }, 0);
            
            // Update the record if the calculated total is different from stored total
            if (calculatedTotal !== dbGRN.total_amount && calculatedTotal > 0) {
              const { error: updateError } = await window.supabase
                .from('saved_grns')
                .update({ total_amount: calculatedTotal })
                .eq('id', dbGRN.id);
              
              if (updateError) {
                console.log(`  ❌ Error updating GRN ${dbGRN.id}:`, updateError.message);
              } else {
                updatedDbCount++;
                console.log(`  ✓ Updated database GRN ${dbGRN.id}: ${calculatedTotal}`);
              }
            }
          }
        } catch (parseError) {
          console.log(`  ⚠ Error processing GRN ${dbGRN.id}:`, parseError.message);
        }
      }
      
      console.log(`\n✓ Updated ${updatedDbCount} database GRNs with calculated totals`);
      console.log('\n=== GRN Total Update Complete ===');
      
    } catch (error) {
      console.error('❌ Unexpected error during GRN total update:', error.message);
    }
  }

  // Make the function available globally for manual execution
  window.updateGRNTotals = updateGRNTotalsBrowser;
  console.log('✅ Update function ready. Run updateGRNTotals() in console to execute.');
}

module.exports = { updateExistingGRNTotals };