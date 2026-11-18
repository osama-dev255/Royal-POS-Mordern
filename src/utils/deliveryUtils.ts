import { supabase } from '@/lib/supabaseClient';

const SAVED_DELIVERIES_KEY = 'savedDeliveries';

export interface DeliveryData {
  id: string;
  deliveryNoteNumber: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "in-transit" | "pending" | "delivered" | "cancelled";
  itemsList?: any[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  amountReceived?: number;
  change?: number;
  vehicle?: string;
  driver?: string;
  deliveryNotes?: string;
  outletId?: string;
  deliveryType?: 'in' | 'out'; // 'in' for incoming, 'out' for outgoing
  sourceType?: 'investment' | 'outlet'; // 'investment' from main warehouse, 'outlet' from another outlet
  sourceOutletId?: string; // ID of the source outlet (if sourceType is 'outlet')
  sourceOutletName?: string; // Name of the source outlet (for display purposes)
  creditBroughtForward?: number; // Credit brought forward from previous deliveries
  // Godown integration fields
  sourceGodownId?: string; // ID of source godown (for outgoing deliveries from warehouse)
  sourceZoneId?: string; // ID of source zone within godown
  destinationGodownId?: string; // ID of destination godown (if delivering to another godown)
  destinationZoneId?: string; // ID of destination zone
  sourceGodownName?: string; // Name of source godown (for display)
  sourceZoneName?: string; // Name of source zone (for display)
  // Approval fields
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedByName?: string;
  approvalNotes?: string;
  approvedAt?: string;
}

export const saveDelivery = async (delivery: DeliveryData): Promise<void> => {
  try {
    console.log('💾 Saving delivery to database:', delivery.deliveryNoteNumber);
    
    // NOTE: The saved_delivery_notes inventory trigger is dropped by
    // migrations/20261118_drop_delivery_inventory_triggers.sql, so this JavaScript
    // block is the single writer for inventory_products.
    let dbSaveSuccessful = false;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('saved_delivery_notes')
        .insert({
          user_id: user.id,
          delivery_note_number: delivery.deliveryNoteNumber,
          date: delivery.date,
          customer: delivery.customer,
          items: delivery.items,
          total: delivery.total,
          payment_method: delivery.paymentMethod,
          status: delivery.status,
          items_list: delivery.itemsList,
          subtotal: delivery.subtotal,
          tax: delivery.tax,
          discount: delivery.discount,
          amount_received: delivery.amountReceived,
          change: delivery.change,
          vehicle: delivery.vehicle,
          driver: delivery.driver,
          delivery_notes: delivery.deliveryNotes,
          outlet_id: delivery.outletId,
          source_type: delivery.sourceType || 'investment',
          source_outlet_id: delivery.sourceOutletId || null,
          credit_brought_forward: delivery.creditBroughtForward || 0,
          // Godown integration fields
          source_godown_id: delivery.sourceGodownId || null,
          source_zone_id: delivery.sourceZoneId || null,
          destination_godown_id: delivery.destinationGodownId || null,
          destination_zone_id: delivery.destinationZoneId || null,
          // Additional fields from DeliveryDetails view (matching exact View Display)
          business_name: (delivery as any).businessName || null,
          business_address: (delivery as any).businessAddress || null,
          prepared_by_name: (delivery as any).preparedByName || null,
          prepared_by_date: (delivery as any).preparedByDate || null,
          driver_name: (delivery as any).driverName || null,
          driver_date: (delivery as any).driverDate || null,
          received_by_name: (delivery as any).receivedByName || null,
          received_by_date: (delivery as any).receivedByDate || null
        });
        
      if (error) {
        console.error('Error saving delivery to database:', error);
        // NEVER report success for a note that is not in the book: callers record
        // stock movements and show a "saved" alert as soon as this resolves.
        throw new Error(
          `Delivery note ${delivery.deliveryNoteNumber} was NOT saved: ${error.message}${error.code ? ` (${error.code})` : ''}`
        );
      }
      dbSaveSuccessful = true;
    } else {
      // Without a session the insert never runs, so the note would only end up in
      // this browser's localStorage while the stock movements are still written.
      throw new Error(
        `Delivery note ${delivery.deliveryNoteNumber} was NOT saved: no signed-in session. Sign in again and re-save.`
      );
    }
    
    // Update localStorage ONLY with current user's deliveries to avoid duplicates
    // Get fresh list from database if DB save was successful, otherwise use existing localStorage
    let deliveriesToStore: DeliveryData[];
    
    if (dbSaveSuccessful && user) {
      // Fetch fresh data from database to ensure consistency
      const { data: dbDeliveries } = await supabase
        .from('saved_delivery_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (dbDeliveries) {
        deliveriesToStore = dbDeliveries.map(dbDelivery => ({
          id: dbDelivery.id,
          deliveryNoteNumber: dbDelivery.delivery_note_number,
          date: dbDelivery.date,
          customer: dbDelivery.customer,
          items: dbDelivery.items,
          total: dbDelivery.total,
          paymentMethod: dbDelivery.payment_method,
          status: dbDelivery.status,
          itemsList: dbDelivery.items_list,
          subtotal: dbDelivery.subtotal,
          tax: dbDelivery.tax,
          discount: dbDelivery.discount,
          amountReceived: dbDelivery.amount_received,
          change: dbDelivery.change,
          vehicle: dbDelivery.vehicle,
          driver: dbDelivery.driver,
          deliveryNotes: dbDelivery.delivery_notes,
          outletId: dbDelivery.outlet_id
        }));
      } else {
        deliveriesToStore = [];
      }
    } else {
      // Fallback: add to existing localStorage (offline mode)
      const existingStored = localStorage.getItem(SAVED_DELIVERIES_KEY);
      const existingDeliveries = existingStored ? JSON.parse(existingStored) : [];
      
      // Check for duplicates before adding
      const exists = existingDeliveries.some(
        d => d.deliveryNoteNumber === delivery.deliveryNoteNumber
      );
      
      if (!exists) {
        deliveriesToStore = [...existingDeliveries, delivery];
      } else {
        deliveriesToStore = existingDeliveries;
      }
    }
    
    // Store consolidated list in localStorage
    localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(deliveriesToStore));
    
