// Utility functions for importing data
export class ImportUtils {
  // Parse CSV data
  static parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    // Parse headers
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"(.*)"$/, '$1'));
    
    // Parse rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => {
        // Remove quotes and unescape
        const trimmed = value.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          return trimmed.substring(1, trimmed.length - 1).replace(/""/g, '"');
        }
        // Convert numbers
        if (!isNaN(Number(trimmed)) && trimmed !== '') {
          return Number(trimmed);
        }
        return trimmed;
      });
      
      // Create object with headers as keys
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] !== undefined ? values[index] : '';
      });
      data.push(row);
    }
    
    return data;
  }

  // Parse JSON data
  static parseJSON(jsonText: string): any[] {
    try {
      const data = JSON.parse(jsonText);
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return [];
    }
  }

  // Validate product data structure
  static validateProducts(data: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, errors };
    }
    
    data.forEach((item, index) => {
      if (!item.name) {
        errors.push(`Row ${index + 1}: Missing product name`);
      }
      if (item.price === undefined || isNaN(Number(item.price))) {
        errors.push(`Row ${index + 1}: Invalid price`);
      }
      if (item.stock === undefined || isNaN(Number(item.stock))) {
        errors.push(`Row ${index + 1}: Invalid stock quantity`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  }

  // Validate customer data structure
  static validateCustomers(data: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, errors };
    }
    
    data.forEach((item, index) => {
      if (!item.name) {
        errors.push(`Row ${index + 1}: Missing customer name`);
      }
      if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
        errors.push(`Row ${index + 1}: Invalid email format`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  }

  // Validate supplier data structure
  static validateSuppliers(data: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, errors };
    }
    
    data.forEach((item, index) => {
      if (!item.name) {
        errors.push(`Row ${index + 1}: Missing supplier name`);
      }
      if (!item.contactPerson) {
        errors.push(`Row ${index + 1}: Missing contact person`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  }
}