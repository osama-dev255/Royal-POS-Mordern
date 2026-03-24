/**
 * Utility to sync localStorage selling prices to the database
 * Run this when you need to update the database with edited selling prices
 */

import { supabase } from "@/lib/supabaseClient";

const getSavedPricesKey = (outletId: string) => `outlet_${outletId}_selling_prices`;

const loadSavedSellingPrices = (outletId: string): Record<string, number> => {
  try {
    const key = getSavedPricesKey(outletId);
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error("Error loading saved selling prices:", error);
    return {};
  }
};

/**
 * Sync selling prices from localStorage to database for a specific outlet
 * @param outletId - The outlet ID to sync prices for
 * @returns Object with sync results
 */
export const syncSellingPricesToDatabase = async (outletId: string): Promise<{
  success: boolean;
  updated: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let updated = 0;

  try {
    // Load saved prices from localStorage
    const savedPrices = loadSavedSellingPrices(outletId);
    const productIds = Object.keys(savedPrices);

    if (productIds.length === 0) {
      console.log(`No saved selling prices found for outlet ${outletId}`);
      return { success: true, updated: 0, errors: [] };
    }

    console.log(`Found ${productIds.length} saved prices for outlet ${outletId}`);

    // Fetch inventory products for this outlet to match by ID
    const { data: products, error: fetchError } = await supabase
      .from('inventory_products')
      .select('id, name')
      .eq('outlet_id', outletId);

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      return { success: true, updated: 0, errors: ['No products found in database for this outlet'] };
    }

    // Create a map of product names to IDs (since localStorage uses product names as keys)
    const productNameToId = new Map(products.map(p => [p.name, p.id]));

    // Update each product's selling price
    for (const [productKey, price] of Object.entries(savedPrices)) {
      try {
        // productKey could be product ID or product name
        let productName = productKey;
        
        // Try to find the product by name
        const { error: updateError } = await supabase
          .from('inventory_products')
          .update({ 
            selling_price: price,
            updated_at: new Date().toISOString()
          })
          .eq('outlet_id', outletId)
          .eq('name', productName);

        if (updateError) {
          errors.push(`Failed to update ${productName}: ${updateError.message}`);
        } else {
          updated++;
          console.log(`Updated selling price for ${productName}: ${price}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Error updating ${productKey}: ${errorMsg}`);
      }
    }

    console.log(`Sync completed: ${updated} products updated, ${errors.length} errors`);
    return { success: errors.length === 0, updated, errors };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Sync failed:', errorMsg);
    return { success: false, updated, errors: [errorMsg] };
  }
};

/**
 * Sync selling prices for all outlets found in localStorage
 * @returns Object with overall sync results
 */
export const syncAllOutletsSellingPrices = async (): Promise<{
  success: boolean;
  results: Record<string, { updated: number; errors: string[] }>;
}> => {
  const results: Record<string, { updated: number; errors: string[] }> = {};
  
  try {
    // Find all outlet selling price keys in localStorage
    const outletIds: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.endsWith('_selling_prices')) {
        const outletId = key.replace('outlet_', '').replace('_selling_prices', '');
        outletIds.push(outletId);
      }
    }

    if (outletIds.length === 0) {
      console.log('No saved selling prices found in localStorage');
      return { success: true, results: {} };
    }

    console.log(`Found selling prices for ${outletIds.length} outlets`);

    // Sync each outlet
    for (const outletId of outletIds) {
      const result = await syncSellingPricesToDatabase(outletId);
      results[outletId] = { updated: result.updated, errors: result.errors };
    }

    const totalUpdated = Object.values(results).reduce((sum, r) => sum + r.updated, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);
    
    console.log(`\n=== SYNC SUMMARY ===`);
    console.log(`Total outlets: ${outletIds.length}`);
    console.log(`Total products updated: ${totalUpdated}`);
    console.log(`Total errors: ${totalErrors}`);

    return { success: totalErrors === 0, results };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Sync all outlets failed:', errorMsg);
    return { success: false, results };
  }
};

// Auto-run sync when this module is imported in development
if (import.meta.env.DEV) {
  console.log('Selling price sync utility loaded. Call syncSellingPricesToDatabase(outletId) or syncAllOutletsSellingPrices() to sync.');
}
