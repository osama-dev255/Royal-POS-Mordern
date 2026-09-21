// Temporary diagnostic: check why Customer Returns does not affect the customer ledger
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
  console.log('=== RECENT CUSTOMER RETURNS ===');
  const returns = await query('outlet_customer_returns',
    'select=id,outlet_id,return_number,source_type,source_id,source_invoice_number,customer_id,customer_name,refund_method,status,total_amount,created_at&order=created_at.desc&limit=10');
  console.log(JSON.stringify(returns, null, 2));

  if (!Array.isArray(returns) || returns.length === 0) {
    console.log('No returns found (or table missing / RLS blocked).');
    return;
  }

  const returnIds = returns.map(r => r.id).join(',');

  console.log('\n=== LEDGER ENTRIES WHOSE reference_id MATCHES A RETURN ===');
  const linked = await query('customer_ledger',
    `reference_id=in.(${returnIds})&select=id,transaction_type,reference_id,reference_number,debit_amount,credit_amount,running_balance,customer_id,outlet_id,transaction_date`);
  console.log(JSON.stringify(linked, null, 2));

  console.log('\n=== ALL refund-TYPE LEDGER ENTRIES (latest 20) ===');
  const refunds = await query('customer_ledger',
    'transaction_type=eq.refund&select=id,reference_id,reference_number,credit_amount,customer_id,transaction_date&order=created_at.desc&limit=20');
  console.log(JSON.stringify(refunds, null, 2));

  const debtReturns = returns.filter(r => r.source_type === 'debt' && r.source_id);
  if (debtReturns.length) {
    console.log('\n=== SOURCE DEBTS OF DEBT-LINKED RETURNS ===');
    const debtIds = debtReturns.map(r => r.source_id).join(',');
    const debts = await query('outlet_debts',
      `id=in.(${debtIds})&select=id,invoice_number,total_amount,amount_paid,remaining_amount,payment_status`);
    console.log(JSON.stringify(debts, null, 2));
  }

  const custIds = [...new Set(returns.map(r => r.customer_id).filter(Boolean))];
  if (custIds.length) {
    console.log('\n=== LEDGER (latest 50) FOR CUSTOMERS INVOLVED IN THESE RETURNS ===');
    const custLedger = await query('customer_ledger',
      `customer_id=in.(${custIds.join(',')})&select=id,transaction_type,reference_id,reference_number,debit_amount,credit_amount,running_balance,customer_id,transaction_date&order=transaction_date.desc&limit=50`);
    console.log(JSON.stringify(custLedger, null, 2));
  }

  console.log('\n=== ITEMS OF LATEST RETURN ===');
  const items = await query('outlet_customer_return_items',
    `return_id=eq.${returns[0].id}&select=product_name,quantity,unit_price,line_total,restock`);
  console.log(JSON.stringify(items, null, 2));

  console.log('\n=== STOCK MOVEMENTS WHOSE reference_id MATCHES A RETURN ===');
  const movements = await query('stock_movements',
    `reference_id=in.(${returnIds})&select=movement_type,product_name,quantity,reference_number,reference_type`);
  console.log(JSON.stringify(movements, null, 2));

  // Inventory baseline (sold_quantity) for the products of the latest return
  if (Array.isArray(items) && items.length) {
    console.log('\n=== INVENTORY BASELINE FOR PRODUCTS OF LATEST RETURN ===');
    const outletId = returns[0].outlet_id;
    const inv = await query('inventory_products',
      `outlet_id=eq.${outletId}&select=name,quantity,sold_quantity`);
    const names = items.map(i => i.product_name);
    console.log(JSON.stringify((Array.isArray(inv) ? inv : []).filter(p => names.includes(p.name)), null, 2));
  }
}

main().catch(console.error);
