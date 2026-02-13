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