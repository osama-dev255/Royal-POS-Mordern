import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Minus, Trash2, ShoppingCart, Search, User, Percent, CreditCard, Wallet, Scan, Star, Printer, Download, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { AutomationService } from "@/services/automationService";
import { PrintUtils } from "@/utils/printUtils";
import WhatsAppUtils from "@/utils/whatsappUtils";
import { saveInvoice, InvoiceData } from "@/utils/invoiceUtils";
// Import Supabase database service
import { getProducts, getCustomers, updateProductStock, createCustomer, createCustomerForOutlet, createSale, createSaleItem, createDebt, getDebtsByCustomerId, createSavedSale, getOutletCustomers, createOutletCustomer, createOutletSale, createOutletSaleItem, createOutletDebt, getOutletDebtsByCustomerId, getOutletDebtsByOutletId, updateOutletDebt, deleteOutletDebt, Product, Customer as DatabaseCustomer, OutletCustomer, incrementSoldQuantity, getAvailableInventoryByOutlet } from "@/services/databaseService";
import { canCreateSales, getCurrentUserRole, hasModuleAccess } from "@/utils/salesPermissionUtils";
import { useAuth } from "@/contexts/AuthContext";
import { getDeliveriesByOutletId } from "@/utils/deliveryUtils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  loyaltyPoints: number;
  address?: string;
  district_ward?: string;
  email?: string;
  phone?: string;
  tax_id?: string;
  creditLimit?: number;
}

// Update the temporary product interface to match the Product type
interface TempProduct {
  id: string;
  name: string;
  selling_price: number;
  barcode?: string;
  sku?: string;
  cost_price: number;
  stock_quantity: number;
}

interface SalesCartProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
  autoOpenScanner?: boolean;
  outletId?: string;
  outletName?: string;
}

