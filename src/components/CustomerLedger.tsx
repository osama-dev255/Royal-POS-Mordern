import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon,
  Search, 
  Download, 
  Filter, 
  Printer, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  X,
  FileText,
  Share2,
  FileSpreadsheet
} from "lucide-react";
import { getCustomerLedgerByCustomerId, getCustomerLedgerBalance, OutletCustomer, CustomerLedgerEntry } from "@/services/databaseService";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CustomerLedgerProps {
  customer: OutletCustomer;
  outletId: string;
  onBack: () => void;
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'cash_sale' | 'card_sale' | 'mobile_sale' | 'credit_sale' | 'debt_payment' | 'settlement' | 'adjustment' | 'refund';
  reference: string;
}

export const CustomerLedger = ({ customer, outletId, onBack }: CustomerLedgerProps) => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDebits, setTotalDebits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filteredEntries, setFilteredEntries] = useState<LedgerEntry[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadLedgerData();
  }, [customer.id, outletId]);

  const loadLedgerData = async () => {
    try {
      setLoading(true);
      const entries: LedgerEntry[] = [];

      console.log('📊 Loading Customer Ledger from database table...');
      console.log('📊 Customer:', customer.first_name, customer.last_name);
      
      // Fetch all ledger entries from the dedicated customer_ledger table
      const ledgerEntries = await getCustomerLedgerByCustomerId(outletId, customer.id!);
      
      console.log('📊 Total ledger entries found:', ledgerEntries.length);
      
      // Convert database entries to LedgerEntry format
      ledgerEntries.forEach((entry: CustomerLedgerEntry) => {
        entries.push({
          id: entry.id || `ledger-${entry.reference_id}`,
          date: new Date(entry.transaction_date).toLocaleDateString(),
          description: entry.description || entry.transaction_type,
          debit: entry.debit_amount || 0,
          credit: entry.credit_amount || 0,
          balance: entry.running_balance || 0,
          type: entry.transaction_type,
          reference: entry.reference_id || ''
        });
      });

      // Get current balance from the last ledger entry
      const currentBal = await getCustomerLedgerBalance(outletId, customer.id!);
      
      setLedgerEntries(entries);

      // Calculate totals
      const debits = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const credits = entries.reduce((sum, entry) => sum + entry.credit, 0);
      
      setTotalDebits(debits);
      setTotalCredits(credits);
      setCurrentBalance(currentBal);

      console.log('✅ Ledger loaded successfully');
      console.log('  Total Debits:', debits);
      console.log('  Total Credits:', credits);
      console.log('  Current Balance:', currentBal);

    } catch (error) {
      console.error('Error loading ledger data:', error);
      toast({
        title: "Error",
        description: "Failed to load customer ledger",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter entries based on search term and date range
  useEffect(() => {
    let filtered = [...ledgerEntries];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date range filter
    if (dateFrom) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= dateFrom;
      });
    }

    if (dateTo) {
      // Make end date inclusive (end of day)
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate <= endDate;
      });
    }

    setFilteredEntries(filtered);
  }, [searchTerm, dateFrom, dateTo, ledgerEntries]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
    const csvData = filteredEntries.map(entry => [
      entry.date,
      entry.description,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${customer.first_name}_${customer.last_name}_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Export to Excel (XLS)
  const handleExportExcel = () => {
    // Create Excel-compatible HTML table
    const tableContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Customer Ledger</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2>Customer Ledger - ${customer.first_name} ${customer.last_name}</h2>
        <table border="1">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Debit (Sales)</th>
              <th>Credit (Payments)</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${filteredEntries.map(entry => `
              <tr>
                <td>${entry.date}</td>
                <td>${entry.description}</td>
                <td>${entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</td>
                <td>${entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</td>
                <td>${entry.balance.toFixed(2)} ${entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2"><strong>Totals</strong></td>
              <td><strong>${totalDebits.toFixed(2)}</strong></td>
              <td><strong>${totalCredits.toFixed(2)}</strong></td>
              <td><strong>${currentBalance.toFixed(2)} ${currentBalance > 0 ? 'Dr' : currentBalance < 0 ? 'Cr' : ''}</strong></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${customer.first_name}_${customer.last_name}_ledger_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  // Download as PDF - Generates a professional report PDF
  const handleDownloadPDF = async () => {
    try {
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Please allow popups to download PDF",
          variant: "destructive"
        });
        return;
      }

      // Generate PDF content with professional report format
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Customer Ledger Report - ${customer.first_name} ${customer.last_name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.6;
              background: white;
            }
            
            .company-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
            }
            
            .company-header h1 {
              font-size: 26px;
              margin-bottom: 4px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            
            .company-header .subtitle {
              font-size: 13px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            
            .report-title {
              text-align: center;
              margin: 20px 0 15px 0;
              padding: 10px;
            }
            
            .report-title h2 {
              font-size: 22px;
              font-weight: 700;
              margin-bottom: 4px;
            }
            
            .report-title .period {
              font-size: 13px;
              color: #6b7280;
            }
            
            .account-info {
              margin: 15px 0;
              padding: 12px;
            }
            
            .account-info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px 30px;
            }
            
            .account-info p {
              font-size: 13px;
              margin: 0;
              display: flex;
              align-items: center;
            }
            
            .account-info strong {
              color: #374151;
              min-width: 100px;
              display: inline-block;
            }
            
            .balance-summary {
              margin: 15px 0;
            }
            
            .balance-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .balance-row:last-child {
              border-bottom: none;
            }
            
            .balance-label {
              font-size: 13px;
              color: #6b7280;
              font-weight: 500;
            }
            
            .balance-amount {
              font-size: 18px;
              font-weight: 700;
            }
            
            .balance-status {
              font-size: 11px;
              color: #6b7280;
              font-weight: 500;
              margin-top: 2px;
            }
            
            .debit-text { color: #000; }
            .credit-text { color: #000; }
            .balance-text { color: #000; }
            
            .ledger-table {
              margin: 15px 0;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            
            thead {
              background: transparent;
            }
            
            th {
              padding: 12px 10px;
              text-align: left;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.8px;
              border-bottom: 1px solid #000;
            }
            
            td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .text-right {
              text-align: right;
            }
            
            tfoot {
              font-weight: 700;
              font-size: 13px;
              border-top: 1px solid #000;
            }
            
            tfoot td {
              padding: 14px 10px;
              border-top: 1px solid #000;
            }
            
            .settlement-badge {
              display: inline-block;
              padding: 2px 6px;
              border: 1px solid #999;
              border-radius: 3px;
              font-size: 9px;
              font-weight: 600;
              margin-left: 6px;
              text-transform: uppercase;
            }
            
            .account-summary {
              margin: 30px 0 20px 0;
              padding: 20px 0;
            }
            
            .account-summary h3 {
              font-size: 14px;
              margin-bottom: 15px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 13px;
            }
            
            .summary-row:last-child {
              font-weight: 700;
              font-size: 15px;
              padding-top: 12px;
              margin-top: 8px;
              border-top: 1px solid #000;
            }
            
            .footer {
              margin-top: 25px;
              padding-top: 15px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 30px;
            }
            
            .signature-box {
              text-align: center;
              padding: 20px;
            }
            
            .signature-line {
              border-top: 1px solid #1a1a1a;
              margin-top: 60px;
              padding-top: 8px;
              font-size: 12px;
              font-weight: 600;
            }
            
            .signature-label {
              font-size: 10px;
              color: #6b7280;
              margin-top: 4px;
            }
            
            .document-footer {
              margin-top: 20px;
              padding-top: 10px;
              text-align: center;
              font-size: 10px;
              color: #6b7280;
            }
            
            .document-footer p {
              margin: 3px 0;
            }
            
            @media print {
              @page {
                margin: 1cm;
                size: A4;
              }
            }
          </style>
        </head>
        <body>
          <div class="company-header">
            <h1>KILANGO GROUP</h1>
            <div class="subtitle">P O I N T   O F   S A L E   M A N A G E M E N T   S Y S T E M</div>
          </div>
          
          <div class="report-title">
            <h2>CUSTOMER LEDGER ACCOUNT</h2>
            <div class="period">Statement as at ${new Date().toLocaleDateString('en-TZ', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric'
            })}</div>
          </div>
          
          <div class="account-info">
            <div class="account-info-grid">
              <p><strong>Account Name:</strong> ${customer.first_name} ${customer.last_name}</p>
              ${customer.phone ? `<p><strong>Phone:</strong> ${customer.phone}</p>` : ''}
              ${customer.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ''}
              ${customer.address ? `<p><strong>Address:</strong> ${customer.address}</p>` : ''}
            </div>
          </div>

          <div class="balance-summary">
            <div class="balance-row">
              <div>
                <div class="balance-label">Total Debits</div>
                <div class="balance-status">All Sales</div>
              </div>
              <div class="balance-amount debit-text">${formatCurrency(totalDebits)}</div>
            </div>
            <div class="balance-row">
              <div>
                <div class="balance-label">Total Credits</div>
                <div class="balance-status">Payments & Settlements</div>
              </div>
              <div class="balance-amount credit-text">${formatCurrency(totalCredits)}</div>
            </div>
            <div class="balance-row">
              <div>
                <div class="balance-label">Net Balance</div>
                <div class="balance-status">${currentBalance > 0 ? 'DEBIT (Amount Owed)' : currentBalance < 0 ? 'CREDIT (Overpaid)' : 'CLEARED'}</div>
              </div>
              <div class="balance-amount balance-text">${formatCurrency(Math.abs(currentBalance))}</div>
            </div>
          </div>

          <div class="ledger-table">
            <table>
              <thead>
                <tr>
                  <th style="width: 100px;">Date</th>
                  <th>Particulars / Description</th>
                  <th class="text-right" style="width: 130px;">Debit (TSh)</th>
                  <th class="text-right" style="width: 130px;">Credit (TSh)</th>
                  <th class="text-right" style="width: 130px;">Balance (TSh)</th>
                </tr>
              </thead>
              <tbody>
                ${filteredEntries.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
                      No transactions recorded for this period
                    </td>
                  </tr>
                ` : filteredEntries.map(entry => `
                  <tr>
                    <td>${entry.date}</td>
                    <td>
                      ${entry.description}
                      ${entry.type === 'settlement' ? '<span class="settlement-badge">Settlement</span>' : ''}
                      ${entry.type === 'debt_payment' ? '<span class="settlement-badge" style="background: #dcfce7; color: #166534;">Payment</span>' : ''}
                    </td>
                    <td class="text-right" style="color: ${entry.debit > 0 ? '#dc2626' : '#9ca3af'}; font-weight: ${entry.debit > 0 ? '600' : '400'};">
                      ${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </td>
                    <td class="text-right" style="color: ${entry.credit > 0 ? '#16a34a' : '#9ca3af'}; font-weight: ${entry.credit > 0 ? '600' : '400'};">
                      ${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </td>
                    <td class="text-right" style="color: ${entry.balance > 0 ? '#dc2626' : entry.balance < 0 ? '#16a34a' : '#6b7280'}; font-weight: 700;">
                      ${formatCurrency(Math.abs(entry.balance))} ${entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2"><strong>TOTALS</strong></td>
                  <td class="text-right debit-text"><strong>${formatCurrency(totalDebits)}</strong></td>
                  <td class="text-right credit-text"><strong>${formatCurrency(totalCredits)}</strong></td>
                  <td class="text-right balance-text" style="font-weight: 800;">
                    <strong>${formatCurrency(Math.abs(currentBalance))} ${currentBalance > 0 ? 'Dr' : currentBalance < 0 ? 'Cr' : ''}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="footer">
            <div class="signature-box">
              <div class="signature-line">Prepared By</div>
              <div class="signature-label">Date: ${new Date().toLocaleDateString('en-TZ')}</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Approved By</div>
              <div class="signature-label">Date: _______________</div>
            </div>
          </div>

          <div class="document-footer">
            <p><strong>System Generated Report</strong> - No Manual Signature Required</p>
            <p>Generated on ${new Date().toLocaleDateString('en-TZ', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p style="margin-top: 8px; font-style: italic;">This is an official financial document. Please retain for your records.</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        printWindow.print();
      };

      toast({
        title: "Success",
        description: "PDF report generated successfully",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive"
      });
    }
  };

  // Share as PDF - Share ledger summary via Web Share API
  const handleSharePDF = async () => {
    try {
      // Create a formatted text summary for sharing
      const shareText = `
Customer Ledger Account
${customer.first_name} ${customer.last_name}
${'='.repeat(50)}

Customer Information:
${customer.phone ? `Phone: ${customer.phone}` : ''}
${customer.email ? `Email: ${customer.email}` : ''}
${customer.address ? `Address: ${customer.address}` : ''}

Financial Summary:
- Total Debits (All Sales): ${formatCurrency(totalDebits)}
- Total Credits (Payments & Settlements): ${formatCurrency(totalCredits)}
- Current Balance: ${formatCurrency(Math.abs(currentBalance))} ${currentBalance > 0 ? '(OWES)' : currentBalance < 0 ? '(CREDIT)' : '(CLEARED)'}

Recent Transactions (${filteredEntries.length} entries):
${'─'.repeat(50)}
${filteredEntries.map(entry => 
  `${entry.date} | ${entry.description} | Debit: ${entry.debit > 0 ? formatCurrency(entry.debit) : '-'} | Credit: ${entry.credit > 0 ? formatCurrency(entry.credit) : '-'} | Balance: ${formatCurrency(Math.abs(entry.balance))} ${entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}`
).join('\n')}
${'─'.repeat(50)}

Generated: ${new Date().toLocaleDateString('en-TZ', { year: 'numeric', month: 'long', day: 'numeric' })}
      `.trim();

      if (navigator.share) {
        await navigator.share({
          title: `Customer Ledger - ${customer.first_name} ${customer.last_name}`,
          text: shareText,
        });
        toast({
          title: "Success",
          description: "Ledger shared successfully",
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied!",
          description: "Ledger summary copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // User cancelled or error - don't show error toast for cancellation
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Error",
          description: "Failed to share ledger",
          variant: "destructive"
        });
      }
    }
  };

  // Print Ledger - Opens optimized print window
  const handlePrint = () => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Please allow popups to print",
          variant: "destructive"
        });
        return;
      }

      // Generate print-optimized content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Customer Ledger - ${customer.first_name} ${customer.last_name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.6;
              background: white;
            }
            
            .company-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
            }
            
            .company-header h1 {
              font-size: 26px;
              margin-bottom: 4px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            
            .company-header .subtitle {
              font-size: 13px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            
            .report-title {
              text-align: center;
              margin: 20px 0 15px 0;
              padding: 10px;
            }
            
            .report-title h2 {
              font-size: 22px;
              font-weight: 700;
              margin-bottom: 4px;
            }
            
            .report-title .period {
              font-size: 13px;
              color: #6b7280;
            }
            
            .account-info {
              margin: 15px 0;
              padding: 12px;
            }
            
            .account-info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px 30px;
            }
            
            .account-info p {
              font-size: 13px;
              margin: 0;
              display: flex;
              align-items: center;
            }
            
            .account-info strong {
              color: #374151;
              min-width: 100px;
              display: inline-block;
            }
            
            .balance-summary {
              margin: 15px 0;
            }
            
            .balance-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .balance-row:last-child {
              border-bottom: none;
            }
            
            .balance-label {
              font-size: 13px;
              color: #6b7280;
              font-weight: 500;
            }
            
            .balance-amount {
              font-size: 18px;
              font-weight: 700;
            }
            
            .balance-status {
              font-size: 11px;
              color: #6b7280;
              font-weight: 500;
              margin-top: 2px;
            }
            
            .debit-text { color: #000; }
            .credit-text { color: #000; }
            .balance-text { color: #000; }
            
            .ledger-table {
              margin: 15px 0;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            
            thead {
              background: transparent;
            }
            
            th {
              padding: 12px 10px;
              text-align: left;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.8px;
              border-bottom: 1px solid #000;
            }
            
            td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            
            tbody tr:hover {
              background: #f3f4f6;
            }
            
            .opening-balance-row {
              background: #fef3c7 !important;
              font-weight: 600;
            }
            
            .closing-balance-row {
              background: #dbeafe !important;
              font-weight: 700;
              border-top: 2px solid #1e3a8a;
            }
            
            .text-right {
              text-align: right;
            }
            
            tfoot {
              font-weight: 700;
              font-size: 13px;
              border-top: 1px solid #000;
            }
            
            tfoot td {
              padding: 14px 10px;
              border-top: 1px solid #000;
            }
            
            .transaction-note {
              font-size: 10px;
              color: #6b7280;
              font-style: italic;
            }
            
            .settlement-badge {
              display: inline-block;
              padding: 2px 6px;
              border: 1px solid #999;
              border-radius: 3px;
              font-size: 9px;
              font-weight: 600;
              margin-left: 6px;
              text-transform: uppercase;
            }
            
            .account-summary {
              margin: 30px 0 20px 0;
              padding: 20px 0;
            }
            
            .account-summary h3 {
              font-size: 14px;
              margin-bottom: 15px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 13px;
            }
            
            .summary-row:last-child {
              font-weight: 700;
              font-size: 15px;
              padding-top: 12px;
              margin-top: 8px;
              border-top: 1px solid #000;
            }
            
            .footer {
              margin-top: 25px;
              padding-top: 15px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 30px;
            }
            
            .signature-box {
              text-align: center;
              padding: 20px;
            }
            
            .signature-line {
              border-top: 1px solid #1a1a1a;
              margin-top: 60px;
              padding-top: 8px;
              font-size: 12px;
              font-weight: 600;
            }
            
            .signature-label {
              font-size: 10px;
              color: #6b7280;
              margin-top: 4px;
            }
            
            .document-footer {
              margin-top: 20px;
              padding-top: 10px;
              text-align: center;
              font-size: 10px;
              color: #6b7280;
            }
            
            .document-footer p {
              margin: 3px 0;
            }
            
            @media print {
              body {
                padding: 15px;
              }
              
              @page {
                margin: 1cm;
                size: A4;
              }
              
              table {
                page-break-inside: auto;
              }
              
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
              thead {
                display: table-header-group;
              }
              
              tfoot {
                display: table-footer-group;
              }
              
              .no-break {
                page-break-before: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="company-header">
            <h1>KILANGO GROUP</h1>
            <div class="subtitle">P O I N T   O F   S A L E   M A N A G E M E N T   S Y S T E M</div>
          </div>
          
          <div class="report-title">
            <h2>CUSTOMER LEDGER ACCOUNT</h2>
            <div class="period">Statement as at ${new Date().toLocaleDateString('en-TZ', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric'
            })}</div>
          </div>
          
          <div class="account-info">
            <div class="account-info-grid">
              <p><strong>Account Name:</strong> ${customer.first_name} ${customer.last_name}</p>
              ${customer.phone ? `<p><strong>Phone:</strong> ${customer.phone}</p>` : ''}
              ${customer.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ''}
              ${customer.address ? `<p><strong>Address:</strong> ${customer.address}</p>` : ''}
            </div>
          </div>

          <div class="balance-summary">
            <div class="balance-row">
              <div>
                <div class="balance-label">Total Debits</div>
                <div class="balance-status">All Sales</div>
              </div>
              <div class="balance-amount debit-text">${formatCurrency(totalDebits)}</div>
            </div>
            <div class="balance-row">
              <div>
                <div class="balance-label">Total Credits</div>
                <div class="balance-status">Payments & Settlements</div>
              </div>
              <div class="balance-amount credit-text">${formatCurrency(totalCredits)}</div>
            </div>
            <div class="balance-row">
              <div>
                <div class="balance-label">Net Balance</div>
                <div class="balance-status">${currentBalance > 0 ? 'DEBIT (Amount Owed)' : currentBalance < 0 ? 'CREDIT (Overpaid)' : 'CLEARED'}</div>
              </div>
              <div class="balance-amount balance-text">${formatCurrency(Math.abs(currentBalance))}</div>
            </div>
          </div>

          <div class="ledger-table">
            <table>
              <thead>
                <tr>
                  <th style="width: 100px;">Date</th>
                  <th>Particulars / Description</th>
                  <th class="text-right" style="width: 130px;">Debit (TSh)</th>
                  <th class="text-right" style="width: 130px;">Credit (TSh)</th>
                  <th class="text-right" style="width: 130px;">Balance (TSh)</th>
                </tr>
              </thead>
              <tbody>
                ${filteredEntries.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
                      No transactions recorded for this period
                    </td>
                  </tr>
                ` : filteredEntries.map((entry, index) => `
                  <tr>
                    <td>${entry.date}</td>
                    <td>
                      ${entry.description}
                      ${entry.type === 'settlement' ? '<span class="settlement-badge">Settlement</span>' : ''}
                      ${entry.type === 'debt_payment' ? '<span class="settlement-badge" style="background: #dcfce7; color: #166534;">Payment</span>' : ''}
                    </td>
                    <td class="text-right" style="color: ${entry.debit > 0 ? '#dc2626' : '#9ca3af'}; font-weight: ${entry.debit > 0 ? '600' : '400'};">
                      ${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </td>
                    <td class="text-right" style="color: ${entry.credit > 0 ? '#16a34a' : '#9ca3af'}; font-weight: ${entry.credit > 0 ? '600' : '400'};">
                      ${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </td>
                    <td class="text-right" style="color: ${entry.balance > 0 ? '#dc2626' : entry.balance < 0 ? '#16a34a' : '#6b7280'}; font-weight: 700;">
                      ${formatCurrency(Math.abs(entry.balance))} ${entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="closing-balance-row">
                  <td colspan="2"><strong>TOTALS</strong></td>
                  <td class="text-right debit-text"><strong>${formatCurrency(totalDebits)}</strong></td>
                  <td class="text-right credit-text"><strong>${formatCurrency(totalCredits)}</strong></td>
                  <td class="text-right balance-text" style="font-weight: 800;">
                    <strong>${formatCurrency(Math.abs(currentBalance))} ${currentBalance > 0 ? 'Dr' : currentBalance < 0 ? 'Cr' : ''}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="footer">
            <div class="signature-box">
              <div class="signature-line">Prepared By</div>
              <div class="signature-label">Date: ${new Date().toLocaleDateString('en-TZ')}</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Approved By</div>
              <div class="signature-label">Date: _______________</div>
            </div>
          </div>

          <div class="document-footer">
            <p><strong>System Generated Report</strong> - No Manual Signature Required</p>
            <p>Generated on ${new Date().toLocaleDateString('en-TZ', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p style="margin-top: 8px; font-style: italic;">This is an official financial document. Please retain for your records.</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };

      toast({
        title: "Success",
        description: "Print dialog opened",
      });
    } catch (error) {
      console.error('Error printing:', error);
      toast({
        title: "Error",
        description: "Failed to open print dialog",
        variant: "destructive"
      });
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="text-muted-foreground">Customer Ledger Account</p>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search, Date Range, and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateFrom ? "default" : "outline"}
                    size="sm"
                    className="w-[140px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? dateFrom.toLocaleDateString() : "From Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateTo ? "default" : "outline"}
                    size="sm"
                    className="w-[140px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? dateTo.toLocaleDateString() : "To Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Actions Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download in .pdf
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSharePDF}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share in .pdf
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export in .xls
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Ledger
                </DropdownMenuItem>
                <DropdownMenuItem onClick={clearFilters}>
                  <Search className="h-4 w-4 mr-2" />
                  Clear Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Debits (All Sales)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {formatCurrency(totalDebits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Credits (Payments & Settlements)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              {formatCurrency(totalCredits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
              <DollarSign className="h-5 w-5" />
              {formatCurrency(Math.abs(currentBalance))}
              {currentBalance > 0 && <Badge variant="destructive">OWES</Badge>}
              {currentBalance < 0 && <Badge variant="default">CREDIT</Badge>}
              {currentBalance === 0 && <Badge variant="outline">CLEARED</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* T-Account Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ledger Account</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Debit (Sales)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Credit (Payments/Settlements)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      {ledgerEntries.length === 0 ? 'No transactions found for this customer' : 'No transactions match your filters'}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, index) => (
                    <tr 
                      key={entry.id} 
                      className={`border-b hover:bg-gray-50 ${(entry.type === 'credit_sale' || entry.type === 'cash_sale' || entry.type === 'card_sale' || entry.type === 'mobile_sale') ? 'bg-red-50/30' : 'bg-green-50/30'}`}
                    >
                      <td className="px-4 py-3 text-sm">{entry.date}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {entry.description}
                        {entry.type === 'settlement' && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">Settlement</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${entry.balance > 0 ? 'text-red-600' : entry.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatCurrency(Math.abs(entry.balance))} {entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <td colSpan={2} className="px-4 py-3 text-sm">Totals</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(totalDebits)}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(totalCredits)}</td>
                  <td className={`px-4 py-3 text-sm text-right ${currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {formatCurrency(Math.abs(currentBalance))} {currentBalance > 0 ? 'Dr' : currentBalance < 0 ? 'Cr' : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
