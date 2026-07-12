const SUPABASE_URL = 'https://tymfrdglmbnmzureeien.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bWZyZGdsbWJubXp1cmVlaWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE2MjEsImV4cCI6MjA3NzI1NzYyMX0.1XqmEkyZqc6-eRKUGJEwXIFLJPril2LqGnh1-1PwuWY';

const OUTLET_ID = '18560d00-1da8-41f1-8c20-8a0bf6598a0b';
const CUSTOMER_ID = '5c1ae407-9edd-41f1-8868-865d48bbc08a';

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
  console.log('=== LEDGER ENTRIES (chronological) ===');
  const ledger = await query('customer_ledger',
    `outlet_id=eq.${OUTLET_ID}&customer_id=eq.${CUSTOMER_ID}&order=transaction_date.asc,created_at.asc&select=id,transaction_type,reference_number,debit_amount,credit_amount,running_balance,transaction_date,description`);
  
  let totalDebit = 0, totalCredit = 0;
  ledger.forEach((e, i) => {
    totalDebit += parseFloat(e.debit_amount) || 0;
    totalCredit += parseFloat(e.credit_amount) || 0;
    const balance = totalDebit - totalCredit;
    console.log(`${(i+1).toString().padStart(2)}. ${e.transaction_date?.split('T')[0]} | ${e.transaction_type.padEnd(14)} | ref:${(e.reference_number||'').padEnd(20)} | DR:${(parseFloat(e.debit_amount)||0).toString().padStart(12)} | CR:${(parseFloat(e.credit_amount)||0).toString().padStart(12)} | Bal:${balance.toString().padStart(12)} | ${e.description}`);
  });
  console.log(`\nTOTALS: Debits=${totalDebit}, Credits=${totalCredit}, Net Balance=${totalDebit - totalCredit}`);

  console.log('\n=== DEBT RECORDS (chronological) ===');
  const debts = await query('outlet_debts',
    `outlet_id=eq.${OUTLET_ID}&customer_id=eq.${CUSTOMER_ID}&order=debt_date.asc&select=id,invoice_number,debt_date,total_amount,amount_paid,remaining_amount,payment_status,credit_brought_forward,adjustments,adjustment_reason`);
  
  let totalDebtRemaining = 0;
  let totalDebtPaid = 0;
  debts.forEach((d, i) => {
    totalDebtRemaining += parseFloat(d.remaining_amount) || 0;
    totalDebtPaid += parseFloat(d.amount_paid) || 0;
    console.log(`${(i+1).toString().padStart(2)}. ${d.debt_date?.split('T')[0]} | ${d.invoice_number.padEnd(22)} | CBF:${(parseFloat(d.credit_brought_forward)||0).toString().padStart(10)} | Total:${(parseFloat(d.total_amount)||0).toString().padStart(12)} | Paid:${(parseFloat(d.amount_paid)||0).toString().padStart(12)} | Rem:${(parseFloat(d.remaining_amount)||0).toString().padStart(12)} | Adj:${(parseFloat(d.adjustments)||0).toString().padStart(8)} | ${d.payment_status}`);
    if (d.adjustment_reason) console.log(`     Reason: ${d.adjustment_reason}`);
  });
  console.log(`\nDEBT TOTALS: Paid=${totalDebtPaid}, Remaining=${totalDebtRemaining}`);
  
  console.log('\n=== RECONCILIATION ===');
  const ledgerBalance = totalDebit - totalCredit;
  console.log(`Ledger Balance:              ${ledgerBalance}`);
  console.log(`Sum of Debt Remaining:       ${totalDebtRemaining}`);
  console.log(`Discrepancy:                 ${ledgerBalance - totalDebtRemaining}`);
  
  // Now trace: which ledger entries are settlements that DON'T correspond to debt payments?
  console.log('\n=== SETTLEMENT ENTRIES IN LEDGER ===');
  const settlements = ledger.filter(e => e.transaction_type === 'settlement');
  let totalSettlementCredits = 0;
  settlements.forEach((s, i) => {
    const cr = parseFloat(s.credit_amount) || 0;
    totalSettlementCredits += cr;
    console.log(`${(i+1).toString().padStart(2)}. ${s.transaction_date?.split('T')[0]} | ref:${(s.reference_number||'').padEnd(20)} | Credit:${cr.toString().padStart(12)} | ${s.description}`);
  });
  console.log(`Total settlement credits: ${totalSettlementCredits}`);
  
  // debt_payment entries
  console.log('\n=== DEBT_PAYMENT ENTRIES IN LEDGER ===');
  const debtPayments = ledger.filter(e => e.transaction_type === 'debt_payment');
  let totalDebtPaymentCredits = 0;
  debtPayments.forEach((s, i) => {
    const cr = parseFloat(s.credit_amount) || 0;
    totalDebtPaymentCredits += cr;
    console.log(`${(i+1).toString().padStart(2)}. ${s.transaction_date?.split('T')[0]} | ref:${(s.reference_number||'').padEnd(20)} | Credit:${cr.toString().padStart(12)} | ${s.description}`);
  });
  console.log(`Total debt_payment credits: ${totalDebtPaymentCredits}`);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total credits in ledger: ${totalCredit}`);
  console.log(`  - From settlements:    ${totalSettlementCredits}`);
  console.log(`  - From debt_payments:  ${totalDebtPaymentCredits}`);
  console.log(`  - From other:          ${totalCredit - totalSettlementCredits - totalDebtPaymentCredits}`);
  console.log(`Total debt amount_paid:  ${totalDebtPaid}`);
  console.log(`Gap (credits - debt paid): ${totalCredit - totalDebtPaid}`);
}

main().catch(console.error);
