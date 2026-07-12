const SUPABASE_URL = 'https://tymfrdglmbnmzureeien.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bWZyZGdsbWJubXp1cmVlaWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE2MjEsImV4cCI6MjA3NzI1NzYyMX0.1XqmEkyZqc6-eRKUGJEwXIFLJPril2LqGnh1-1PwuWY';

async function query(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return res.json();
}

async function main() {
  // 1. Find the outlet
  const outlets = await query('outlets', `name=eq.KILANGO%20GROUP%20LTD&select=id,name,location`);
  console.log('\n=== OUTLET ===');
  console.log(JSON.stringify(outlets, null, 2));
  
  if (!outlets.length) {
    // Try searching with different name patterns
    const allOutlets = await query('outlets', 'select=id,name,location');
    console.log('\n=== ALL OUTLETS ===');
    console.log(JSON.stringify(allOutlets.map(o => `${o.id} | ${o.name} | ${o.location}`), null, 2));
    return;
  }

  const outletId = outlets[0].id;
  console.log(`\nOutlet ID: ${outletId}`);

  // 2. Find the customer
  const customers = await query('outlet_customers', `outlet_id=eq.${outletId}&select=id,first_name,last_name,phone,email`);
  console.log('\n=== ALL CUSTOMERS IN OUTLET ===');
  console.log(JSON.stringify(customers, null, 2));

  const customer = customers.find(c => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    return fullName.includes('daudi') || fullName.includes('kilimanjaro');
  });
  
  if (!customer) {
    console.log('\nCustomer "DAUDI KILIMANJARO" not found in this outlet.');
    return;
  }

  console.log(`\nCustomer ID: ${customer.id}`);
  console.log(`Customer Name: ${customer.first_name} ${customer.last_name}`);

  // 3. Get customer ledger entries
  const ledger = await query('customer_ledger', `customer_id=eq.${customer.id}&outlet_id=eq.${outletId}&order=transaction_date.asc&select=*`);
  console.log('\n=== CUSTOMER LEDGER ENTRIES ===');
  console.log(JSON.stringify(ledger, null, 2));

  // 4. Get customer debts
  const debts = await query('outlet_debts', `customer_id=eq.${customer.id}&outlet_id=eq.${outletId}&select=id,debt_number,debt_date,total_amount,paid_amount,balance,status,payment_terms`);
  console.log('\n=== CUSTOMER DEBTS ===');
  console.log(JSON.stringify(debts, null, 2));

  // 5. Calculate summary
  if (ledger.length > 0) {
    const lastEntry = ledger[ledger.length - 1];
    console.log('\n=== LEDGER SUMMARY ===');
    console.log(`Total Entries: ${ledger.length}`);
    console.log(`Total Debits: ${ledger.reduce((s, e) => s + Number(e.debit_amount || 0), 0).toFixed(2)}`);
    console.log(`Total Credits: ${ledger.reduce((s, e) => s + Number(e.credit_amount || 0), 0).toFixed(2)}`);
    console.log(`Current Balance: ${Number(lastEntry.running_balance).toFixed(2)}`);
  }
}

main().catch(console.error);
