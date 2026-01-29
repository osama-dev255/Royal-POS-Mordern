// Debug script to check GRN saving status
console.log('=== GRN Debug Information ===');

// Check localStorage
console.log('\n1. Checking localStorage:');
try {
  const savedGRNs = localStorage.getItem('savedGRNs');
  if (savedGRNs) {
    const parsed = JSON.parse(savedGRNs);
    console.log(`Found ${parsed.length} GRNs in localStorage:`);
    parsed.forEach((grn, index) => {
      console.log(`  ${index + 1}. ${grn.name} (ID: ${grn.id}) - Created: ${grn.createdAt}`);
    });
  } else {
    console.log('No GRNs found in localStorage');
  }
} catch (error) {
  console.log('Error reading localStorage:', error);
}

// Check if we can access the database (this would need to be run in the browser context with Supabase initialized)
console.log('\n2. Database check would require browser context with Supabase authentication');

console.log('\n=== End Debug Information ===');