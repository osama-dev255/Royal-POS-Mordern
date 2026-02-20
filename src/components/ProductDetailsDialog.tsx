import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Eye, Package, DollarSign, ShoppingCart, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Product } from "@/services/databaseService";
import { formatCurrency } from "@/lib/currency";

interface ProductDetailsDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductDetailsDialog = ({ product, open, onOpenChange }: ProductDetailsDialogProps) => {
  if (!product) return null;

  const stockLevel = product.stock_quantity;
  const minLevel = product.min_stock_level || 10;
  const isLowStock = stockLevel > 0 && stockLevel < minLevel;
  const isOutOfStock = stockLevel === 0;
  const totalValue = product.selling_price * stockLevel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Product Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{product.name}</h2>
              <p className="text-sm text-muted-foreground">{product.description}</p>
            </div>
            <Badge variant={isOutOfStock ? "destructive" : isLowStock ? "outline" : "default"}>
              {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
            </Badge>
          </div>

          <Separator />

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Current Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
                  {stockLevel}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Min Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{minLevel}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Unit Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(product.cost_price)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Product Details Table */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Name</TableCell>
                      <TableCell>{product.name}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SKU</TableCell>
                      <TableCell>{product.sku || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Barcode</TableCell>
                      <TableCell>{product.barcode || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Category</TableCell>
                      <TableCell>{product.category_id || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Unit of Measure</TableCell>
                      <TableCell>{product.unit_of_measure || 'piece'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Description</TableCell>
                      <TableCell>{product.description || '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Selling Price</TableCell>
                      <TableCell>{formatCurrency(product.selling_price)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Cost Price</TableCell>
                      <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Wholesale Price</TableCell>
                      <TableCell>{product.wholesale_price ? formatCurrency(product.wholesale_price) : '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Inventory Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Current Stock</TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
                          {stockLevel}
                          {isLowStock && <AlertTriangle className="h-3 w-3" />}
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Min Stock Level</TableCell>
                      <TableCell>{minLevel}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Max Stock Level</TableCell>
                      <TableCell>{product.max_stock_level || 100}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Status</TableCell>
                      <TableCell>
                        <Badge variant={isOutOfStock ? "destructive" : isLowStock ? "outline" : "default"}>
                          {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={() => {
              // Close the details dialog first
              onOpenChange(false);
              // Trigger an event to open the edit product form in the parent component
              const event = new CustomEvent('editProductRequested', { detail: { product } });
              window.dispatchEvent(event);
            }}>
              Edit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};