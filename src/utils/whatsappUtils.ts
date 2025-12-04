/**
 * WhatsApp Utility Functions
 */

// WhatsApp business numbers
const BUSINESS_NUMBERS = [
  "+255711299266",
  "+255787787088"
];

/**
 * Get the start of the business day (2:00 AM)
 * @param date Date to calculate from
 * @returns Date representing the start of the business day
 */
export const getBusinessDayStart = (date: Date = new Date()): Date => {
  const businessDayStart = new Date(date);
  businessDayStart.setHours(2, 0, 0, 0); // 2:00 AM
  return businessDayStart;
};

/**
 * Get the end of the business day (2:00 AM next day)
 * @param date Date to calculate from
 * @returns Date representing the end of the business day
 */
export const getBusinessDayEnd = (date: Date = new Date()): Date => {
  const businessDayEnd = getBusinessDayStart(date);
  businessDayEnd.setDate(businessDayEnd.getDate() + 1); // Next day at 2:00 AM
  return businessDayEnd;
};

/**
 * Check if this is the first sale of the business day
 * @returns Boolean indicating if this is the first sale of the day
 */
export const isFirstSaleOfDay = (): boolean => {
  try {
    const now = new Date();
    const businessDayStart = getBusinessDayStart(now);
    
    // Get the last sale timestamp from localStorage
    const lastSaleTimestamp = localStorage.getItem('lastSaleTimestamp');
    
    if (!lastSaleTimestamp) {
      // No previous sale recorded, this is the first
      localStorage.setItem('lastSaleTimestamp', now.toISOString());
      return true;
    }
    
    const lastSaleDate = new Date(lastSaleTimestamp);
    
    // Check if the last sale was in a different business day
    const lastSaleBusinessDayStart = getBusinessDayStart(lastSaleDate);
    
    // If the last sale was before today's business day start, this is the first sale
    if (lastSaleBusinessDayStart < businessDayStart) {
      localStorage.setItem('lastSaleTimestamp', now.toISOString());
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if first sale of day:', error);
    return false;
  }
};

/**
 * Format phone number for WhatsApp URL
 * @param phoneNumber Phone number in various formats
 * @returns Formatted phone number without spaces, dashes, or parentheses
 */
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters except the plus sign
  return phoneNumber.replace(/[^+\d]/g, '');
};

/**
 * Send WhatsApp message to a single number
 * @param phoneNumber Recipient's phone number
 * @param message Message content
 * @returns Boolean indicating if the operation was successful
 */
export const sendWhatsAppMessage = (phoneNumber: string, message: string): boolean => {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
};

/**
 * Send WhatsApp message to all business numbers
 * @param message Message content
 * @returns Array of results for each number
 */
export const sendWhatsAppMessageToBusiness = (message: string): boolean[] => {
  try {
    return BUSINESS_NUMBERS.map(number => {
      return sendWhatsAppMessage(number, message);
    });
  } catch (error) {
    console.error('Error sending WhatsApp messages to business numbers:', error);
    return BUSINESS_NUMBERS.map(() => false);
  }
};

/**
 * Generate sales notification message
 * @param transactionId Transaction ID
 * @param totalAmount Total transaction amount
 * @param paymentMethod Payment method used
 * @param customerName Customer name (if available)
 * @returns Formatted message string
 */
export const generateSalesNotificationMessage = (
  transactionId: string,
  totalAmount: number,
  paymentMethod: string,
  customerName?: string
): string => {
  const formattedAmount = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS'
  }).format(totalAmount);

  let message = `🔔 *NEW SALE ALERT* 🔔\n\n`;
  message += `Transaction ID: ${transactionId}\n`;
  message += `Amount: ${formattedAmount}\n`;
  message += `Payment Method: ${paymentMethod}\n`;
  
  if (customerName) {
    message += `Customer: ${customerName}\n`;
  }
  
  message += `\nThis is an automated notification from the POS system.`;
  
  return message;
};

/**
 * Generate sales receipt message
 * @param transactionId Transaction ID
 * @param date Transaction date
 * @param customerName Customer name
 * @param items Transaction items
 * @param subtotal Subtotal amount
 * @param discount Discount amount
 * @param tax Tax amount
 * @param total Total amount
 * @param paymentMethod Payment method used
 * @returns Formatted receipt message string
 */
export const generateSalesReceiptMessage = (
  transactionId: string,
  date: string,
  customerName: string,
  items: any[],
  subtotal: number,
  discount: number,
  tax: number,
  total: number,
  paymentMethod: string
): string => {
  const formattedDate = new Date(date).toLocaleDateString('en-TZ');
  const formattedSubtotal = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS'
  }).format(subtotal);
  
  const formattedTotal = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS'
  }).format(total);
  
  const formattedDiscount = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS'
  }).format(discount);
  
  const formattedTax = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS'
  }).format(tax);

  let message = `🧾 *SALES RECEIPT* 🧾\n\n`;
  message += `Transaction ID: ${transactionId}\n`;
  message += `Date: ${formattedDate}\n`;
  message += `Customer: ${customerName}\n\n`;
  
  message += `*Items:*\n`;
  items.forEach(item => {
    const itemTotal = new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS'
    }).format(item.totalPrice || item.price * item.quantity);
    message += `- ${item.name} x${item.quantity}: ${itemTotal}\n`;
  });
  
  message += `\nSubtotal: ${formattedSubtotal}\n`;
  if (discount > 0) {
    message += `Discount: -${formattedDiscount}\n`;
  }
  if (tax > 0) {
    message += `Tax: ${formattedTax}\n`;
  }
  message += `*Total: ${formattedTotal}*\n\n`;
  message += `Payment Method: ${paymentMethod}\n\n`;
  message += `Thank you for your business!`;
  
  return message;
};

export default {
  sendWhatsAppMessage,
  sendWhatsAppMessageToBusiness,
  generateSalesNotificationMessage,
  generateSalesReceiptMessage,
  isFirstSaleOfDay,
  getBusinessDayStart,
  getBusinessDayEnd
};