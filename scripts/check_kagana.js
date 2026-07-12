const SUPABASE_URL = 'https://tymfrdglmbnmzureeien.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bWZyZGdsbWJubXp1cmVlaWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE2MjEsImV4cCI6MjA3NzI1NzYyMX0.1XqmEkyZqc6-eRKUGJEwXIFLJPril2LqGnh1-1PwuWY';

const OUTLET_ID = '18560d00-1da8-41f1-8c20-8a0bf6598a0b';

async function query(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return res.json();
}

async function main() {
  // Step 1: Find customer "KAGANA KAGANA"
  console.log('=== SEARCHING FOR CUSTOMER: KAGANA KAGANA ===');
  const customers = await query('outlet_customers',
    `outlet_id=eq.${OUTLET_ID}&select=id,first_name,last_name,phone,address,email`);
  
  const customer = customers.find(c => {
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
    return fullName.includes('kagana');
  });

  if (!customer) {
    console.log('Customer not found at outlet', OUTLET_ID);
    // Try searching all customers
    const allCustomers = await query('customers', `select=id,first_name,last_name,phone`);
    const found = allCustomers.find(c => {
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
      return fullName.includes('kagana');
    });
    if (found) {
      console.log('Found in customers table:', found);
    } else {
      console.log('Customer KAGANA KAGANA not found in any table');
      return;
    }
    return;
  }

  const customerId = customer.id;
  const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  console.log(`Found: ${customerName} (ID: ${customerId})`);
  console.log(`Phone: ${customer.phone || 'N/A'}, Address: ${customer.address || 'N/A'}`);

  // Step 2: Ledger entries
  console.log('\n=== LEDGER ENTRIES (chronological) ===');
  const ledger = await query('customer_ledger',
    `outlet_id=eq.${OUTLET_ID}&customer_id=eq.${customerId}&order=transaction_date.asc,created_at.asc&select=id,transaction_type,reference_number,debit_amount,credit_amount,transaction_date,description`);
  
  let totalDebit = 0, totalCredit = 0;
  ledger.forEach((e, i) => {
    totalDebit += parseFloat(e.debit_amount) || 0;
    totalCredit += parseFloat(e.credit_amount) || 0;
    const balance = totalDebit - totalCredit;
    console.log(`${(i+1).toString().padStart(2)}. ${e.transaction_date?.split('T')[0]} | ${e.transaction_type.padEnd(14)} | ref:${(e.reference_number||'').padEnd(22)} | DR:${(parseFloat(e.debit_amount)||0).toString().padStart(12)} | CR:${(parseFloat(e.credit_amount)||0).toString().padStart(12)} | Bal:${balance.toString().padStart(12)} | ${e.description}`);
  });
  console.log(`\nTOTALS: Debits=${totalDebit}, Credits=${totalCredit}, Net Balance=${totalDebit - totalCredit}`);

  // Step 3: Debt records
  console.log('\n=== DEBT RECORDS (chronological) ===');
  const debts = await query('outlet_debts',
    `outlet_id=eq.${OUTLET_ID}&customer_id=eq.${customerId}&order=debt_date.asc&select=id,invoice_number,debt_date,total_amount,amount_paid,remaining_amount,payment_status,credit_brought_forward,adjustments,adjustment_reason`);
  
  let totalDebtRemaining = 0, totalDebtPaid = 0;
  debts.forEach((d, i) => {
    totalDebtRemaining += parseFloat(d.remaining_amount) || 0;
    totalDebtPaid += parseFloat(d.amount_paid) || 0;
    console.log(`${(i+1).toString().padStart(2)}. ${d.debt_date?.split('T')[0]} | ${d.invoice_number.padEnd(22)} | CBF:${(parseFloat(d.credit_brought_forward)||0).toString().padStart(10)} | Total:${(parseFloat(d.total_amount)||0).toString().padStart(12)} | Paid:${(parseFloat(d.amount_paid)||0).toString().padStart(12)} | Rem:${(parseFloat(d.remaining_amount)||0).toString().padStart(12)} | Adj:${(parseFloat(d.adjustments)||0).toString().padStart(8)} | ${d.payment_status}`);
    if (d.adjustment_reason) console.log(`     Reason: ${d.adjustment_reason}`);
  });
  console.log(`\nDEBT TOTALS: Paid=${totalDebtPaid}, Remaining=${totalDebtRemaining}`);

  // Step 4: Reconciliation
  const ledgerBalance = totalDebit - totalCredit;
  console.log('\n=== RECONCILIATION ===');
  console.log(`Ledger Balance:              ${ledgerBalance}`);
  console.log(`Sum of Debt Remaining:       ${totalDebtRemaining}`);
  console.log(`Discrepancy:                 ${ledgerBalance - totalDebtRemaining}`);
  
  // Breakdown by credit type
  const settlements = ledger.filter(e => e.transaction_type === 'settlement');
  const debtPayments = ledger.filter(e => e.transaction_type === 'debt_payment');
  const creditSales = ledger.filter(e => e.transaction_type === 'credit_sale');
  const adjustments = ledger.filter(e => e.transaction_type === 'adjustment');
  
  console.log(`\nLedger credit breakdown:`);
  console.log(`  Settlements:   ${settlements.length} entries, total: ${settlements.reduce((s,e) => s + (parseFloat(e.credit_amount)||0), 0)}`);
  console.log(`  Debt payments: ${debtPayments.length} entries, total: ${debtPayments.reduce((s,e) => s + (parseFloat(e.credit_amount)||0), 0)}`);
  console.log(`  Adjustments:   ${adjustments.length} entries, total: ${adjustments.reduce((s,e) => s + (parseFloat(e.credit_amount)||0), 0)}`);
  console.log(`Debt total amount_paid:      ${totalDebtPaid}`);
  console.log(`Gap (credits - debt paid):   ${totalCredit - totalDebtPaid}`);
}

main().catch(console.error);
