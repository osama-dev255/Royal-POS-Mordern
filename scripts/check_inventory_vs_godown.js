import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function authenticate() {
  // Try to sign in with a test account to get authenticated access
  // The godown_stock RLS requires 'authenticated' role
  console.log('🔐 Attempting authenticated access...');
  
  // Check if we have test credentials
  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;
  
  if (testEmail && testPassword) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    if (error) {
      console.error('❌ Auth failed:', error.message);
      console.log('⚠️ Continuing with anon key - godown_stock may not be visible due to RLS');
      return false;
    }
    console.log('✅ Authenticated as:', data.user?.email);
    return true;
  } else {
    console.log('⚠️ No TEST_EMAIL/TEST_PASSWORD in .env - using anon key');
    console.log('⚠️ godown_stock requires authenticated role. Add to .env:');
    console.log('   TEST_EMAIL=your@email.com');
    console.log('   TEST_PASSWORD=yourpassword');
    return false;
  }
}

async function compareInventory() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  INVENTORY PRODUCTS vs GODOWN STOCK COMPARISON');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Fetch all inventory_products
  const { data: inventoryProducts, error: invError } = await supabase
    .from('inventory_products')
    .select('id, name, quantity, outlet_id, unit_cost, selling_price');
  
  if (invError) {
    console.error('❌ Error fetching inventory_products:', invError.message);
    return;
  }
  console.log(`📦 Total inventory_products records: ${inventoryProducts?.length || 0}`);

  // 2. Fetch all godown_stock with product/godown/zone names
  const { data: godownStock, error: gsError } = await supabase
    .from('godown_stock')
    .select(`
      id,
      product_id,
      godown_id,
      zone_id,
      quantity,
      products (name),
      godowns (name),
      godown_zones (zone_name)
    `);
  
  if (gsError) {
    console.error('❌ Error fetching godown_stock:', gsError.message);
    return;
  }
  console.log(`📦 Total godown_stock records: ${godownStock?.length || 0}`);

  // 3. Fetch all products for name→ID mapping
  const { data: products, error: pError } = await supabase
    .from('products')
    .select('id, name, stock_quantity');
  
  if (pError) {
    console.error('❌ Error fetching products:', pError.message);
    return;
  }
  console.log(`📦 Total products records: ${products?.length || 0}\n`);

  // Build product name → ID map
  const productNameToId = new Map();
  const productIdToName = new Map();
  products.forEach(p => {
    if (p.name && p.id) {
      productNameToId.set(p.name.toLowerCase().trim(), p.id);
      productIdToName.set(p.id, p.name);
    }
  });

  // ──────────────────────────────────────────────
  // SECTION A: godown_stock grouped by product
  // ──────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SECTION A: GODOWN STOCK grouped by product');
  console.log('═══════════════════════════════════════════════════════\n');

  const godownStockByProduct = new Map();
  for (const gs of (godownStock || [])) {
    const productName = gs.products?.name || productIdToName.get(gs.product_id) || gs.product_id;
    const key = productName.toLowerCase().trim();
    if (!godownStockByProduct.has(key)) {
      godownStockByProduct.set(key, { productName, totalQty: 0, records: [] });
    }
    const entry = godownStockByProduct.get(key);
    entry.totalQty += gs.quantity || 0;
    entry.records.push({
      godown: gs.godowns?.name || gs.godown_id,
      zone: gs.godown_zones?.zone_name || (gs.zone_id ? gs.zone_id : 'No Zone'),
      quantity: gs.quantity
    });
  }

  for (const [key, entry] of godownStockByProduct) {
    console.log(`📦 ${entry.productName}`);
    console.log(`   Total godown stock: ${entry.totalQty}`);
    for (const rec of entry.records) {
      console.log(`     → ${rec.godown} / ${rec.zone}: ${rec.quantity}`);
    }
    console.log('');
  }

  // ──────────────────────────────────────────────
  // SECTION B: inventory_products grouped by product name
  // ──────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SECTION B: INVENTORY PRODUCTS grouped by name');
  console.log('═══════════════════════════════════════════════════════\n');

  const inventoryByName = new Map();
  for (const inv of (inventoryProducts || [])) {
    const key = inv.name.toLowerCase().trim();
    if (!inventoryByName.has(key)) {
      inventoryByName.set(key, { productName: inv.name, totalQty: 0, records: [] });
    }
    const entry = inventoryByName.get(key);
    entry.totalQty += inv.quantity || 0;
    entry.records.push({
      outlet_id: inv.outlet_id,
      quantity: inv.quantity
    });
  }

  for (const [key, entry] of inventoryByName) {
    console.log(`📦 ${entry.productName}`);
    console.log(`   Total inventory qty: ${entry.totalQty}`);
    for (const rec of entry.records) {
      console.log(`     → outlet ${rec.outlet_id}: ${rec.quantity}`);
    }
    console.log('');
  }

  // ──────────────────────────────────────────────
  // SECTION C: COMPARISON - Match by product name
  // ──────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SECTION C: COMPARISON (Godown Stock vs Inventory)');
  console.log('═══════════════════════════════════════════════════════\n');

  const allProductNames = new Set([
    ...godownStockByProduct.keys(),
    ...inventoryByName.keys()
  ]);

  let matchCount = 0;
  let mismatchCount = 0;
  let onlyInGodown = 0;
  let onlyInInventory = 0;

  const sortedNames = Array.from(allProductNames).sort();

  console.log('Product Name'.padEnd(40) + 'Godown Qty'.padEnd(15) + 'Inventory Qty'.padEnd(15) + 'Status');
  console.log('─'.repeat(85));

  for (const name of sortedNames) {
    const gsEntry = godownStockByProduct.get(name);
    const invEntry = inventoryByName.get(name);
    const displayName = name.length > 38 ? name.substring(0, 35) + '...' : name;

    if (gsEntry && invEntry) {
      const match = gsEntry.totalQty === invEntry.totalQty;
      const status = match ? '✅ MATCH' : '❌ MISMATCH';
      if (match) matchCount++; else mismatchCount++;
      console.log(
        displayName.padEnd(40) +
        String(gsEntry.totalQty).padEnd(15) +
        String(invEntry.totalQty).padEnd(15) +
        status
      );
    } else if (gsEntry && !invEntry) {
      onlyInGodown++;
      console.log(
        displayName.padEnd(40) +
        String(gsEntry.totalQty).padEnd(15) +
        'N/A'.padEnd(15) +
        '⚠️ ONLY IN GODOWN'
      );
    } else if (!gsEntry && invEntry) {
      onlyInInventory++;
      console.log(
        displayName.padEnd(40) +
        'N/A'.padEnd(15) +
        String(invEntry.totalQty).padEnd(15) +
        '⚠️ ONLY IN INVENTORY'
      );
    }
  }

  // ──────────────────────────────────────────────
  // SECTION D: SUMMARY
  // ──────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Total unique products: ${allProductNames.size}`);
  console.log(`✅ Matching quantities: ${matchCount}`);
  console.log(`❌ Mismatched quantities: ${mismatchCount}`);
  console.log(`⚠️ Only in godown_stock: ${onlyInGodown}`);
  console.log(`⚠️ Only in inventory_products: ${onlyInInventory}`);

  // ──────────────────────────────────────────────
  // SECTION E: products.stock_quantity vs godown_stock totals
  // ──────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SECTION E: products.stock_quantity vs GODOWN TOTALS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Product Name'.padEnd(40) + 'products.stock'.padEnd(15) + 'godown_total'.padEnd(15) + 'Status');
  console.log('─'.repeat(85));

  for (const product of (products || [])) {
    const key = product.name.toLowerCase().trim();
    const gsEntry = godownStockByProduct.get(key);
    const godownTotal = gsEntry ? gsEntry.totalQty : 0;
    const productStock = product.stock_quantity || 0;
    const match = productStock === godownTotal;
    const displayName = product.name.length > 38 ? product.name.substring(0, 35) + '...' : product.name;

    console.log(
      displayName.padEnd(40) +
      String(productStock).padEnd(15) +
      String(godownTotal).padEnd(15) +
      (match ? '✅' : '❌')
    );
  }
}

async function main() {
  await authenticate();
  await compareInventory();
}

main().catch(err => {
  console.error('❌ Script error:', err);
  process.exit(1);
});