    // CRITICAL: Update outlet inventory in JavaScript ONLY ONCE
    // (the database trigger that used to do this has been dropped)
    if (dbSaveSuccessful && delivery.outletId && delivery.itemsList && delivery.itemsList.length > 0) {
      try {
        console.log('📦 Updating outlet inventory (single writer)...');
        console.log('📍 Outlet ID:', delivery.outletId);
        console.log('📋 Items:', delivery.itemsList.length);

        // Aggregate the delivered quantity per product first: the same product can sit
        // on several rows of one note (one row per godown/zone), and applying each row
        // separately used to insert a second inventory row for that product.
        const itemsByProduct = new Map<string, {
          name: string;
          quantity: number;
          unitCost: number;
          sellingPrice: number;
          sku?: string;
          category?: string;
        }>();

        for (const item of delivery.itemsList) {
          const productName = (item.name || item.description || '').toString().trim();
          const deliveredQty = Number(item.quantity ?? item.delivered ?? 0);

          if (!productName || !Number.isFinite(deliveredQty) || deliveredQty <= 0) {
            console.log('⏭️ Skip:', productName, deliveredQty);
            continue;
          }

          const key = productName.toLowerCase();
          const aggregated = itemsByProduct.get(key);

          if (aggregated) {
            aggregated.quantity += deliveredQty;
            aggregated.unitCost = item.rate ?? item.price ?? aggregated.unitCost;
            aggregated.sellingPrice = item.sellingPrice ?? item.rate ?? item.price ?? aggregated.sellingPrice;
          } else {
            itemsByProduct.set(key, {
              name: productName,
              quantity: deliveredQty,
              unitCost: item.rate ?? item.price ?? 0,
              sellingPrice: item.sellingPrice ?? item.rate ?? item.price ?? 0,
              sku: item.sku,
              category: item.category
            });
          }
        }

        // Get fresh inventory data
        const { data: outletInventory, error: inventoryError } = await supabase
          .from('inventory_products')
          .select('id, name, quantity, unit_cost, selling_price')
          .eq('outlet_id', delivery.outletId);

        if (inventoryError) {
          console.error('❌ Error loading inventory:', inventoryError);
        } else {
          // Match on the normalised name so a case/whitespace difference never creates
          // a second row for a product the outlet already has.
          const inventoryByName = new Map<string, { id: string; name: string; quantity: number; unit_cost: number; selling_price: number }>();
          (outletInventory || []).forEach((p: any) => {
            const key = (p.name || '').trim().toLowerCase();
            if (!key) return;
            const current = inventoryByName.get(key);
            // Historical duplicates may exist: keep the largest row as the target
            if (!current || (p.quantity || 0) > (current.quantity || 0)) {
              inventoryByName.set(key, p);
            }
          });

          const nowIso = new Date().toISOString();

          for (const product of itemsByProduct.values()) {
            const key = product.name.toLowerCase();
            const existingProduct = inventoryByName.get(key);

            if (existingProduct) {
              const currentQty = existingProduct.quantity || 0;
              const newQty = currentQty + product.quantity;
              const unitCost = product.unitCost || existingProduct.unit_cost || 0;
              const sellingPrice = product.sellingPrice || existingProduct.selling_price || 0;

              console.log(`📝 ${product.name}: ${currentQty} + ${product.quantity} = ${newQty}`);

              const { error: updateError } = await supabase
                .from('inventory_products')
                .update({
                  quantity: newQty,
                  unit_cost: unitCost,
                  selling_price: sellingPrice,
                  delivery_note_number: delivery.deliveryNoteNumber,
                  last_updated: nowIso,
                  updated_at: nowIso
                })
                .eq('id', existingProduct.id);

              if (updateError) {
                console.error(`❌ Error updating ${product.name}:`, updateError);
              } else {
                existingProduct.quantity = newQty;
                console.log(`✅ Updated ${product.name} inventory`);
              }
            } else {
              // Create the product once, then remember it for the rest of this save
              const { data: inserted, error: insertError } = await supabase
                .from('inventory_products')
                .insert({
                  outlet_id: delivery.outletId,
                  name: product.name,
                  quantity: product.quantity,
                  unit_cost: product.unitCost,
                  selling_price: product.sellingPrice,
                  sku: product.sku || null,
                  category: product.category || 'General',
                  delivery_note_number: delivery.deliveryNoteNumber,
                  created_at: nowIso,
                  updated_at: nowIso,
                  last_updated: nowIso
                })
                .select('id, name, quantity, unit_cost, selling_price')
                .single();

              if (insertError) {
                console.error(`❌ Error creating inventory for ${product.name}:`, insertError);
              } else if (inserted) {
                inventoryByName.set(key, inserted as any);
                console.log(`✅ Created inventory for ${product.name}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error updating outlet inventory:', error);
      }
    }

    // Update godown stock if source godown is specified (warehouse deliveries)
    console.log('🔍 ════════════════════════════════════════════════════════');
    console.log('🔍 GODOWN STOCK UPDATE DIAGNOSTICS');
    console.log('🔍 ════════════════════════════════════════════════════════');
    console.log('🔍 dbSaveSuccessful:', dbSaveSuccessful);
    console.log('🔍 delivery.sourceGodownId:', delivery.sourceGodownId);
    console.log('🔍 delivery.sourceType:', delivery.sourceType);
    console.log('🔍 delivery.sourceZoneId:', delivery.sourceZoneId);
    console.log('🔍 Number of items:', delivery.itemsList?.length);
    console.log('🔍 Items godown_ids:', delivery.itemsList?.map(i => ({ name: i.name, godown_id: i.godown_id, zone_id: i.zone_id, product_id: i.product_id, quantity: i.quantity })));
    
    const conditionA = dbSaveSuccessful;
    const conditionB = !!(delivery.sourceGodownId || delivery.itemsList?.some(i => i.godown_id));
    const conditionC = delivery.sourceType === 'investment';
    console.log('🔍 Condition A (dbSaveSuccessful):', conditionA);
    console.log('🔍 Condition B (has godown):', conditionB, '→ sourceGodownId:', delivery.sourceGodownId, '→ items with godown_id:', delivery.itemsList?.filter(i => i.godown_id).map(i => i.name));
    console.log('🔍 Condition C (sourceType === investment):', conditionC, '→ actual sourceType:', delivery.sourceType);
    
    if (conditionA && conditionB && conditionC) {
      console.log('✅ ALL CONDITIONS MET → Calling updateDeliveryGodownStock...');
      await updateDeliveryGodownStock(delivery);
    } else {
      console.log('❌ CONDITIONS NOT MET → Skipping godown stock update!');
      if (!conditionA) console.log('   ❌ dbSaveSuccessful is false - DB save may have failed');
      if (!conditionB) console.log('   ❌ No godown specified - neither sourceGodownId nor item godown_ids are set');
      if (!conditionC) console.log('   ❌ sourceType is not "investment" - it is:', delivery.sourceType);
    }
    
    console.log('✅ Delivery saved successfully:', delivery.deliveryNoteNumber);
    
  } catch (error) {
    console.error('Error saving delivery:', error);
    throw new Error('Failed to save delivery');
  }
};

// Update godown stock when delivery is saved (for warehouse deliveries)
const updateDeliveryGodownStock = async (delivery: DeliveryData): Promise<void> => {
  console.log('📦 ══════ updateDeliveryGodownStock START ══════');
  // Only update if there are items
  if (!delivery.itemsList || delivery.itemsList.length === 0) {
    console.log('⚠️ updateDeliveryGodownStock: Skipping - no items:', delivery.itemsList?.length);
    return;
  }

  try {
    console.log('📦 Updating godown stock for delivery:', delivery.deliveryNoteNumber);

    // Import services dynamically to avoid circular dependencies
    const { updateGodownStock, getGodownStock } = await import('@/services/godownService');
    const { getProducts } = await import('@/services/databaseService');

    // Build a product name -> ID map so we can resolve IDs from item descriptions
    const products = await getProducts();
    console.log('📦 Loaded', products.length, 'products from database for name→ID mapping');
    const productNameToId = new Map<string, string>();
    products.forEach(p => {
      if (p.name && p.id) {
        productNameToId.set(p.name.toLowerCase().trim(), p.id);
      }
    });

    console.log(`📋 Built product map with ${productNameToId.size} entries`);
    console.log(`📋 Delivery items to process:`, delivery.itemsList.map(i => ({
      name: i.name, product_id: i.product_id, quantity: i.quantity,
      godown_id: i.godown_id, zone_id: i.zone_id
    })));

    let processedCount = 0;
    let skippedCount = 0;

    for (const item of delivery.itemsList) {
      // Resolve product ID: first try explicit product_id, then look up by name
      let productId = item.product_id || null;
      if (!productId && item.name) {
        const lookupKey = item.name.toLowerCase().trim();
        productId = productNameToId.get(lookupKey) || null;
        console.log(`🔍 Name lookup for "${item.name}" (key: "${lookupKey}") → ${productId || 'NOT FOUND'}`);
      }

      const quantity = item.quantity || item.delivered || 0;

      // Use per-item godown_id, fall back to delivery-level sourceGodownId
      const itemGodownId = item.godown_id || delivery.sourceGodownId || null;
      // Use per-item zone_id, fall back to delivery-level sourceZoneId
      const itemZoneId = item.zone_id || delivery.sourceZoneId || null;

      if (!productId || quantity <= 0) {
        console.log(`⚠️ Skipping item: name="${item.name}", productId=${productId}, quantity=${quantity}`);
        if (!productId) console.log(`   ❌ PRODUCT ID IS NULL! Name lookup failed for "${item.name}". grnProductItems may not contain this product.`);
        if (quantity <= 0) console.log(`   ❌ QUANTITY IS ZERO OR NEGATIVE: ${quantity}`);
        skippedCount++;
        continue;
      }

      if (!itemGodownId) {
        console.log(`⚠️ Skipping item "${item.name}": no godown_id specified (per-item or delivery-level)`);
        console.log(`   item.godown_id: ${item.godown_id}, delivery.sourceGodownId: ${delivery.sourceGodownId}`);
        skippedCount++;
        continue;
      }

      console.log(`📍 Processing item "${item.name}": godown=${itemGodownId}, zone=${itemZoneId || 'null'}, qty=${quantity}`);

      // Check which godown_stock records exist for this product in the source godown
      const existingStock = await getGodownStock(productId, itemGodownId);
      console.log(`📋 Existing godown stock for product ${item.name}:`, existingStock.map(s => ({ zone_id: s.zone_id, quantity: s.quantity })));

      if (existingStock.length === 0) {
        console.log(`⚠️ No godown stock records found for product "${item.name}" (ID: ${productId}) in godown ${itemGodownId}. Skipping godown decrement.`);
        console.log(`   This means the godown_stock table has NO record for this product+godown combination.`);
        console.log(`   Possible causes: (1) Stock was never added to this godown, (2) Previous delivery already depleted it to 0 and record was deleted.`);
        skippedCount++;
        continue;
      }

      // Determine which record to decrement from
      let targetZoneId: string | null = null;

      if (itemZoneId) {
        // Zone is specified - check if a zone-specific record exists
        const zoneRecord = existingStock.find(s => s.zone_id === itemZoneId);
        if (zoneRecord) {
          targetZoneId = itemZoneId; // Decrement from zone-specific record
        } else {
          // Fall back to godown-level record (zone_id = null)
          const godownLevelRecord = existingStock.find(s => s.zone_id === null);
          if (godownLevelRecord) {
            targetZoneId = null; // Decrement from godown-level record
            console.log(`ℹ️ Zone-specific record not found for zone ${itemZoneId}. Falling back to godown-level record.`);
          } else {
            // No matching record at all - use the first available record
            targetZoneId = existingStock[0].zone_id || null;
            console.log(`ℹ️ No matching record found. Using first available record (zone: ${targetZoneId || 'null'}).`);
          }
        }
      } else {
        // No zone specified - use godown-level record (zone_id = null)
        const godownLevelRecord = existingStock.find(s => s.zone_id === null);
        if (godownLevelRecord) {
          targetZoneId = null;
        } else {
          // No godown-level record, use first available
          targetZoneId = existingStock[0].zone_id || null;
          console.log(`ℹ️ No godown-level record found. Using first available record (zone: ${targetZoneId || 'null'}).`);
        }
      }

      // Decrease stock from the determined record
      await updateGodownStock(
        productId,
        itemGodownId,
        targetZoneId,
        -quantity // Negative to decrease
      );

      console.log(`✅ Decreased ${quantity} units of product ${item.name || productId} from godown ${itemGodownId} (zone: ${targetZoneId || 'null'})`);
      processedCount++;
    }

    console.log('📦 ══════ updateDeliveryGodownStock SUMMARY ══════');
    console.log(`📦 Total items: ${delivery.itemsList.length}`);
    console.log(`📦 Successfully processed: ${processedCount}`);
    console.log(`📦 Skipped: ${skippedCount}`);
    console.log('📦 ══════ updateDeliveryGodownStock END ══════');
  } catch (error) {
    console.error('❌ Error updating godown stock for delivery:', error);
    console.error('❌ Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    // Don't throw error - delivery was already saved successfully
  }
};

// ============================================
// SAVED DELIVERY NOTES - SHARED, PAGED READS
// ============================================
// Supabase/PostgREST returns at most 1000 rows per request, so a single
// unpaged select silently truncates the book: the newest page arrives and the
// oldest notes vanish, which looks exactly like "only shows deliveries from
// <some recent date>". Every read below walks the pages instead.
const DELIVERY_PAGE_SIZE = 1000;

interface DeliveryScope {
  /** outlet manager: their own notes OR their assigned outlet */
  orFilter?: string;
  /** single-outlet lookups (one outlet's deliveries in/out) */
  outletIds?: string[];
}

const applyDeliveryScope = (query: any, scope: DeliveryScope) =>
  scope.orFilter ? query.or(scope.orFilter) : query;

/**
 * Fetches every matching note page by page. created_at is not unique, so id is
 * appended as a tiebreaker - without it a page boundary can repeat or skip rows
 * whenever two notes share a timestamp.
 */
const fetchAllDeliveryNotes = async (
  scope: DeliveryScope
): Promise<{ rows: any[]; error: any }> => {
  const rows: any[] = [];

  for (let from = 0; ; from += DELIVERY_PAGE_SIZE) {
    let pageQuery: any = supabase
      .from('saved_delivery_notes')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + DELIVERY_PAGE_SIZE - 1);

    pageQuery = applyDeliveryScope(pageQuery, scope);
    if (scope.outletIds && scope.outletIds.length > 0) {
      pageQuery = pageQuery.in('outlet_id', scope.outletIds);
    }

    const { data, error } = await pageQuery;
    if (error) return { rows, error };

    rows.push(...(data || []));
    if (!data || data.length < DELIVERY_PAGE_SIZE) break;
  }

  return { rows, error: null };
};

/**
 * Saved delivery notes are shared documents, so the book is read business-wide
 * and RLS decides what a login may see. The one narrow scope is an outlet
 * manager, who is pinned to their assigned outlet plus the notes they authored.
 *
 * A missing or unreadable staff row is deliberately NOT treated as "scope this
 * login": that default is what previously hid every note saved by another
 * login behind a silently empty-looking list.
 */
const resolveDeliveryScope = async (): Promise<{ userId: string | null; scope: DeliveryScope }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, scope: {} };

  const { data: profile, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error resolving delivery scope role:', error);
  }

  if (profile?.role !== 'outlet_manager') {
    return { userId: user.id, scope: {} };
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from('outlet_users')
    .select('outlet_id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (assignmentError) {
    console.error('Error resolving delivery scope outlet:', assignmentError);
  }

  const outletIds = Array.from(
    new Set((assignments || []).map((row: any) => row.outlet_id).filter(Boolean))
  ) as string[];

  const clauses = [`user_id.eq.${user.id}`];
  if (outletIds.length > 0) {
    clauses.push(`outlet_id.in.(${outletIds.join(',')})`);
  }

  return { userId: user.id, scope: { orFilter: clauses.join(',') } };
};

export const getSavedDeliveries = async (): Promise<DeliveryData[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { scope } = await resolveDeliveryScope();
      
      const { rows: data, error } = await fetchAllDeliveryNotes(scope);
        
      if (error) {
        console.error('Error retrieving saved deliveries from database:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(SAVED_DELIVERIES_KEY);
        return saved ? JSON.parse(saved) : [];
      }
      
      // Transform database records to DeliveryData format
      const deliveries = data.map(dbDelivery => ({
        id: dbDelivery.id,
        deliveryNoteNumber: dbDelivery.delivery_note_number,
        date: dbDelivery.date,
        customer: dbDelivery.customer,
        items: dbDelivery.items,
        total: dbDelivery.total,
        paymentMethod: dbDelivery.payment_method,
        status: dbDelivery.status,
        itemsList: dbDelivery.items_list,
        subtotal: dbDelivery.subtotal,
        tax: dbDelivery.tax,
        discount: dbDelivery.discount,
        amountReceived: dbDelivery.amount_received,
        change: dbDelivery.change,
        vehicle: dbDelivery.vehicle,
        driver: dbDelivery.driver,
        deliveryNotes: dbDelivery.delivery_notes,
        outletId: dbDelivery.outlet_id,
        // If source_outlet_id exists, it's from another outlet; otherwise it's from investment
        sourceType: dbDelivery.source_type || (dbDelivery.source_outlet_id ? 'outlet' : 'investment'),
        sourceOutletId: dbDelivery.source_outlet_id,
        creditBroughtForward: dbDelivery.credit_brought_forward || 0,
        // Additional fields from DeliveryDetails view (matching exact View Display)
        businessName: dbDelivery.business_name,
        businessAddress: dbDelivery.business_address,
        preparedByName: dbDelivery.prepared_by_name,
        preparedByDate: dbDelivery.prepared_by_date,
        driverName: dbDelivery.driver_name,
        driverDate: dbDelivery.driver_date,
        receivedByName: dbDelivery.received_by_name,
        receivedByDate: dbDelivery.received_by_date,
        // Approval fields
        approvalStatus: dbDelivery.approval_status || 'pending',
        approvedByName: dbDelivery.approved_by_name,
        approvalNotes: dbDelivery.approval_notes,
        approvedAt: dbDelivery.approved_at
      }));
      
      return deliveries;
    } else {
      // If not authenticated, use localStorage
      const saved = localStorage.getItem(SAVED_DELIVERIES_KEY);
      return saved ? JSON.parse(saved) : [];
    }
  } catch (error) {
    console.error('Error retrieving saved deliveries:', error);
    return [];
  }
};

export const deleteDelivery = async (deliveryId: string): Promise<void> => {
  try {
    // Delete from database first (source of truth)
    const { data: { user } } = await supabase.auth.getUser();
    let dbDeleteSuccessful = false;
    
    if (user) {
      // Scope the delete exactly like the list: business-wide, except an outlet
      // manager who keeps their own outlet
      const { scope } = await resolveDeliveryScope();
      
      let query = supabase.from('saved_delivery_notes').delete();
      
      // Same scope as the list below, so a note that is visible is always
      // deletable and a hidden one is never reported as deleted.
      query = applyDeliveryScope(query, scope);
      
      const { error } = await query.eq('id', deliveryId);
        
      if (error) {
        console.error('Error deleting delivery from database:', error);
      } else {
        dbDeleteSuccessful = true;
      }
    }
    
    // Update localStorage after successful DB deletion or as fallback
    if (dbDeleteSuccessful) {
      // Refresh localStorage from database to ensure consistency
      const { data: dbDeliveries } = await supabase
        .from('saved_delivery_notes')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (dbDeliveries) {
        const deliveriesToStore = dbDeliveries.map(dbDelivery => ({
          id: dbDelivery.id,
          deliveryNoteNumber: dbDelivery.delivery_note_number,
          date: dbDelivery.date,
          customer: dbDelivery.customer,
          items: dbDelivery.items,
          total: dbDelivery.total,
          paymentMethod: dbDelivery.payment_method,
          status: dbDelivery.status,
          itemsList: dbDelivery.items_list,
          subtotal: dbDelivery.subtotal,
          tax: dbDelivery.tax,
          discount: dbDelivery.discount,
          amountReceived: dbDelivery.amount_received,
          change: dbDelivery.change,
          vehicle: dbDelivery.vehicle,
          driver: dbDelivery.driver,
          deliveryNotes: dbDelivery.delivery_notes,
          outletId: dbDelivery.outlet_id
        }));
        localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(deliveriesToStore));
      }
    } else {
      // Fallback: remove from localStorage only
      const existingStored = localStorage.getItem(SAVED_DELIVERIES_KEY);
      if (existingStored) {
        const existingDeliveries = JSON.parse(existingStored);
        const updatedDeliveries = existingDeliveries.filter(
          delivery => delivery.id !== deliveryId
        );
        localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(updatedDeliveries));
      }
    }
  } catch (error) {
    console.error('Error deleting delivery:', error);
    throw new Error('Failed to delete delivery');
  }
};

// Helper function to update outlet inventory when delivery is edited
const updateOutletInventoryAfterEdit = async (
  outletId: string,
  originalItems: any[],
  updatedItems: any[]
): Promise<void> => {
  console.log('📦 Updating outlet inventory after delivery edit...');
  console.log('   - Outlet ID:', outletId);
  console.log('   - Original items:', originalItems.length);
  console.log('   - Updated items:', updatedItems.length);
  
  try {
    // Get current inventory for this outlet
    const { data: currentInventory, error: inventoryError } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('outlet_id', outletId);
    
    if (inventoryError) {
      console.error('❌ Error loading inventory:', inventoryError);
      return;
    }
    
    console.log('📊 Current inventory products:', currentInventory?.length || 0);
    
    // Build a map of original quantities by product name
    const originalQtyMap = new Map<string, number>();
    for (const item of originalItems) {
      const productName = item.name || item.description || item.productName;
      const qty = item.quantity || item.delivered || 0;
      if (productName && qty > 0) {
        originalQtyMap.set(productName, (originalQtyMap.get(productName) || 0) + qty);
      }
    }
    
    // Build a map of updated quantities by product name
    const updatedQtyMap = new Map<string, number>();
    for (const item of updatedItems) {
      const productName = item.name || item.description || item.productName;
      const qty = item.quantity || item.delivered || 0;
      if (productName && qty > 0) {
        updatedQtyMap.set(productName, (updatedQtyMap.get(productName) || 0) + qty);
      }
    }
    
    console.log('📋 Original quantities:', Object.fromEntries(originalQtyMap));
    console.log('📋 Updated quantities:', Object.fromEntries(updatedQtyMap));
    
    // Get all unique product names from both original and updated
    const allProductNames = new Set([...originalQtyMap.keys(), ...updatedQtyMap.keys()]);
    
    for (const productName of allProductNames) {
      const originalQty = originalQtyMap.get(productName) || 0;
      const updatedQty = updatedQtyMap.get(productName) || 0;
      const qtyDiff = updatedQty - originalQty;
      
      if (qtyDiff === 0) {
        console.log(`⏭️ ${productName}: No change (${originalQty} -> ${updatedQty})`);
        continue;
      }
      
      console.log(`📝 ${productName}: ${originalQty} -> ${updatedQty} (diff: ${qtyDiff})`);
      
      // Find existing inventory product
      const existingProduct = currentInventory?.find(p => p.name === productName);
      
      if (existingProduct) {
        // Update existing product
        const currentQty = existingProduct.quantity || 0;
        const newQty = Math.max(0, currentQty + qtyDiff); // Don't allow negative stock
        
        console.log(`   - Inventory: ${currentQty} -> ${newQty}`);
        
        const { error: updateError } = await supabase
          .from('inventory_products')
          .update({
            quantity: newQty,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProduct.id);
        
        if (updateError) {
          console.error(`❌ Error updating ${productName}:`, updateError);
        } else {
          console.log(`✅ Updated ${productName} inventory`);
        }
      } else if (qtyDiff > 0) {
        // New product - create inventory record
        const updatedItem = updatedItems.find(i => (i.name || i.description || i.productName) === productName);
        const unitCost = updatedItem?.rate ?? updatedItem?.price ?? updatedItem?.unitPrice ?? 0;
        const sellingPrice = updatedItem?.sellingPrice ?? updatedItem?.rate ?? updatedItem?.price ?? updatedItem?.unitPrice ?? 0;
        
        console.log(`   - Creating new inventory product: ${productName}, qty: ${qtyDiff}`);
        
        const { error: insertError } = await supabase
          .from('inventory_products')
          .insert({
            outlet_id: outletId,
            name: productName,
            quantity: qtyDiff,
            unit_cost: unitCost,
            selling_price: sellingPrice,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Error creating inventory for ${productName}:`, insertError);
        } else {
          console.log(`✅ Created inventory for ${productName}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error updating outlet inventory after edit:', error);
  }
};

// Helper function to update godown stock when an investment delivery is edited
const updateGodownStockAfterEdit = async (
  godownId: string,
  zoneId: string | null,
  originalItems: any[],
  updatedItems: any[]
): Promise<void> => {
  console.log('📦 Updating godown stock after investment delivery edit...');
  console.log('   - Godown ID:', godownId);
  console.log('   - Zone ID:', zoneId);
  console.log('   - Original items:', originalItems.length);
  console.log('   - Updated items:', updatedItems.length);

  try {
    // Import updateGodownStock dynamically to avoid circular dependencies
    const { updateGodownStock } = await import('@/services/godownService');

    // Build quantity maps by product_id
    const originalQtyMap = new Map<string, number>();
    for (const item of originalItems) {
      const productId = item.product_id || item.id;
      const qty = item.quantity || item.delivered || 0;
      if (productId && qty > 0) {
        originalQtyMap.set(productId, (originalQtyMap.get(productId) || 0) + qty);
      }
    }

    const updatedQtyMap = new Map<string, number>();
    for (const item of updatedItems) {
      const productId = item.product_id || item.id;
      const qty = item.quantity || item.delivered || 0;
      if (productId && qty > 0) {
        updatedQtyMap.set(productId, (updatedQtyMap.get(productId) || 0) + qty);
      }
    }

    console.log('📋 Original godown quantities:', Object.fromEntries(originalQtyMap));
    console.log('📋 Updated godown quantities:', Object.fromEntries(updatedQtyMap));

    // Get all unique product IDs from both maps
    const allProductIds = new Set([...originalQtyMap.keys(), ...updatedQtyMap.keys()]);

    for (const productId of allProductIds) {
      const originalQty = originalQtyMap.get(productId) || 0;
      const updatedQty = updatedQtyMap.get(productId) || 0;
      const delta = updatedQty - originalQty; // positive = more delivered, negative = less delivered

      if (delta === 0) {
        console.log(`⏭️ Product ${productId}: No change (${originalQty} -> ${updatedQty})`);
        continue;
      }

      console.log(`📝 Product ${productId}: ${originalQty} -> ${updatedQty} (delta: ${delta})`);

      // Delivery decreases godown stock, so apply -delta
      // If qty increased (delta > 0): decrease godown stock further (-delta)
      // If qty decreased (delta < 0): restore godown stock (-delta = positive)
      await updateGodownStock(productId, godownId, zoneId, -delta);

      console.log(`✅ Updated godown stock for product ${productId} by ${-delta}`);
    }

    console.log('✅ Godown stock update after edit completed');
  } catch (error) {
    console.error('❌ Error updating godown stock after edit:', error);
  }
};

// Helper function to update general products.stock_quantity when investment delivery is edited
// On initial save, Templates.tsx decrements stock by delivered qty.
// On edit, we reverse the old decrement (add back) and apply the new one (subtract new qty).
const updateGeneralInventoryAfterEdit = async (
  originalItems: any[],
  updatedItems: any[]
): Promise<void> => {
  console.log('📦 Updating products.stock_quantity after investment delivery edit...');

  try {
    const { getProducts, updateProduct } = await import('@/services/databaseService');
    const allProducts = await getProducts();

    // Build quantity maps by product name (matching by name like updateProductStockBasedOnDelivered does)
    const originalQtyMap = new Map<string, number>();
    for (const item of originalItems) {
      const name = (item.name || item.description || item.productName || '').toLowerCase().trim();
      const qty = item.quantity || item.delivered || 0;
      if (name && qty > 0) {
        originalQtyMap.set(name, (originalQtyMap.get(name) || 0) + qty);
      }
    }

    const updatedQtyMap = new Map<string, number>();
    for (const item of updatedItems) {
      const name = (item.name || item.description || item.productName || '').toLowerCase().trim();
      const qty = item.quantity || item.delivered || 0;
      if (name && qty > 0) {
        updatedQtyMap.set(name, (updatedQtyMap.get(name) || 0) + qty);
      }
    }

    console.log('📋 Original stock quantities:', Object.fromEntries(originalQtyMap));
    console.log('📋 Updated stock quantities:', Object.fromEntries(updatedQtyMap));

    // Get all unique product names
    const allNames = new Set([...originalQtyMap.keys(), ...updatedQtyMap.keys()]);

    for (const name of allNames) {
      const originalQty = originalQtyMap.get(name) || 0;
      const updatedQty = updatedQtyMap.get(name) || 0;

      if (originalQty === updatedQty) {
        console.log(`⏭️ ${name}: No change`);
        continue;
      }

      // Find the product in the products table
      const product = allProducts.find(p =>
        p.name.toLowerCase().trim() === name
      );

      if (!product) {
        console.warn(`⚠️ No matching product found for: ${name}`);
        continue;
      }

      const currentStock = product.stock_quantity || 0;
      // Reverse old decrement (add back originalQty) and apply new decrement (subtract updatedQty)
      const adjustment = originalQty - updatedQty;
      const newStock = Math.max(0, currentStock + adjustment);

      console.log(`📝 ${name}: stock ${currentStock} -> ${newStock} (adjustment: ${adjustment})`);

      const updatedProduct = { ...product, stock_quantity: newStock };
      await updateProduct(product.id!, updatedProduct);

      console.log(`✅ Updated ${name} stock to ${newStock}`);
    }

    console.log('✅ General inventory update after edit completed');
  } catch (error) {
    console.error('❌ Error updating general inventory after edit:', error);
  }
};

export const updateDelivery = async (updatedDelivery: DeliveryData): Promise<void> => {
  try {
    console.log('🔄 Starting delivery update...', updatedDelivery.id);
    
    // Update database first (source of truth)
    const { data: { user } } = await supabase.auth.getUser();
    let dbUpdateSuccessful = false;
    let originalItemsList: any[] = [];
    
    if (user) {
      console.log('👤 User authenticated:', user.id);
      
      // Scope the update exactly like the list: business-wide, except an outlet
      // manager who keeps their own outlet
      const { scope } = await resolveDeliveryScope();
      
      console.log('📝 Delivery write scope resolved');
      
      // First, fetch the original delivery from database to compare items
      const { data: originalDelivery, error: fetchError } = await supabase
        .from('saved_delivery_notes')
        .select('status, source_type, outlet_id, items_list, source_godown_id, source_zone_id')
        .eq('id', updatedDelivery.id)
        .single();
      
      if (fetchError) {
        console.error('❌ Error fetching original delivery:', fetchError);
      } else {
        originalItemsList = originalDelivery?.items_list || [];
        console.log('📋 Original items count:', originalItemsList.length);
      }
      
      // Validate numeric fields to prevent NaN serialization errors
      const updateData = {
        delivery_note_number: updatedDelivery.deliveryNoteNumber,
        // Convert empty string dates to null to avoid database errors
        date: updatedDelivery.date || null,
        customer: updatedDelivery.customer,
        items: updatedDelivery.items || 0,
        total: updatedDelivery.total || 0,
        payment_method: updatedDelivery.paymentMethod,
        status: updatedDelivery.status,
        items_list: updatedDelivery.itemsList,
        subtotal: updatedDelivery.subtotal || 0,
        tax: updatedDelivery.tax || 0,
        discount: updatedDelivery.discount || 0,
        amount_received: updatedDelivery.amountReceived || 0,
        change: updatedDelivery.change || 0,
        vehicle: updatedDelivery.vehicle,
        driver: updatedDelivery.driver,
        delivery_notes: updatedDelivery.deliveryNotes,
        outlet_id: updatedDelivery.outletId,
        source_type: updatedDelivery.sourceType || 'investment',
        source_outlet_id: updatedDelivery.sourceOutletId || null,
        credit_brought_forward: updatedDelivery.creditBroughtForward || 0,
        // Additional fields from DeliveryDetails view (matching exact View Display)
        business_name: (updatedDelivery as any).businessName || null,
        business_address: (updatedDelivery as any).businessAddress || null,
        prepared_by_name: (updatedDelivery as any).preparedByName || null,
        prepared_by_date: (updatedDelivery as any).preparedByDate || null,
        driver_name: (updatedDelivery as any).driverName || null,
        driver_date: (updatedDelivery as any).driverDate || null,
        received_by_name: (updatedDelivery as any).receivedByName || null,
        received_by_date: (updatedDelivery as any).receivedByDate || null
      };
      
      console.log('📦 Update data:', JSON.stringify(updateData, null, 2));
      
      let query = supabase.from('saved_delivery_notes').update(updateData);
      
      // Same scope as the list: an outlet manager stays inside their own outlet,
      query = applyDeliveryScope(query, scope);
      
      const { error } = await query.eq('id', updatedDelivery.id);
        
      if (error) {
        console.error('❌ Error updating delivery in database:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database update failed: ${error.message}`);
      } else {
        console.log('✅ Database update successful');
        dbUpdateSuccessful = true;
        
        // Update inventory if this is an outlet delivery
        // Note: We need to update inventory even if itemsList is empty (user deleted all items)
        if (updatedDelivery.outletId) {
          const newItemsList = updatedDelivery.itemsList || [];
          console.log('📦 Updating outlet inventory after delivery edit...');
          console.log(`   - Original items: ${originalItemsList.length}, Updated items: ${newItemsList.length}`);
          await updateOutletInventoryAfterEdit(
            updatedDelivery.outletId,
            originalItemsList,
            newItemsList
          );
        } else {
          console.log('ℹ️ Skipping outlet inventory update - no outlet ID');
        }

        // Update godown stock for investment deliveries when quantities change
        const originalGodownId = originalDelivery?.source_godown_id;
        const originalZoneId = originalDelivery?.source_zone_id;
        const effectiveGodownId = updatedDelivery.sourceGodownId || originalGodownId;
        const effectiveZoneId = updatedDelivery.sourceZoneId || originalZoneId;
        const isInvestment = (originalDelivery?.source_type || updatedDelivery.sourceType) === 'investment';

        if (isInvestment && effectiveGodownId) {
          console.log('📦 Updating godown stock after investment delivery edit...');
          await updateGodownStockAfterEdit(
            effectiveGodownId,
            effectiveZoneId || null,
            originalItemsList,
            updatedDelivery.itemsList || []
          );
        } else {
          console.log('ℹ️ Skipping godown stock update - not investment or no godown');
        }

        // Update general products.stock_quantity for investment deliveries
        // On initial save, Templates.tsx calls updateProductStockBasedOnDelivered to decrement stock.
        // On edit, we need to reverse the old decrement and apply the new one.
        if (isInvestment) {
          console.log('📦 Updating products.stock_quantity after investment delivery edit...');
          await updateGeneralInventoryAfterEdit(originalItemsList, updatedDelivery.itemsList || []);
        }
      }
    } else {
      console.warn('⚠️ No authenticated user found');
    }
    
    // Update localStorage after successful DB update or as fallback
    if (dbUpdateSuccessful && user) {
      // Refresh localStorage from database to ensure consistency
      const { data: dbDeliveries } = await supabase
        .from('saved_delivery_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (dbDeliveries) {
        const deliveriesToStore = dbDeliveries.map(dbDelivery => ({
          id: dbDelivery.id,
          deliveryNoteNumber: dbDelivery.delivery_note_number,
          date: dbDelivery.date,
          customer: dbDelivery.customer,
          items: dbDelivery.items,
          total: dbDelivery.total,
          paymentMethod: dbDelivery.payment_method,
          status: dbDelivery.status,
          itemsList: dbDelivery.items_list,
          subtotal: dbDelivery.subtotal,
          tax: dbDelivery.tax,
          discount: dbDelivery.discount,
          amountReceived: dbDelivery.amount_received,
          change: dbDelivery.change,
          vehicle: dbDelivery.vehicle,
          driver: dbDelivery.driver,
          deliveryNotes: dbDelivery.delivery_notes,
          outletId: dbDelivery.outlet_id
        }));
        localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(deliveriesToStore));
      }
    } else {
      // Fallback: update localStorage only
      const existingStored = localStorage.getItem(SAVED_DELIVERIES_KEY);
      if (existingStored) {
        const existingDeliveries = JSON.parse(existingStored);
        const updatedDeliveries = existingDeliveries.map(delivery => 
          delivery.id === updatedDelivery.id ? updatedDelivery : delivery
        );
        localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(updatedDeliveries));
      }
    }
  } catch (error) {
    console.error('Error updating delivery:', error);
    throw new Error('Failed to update delivery');
  }
};

export const getDeliveryById = async (deliveryId: string): Promise<DeliveryData | undefined> => {
  try {
    const savedDeliveries = await getSavedDeliveries();
    return savedDeliveries.find(delivery => delivery.id === deliveryId);
  } catch (error) {
    console.error('Error retrieving delivery by ID:', error);
    return undefined;
  }
};

export const getDeliveriesByOutletId = async (outletId: string): Promise<DeliveryData[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Paged read so an outlet with more than one response page of notes is not
      // truncated to the newest 1000 notes.
      const { rows: data, error } = await fetchAllDeliveryNotes({ outletIds: [outletId] });
        
      if (error) {
        console.error('Error retrieving deliveries by outlet ID from database:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(SAVED_DELIVERIES_KEY);
        if (saved) {
          const deliveries = JSON.parse(saved);
          return deliveries.filter((d: DeliveryData) => d.outletId === outletId);
        }
        return [];
      }
      
      // Transform database records to DeliveryData format
      const deliveries = data.map(dbDelivery => ({
        id: dbDelivery.id,
        deliveryNoteNumber: dbDelivery.delivery_note_number,
        date: dbDelivery.date,
        customer: dbDelivery.customer,
        items: dbDelivery.items,
        total: dbDelivery.total,
        paymentMethod: dbDelivery.payment_method,
        status: dbDelivery.status,
        itemsList: dbDelivery.items_list,
        subtotal: dbDelivery.subtotal,
        tax: dbDelivery.tax,
        discount: dbDelivery.discount,
        amountReceived: dbDelivery.amount_received,
        change: dbDelivery.change,
        vehicle: dbDelivery.vehicle,
        driver: dbDelivery.driver,
        deliveryNotes: dbDelivery.delivery_notes,
        outletId: dbDelivery.outlet_id,
        // If source_outlet_id exists, it's from another outlet; otherwise it's from investment
        sourceType: dbDelivery.source_type || (dbDelivery.source_outlet_id ? 'outlet' : 'investment'),
        sourceOutletId: dbDelivery.source_outlet_id,
        creditBroughtForward: dbDelivery.credit_brought_forward || 0,
        // Additional fields from DeliveryDetails view (matching exact View Display)
        businessName: dbDelivery.business_name,
        businessAddress: dbDelivery.business_address,
        preparedByName: dbDelivery.prepared_by_name,
        preparedByDate: dbDelivery.prepared_by_date,
        driverName: dbDelivery.driver_name,
        driverDate: dbDelivery.driver_date,
        receivedByName: dbDelivery.received_by_name,
        receivedByDate: dbDelivery.received_by_date,
        // Approval fields
        approvalStatus: dbDelivery.approval_status || 'pending',
        approvedByName: dbDelivery.approved_by_name,
        approvalNotes: dbDelivery.approval_notes,
        approvedAt: dbDelivery.approved_at
      }));
      
      return deliveries;
    } else {
      // If not authenticated, use localStorage
      const saved = localStorage.getItem(SAVED_DELIVERIES_KEY);
      if (saved) {
        const deliveries = JSON.parse(saved);
        return deliveries.filter((d: DeliveryData) => d.outletId === outletId);
      }
      return [];
    }
  } catch (error) {
    console.error('Error retrieving deliveries by outlet ID:', error);
    return [];
  }
};