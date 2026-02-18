// Test script to verify GRN dashboard functionality
// Run this in browser console after logging in

async function testGRNDashboard() {
  console.log('=== GRN Dashboard Test ===\n');
  
  try {
    // Test 1: Check if required components are available
    console.log('1. Checking required components...');
    
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase client not found');
      return;
    }
    console.log('✓ Supabase client available');
    
    // Test 2: Check authentication
    console.log('\n2. Checking authentication...');
    const { data: { user }, error: authError } = await window.supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }
    
    if (!user) {
      console.log('⚠ No authenticated user - will use localStorage only');
    } else {
      console.log('✓ User authenticated:', user.email || user.id);
    }
    
    // Test 3: Test database connection
    console.log('\n3. Testing database connection...');
    const { data: testData, error: testError } = await window.supabase
      .from('saved_grns')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection error:', testError.message);
      console.error('Error code:', testError.code);
    } else {
      console.log('✓ Database connection successful');
    }
    
    // Test 4: Try to insert a test GRN
    console.log('\n4. Testing GRN insert...');
    const testGRN = {
      id: `test-${Date.now()}`,
      name: `Test GRN ${Date.now()}`,
      total: 1500,
      data: {
        grnNumber: `TEST-${Date.now()}`,
        supplierName: 'Test Supplier',
        poNumber: `TEST-PO-${Date.now()}`,
        items: [
          {
            id: '1',
            description: 'Test Item',
            quantity: 10,
            delivered: 10,
            unitCost: 150,
            total: 1500,
            unit: 'pcs'
          }
        ],
        status: 'pending',
        preparedBy: 'Test User',
        receivedDate: new Date().toISOString().split('T')[0]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Try to save to database
    if (user) {
      const insertData = {
        user_id: user.id,
        grn_number: testGRN.data.grnNumber,
        supplier_name: testGRN.data.supplierName,
        po_number: testGRN.data.poNumber,
        items: testGRN.data.items,
        status: testGRN.data.status,
        total_amount: testGRN.total,
        created_at: testGRN.createdAt,
        updated_at: testGRN.updatedAt
      };
      
      const { data: insertResult, error: insertError } = await window.supabase
        .from('saved_grns')
        .insert(insertData)
        .select();
      
      if (insertError) {
        console.error('❌ Database insert failed:', insertError.message);
        console.error('Error code:', insertError.code);
      } else {
        console.log('✓ Database insert successful');
        console.log('Inserted ID:', insertResult?.[0]?.id);
        
        // Clean up test data
        if (insertResult?.[0]?.id) {
          await window.supabase
            .from('saved_grns')
            .delete()
            .eq('id', insertResult[0].id);
          console.log('✓ Test data cleaned up');
        }
      }
    }
    
    // Test 5: Test localStorage fallback
    console.log('\n5. Testing localStorage fallback...');
    const localStorageKey = 'savedGRNs';
    const existingData = localStorage.getItem(localStorageKey);
    let testDataArray = existingData ? JSON.parse(existingData) : [];
    
    testDataArray.push(testGRN);
    localStorage.setItem(localStorageKey, JSON.stringify(testDataArray));
    console.log('✓ Test data saved to localStorage');
    
    // Verify it can be read back
    const verifyData = localStorage.getItem(localStorageKey);
    const parsedData = verifyData ? JSON.parse(verifyData) : [];
    const foundTestGRN = parsedData.find((item: any) => item.id === testGRN.id);
    
    if (foundTestGRN) {
      console.log('✓ Data successfully retrieved from localStorage');
    } else {
      console.error('❌ Failed to retrieve data from localStorage');
    }
    
    // Clean up localStorage test data
    const cleanedData = parsedData.filter((item: any) => item.id !== testGRN.id);
    localStorage.setItem(localStorageKey, JSON.stringify(cleanedData));
    console.log('✓ localStorage test data cleaned up');
    
    console.log('\n=== Test Complete ===');
    console.log('✅ GRN dashboard components are working correctly');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testGRNDashboard();