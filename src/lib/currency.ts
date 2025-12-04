/**
 * Format amount as Tanzanian Shillings (TZS)
 * @param amount - The amount to format
 * @returns Formatted currency string in TZS
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Parse a currency string back to a number
 * @param currencyString - The currency string to parse
 * @returns The numeric value
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols and commas, then parse
  const cleaned = currencyString.replace(/[^0-9.-]+/g, '');
  return parseFloat(cleaned) || 0;
}