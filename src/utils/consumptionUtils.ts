import { getSavedGRNs, updateGRN, SavedGRN } from './grnUtils';

/**
 * Updates the GRN's SoldOut quantities when items are consumed from Invoice/Delivery Note
 * @param consumedItems - Items consumed from Invoice/Delivery Note
 */
export const updateGRNQuantitiesOnConsumption = async (consumedItems: Array<{
  description: string;
  quantity: number;
}>) => {
  try {
    console.log('Starting updateGRNQuantitiesOnConsumption with items:', consumedItems);
    
    // Get all saved GRNs
    const savedGRNs = await getSavedGRNs();
    console.log('Found', savedGRNs.length, 'saved GRNs');
    
    // For each consumed item, find the corresponding GRN item and update its soldout quantity
    for (const consumedItem of consumedItems) {
      console.log(`Processing consumed item: ${consumedItem.description}, quantity: ${consumedItem.quantity}`);
      
      let itemUpdated = false;
      
      // Find GRN that contains this item
      for (const grn of savedGRNs) {
        console.log(`Checking GRN: ${grn.data.grnNumber}`);
        
        const grnItemIndex = grn.data.items.findIndex(
          item => item.description.toLowerCase().trim() === consumedItem.description.toLowerCase().trim()
        );
        
        if (grnItemIndex !== -1) {
          console.log(`Found matching item in GRN ${grn.data.grnNumber} at index ${grnItemIndex}`);
          
          // Update the soldout quantity
          const updatedGRN = { ...grn };
          const grnItem = updatedGRN.data.items[grnItemIndex];
          
          console.log(`Original values - soldout: ${grnItem.soldout || 0}, delivered: ${grnItem.delivered || 0}, available: ${grnItem.available || 0}`);
          
          // Update the soldout value by adding the consumed quantity
          const newSoldOut = (grnItem.soldout || 0) + consumedItem.quantity;
          
          // Update available quantity (available = delivered - soldout - rejectedOut + rejectionIn - damaged - complimentary)
          const newAvailable = (grnItem.delivered || 0) - 
                              newSoldOut - 
                              (grnItem.rejectedOut || 0) + 
                              (grnItem.rejectionIn || 0) - 
                              (grnItem.damaged || 0) - 
                              (grnItem.complimentary || 0);
          
          console.log(`Calculated new values - newSoldOut: ${newSoldOut}, newAvailable: ${newAvailable}`);
          
          // Update the item in the GRN
          updatedGRN.data.items[grnItemIndex] = {
            ...grnItem,
            soldout: newSoldOut,
            available: Math.max(0, newAvailable) // Ensure available doesn't go negative
          };
          
          console.log(`Updated item in GRN ${grn.data.grnNumber}`, updatedGRN.data.items[grnItemIndex]);
          
          // Update the GRN in both localStorage and database
          await updateGRN(updatedGRN);
          console.log(`Successfully updated GRN ${grn.data.grnNumber}`);
          
          itemUpdated = true;
          
          // Break after updating the first matching GRN item
          // In a more sophisticated system, you might want to handle multiple GRNs with the same item
          break;
        } else {
          console.log(`No matching item found in GRN ${grn.data.grnNumber} for description: ${consumedItem.description}`);
        }
      }
      
      if (!itemUpdated) {
        console.warn(`No matching GRN item found for consumed item: ${consumedItem.description}`);
      }
    }
    
    console.log('Completed updateGRNQuantitiesOnConsumption');
  } catch (error) {
    console.error('Error updating GRN quantities on consumption:', error);
    throw error;
  }
};

/**
 * Updates the GRN's SoldOut quantities when items are consumed from Invoice
 * @param invoiceItems - Items from the invoice
 */
export const updateGRNQuantitiesFromInvoice = async (invoiceItems: Array<{
  description: string;
  quantity: number;
}>) => {
  await updateGRNQuantitiesOnConsumption(invoiceItems);
};

/**
 * Updates the GRN's SoldOut quantities when items are consumed from Delivery Note
 * @param deliveryItems - Items from the delivery note
 */
export const updateGRNQuantitiesFromDeliveryNote = async (deliveryItems: Array<{
  description: string;
  quantity: number;
}>) => {
  await updateGRNQuantitiesOnConsumption(deliveryItems);
};

/**
 * Updates the GRN's SoldOut quantities when items are delivered based on delivered quantity
 * @param deliveryItems - Items from the delivery note with delivered quantities
 */
