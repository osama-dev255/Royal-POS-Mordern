import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Download, 
  Upload, 
  FileText, 
  FileJson, 
  FileSpreadsheet,
  Printer,
  AlertCircle,
  Table
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExportUtils } from "@/utils/exportUtils";
import { ImportUtils } from "@/utils/importUtils";
import { ExcelUtils } from "@/utils/excelUtils";

interface ExportImportManagerProps {
  data: any[];
  dataType: string;
  onImport?: (data: any[]) => void;
}

export const ExportImportManager = ({ data, dataType, onImport }: ExportImportManagerProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState("");
  const [importFormat, setImportFormat] = useState("csv");

  // Handle export
  const handleExport = (format: string) => {
    const filename = `${dataType}_${new Date().toISOString().split('T')[0]}`;
    
    try {
      switch (format) {
        case "csv":
          ExportUtils.exportToCSV(data, filename);
          break;
        case "json":
          ExportUtils.exportToJSON(data, filename);
          break;
        case "pdf":
          ExportUtils.exportToPDF(data, filename, `${dataType} Report`);
          break;
        case "excel":
          ExcelUtils.exportToExcel(data, filename);
          break;
        default:
          throw new Error("Unsupported export format");
      }
      
      toast({
        title: "Export Successful",
        description: `Data exported as ${format.toUpperCase()} successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "success",
      });
    }
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setImportData(content);
      }
    };
    reader.readAsText(file);
  };

  // Handle manual import
  const handleManualImport = () => {
    if (!importData.trim()) {
      toast({
        title: "Import Failed",
        description: "Please provide data to import",
        variant: "success",
      });
      return;
    }

    try {
      let parsedData: any[] = [];
      
      switch (importFormat) {
        case "csv":
          parsedData = ImportUtils.parseCSV(importData);
          break;
        case "json":
          parsedData = ImportUtils.parseJSON(importData);
          break;
        default:
          throw new Error("Unsupported import format");
      }

      // Validate data based on type
      let validation;
      switch (dataType) {
        case "products":
          validation = ImportUtils.validateProducts(parsedData);
          break;
        case "customers":
          validation = ImportUtils.validateCustomers(parsedData);
          break;
        case "suppliers":
          validation = ImportUtils.validateSuppliers(parsedData);
          break;
        default:
          validation = { valid: true, errors: [] };
      }

      if (!validation.valid) {
        toast({
          title: "Import Validation Failed",
          description: (
            <div>
              <p>Data validation errors:</p>
              <ul className="list-disc pl-4">
                {validation.errors.slice(0, 5).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {validation.errors.length > 5 && (
                  <li>...and {validation.errors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          ),
          variant: "success",
        });
        return;
      }

      if (onImport) {
        onImport(parsedData);
        toast({
          title: "Import Successful",
          description: `Successfully imported ${parsedData.length} records`,
        });
        setImportData("");
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "success",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export/Import Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Section */}
        <div>
          <h3 className="text-lg font-medium mb-3">Export Data</h3>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleExport("csv")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => handleExport("excel")}>
              <Table className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={() => handleExport("json")}>
              <FileJson className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={() => handleExport("pdf")}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Import Section */}
        <div>
          <h3 className="text-lg font-medium mb-3">Import Data</h3>
          <div className="space-y-4">
            {/* File Import */}
            <div>
              <Label>Import from file</Label>
              <div className="flex gap-2 mt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".csv,.json"
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
                <Select value={importFormat} onValueChange={setImportFormat}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Manual Import */}
            <div>
              <Label>Or paste data manually</Label>
              <Textarea
                placeholder={`Paste your ${importFormat.toUpperCase()} data here...`}
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="mt-2 min-h-[120px]"
              />
              <Button 
                onClick={handleManualImport}
                className="mt-2"
                disabled={!importData.trim()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
            
            {importData && (
              <div className="text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Review the data above before importing
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};