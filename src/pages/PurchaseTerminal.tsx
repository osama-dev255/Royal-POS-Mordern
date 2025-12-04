import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Minus, Trash2, ShoppingCart, Search, User, Percent, CreditCard, Wallet, Scan, Star, Printer, Download, Truck, Package, PackagePlus, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { PrintUtils } from "@/utils/printUtils";
// Import Supabase database service
import { getProducts, getSuppliers, updateProductStock, createSupplier, createPurchaseOrder, createPurchaseOrderItem, createDebt, Product, Supplier as DatabaseSupplier } from "@/services/databaseService";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  tax_id?: string;
}

export const PurchaseTerminal = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isTransactionCompleteDialogOpen, setIsTransactionCompleteDialogOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    tax_id: ""
  });
  const [completedPurchaseOrder, setCompletedPurchaseOrder] = useState<any>(null); // Store completed purchase order for printing
  const { toast } = useToast();

  // Load products and suppliers from Supabase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load products
        const productData = await getProducts();
        setProducts(productData);
        
        // Load suppliers
        const supplierData = await getSuppliers();
        const formattedSuppliers = supplierData.map(supplier => ({
          id: supplier.id || '',
          name: supplier.name,
          contactPerson: supplier.contact_person || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          tax_id: supplier.tax_id || ''
        }));
        setSuppliers(formattedSuppliers);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load products and suppliers",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredProducts = products.filter(product => 
    (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.barcode && product.barcode.includes(searchTerm)) ||
    (product.sku && product.sku.includes(searchTerm))
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: product.id || '',
        name: product.name,
        price: product.cost_price,
        quantity: 1,
      };
      setCart([...cart, newItem]);
    }
    
    setSearchTerm("");
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  // Display only tax (18% of subtotal) - for informational purposes only
  const displayTax = subtotal * 0.18;
  
  const discountAmount = discountType === "percentage" 
    ? subtotal * (parseFloat(discountValue) / 100 || 0)
    : parseFloat(discountValue) || 0;
    
  // Actual total calculation (tax not included in computation)
  const total = subtotal - discountAmount;
  
  const amountReceivedNum = parseFloat(amountReceived) || 0;
  const change = amountReceivedNum - total;

  const processTransaction = () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    setIsPaymentDialogOpen(true);
  };

  const completeTransaction = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    // Check if supplier is selected
    if (!selectedSupplier) {
      toast({
        title: "Error",
        description: "Please select a supplier before completing the purchase",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "cash" && change < 0) {
      toast({
        title: "Error",
        description: "Insufficient payment amount",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create the purchase order record in the database
      const purchaseOrderData = {
        supplier_id: selectedSupplier.id, // Now required, no longer allows null
        user_id: null, // In a real app, this would be the current user ID
        order_number: `PO-${Date.now()}`,
        order_date: new Date().toISOString(),
        total_amount: total,
        status: "received",
        notes: "Purchase completed through terminal"
      };

      const createdPurchaseOrder = await createPurchaseOrder(purchaseOrderData);
      
      if (!createdPurchaseOrder) {
        throw new Error("Failed to create purchase order record");
      }

      // Create purchase order items for each product in the cart
      const itemsWithQuantity = cart.filter(item => item.quantity > 0);
      for (const item of itemsWithQuantity) {
        const purchaseOrderItemData = {
          purchase_order_id: createdPurchaseOrder.id || '',
          product_id: item.id,
          quantity_ordered: item.quantity,
          quantity_received: item.quantity,
          unit_cost: item.price,
          total_cost: item.price * item.quantity
        };
        
        await createPurchaseOrderItem(purchaseOrderItemData);
      }

      // Create debt record for credit transactions or partial payments
      if ((paymentMethod === "credit" || (paymentMethod === "cash" && amountReceivedNum > 0 && amountReceivedNum < total)) && selectedSupplier) {
        // Calculate the amount owed (either full amount for credit or remaining balance for partial payment)
        const amountOwed = paymentMethod === "credit" ? total : total - amountReceivedNum;
        
        const debtData = {
          supplier_id: selectedSupplier.id,
          debt_type: "supplier",
          amount: amountOwed,
          description: `Debt for purchase order ${createdPurchaseOrder.id || 'unknown'}${paymentMethod === "cash" ? " (partial payment)" : ""}`,
          status: "outstanding",
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        };

        const createdDebt = await createDebt(debtData);
        if (!createdDebt) {
          console.warn("Failed to create debt record for transaction");
        }
      }

      // Update stock quantities for each item in the cart
      for (const item of itemsWithQuantity) {
        // Find the original product to get current stock
        const product = products.find(p => p.id === item.id);
        if (product) {
          // Calculate new stock quantity
          const newStock = product.stock_quantity + item.quantity;
          // Update stock in database
          await updateProductStock(item.id, newStock);
        }
      }
      
      // Reload products to get updated stock quantities
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);

      // Show transaction complete dialog (without clearing cart yet)
      setIsPaymentDialogOpen(false);
      setIsTransactionCompleteDialogOpen(true);
      
      toast({
        title: "Success",
        description: `Purchase completed successfully${(paymentMethod === "credit" || (paymentMethod === "cash" && amountReceivedNum > 0 && amountReceivedNum < total)) ? " with outstanding debt" : ""}`,
      });

      // Store completed purchase order for printing
      setCompletedPurchaseOrder(createdPurchaseOrder);
    } catch (error) {
      console.error("Error completing transaction:", error);
      toast({
        title: "Error",
        description: "Failed to complete transaction: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name) {
      toast({
        title: "Error",
        description: "Supplier name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const supplierData = {
        name: newSupplier.name,
        contact_person: newSupplier.contact_person || "",
        email: newSupplier.email || "",
        phone: newSupplier.phone || "",
        tax_id: newSupplier.tax_id || "",
        is_active: true
      };

      const createdSupplier = await createSupplier(supplierData);
      
      if (createdSupplier) {
        // Format the created supplier to match our Supplier interface
        const formattedSupplier: Supplier = {
          id: createdSupplier.id || '',
          name: createdSupplier.name,
          contactPerson: createdSupplier.contact_person || '',
          email: createdSupplier.email || '',
          phone: createdSupplier.phone || '',
          tax_id: createdSupplier.tax_id || ''
        };
        
        // Add the new supplier to the suppliers list
        setSuppliers([...suppliers, formattedSupplier]);
        
        // Select the newly created supplier
        setSelectedSupplier(formattedSupplier);
        
        // Close the dialog
        setIsSupplierDialogOpen(false);
        
        // Reset the new supplier form
        setNewSupplier({
          name: "",
          contact_person: "",
          email: "",
          phone: "",
          tax_id: ""
        });
        
        toast({
          title: "Success",
          description: "Supplier added successfully",
        });
      } else {
        throw new Error("Failed to create supplier");
      }
    } catch (error) {
      console.error("Error creating supplier:", error);
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Purchase Terminal" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">Purchase Terminal</h1>
            <p className="text-muted-foreground">Process supplier purchases and manage incoming inventory</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" onClick={() => setIsScannerOpen(true)}>
              <Scan className="h-4 w-4 mr-2" />
              Scan Item
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={processTransaction}>
              <PackagePlus className="h-4 w-4 mr-2" />
              Process Purchase
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Search and Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Search */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  Product Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name, barcode, or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-blue-200"
                  />
                </div>
                
                {searchTerm && (
                  <div className="mt-2 border border-blue-200 rounded-md max-h-60 overflow-y-auto">
                    {loading ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Loading products...
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No products found
                      </div>
                    ) : (
                      <div className="divide-y divide-blue-100">
                        {filteredProducts.map((product) => (
                          <div 
                            key={product.id}
                            className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                            onClick={() => addToCart(product)}
                          >
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {product.barcode && `Barcode: ${product.barcode}`}
                                {product.sku && `SKU: ${product.sku}`}
                                <div className="flex items-center mt-1">
                                  <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                    Stock: {product.stock_quantity}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="font-medium text-blue-600">{formatCurrency(product.cost_price)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Cart */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  Purchase Cart
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 text-blue-3300" />
                    <p>Your purchase cart is empty</p>
                    <p className="text-sm">Add products using the search above</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(item.price)} × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQuantity = Math.max(0, parseInt(e.target.value) || 0);
                              setCart(cart.map(cartItem => 
                                cartItem.id === item.id 
                                  ? { ...cartItem, quantity: newQuantity } 
                                  : cartItem
                              ));
                            }}
                            className="w-16 border-blue-300"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-100"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="font-medium ml-4 text-blue-600">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                    
                    <Separator className="bg-blue-200" />
                    
                    <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (18%):</span>
                        <span className="font-medium">{formatCurrency(displayTax)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-blue-700">
                        <span>Total:</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Note: Tax is for display purposes only and not included in calculations
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Supplier and Transaction Info */}
          <div className="space-y-6">
            {/* Supplier Selection */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Supplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSupplier ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{selectedSupplier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedSupplier.contactPerson && `Contact: ${selectedSupplier.contactPerson}`}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-600 hover:bg-blue-100"
                        onClick={() => setSelectedSupplier(null)}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => setIsSupplierDialogOpen(true)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Select Supplier
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Discount */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-blue-600" />
                  Discount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Select 
                    value={discountType} 
                    onValueChange={(value) => setDiscountType(value as "percentage" | "amount")}
                  >
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="amount">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder={discountType === "percentage" ? "0%" : "Tsh0.00"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="border-blue-200"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="border-blue-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Cash
                          </div>
                        </SelectItem>
                        <SelectItem value="credit">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Credit
                          </div>
                        </SelectItem>
                        <SelectItem value="card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Card
                          </div>
                        </SelectItem>
                        <SelectItem value="mobile">
                          <div className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Mobile Money
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 text-sm bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (18%):</span>
                      <span>{formatCurrency(displayTax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-700">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={processTransaction}
                    disabled={cart.length === 0}
                  >
                    Process Purchase
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Supplier Selection Dialog */}
        <Dialog open={isSupplierDialogOpen} onOpenChange={(open) => {
          setIsSupplierDialogOpen(open);
          if (!open) {
            // Reset new supplier form when dialog is closed
            setIsAddingNewSupplier(false);
            setNewSupplier({
              name: "",
              contact_person: "",
              email: "",
              phone: "",
              tax_id: ""
            });
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {isAddingNewSupplier ? "Add New Supplier" : "Select Supplier"}
              </DialogTitle>
            </DialogHeader>
            
            {isAddingNewSupplier ? (
              // New Supplier Form
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                    placeholder="Enter supplier name"
                    className="border-blue-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={newSupplier.contact_person}
                    onChange={(e) => setNewSupplier({...newSupplier, contact_person: e.target.value})}
                    placeholder="Enter contact person"
                    className="border-blue-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                    placeholder="Enter email"
                    className="border-blue-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                    placeholder="Enter phone number"
                    className="border-blue-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID (TIN)</Label>
                  <Input
                    id="taxId"
                    value={newSupplier.tax_id}
                    onChange={(e) => setNewSupplier({...newSupplier, tax_id: e.target.value})}
                    placeholder="Enter tax identification number"
                    className="border-blue-200"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    className="border-blue-300 text-blue-600 hover:bg-blue-100"
                    onClick={() => {
                      setIsAddingNewSupplier(false);
                      setNewSupplier({
                        name: "",
                        contact_person: "",
                        email: "",
                        phone: "",
                        tax_id: ""
                      });
                    }}
                  >
                    Back
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateSupplier}>
                    Add Supplier
                  </Button>
                </div>
              </div>
            ) : (
              // Supplier Selection List
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading suppliers...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => setIsAddingNewSupplier(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Supplier
                    </Button>
                    
                    {suppliers.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No suppliers found
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {suppliers.map((supplier) => (
                          <div
                            key={supplier.id}
                            className="p-3 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setIsSupplierDialogOpen(false);
                            }}
                          >
                            <div>
                              <div className="font-medium">{supplier.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {supplier.contactPerson && `Contact: ${supplier.contactPerson}`}
                              </div>
                            </div>
                            <Truck className="h-4 w-4 text-blue-500" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Purchase</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Amount</Label>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(total)}</div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <div className="flex items-center gap-2">
                    {paymentMethod === "cash" ? (
                      <Wallet className="h-4 w-4 text-blue-500" />
                    ) : (
                      <CreditCard className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="capitalize">{paymentMethod}</span>
                  </div>
                </div>
              </div>
              
              {paymentMethod === "cash" && (
                <div>
                  <Label>Amount Paid</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="border-blue-200"
                  />
                  {amountReceived && (
                    <div className="mt-2 text-sm">
                      Change: <span className={change < 0 ? "text-red-500" : "text-green-500"}>
                        {formatCurrency(change)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-100" onClick={() => setIsPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={completeTransaction}>
                  Complete Purchase
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transaction Complete Dialog */}
        <Dialog open={isTransactionCompleteDialogOpen} onOpenChange={setIsTransactionCompleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Purchase Complete</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-2xl font-bold text-green-600 mb-2">Success!</div>
                <p className="text-muted-foreground">
                  Purchase processed successfully for {formatCurrency(total)}
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                  // Prepare transaction data for printing
                  const transactionData = {
                    orderNumber: completedPurchaseOrder?.order_number || `PO-${Date.now()}`,
                    date: new Date().toISOString(),
                    supplier: selectedSupplier,
                    items: cart.map(item => ({
                      name: item.name,
                      quantity: item.quantity,
                      price: item.price,
                      total: item.price * item.quantity
                    })),
                    subtotal: subtotal,
                    discount: discountAmount,
                    total: total,
                    paymentMethod: paymentMethod,
                    amountReceived: (paymentMethod === "credit" ? 0 : amountReceivedNum) || 0,
                    change: (paymentMethod === "credit" ? 0 : change) || 0
                  };
                  
                  // Print receipt
                  PrintUtils.printPurchaseReceipt(transactionData);
                  
                  // Keep dialog open to allow user to choose again
                }}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                
                <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-100" onClick={() => {
                  // Clear cart and reset form
                  setCart([]);
                  setSelectedSupplier(null);
                  setDiscountValue("");
                  setAmountReceived("");
                  setIsTransactionCompleteDialogOpen(false);
                }}>
                  <X className="h-4 w-4 mr-2" />
                  Quit Cart
                </Button>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Choose an option above to continue
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Barcode Scanner */}
        <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Scan Barcode</DialogTitle>
            </DialogHeader>
            <BarcodeScanner 
              onItemsScanned={(items) => {
                // Convert scanned items to cart items
                const cartItems = items.map(item => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity
                }));
                setCart([...cart, ...cartItems]);
                setIsScannerOpen(false);
              }}
              onCancel={() => setIsScannerOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};