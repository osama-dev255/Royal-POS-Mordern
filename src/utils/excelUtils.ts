// Utility functions for Excel export
export class ExcelUtils {
  // Export data to Excel (CSV format that Excel can open)
  static exportToExcel(data: any[], filename: string) {
    if (!data || data.length === 0) return;

    // Create CSV content with Excel-specific formatting
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => {
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Add BOM for Excel to correctly display UTF-8 characters
    const BOM = '\uFEFF';
    const excelContent = BOM + csvContent;
    
    // Create download link with .xlsx extension for Excel recognition
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}