export const SalesCart = ({ username, onBack, onLogout, outletId, outletName }: SalesCartProps) => {
  console.log("SalesCart rendered with outletId:", outletId, "outletName:", outletName);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isTransactionCompleteDialogOpen, setIsTransactionCompleteDialogOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerBalances, setCustomerBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [completedTransaction, setCompletedTransaction] = useState<any>(null); // Store completed transaction for printing
  const [creditBroughtForward, setCreditBroughtForward] = useState<number>(0); // Credit brought forward from previous debts
  const [shippingCost, setShippingCost] = useState<string>(""); // Shipping cost input
  const [adjustments, setAdjustments] = useState<string>(""); // Adjustments amount (can be positive or negative)
  const [adjustmentReason, setAdjustmentReason] = useState<string>(""); // Reason for adjustment
  const [debtPaymentAmount, setDebtPaymentAmount] = useState<string>(""); // Amount paid toward previous debt
  const [salesman, setSalesman] = useState<string>(""); // Salesman name
  const [driver, setDriver] = useState<string>(""); // Driver name
  const [dueDate, setDueDate] = useState<string>(""); // Due date for debt transactions
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false); // State for adding new customer
  const [newCustomer, setNewCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    district_ward: "",
    tax_id: ""
  }); // State for new customer data
  const { toast } = useToast();

  // Check user permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      const userRole = await getCurrentUserRole();
      if (!hasModuleAccess(userRole, "sales")) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the sales terminal.",
          variant: "destructive",
        });
        onBack(); // Redirect back to the previous view
      }
    };
    
    checkPermissions();
  }, [onBack, toast]);

  // Load products and customers from Supabase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load products - use outlet-specific products if outletId is provided
        if (outletId) {
          // Fetch products from database with sold quantities (everything from database)
          const dbInventory = await getAvailableInventoryByOutlet(outletId);
          const outletProducts: Product[] = [];
          
          // Convert database inventory to Product format (all values from DB)
          dbInventory.forEach(item => {
            const productId = `${item.outlet_id}-${item.name}`;
            const existingProduct = outletProducts.find(p => p.name === item.name);
            if (existingProduct) {
              existingProduct.stock_quantity += item.available_quantity || 0;
            } else {
              outletProducts.push({
                id: productId,
                name: item.name,
                selling_price: item.selling_price,
                cost_price: item.unit_cost,
                stock_quantity: item.available_quantity || 0,
                barcode: '',
                sku: item.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                category: item.category || 'General',
                unit: 'pcs',
                vat_rate: 18,
                is_active: true
              } as Product);
            }
          });
          
          setProducts(outletProducts);
          console.log(`Loaded ${outletProducts.length} products for outlet ${outletId}`);
        } else {
          // Load general products
          const productData = await getProducts();
          setProducts(productData);
        }
        
        // Load customers - use outlet_customers if outletId is present, otherwise general customers
        let customerData;
        if (outletId) {
          customerData = await getOutletCustomers(outletId);
        } else {
          customerData = await getCustomers();
        }
        const formattedCustomers = customerData.map(customer => ({
          id: customer.id || '',
          name: `${customer.first_name} ${customer.last_name}`,
          loyaltyPoints: customer.loyalty_points || 0,
          address: customer.address || '',
          district_ward: customer.district_ward || '',
          email: customer.email || '',
          phone: customer.phone || '',
          tax_id: customer.tax_id || '', // Include tax_id field
          creditLimit: customer.credit_limit || 0 // Include credit limit field
        }));
        setCustomers(formattedCustomers);
        
        // Fetch customer balances from outlet_debts if outletId is present
        if (outletId) {
          const debts = await getOutletDebtsByOutletId(outletId);
          const balances: Record<string, number> = {};
          debts.forEach(debt => {
            if (debt.customer_id && debt.status === 'outstanding') {
              balances[debt.customer_id] = (balances[debt.customer_id] || 0) + (debt.amount || 0);
            }
          });
          setCustomerBalances(balances);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load products and customers",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [outletId]);

  const filteredProducts = products.filter(product => 
    (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.barcode && product.barcode.includes(searchTerm)) ||
    (product.sku && product.sku.includes(searchTerm))
  );

  const addToCart = (product: Product) => {
    // Check if product is out of stock
    if (product.stock_quantity <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock`,
        variant: "success",
      });
      return;
    }
    
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      // Check if adding one more would exceed stock
      if (existingItem.quantity + 1 > product.stock_quantity) {
        toast({
          title: "Insufficient Stock",
          description: `${product.name} only has ${product.stock_quantity} items in stock. You cannot add more items to the cart.`,
          variant: "success",
        });
        return;
      }
      
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: product.id || '',
        name: product.name,
        price: product.selling_price,
        quantity: 1, // Changed to 1 instead of 0
      };
      setCart([...cart, newItem]);
    }
    
    setSearchTerm("");
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + change);
        // Find the product to check stock availability
        const product = products.find(p => p.id === id);
        
        // Check if the new quantity exceeds available stock
        if (product && newQuantity > product.stock_quantity) {
          toast({
            title: "Insufficient Stock",
            description: `${product.name} only has ${product.stock_quantity} items in stock. You cannot sell ${newQuantity} items.`,
            variant: "success",
          });
          // Return the item with maximum available stock
          return { ...item, quantity: product.stock_quantity };
        }
        
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  const discountAmount = discountType === "percentage" 
    ? subtotal * (parseFloat(discountValue) / 100 || 0)
    : parseFloat(discountValue) || 0;
    
  const shippingAmount = parseFloat(shippingCost) || 0;
  
  const adjustmentsAmount = parseFloat(adjustments) || 0;
  
  const total = subtotal - discountAmount + shippingAmount + adjustmentsAmount;
  
  // Tax is displayed as 18% but doesn't affect calculation (for display purposes only)
  const tax = (subtotal - discountAmount) * 0.18; // 18% tax for display on subtotal after discount
  const totalWithTax = total; // Tax doesn't affect the actual total
  
  const amountReceivedNum = parseFloat(amountReceived) || 0;
  const debtPaymentNum = parseFloat(debtPaymentAmount) || 0;
  
  // Calculate the actual amount paid/received
  // amount_paid = payment toward current transaction
  // amount_received = total cash received (current transaction + debt payment)
  const safeTotalWithTax = Number(totalWithTax) || 0;
  
  // For current transaction payment:
  // - debt: use amountReceived (what they paid for current items)
  // - non-debt: use amountReceived if entered, otherwise full payment
  const actualAmountPaid = paymentMethod === "debt" 
    ? amountReceivedNum  // For debt, what they paid for current items
    : (amountReceivedNum > 0 ? amountReceivedNum : safeTotalWithTax);
  
  // Total cash received includes debt payment
  const totalAmountReceived = actualAmountPaid + debtPaymentNum;
  
  // Change calculation: what they paid minus what they owe (current transaction only)
  // For debt: if they paid more than current transaction, they get change
  // For non-debt: standard change calculation
  const change = paymentMethod === "debt"
    ? (amountReceivedNum > total ? amountReceivedNum - total : 0)  // Only give change if overpaid current transaction
    : amountReceivedNum - total;
    
  console.log('Payment Debug:', {
    paymentMethod,
    amountReceived,
    amountReceivedNum,
    debtPaymentAmount,
    debtPaymentNum,
    totalWithTax,
    safeTotalWithTax,
    actualAmountPaid,
    totalAmountReceived,
    change,
    actualAmountPaidType: typeof actualAmountPaid,
    isNaN: isNaN(actualAmountPaid)
  });

  const processTransaction = () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "success",
      });
      return;
    }
    
    // Check if any items in the cart exceed available stock
    for (const item of cart) {
      if (item.quantity > 0) {
        const product = products.find(p => p.id === item.id);
        if (product && item.quantity > product.stock_quantity) {
          toast({
            title: "Insufficient Stock",
            description: `${product.name} only has ${product.stock_quantity} items in stock, but you're trying to sell ${item.quantity} items. Please adjust the quantity before proceeding.`,
            variant: "success",
          });
          return;
        }
      }
    }

    setIsPaymentDialogOpen(true);
  };

  const completeTransaction = async () => {
    console.log('completeTransaction called:', {
      paymentMethod,
      amountReceived,
      amountReceivedNum,
      totalWithTax,
      actualAmountPaid,
      change
    });
    
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "success",
      });
      return;
    }
    
    // Check if any items in the cart exceed available stock
    for (const item of cart) {
      if (item.quantity > 0) {
        const product = products.find(p => p.id === item.id);
        if (product && item.quantity > product.stock_quantity) {
          toast({
            title: "Insufficient Stock",
            description: `${product.name} only has ${product.stock_quantity} items in stock, but you're trying to sell ${item.quantity} items. Please adjust the quantity.`,
            variant: "success",
          });
          return;
        }
      }
    }

    // Check if payment method is Debt and customer details are required
    if (paymentMethod === "debt" && !selectedCustomer) {
      toast({
        title: "Error",
        description: "Customer details are required for Debt transactions",
        variant: "success",
      });
      setIsCustomerDialogOpen(true); // Open customer selection dialog
      return;
    }

    // Check credit limit for debt transactions
    if (paymentMethod === "debt" && selectedCustomer) {
      // Get the full customer details to check credit limit
      const fullCustomer = customers.find(c => c.id === selectedCustomer.id);
      if (fullCustomer && fullCustomer.creditLimit && total > fullCustomer.creditLimit) {
        toast({
          title: "Credit Limit Exceeded",
          description: `This customer's credit limit is ${formatCurrency(fullCustomer.creditLimit || 0)}, but the transaction total is ${formatCurrency(total)}. Please select a different payment method or reduce the transaction amount.`,
          variant: "success",
        });
        return;
      }
    }

    if (paymentMethod === "cash" && change < 0) {
      toast({
        title: "Error",
        description: "Insufficient payment amount",
        variant: "success",
      });
      return;
    }

    // Check if adjustments have a reason when non-zero
    if (adjustmentsAmount !== 0 && !adjustmentReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the adjustment",
        variant: "destructive",
      });
      return;
    }

    // Check if user has permission to create sales
    const hasPermission = await canCreateSales();
    if (!hasPermission) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create sales. Only salesmen and admins can create sales.",
        variant: "success",
      });
      return;
    }

    // Calculate loyalty points automatically
    const loyaltyPoints = selectedCustomer 
      ? AutomationService.calculateLoyaltyPoints(total) // Use total without tax for loyalty points
      : 0;

    try {
      // Create the sale record in the database
      // Use outlet_sales table for outlet-specific sales, otherwise use general sales table
      let createdSale;
      
      if (outletId) {
        // Ensure all numeric values are properly converted to numbers
        const outletSaleData = {
          outlet_id: outletId,
          customer_id: selectedCustomer?.id || null,
          user_id: null,
          invoice_number: `INV-${Date.now()}`,
          sale_date: new Date().toISOString(),
          subtotal: Number(subtotal) || 0,
          discount_amount: Number(discountAmount) || 0,
          tax_amount: Number(tax) || 0,
          shipping_amount: Number(parseFloat(shippingCost) || 0),
          credit_brought_forward: Number(creditBroughtForward) || 0,
          adjustments: Number(adjustmentsAmount) || 0,
          adjustment_reason: adjustmentsAmount !== 0 ? adjustmentReason : undefined,
          amount_received: Number(totalAmountReceived),  // Total cash received (current + debt payment)
          total_amount: Number(totalWithTax) || 0,
          amount_paid: Number(actualAmountPaid),  // Payment for current transaction only
          change_amount: Number(paymentMethod === "debt" ? 0 : change),
          payment_method: paymentMethod,
          payment_status: paymentMethod === "debt" ? "unpaid" : "paid",
          sale_status: "completed",
          notes: paymentMethod === "debt" ? "Debt transaction - payment pending" : ""
        };
        
        console.log('Creating outlet sale with data:', outletSaleData);
        console.log('amount_paid value:', outletSaleData.amount_paid, 'type:', typeof outletSaleData.amount_paid);
        
        createdSale = await createOutletSale(outletSaleData);
        
        if (createdSale) {
          console.log('Sale created successfully:', createdSale);
          console.log('Saved amount_paid:', createdSale.amount_paid);
        } else {
          console.error('Failed to create sale - createOutletSale returned null');
        }
      } else {
        // Create general sale
        const saleData = {
          customer_id: selectedCustomer?.id || null,
          user_id: null,
          invoice_number: `INV-${Date.now()}`,
          sale_date: new Date().toISOString(),
          subtotal: Number(subtotal) || 0,
          discount_amount: Number(discountAmount) || 0,
          tax_amount: Number(tax) || 0,
          total_amount: Number(totalWithTax) || 0,
          amount_paid: Number(actualAmountPaid),
          change_amount: Number(paymentMethod === "debt" ? 0 : change),
          payment_method: paymentMethod,
          payment_status: paymentMethod === "debt" ? "unpaid" : "paid",
          sale_status: "completed",
          notes: paymentMethod === "debt" ? "Debt transaction - payment pending" : ""
        };
        
        console.log('Creating general sale with data:', saleData);
        console.log('amount_paid value:', saleData.amount_paid, 'type:', typeof saleData.amount_paid);
        
        createdSale = await createSale(saleData);
      }
      
      if (!createdSale) {
        throw new Error("Failed to create sale record");
      }

      // Create sale items for each product in the cart
      const itemsWithQuantity = cart.filter(item => item.quantity > 0);
      for (const item of itemsWithQuantity) {
        // For outlet sales, product_id may not be a valid UUID
        // Only include product_id if it's a valid UUID format
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
        
        if (outletId) {
          // Create outlet sale item
          const outletSaleItemData = {
            sale_id: createdSale.id || '',
            product_id: isValidUuid ? item.id : null,
            product_name: item.name, // Store product name directly for display
            quantity: item.quantity,
            unit_price: item.price,
            discount_amount: 0,
            total_price: item.price * item.quantity
          };
          
          await createOutletSaleItem(outletSaleItemData);
        } else {
          // Create general sale item
          const saleItemData = {
            sale_id: createdSale.id || '',
            product_id: isValidUuid ? item.id : null,
            quantity: item.quantity,
            unit_price: item.price,
            discount_amount: 0,
            tax_amount: item.price * item.quantity * 0.18,
            total_price: item.price * item.quantity
          };
          
          await createSaleItem(saleItemData);
        }
      }

      // Handle debt payment and new debt creation
      if (selectedCustomer && outletId) {
        // If customer paid toward previous debt, reduce it
        if (debtPaymentNum > 0) {
          console.log(`Customer paid ${debtPaymentNum} toward previous debt of ${creditBroughtForward}`);
          
          // Get existing debts for this customer
          const existingDebts = await getOutletDebtsByCustomerId(outletId, selectedCustomer.id);
          let remainingPayment = debtPaymentNum;
          
          // Apply payment to existing debts (oldest first)
          for (const debt of existingDebts) {
            if (remainingPayment <= 0) break;
            
            const paymentTowardThisDebt = Math.min(remainingPayment, debt.amount);
            const newDebtAmount = debt.amount - paymentTowardThisDebt;
            
            if (newDebtAmount <= 0) {
              // Fully paid - delete the debt
              await deleteOutletDebt(debt.id);
              console.log(`Cleared debt ${debt.id}`);
            } else {
              // Partially paid - update amount
              await updateOutletDebt(debt.id, { amount: newDebtAmount });
              console.log(`Reduced debt ${debt.id} to ${newDebtAmount}`);
            }
            
            remainingPayment -= paymentTowardThisDebt;
          }
        }
        
        // Create new debt record for current transaction if not fully paid
        const remainingNewDebt = totalWithTax - actualAmountPaid;
        if (paymentMethod === "debt" && remainingNewDebt > 0) {
          const outletDebtData = {
            outlet_id: outletId,
            customer_id: selectedCustomer.id,
            sale_id: createdSale.id, // Link debt to the sale for proper deletion
            amount: remainingNewDebt,  // Only the remaining unpaid amount of new transaction
            description: `Debt for sale ${createdSale.id || 'unknown'}`,
            status: "outstanding" as const,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          };

          const createdDebt = await createOutletDebt(outletDebtData);
          if (!createdDebt) {
            console.warn("Failed to create outlet debt record for transaction");
          }
        }
      } else if (paymentMethod === "debt" && selectedCustomer && !outletId) {
        // Create general debt for non-outlet sales
        const remainingNewDebt = totalWithTax - actualAmountPaid;
        if (remainingNewDebt > 0) {
          const debtData = {
            customer_id: selectedCustomer.id,
            debt_type: "customer",
            amount: remainingNewDebt,
            description: `Debt for sale ${createdSale.id || 'unknown'}`,
            status: "outstanding",
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          };

          const createdDebt = await createDebt(debtData);
          if (!createdDebt) {
            console.warn("Failed to create debt record for transaction");
          }
        }
      }

      // Update stock quantities for each item in the cart
      for (const item of itemsWithQuantity) {
        // Find the original product to get current stock
        const product = products.find(p => p.id === item.id);
        if (product) {
          // Calculate new stock quantity
          const newStock = Math.max(0, product.stock_quantity - item.quantity);
          
          // For outlet sales, update sold quantities in database
          if (outletId) {
            // Update sold_quantity in inventory_products table
            await incrementSoldQuantity(outletId, product.name, item.quantity);
          } else {
            // For general sales, update stock in database
            await updateProductStock(item.id, newStock);
          }
        }
      }
      
      // Reload products to get updated stock quantities
      if (outletId) {
        // Reload outlet products with updated sold quantities from database
        const dbInventory = await getAvailableInventoryByOutlet(outletId);
        
        const updatedProducts: Product[] = [];
        dbInventory.forEach(item => {
          const productId = `${item.outlet_id}-${item.name}`;
          const existingProduct = updatedProducts.find(p => p.name === item.name);
          if (existingProduct) {
            existingProduct.stock_quantity += item.available_quantity || 0;
          } else {
            updatedProducts.push({
              id: productId,
              name: item.name,
              selling_price: item.selling_price,
              cost_price: item.unit_cost,
              stock_quantity: item.available_quantity || 0,
              barcode: '',
              sku: item.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
              category: item.category || 'General',
              unit: 'pcs',
              vat_rate: 18,
              is_active: true
            } as Product);
          }
        });
        setProducts(updatedProducts);
      } else {
        // Reload general products
        const updatedProducts = await getProducts();
        setProducts(updatedProducts);
      }

      // Create transaction object for printing
      const transaction = {
        id: createdSale.id || Date.now().toString(),
        receiptNumber: createdSale.invoice_number || `INV-${Date.now()}`,
        date: createdSale.sale_date || new Date().toISOString(),
        items: cart,
        subtotal: subtotal,
        tax: tax, // Display only tax (18%)
        discount: discountAmount,
        shipping: parseFloat(shippingCost) || 0,
        adjustments: adjustmentsAmount,
        adjustmentReason: adjustmentReason,
        total: totalWithTax, // Actual total without tax effect
        paymentMethod: paymentMethod,
        amountPaid: actualAmountPaid, // Amount paid for current transaction
        amountReceived: totalAmountReceived, // Total cash received (current + debt payment)
        debtPaymentAmount: debtPaymentNum, // Payment toward previous debt
        previousDebtBalance: creditBroughtForward, // Previous debt before payment
        change: change,
        customer: selectedCustomer, // Include customer information
        salesman: salesman || 'Not Assigned',
        driver: driver || 'Not Assigned',
        dueDate: paymentMethod === "debt" 
          ? (dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()) 
          : undefined,
        paymentStatus: paymentMethod === "debt" && actualAmountPaid < totalWithTax ? "partial" : 
                      paymentMethod === "debt" && actualAmountPaid >= totalWithTax ? "paid" : "completed"
      };

      // Store transaction for potential printing
      setCompletedTransaction(transaction);
      
      // Set transaction ID for the dialog
      setTransactionId(createdSale.id || Date.now().toString());
      
      // Save invoice to localStorage
      try {
        // Calculate amountDue using the formula: Total - Amount Paid
        const amountPaid = actualAmountPaid;
        const amountDue = totalWithTax - amountPaid;
        
        const invoiceToSave: InvoiceData = {
          id: createdSale.id || Date.now().toString(),
          invoiceNumber: createdSale.invoice_number || `INV-${Date.now()}`,
          date: createdSale.sale_date || new Date().toISOString(),
          customer: selectedCustomer?.name || 'Walk-in Customer',
          items: cart.reduce((sum, item) => sum + item.quantity, 0),
          total: totalWithTax,
          paymentMethod: paymentMethod,
          status: "completed",
          itemsList: cart.map(item => {
            // Find the corresponding product to get unit information
            const product = products.find(p => p.id === item.id);
            return {
              id: item.id,
              name: item.name,
              description: '',
              quantity: item.quantity,
              rate: item.price,
              amount: item.price * item.quantity,
              unit: product?.unit_of_measure || 'unit'
            };
          }),

          subtotal: subtotal,
          tax: tax,
          discount: discountAmount,
          amountReceived: paymentMethod === "debt" ? 0 : amountReceivedNum,
          amountPaid: amountPaid,
          creditBroughtForward: creditBroughtForward,
          amountDue: amountDue,
          change: paymentMethod === "debt" ? 0 - totalWithTax : change,
          businessName: localStorage.getItem('businessName'),
          businessAddress: localStorage.getItem('businessAddress'),
          businessPhone: localStorage.getItem('businessPhone'),
          adjustments: adjustmentsAmount,
          adjustmentReason: adjustmentsAmount !== 0 ? adjustmentReason : undefined,
        };
        
        await saveInvoice(invoiceToSave);
        
        // Save to outlet-specific saved sales based on payment method (database)
        if (outletId) {
          const savedSaleData = {
            outlet_id: outletId,
            invoice_number: createdSale.invoice_number || `INV-${Date.now()}`,
            customer: selectedCustomer?.name || 'Walk-in Customer',
            customer_id: selectedCustomer?.id,
            items: cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            })),
            subtotal: subtotal,
            tax: tax,
            discount: discountAmount,
            shipping: parseFloat(shippingCost) || 0,
            credit_brought_forward: creditBroughtForward,
            adjustments: adjustmentsAmount,
            adjustment_reason: adjustmentsAmount !== 0 ? adjustmentReason : undefined,
            amount_received: totalAmountReceived,  // Total cash received (current + debt payment)
            amount_paid: actualAmountPaid,  // Amount paid for current transaction
            total: totalWithTax,
            payment_method: paymentMethod,
            status: paymentMethod === "debt" ? "outstanding" : "completed",
            sale_date: createdSale.sale_date || new Date().toISOString(),
            notes: paymentMethod === "debt" ? "Debt transaction" : undefined
          };
          
          // Save to Supabase database
          await createSavedSale(savedSaleData);
        }
      } catch (error) {
        console.error('Error saving invoice:', error);
        toast({
          title: "Warning",
          description: "Invoice was not saved locally, but transaction completed successfully",
          variant: "destructive",
        });
      }
      
      // Show transaction complete dialog instead of toast
      setIsPaymentDialogOpen(false);
      setIsTransactionCompleteDialogOpen(true);
      
      // DISABLED: Send WhatsApp notification to business numbers only for the first sale of the day
      // try {
      //   // Check if this is the first sale of the business day
      //   if (WhatsAppUtils.isFirstSaleOfDay()) {
      //     const message = WhatsAppUtils.generateSalesNotificationMessage(
      //       createdSale.id || Date.now().toString(),
      //       totalWithTax,
      //       paymentMethod,
      //       selectedCustomer?.name
      //     );
          
      //     // Send message to all business numbers
      //     WhatsAppUtils.sendWhatsAppMessageToBusiness(message);
      //   }
      // } catch (whatsappError) {
      //   console.warn("Failed to send WhatsApp notification:", whatsappError);
      //   // Don't block the transaction if WhatsApp fails
      // }
      
      // Clear cart and reset form (but don't show toast yet)
      setCart([]);
      setSelectedCustomer(null);
      setCreditBroughtForward(0);
      setShippingCost("");
      setDiscountValue("");
      setAmountReceived("");
      setDebtPaymentAmount("");
      setAdjustments("");
      setAdjustmentReason("");
      
      toast({
        title: "Success",
        description: `Transaction completed successfully${paymentMethod === "debt" ? " as Debt" : ""}`,
      });
    } catch (error) {
      console.error("Error completing transaction:", error);
      toast({
        title: "Error",
        description: "Failed to complete transaction: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // Print receipt or invoice based on payment method
  const printReceipt = () => {
    // Use the completed transaction if available, otherwise create a mock transaction
    if (completedTransaction) {
      // For Debt payments, print invoice format instead of receipt
      if (completedTransaction.paymentMethod === "debt") {
        PrintUtils.printDebtInvoice(completedTransaction);
      } else {
        PrintUtils.printReceipt(completedTransaction);
      }
    } else {
      // In a real app, this would fetch the transaction details
      const mockTransaction = {
        id: Date.now().toString(),
        receiptNumber: `INV-${Date.now()}`,
        items: cart,
        subtotal: subtotal,
        tax: tax, // Display only tax (18%)
        discount: discountAmount,
        total: totalWithTax, // Actual total without tax effect
        paymentMethod: paymentMethod,
        amountReceived: paymentMethod === "debt" ? (parseFloat(amountReceived) || 0) : (parseFloat(amountReceived) || totalWithTax),
        change: paymentMethod === "debt" ? (parseFloat(amountReceived) || 0) - totalWithTax : change
      };
      
      // For Debt payments, print invoice format instead of receipt
      if (paymentMethod === "debt") {
        PrintUtils.printDebtInvoice(mockTransaction);
      } else {
        PrintUtils.printReceipt(mockTransaction);
      }
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.first_name || !newCustomer.last_name) {
      toast({
        title: "Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const customerData = {
        first_name: newCustomer.first_name,
        last_name: newCustomer.last_name,
        email: newCustomer.email || "",
        phone: newCustomer.phone || "",
        address: newCustomer.address || "",
        district_ward: newCustomer.district_ward || "",
        tax_id: newCustomer.tax_id || "",
        loyalty_points: 0,
        is_active: true
      };

      // Use createOutletCustomer if outletId is provided (new separate table), otherwise use createCustomer
      const createdCustomer = outletId 
        ? await createOutletCustomer({
            outlet_id: outletId,
            ...customerData
          })
        : await createCustomer(customerData);
      
      if (createdCustomer) {
        // Format the created customer to match our Customer interface
        const formattedCustomer: Customer = {
          id: createdCustomer.id || '',
          name: `${createdCustomer.first_name} ${createdCustomer.last_name}`,
          loyaltyPoints: createdCustomer.loyalty_points || 0,
          address: createdCustomer.address || '',
          district_ward: createdCustomer.district_ward || '',
          email: createdCustomer.email || '',
          phone: createdCustomer.phone || '',
          tax_id: createdCustomer.tax_id || ''
        };
        
        // Add the new customer to the customers list
        setCustomers([...customers, formattedCustomer]);
        
        // Select the newly created customer
        setSelectedCustomer(formattedCustomer);
        
        // Close the dialog
        setIsCustomerDialogOpen(false);
        
        // Reset the new customer form
        setNewCustomer({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          address: "",
          district_ward: "",
          tax_id: ""
        });
        
        toast({
          title: "Success",
          description: "Customer added successfully",
        });
      } else {
        throw new Error("Failed to create customer");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Sales Terminal" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container-responsive py-4 xs:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-3 gap-4 xs:gap-6">
          {/* Left Column - Product Search and Cart */}
          <div className="xl:col-span-2 space-y-4 xs:space-y-6">
            {/* Product Search Section */}
            <Card className="card-padding">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-responsive-xl flex items-center gap-2">
                  <Search className="h-5 w-5 xs:h-6 xs:w-6" />
                  Product Search
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col xs:flex-row gap-2 xs:gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name, barcode, or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 py-5 text-responsive-base"
                    />
                  </div>
                  <Button 
                    onClick={() => setIsScannerOpen(true)} 
                    className="btn-touch px-3 xs:px-4"
                  >
                    <Scan className="h-4 w-4 xs:h-5 xs:w-5 mr-1 xs:mr-2" />
                    <span className="hidden xs:inline">Scan</span>
                  </Button>
                  {outletId && (
                    <Button 
                      onClick={() => {
                        window.location.hash = `#/outlet-stock-take/${outletId}`;
                      }} 
                      variant="outline"
                      className="btn-touch px-3 xs:px-4"
                    >
                      <ClipboardCheck className="h-4 w-4 xs:h-5 xs:w-5 mr-1 xs:mr-2" />
                      <span className="hidden xs:inline">Stock Take</span>
                    </Button>
                  )}
                </div>
                
                {searchTerm && (
                  <div className="max-h-60 xs:max-h-80 overflow-y-auto border rounded-md p-2 bg-muted/50">
                    {filteredProducts.length > 0 ? (
                      <div className="space-y-1">
                        {filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
                            onClick={() => addToCart(product)}
                          >
                            <div>
                              <p className="font-medium text-responsive-base">{product.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Stock: {product.stock_quantity}</span>
                                {product.barcode && (
                                  <span className="hidden xs:inline">| {product.barcode}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-responsive-base">
                                {formatCurrency(product.selling_price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground">
                        No products found matching "{searchTerm}"
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cart Items Section */}
            <Card className="card-padding">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-responsive-xl flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 xs:h-6 xs:w-6" />
                  Shopping Cart
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="text-xs xs:text-sm">
                      {cart.reduce((total, item) => total + item.quantity, 0)} items
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cart.length > 0 ? (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-responsive-base truncate">{item.name}</p>
                          <p className="text-muted-foreground text-sm">
                            {formatCurrency(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 xs:gap-3">
                          <div className="flex items-center gap-1 xs:gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = Math.max(0, parseInt(e.target.value) || 0);
                                // Find the product to check stock availability
                                const product = products.find(p => p.id === item.id);
                                
                                // Check if the new quantity exceeds available stock
                                if (product && newQuantity > product.stock_quantity) {
                                  toast({
                                    title: "Insufficient Stock",
                                    description: `${product.name} only has ${product.stock_quantity} items in stock. You cannot sell ${newQuantity} items.`,
                                    variant: "destructive",
                                  });
                                  // Set quantity to maximum available stock
                                  setCart(cart.map(cartItem => 
                                    cartItem.id === item.id 
                                      ? { ...cartItem, quantity: product.stock_quantity } 
                                      : cartItem
                                  ));
                                } else {
                                  setCart(cart.map(cartItem => 
                                    cartItem.id === item.id 
                                      ? { ...cartItem, quantity: newQuantity } 
                                      : cartItem
                                  ));
                                }
                              }}
                              className="w-16 h-8 xs:h-9 text-center"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="h-8 w-8 xs:h-9 xs:w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 btn-touch"
                          >
                            <Trash2 className="h-4 w-4 xs:h-5 xs:w-5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 xs:py-12">
                    <ShoppingCart className="h-12 w-12 xs:h-16 xs:w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-responsive-base">
                      Your cart is empty. Add products to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary and Actions */}
          <div className="space-y-4 xs:space-y-6">
            {/* Customer Selection */}
            <Card className="card-padding">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-responsive-lg flex items-center gap-2">
                  <User className="h-5 w-5 xs:h-6 xs:w-6" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {selectedCustomer ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-responsive-base">{selectedCustomer.name}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 xs:h-4 xs:w-4" />
                          <span>{selectedCustomer.loyaltyPoints} points</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCreditBroughtForward(0);
                          setShippingCost("");
                        }}
                        className="h-8 w-8 p-0 btn-touch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span className="hidden xs:inline">📞</span>
                        {selectedCustomer.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button 
                    onClick={() => setIsCustomerDialogOpen(true)} 
                    variant="outline" 
                    className="w-full btn-touch"
                  >
                    <User className="h-4 w-4 xs:h-5 xs:w-5 mr-2" />
                    Select Customer
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="card-padding">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-responsive-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="discount" className="text-muted-foreground">Discount</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={discountType} onValueChange={(value: "percentage" | "amount") => setDiscountType(value)}>
                          <SelectTrigger className="w-20 xs:w-24 h-8 xs:h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="amount">TZS</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          id="discount"
                          type="number"
                          placeholder="0"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          className="w-20 xs:w-24 h-8 xs:h-9 text-right"
                        />
                      </div>
                    </div>
                    
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Discount</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Total Quantity */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  
                  {/* Tax */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (18%)</span>
                    <span className="font-medium">{formatCurrency(tax)}</span>
                  </div>
                  
                  {/* Adjustments */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Adjustments</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={adjustments}
                        onChange={(e) => setAdjustments(e.target.value)}
                        className="w-24 h-8 text-right"
                      />
                    </div>
                    
                    {adjustmentsAmount !== 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {adjustmentsAmount > 0 ? 'Addition' : 'Deduction'}
                          </span>
                          <span className={adjustmentsAmount > 0 ? 'text-orange-600' : 'text-green-600'}>
                            {adjustmentsAmount > 0 ? '+' : ''}{formatCurrency(adjustmentsAmount)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="adjustmentReason" className="text-xs text-muted-foreground">
                            Reason for adjustment *
                          </Label>
                          <Input
                            id="adjustmentReason"
                            placeholder="Enter reason for adjustment..."
                            value={adjustmentReason}
                            onChange={(e) => setAdjustmentReason(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Shipping */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Shipping</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(e.target.value)}
                      className="w-24 h-8 text-right"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="card-padding">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-responsive-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 xs:h-6 xs:w-6" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                  <Button
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("cash")}
                    className="h-16 xs:h-20 flex flex-col gap-1 btn-touch"
                  >
                    <Wallet className="h-5 w-5 xs:h-6 xs:w-6" />
                    <span className="text-xs xs:text-sm">Cash</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("card")}
                    className="h-16 xs:h-20 flex flex-col gap-1 btn-touch"
                  >
                    <CreditCard className="h-5 w-5 xs:h-6 xs:w-6" />
                    <span className="text-xs xs:text-sm">Card</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "mobile" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("mobile")}
                    className="h-16 xs:h-20 flex flex-col gap-1 btn-touch"
                  >
                    <Download className="h-5 w-5 xs:h-6 xs:w-6" />
                    <span className="text-xs xs:text-sm">Mobile Money</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "debt" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("debt")}
                    className="h-16 xs:h-20 flex flex-col gap-1 btn-touch"
                  >
                    <User className="h-5 w-5 xs:h-6 xs:w-6" />
                    <span className="text-xs xs:text-sm">Debt</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="sticky bottom-4 space-y-3">
              <Button
                onClick={processTransaction}
                disabled={cart.length === 0}
                className="w-full h-12 xs:h-14 text-responsive-lg btn-touch"
              >
                <Printer className="h-5 w-5 xs:h-6 xs:w-6 mr-2" />
                Process Transaction
              </Button>
              
              <Button
                variant="outline"
                onClick={onBack}
                className="w-full h-12 xs:h-14 text-responsive-base btn-touch"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Customer Selection Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-md xs:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-responsive-xl">Select Customer</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2 mb-4">
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
              {customers
                .filter(customer => 
                  customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (customer.phone && customer.phone.includes(searchTerm))
                )
                .map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                    onClick={async () => {
                      setSelectedCustomer(customer);
                      setIsCustomerDialogOpen(false);
                      setSearchTerm("");
                      
                      // Fetch customer's outstanding debts from both database and localStorage
                      if (customer.id) {
                        try {
                          let totalDebt = 0;
                          
                          if (outletId) {
                            // Get outlet-specific debts from database only
                            const outletDebts = await getOutletDebtsByCustomerId(outletId, customer.id);
                            totalDebt = outletDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
                          } else {
                            // Get general debts from database
                            const dbDebts = await getDebtsByCustomerId(customer.id);
                            totalDebt = dbDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
                          }
                          
                          setCreditBroughtForward(totalDebt);
                        } catch (error) {
                          console.error('Error fetching customer debts:', error);
                          setCreditBroughtForward(0);
                        }
                      }
                    }}
                  >
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-3 w-3" />
                        <span>{customer.loyaltyPoints} points</span>
                        {customer.phone && (
                          <span>| {customer.phone}</span>
                        )}
                      </div>
                    </div>
                    {outletId && customerBalances[customer.id] > 0 && (
                      <div className="text-right">
                        <span className="text-sm font-semibold text-red-600">
                          Balance: {formatCurrency(customerBalances[customer.id])}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <Button 
              onClick={() => {
                setIsAddingNewCustomer(true);
                setIsCustomerDialogOpen(false);
              }} 
              variant="outline" 
              className="w-full"
            >
              <User className="h-4 w-4 mr-2" />
              Add New Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Customer Dialog */}
      <Dialog open={isAddingNewCustomer} onOpenChange={setIsAddingNewCustomer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-responsive-xl">Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={newCustomer.first_name}
                  onChange={(e) => setNewCustomer({...newCustomer, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={newCustomer.last_name}
                  onChange={(e) => setNewCustomer({...newCustomer, last_name: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Phone number"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Customer address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="district_ward">District/Ward</Label>
              <Input
                id="district_ward"
                placeholder="District or ward"
                value={newCustomer.district_ward}
                onChange={(e) => setNewCustomer({...newCustomer, district_ward: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="tax_id">Tax ID (TIN)</Label>
              <Input
                id="tax_id"
                placeholder="Tax Identification Number"
                value={newCustomer.tax_id}
                onChange={(e) => setNewCustomer({...newCustomer, tax_id: e.target.value})}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingNewCustomer(false);
                  // Reset form
                  setNewCustomer({
                    first_name: "",
                    last_name: "",
                    email: "",
                    phone: "",
                    address: "",
                    district_ward: "",
                    tax_id: ""
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCustomer}>
                Add Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-responsive-xl">Process Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total">Total Amount</Label>
                <div className="text-2xl font-bold mt-1">{formatCurrency(total)}</div>
              </div>
              <div>
                <Label htmlFor="amountReceived">Amount Received</Label>
                <Input
                  id="amountReceived"
                  type="number"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="text-lg"
                />
              </div>
            </div>
            
            {/* Salesman and Driver fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salesman">Salesman</Label>
                <Input
                  id="salesman"
                  type="text"
                  placeholder="Enter salesman name"
                  value={salesman}
                  onChange={(e) => setSalesman(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="driver">Driver</Label>
                <Input
                  id="driver"
                  type="text"
                  placeholder="Enter driver name"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                />
              </div>
            </div>
            
            {/* Due Date field for debt transactions */}
            {paymentMethod === "debt" && (
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default: 30 days from today if not specified
                </p>
              </div>
            )}
            
            {/* Show debt payment field if customer has previous debt */}
            {creditBroughtForward > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700 font-medium">Previous Debt Balance</span>
                  <span className="text-blue-700 font-bold">{formatCurrency(creditBroughtForward)}</span>
                </div>
                <div>
                  <Label htmlFor="debtPayment" className="text-blue-700">Debt Payment Amount</Label>
                  <Input
                    id="debtPayment"
                    type="number"
                    placeholder="0.00"
                    value={debtPaymentAmount}
                    onChange={(e) => setDebtPaymentAmount(e.target.value)}
                    className="text-lg bg-white"
                  />
                  <p className="text-xs text-blue-600 mt-1">Additional payment toward previous debt</p>
                </div>
              </div>
            )}
            
            {amountReceivedNum > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span>Change</span>
                  <span className={`font-bold ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(change)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={completeTransaction}
                disabled={(paymentMethod !== "debt" && (amountReceivedNum < total || change < 0))}
              >
                Complete Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Complete Dialog */}
      <Dialog open={isTransactionCompleteDialogOpen} onOpenChange={setIsTransactionCompleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-responsive-xl text-center">Transaction Complete!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p className="text-muted-foreground mb-2">Transaction ID: {transactionId}</p>
            <p className="text-2xl font-bold mb-4">{formatCurrency(total)}</p>
            <p className="text-muted-foreground">Payment Method: {paymentMethod}</p>
          </div>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => {
              // Just close the dialog and reset
              setIsTransactionCompleteDialogOpen(false);
            }}>
              Quit Cart
            </Button>
            <Button onClick={() => {
              // Print receipt/invoice and then close
              if (completedTransaction) {
                if (completedTransaction.paymentMethod === "debt") {
                  PrintUtils.printDebtInvoice(completedTransaction);
                } else {
                  PrintUtils.printReceipt(completedTransaction);
                }
              }
              setIsTransactionCompleteDialogOpen(false);
              toast({
                title: "Transaction Processed",
                description: `Sale completed for ${formatCurrency(totalWithTax)}${selectedCustomer ? ` (${AutomationService.calculateLoyaltyPoints(total)} points earned)` : ''}`,
              });
            }}>
              <Printer className="h-4 w-4 mr-2" />
              {completedTransaction?.paymentMethod === "debt" ? "Print Invoice" : "Print Receipt"}
            </Button>
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
            }}
            onCancel={() => setIsScannerOpen(false)}
            autoAddToCart={true} // Enable auto-add for better sales experience
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