export const updateGRNQuantitiesBasedOnDelivered = async (deliveryItems: Array<{
  description: string;
  delivered: number; // Use delivered quantity instead of general quantity
}>) => {
  try {
    console.log('Starting updateGRNQuantitiesBasedOnDelivered with items:', deliveryItems);
    
    // Get all saved GRNs
    const savedGRNs = await getSavedGRNs();
    console.log('Found', savedGRNs.length, 'saved GRNs');
    
    // For each delivered item, find the corresponding GRN item and update its soldout quantity
    for (const deliveredItem of deliveryItems) {
      console.log(`Processing delivered item: ${deliveredItem.description}, delivered: ${deliveredItem.delivered}`);
      
      let itemUpdated = false;
      
      // Find GRN that contains this item
      for (const grn of savedGRNs) {
        console.log(`Checking GRN: ${grn.data.grnNumber}`);
        
        const grnItemIndex = grn.data.items.findIndex(
          item => item.description.toLowerCase().trim() === deliveredItem.description.toLowerCase().trim()
        );
        
        if (grnItemIndex !== -1) {
          console.log(`Found matching item in GRN ${grn.data.grnNumber} at index ${grnItemIndex}`);
          
          // Update the soldout quantity
          const updatedGRN = { ...grn };
          const grnItem = updatedGRN.data.items[grnItemIndex];
          
          console.log(`Original values - soldout: ${grnItem.soldout || 0}, delivered: ${grnItem.delivered || 0}, available: ${grnItem.available || 0}`);
          
          // Update the soldout value by adding the delivered quantity
          const newSoldOut = (grnItem.soldout || 0) + deliveredItem.delivered;
          
          // Update available quantity (available = delivered - soldout - rejectedOut + rejectionIn - damaged - complimentary)
          const newAvailable = (grnItem.delivered || 0) - 
                              newSoldOut - 
                              (grnItem.rejectedOut || 0) + 
                              (grnItem.rejectionIn || 0) - 
                              (grnItem.damaged || 0) - 
                              (grnItem.complimentary || 0);
          
          console.log(`Calculated new values - newSoldOut: ${newSoldOut}, newAvailable: ${newAvailable}`);
          
          // Update the item in the GRN
          updatedGRN.data.items[grnItemIndex] = {
            ...grnItem,
            soldout: newSoldOut,
            available: Math.max(0, newAvailable) // Ensure available doesn't go negative
          };
          
          console.log(`Updated item in GRN ${grn.data.grnNumber}`, updatedGRN.data.items[grnItemIndex]);
          
          // Update the GRN in both localStorage and database
          await updateGRN(updatedGRN);
          console.log(`Successfully updated GRN ${grn.data.grnNumber}`);
          
          itemUpdated = true;
          
          // Break after updating the first matching GRN item
          break;
        } else {
          console.log(`No matching item found in GRN ${grn.data.grnNumber} for description: ${deliveredItem.description}`);
        }
      }
      
      if (!itemUpdated) {
        console.warn(`No matching GRN item found for delivered item: ${deliveredItem.description}`);
      }
    }
    
    console.log('Completed updateGRNQuantitiesBasedOnDelivered');
  } catch (error) {
    console.error('Error updating GRN quantities based on delivered:', error);
    throw error;
  }
};

/**
 * Updates product stock quantities in the database when items are delivered
 * @param deliveryItems - Items from the delivery note with delivered quantities
 */
export const updateProductStockBasedOnDelivered = async (deliveryItems: Array<{
  description: string;
  delivered: number; // Amount to reduce from stock
}>) => {
  try {
    console.log('Starting updateProductStockBasedOnDelivered with items:', deliveryItems);
    
    const { getProducts, updateProduct } = await import('@/services/databaseService');
    const allProducts = await getProducts();
    
    // For each delivered item, find the corresponding product and update its stock
    for (const deliveredItem of deliveryItems) {
      console.log(`Processing delivered item: ${deliveredItem.description}, delivered: ${deliveredItem.delivered}`);
      
      // Find product that matches the description
      const product = allProducts.find(p => 
        p.name.toLowerCase().trim() === deliveredItem.description.toLowerCase().trim()
      );
      
      if (product) {
        console.log(`Found matching product: ${product.name}, current stock: ${product.stock_quantity || 0}`);
        
        // Calculate new stock quantity (reduce by delivered amount)
        const currentStock = product.stock_quantity || 0;
        const newStock = Math.max(0, currentStock - deliveredItem.delivered); // Ensure stock doesn't go negative
        
        console.log(`Updating stock from ${currentStock} to ${newStock}`);
        
        // Update the product in the database
        const updatedProduct = { ...product, stock_quantity: newStock };
        await updateProduct(product.id!, updatedProduct);
        
        console.log(`Successfully updated product ${product.name} stock to ${newStock}`);
      } else {
        console.warn(`No matching product found for delivered item: ${deliveredItem.description}`);
      }
    }
    
    console.log('Completed updateProductStockBasedOnDelivered');
  } catch (error) {
    console.error('Error updating product stock based on delivered:', error);
    throw error;
  }
};

/**
 * Checks if the requested quantity is available in GRN
 * @param itemDescription - Description of the item to check
 * @param requestedQuantity - Quantity requested
 * @returns Object with availability status and available quantity
 */
export const checkItemAvailability = async (itemDescription: string, requestedQuantity: number) => {
  try {
    // Get all saved GRNs
    const savedGRNs = await getSavedGRNs();
    
    // Find GRN that contains this item
    for (const grn of savedGRNs) {
      const grnItem = grn.data.items.find(
        item => item.description.toLowerCase().trim() === itemDescription.toLowerCase().trim()
      );
      
      if (grnItem) {
        const availableQuantity = grnItem.available || 0;
        return {
          available: availableQuantity >= requestedQuantity,
          availableQuantity,
          grnNumber: grn.data.grnNumber
        };
      }
    }

    // If item not found in GRN, check the product database as fallback
    try {
      const { getProducts } = await import('@/services/databaseService');
      const allProducts = await getProducts();
      
      // Look for a product that matches the description
      const product = allProducts.find(p => 
        p.name.toLowerCase().trim() === itemDescription.toLowerCase().trim()
      );
      
      if (product) {
        const availableQuantity = product.stock_quantity || 0;
        return {
          available: availableQuantity >= requestedQuantity,
          availableQuantity,
          grnNumber: null
        };
      }
    } catch (dbError) {
      console.error('Error checking product database:', dbError);
      // Continue to return not available if database check fails
    }

    // If item not found in any GRN or product database, return 0 available
    return {
      available: false,
      availableQuantity: 0,
      grnNumber: null
    };
  } catch (error) {
    console.error('Error checking item availability:', error);
    return {
      available: false,
      availableQuantity: 0,
      grnNumber: null
    };
  }
};