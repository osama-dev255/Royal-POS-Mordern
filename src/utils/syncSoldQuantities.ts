/**
 * Utility to sync sold quantities from localStorage to database
 * Run this once to migrate existing sold quantity data
 */

import { supabase } from "@/lib/supabaseClient";

interface SoldQuantityData {
  outletId: string;
  productName: string;
  quantity: number;
}

/**
 * Extract all sold quantities from localStorage for all outlets
 */
export function extractAllSoldQuantitiesFromLocalStorage(): SoldQuantityData[] {
  const results: SoldQuantityData[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('_sold_quantities')) {
      try {
        // Extract outlet ID from key format: outlet_{outletId}_sold_quantities
        const match = key.match(/outlet_([a-f0-9-]+)_sold_quantities/);
        if (match) {
          const outletId = match[1];
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          
          // Parse each sold quantity entry
          // Key format: "{deliveryId}-{productName}" where deliveryId is a UUID (36 chars)
          for (const [productKey, qty] of Object.entries(data)) {
            if (typeof qty === 'number' && qty > 0) {
              // Extract product name (everything after the UUID and dash)
              // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars)
              const productName = productKey.substring(37); // 36 + 1 for dash
              if (productName) {
                results.push({
                  outletId,
                  productName,
                  quantity: qty
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error parsing localStorage key ${key}:`, error);
      }
    }
  }
  
  return results;
}

/**
 * Sync sold quantities from localStorage to database for a specific outlet
 */
export async function syncSoldQuantitiesToDatabase(outletId: string): Promise<{
  success: boolean;
  updated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let updated = 0;
  
  try {
    // Get sold quantities from localStorage
    const key = `outlet_${outletId}_sold_quantities`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    
    // Aggregate quantities by product name
    const quantitiesByProduct: Record<string, number> = {};
    
    for (const [productKey, qty] of Object.entries(data)) {
      if (typeof qty === 'number' && qty > 0) {
        // Extract product name (everything after the UUID and dash)
        const productName = productKey.substring(37);
        if (productName) {
          quantitiesByProduct[productName] = (quantitiesByProduct[productName] || 0) + qty;
        }
      }
    }
    
    // Update each product in database
    for (const [productName, quantity] of Object.entries(quantitiesByProduct)) {
      try {
        // Get current sold_quantity
        const { data: current } = await supabase
          .from('inventory_products')
          .select('sold_quantity')
          .eq('outlet_id', outletId)
          .eq('name', productName)
          .single();
        
        if (current) {
          // Update with new sold quantity
          const { error } = await supabase
            .from('inventory_products')
            .update({
              sold_quantity: (current.sold_quantity || 0) + quantity,
              updated_at: new Date().toISOString()
            })
            .eq('outlet_id', outletId)
            .eq('name', productName);
          
          if (error) {
            errors.push(`Failed to update ${productName}: ${error.message}`);
          } else {
            updated++;
          }
        } else {
          errors.push(`Product not found: ${productName}`);
        }
      } catch (error) {
        errors.push(`Error updating ${productName}: ${error}`);
      }
    }
    
    return { success: errors.length === 0, updated, errors };
  } catch (error) {
    return { success: false, updated, errors: [`Sync failed: ${error}`] };
  }
}

/**
 * Sync sold quantities for all outlets found in localStorage
 */
export async function syncAllOutletsSoldQuantities(): Promise<{
  success: boolean;
  totalUpdated: number;
  results: Record<string, { updated: number; errors: string[] }>;
}> {
  const results: Record<string, { updated: number; errors: string[] }> = {};
  let totalUpdated = 0;
  
  // Find all outlet IDs with sold quantities
  const outletIds = new Set<string>();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('_sold_quantities')) {
      const match = key.match(/outlet_([a-f0-9-]+)_sold_quantities/);
      if (match) {
        outletIds.add(match[1]);
      }
    }
  }
  
  // Sync each outlet
  for (const outletId of outletIds) {
    const result = await syncSoldQuantitiesToDatabase(outletId);
    results[outletId] = { updated: result.updated, errors: result.errors };
    totalUpdated += result.updated;
  }
  
  return {
    success: Object.values(results).every(r => r.errors.length === 0),
    totalUpdated,
    results
  };
}

/**
 * Clear all sold quantities from localStorage (call after successful sync)
 */
export function clearLocalStorageSoldQuantities(): void {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('_sold_quantities')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`Cleared ${keysToRemove.length} sold quantity entries from localStorage`);
}

// Auto-log when module loads
console.log('Sold quantities sync utility loaded. Call syncSoldQuantitiesToDatabase(outletId) or syncAllOutletsSoldQuantities() to sync.');
