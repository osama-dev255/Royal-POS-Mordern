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
  const outletId = '18560d00-1da8-41f1-8c20-8a0bf6598a0b';
  const customerId = '5c1ae407-9edd-41f1-8868-865d48bbc08a';

  // 1. Get the last credit sale invoice (INV-1782536427782)
  console.log('=== LAST CREDIT SALE INVOICE ===');
  const lastInvRef = '950f0a04-11c2-4b3f-bc3a-02d6fce5afa7';
  
  // 2. Get all outlet debts for this customer
  const debts = await query('outlet_debts', `customer_id=eq.${customerId}&outlet_id=eq.${outletId}&order=created_at.desc&select=*`);
  console.log('\n=== ALL OUTLET DEBTS ===');
  if (debts.message) {
    console.log('Error:', debts.message);
    // Try without specific columns
    const debts2 = await query('outlet_debts', `customer_id=eq.${customerId}&outlet_id=eq.${outletId}&order=created_at.desc&limit=10`);
    console.log(JSON.stringify(debts2, null, 2));
  } else {
    console.log(JSON.stringify(debts, null, 2));
  }

  // 3. Get the specific debt linked to last invoice
  const specificDebt = await query('outlet_debts', `sale_id=eq.${lastInvRef}&select=*`);
  console.log('\n=== DEBT FOR LAST INVOICE ===');
  console.log(JSON.stringify(specificDebt, null, 2));

  // 4. Check outlet_card_sales for this invoice
  const cardSales = await query('outlet_card_sales', `customer_id=eq.${customerId}&outlet_id=eq.${outletId}&order=created_at.desc&limit=5&select=*`);
  console.log('\n=== RECENT CARD SALES ===');
  if (cardSales.message) {
    console.log('Error:', cardSales.message);
  } else {
    console.log(JSON.stringify(cardSales, null, 2));
  }

  // 5. Check outlet_mobile_sales
  const mobileSales = await query('outlet_mobile_sales', `customer_id=eq.${customerId}&outlet_id=eq.${outletId}&order=created_at.desc&limit=5&select=*`);
  console.log('\n=== RECENT MOBILE SALES ===');
  if (mobileSales.message) {
    console.log('Error:', mobileSales.message);
  } else {
    console.log(JSON.stringify(mobileSales, null, 2));
  }

  // 6. Check outlet_cash_sales
  const cashSales = await query('outlet_cash_sales', `customer_id=eq.${customerId}&outlet_id=eq.${outletId}&order=created_at.desc&limit=5&select=*`);
  console.log('\n=== RECENT CASH SALES ===');
  if (cashSales.message) {
    console.log('Error:', cashSales.message);
  } else {
    console.log(JSON.stringify(cashSales, null, 2));
  }

  // 7. Check outlet_payments for this customer
  const payments = await query('outlet_payments', `customer_id=eq.${customerId}&outlet_id=eq.${outletId}&order=created_at.desc&limit=10&select=*`);
  console.log('\n=== RECENT PAYMENTS ===');
  if (payments.message) {
    console.log('Error:', payments.message);
  } else {
    console.log(JSON.stringify(payments, null, 2));
  }
}

main().catch(console.error);
