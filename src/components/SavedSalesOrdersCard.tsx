import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/currency";
import { FileText, Calendar, User, Eye, Trash2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, signIn } from "@/services/authService";
import { getCurrentUserRole } from "@/utils/salesPermissionUtils";

interface SalesOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  total?: number;
  unit?: string;
}

interface SavedSalesOrder {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  status: "pending" | "completed" | "cancelled";
  itemsList?: SalesOrderItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  amountPaid?: number;
  creditBroughtForward?: number;
  amountDue?: number;
}

interface SavedSalesOrdersCardProps {
  salesOrder: SavedSalesOrder;
  onViewDetails: () => void;
  onDeleteOrder: () => void;
  className?: string;
}

export const SavedSalesOrdersCard = ({ 
  salesOrder, 
  onViewDetails,
  onDeleteOrder,
  className 
}: SavedSalesOrdersCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Check user role on component mount
  useEffect(() => {
    const checkUserRole = async () => {
      const role = await getCurrentUserRole();
      setUserRole(role);
    };
    
    checkUserRole();
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "cancelled": return "outline";
      default: return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleConfirmDelete = async () => {
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }
    
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || !currentUser.email) {
        setPasswordError('Authentication error. Please log in again.');
        return;
      }
      
      const { error } = await signIn(currentUser.email, password);
      
      if (error) {
        setPasswordError('Incorrect password. Please try again.');
        return;
      }
      
      onDeleteOrder();
      
      setShowDeleteConfirmation(false);
      setPassword('');
      setPasswordError('');
    } catch (error) {
      setPasswordError('Authentication failed. Please try again.');
    }
  };
  
  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Order #{salesOrder.orderNumber}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-4 w-4" />
                {formatDate(salesOrder.date)}
              </p>
            </div>
            <Badge variant={getStatusVariant(salesOrder.status)}>
              {salesOrder.status.charAt(0).toUpperCase() + salesOrder.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{salesOrder.customer}</span>
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <div className="font-bold">{formatCurrency(salesOrder.total)}</div>
            </div>
            
            {salesOrder.subtotal !== undefined && salesOrder.subtotal !== 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(salesOrder.subtotal)}</span>
              </div>
            )}
            
            {salesOrder.tax !== undefined && salesOrder.tax !== 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(salesOrder.tax)}</span>
              </div>
            )}
            
            {salesOrder.discount !== undefined && salesOrder.discount !== 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span>-{formatCurrency(salesOrder.discount)}</span>
              </div>
            )}
            
            {salesOrder.amountPaid !== undefined && salesOrder.amountPaid !== 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span>{formatCurrency(salesOrder.amountPaid)}</span>
              </div>
            )}
            
            {salesOrder.amountDue !== undefined && salesOrder.amountDue !== 0 && (
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-muted-foreground">Amount Due:</span>
                <span>{formatCurrency(salesOrder.amountDue)}</span>
              </div>
            )}
            
            {/* Items Table Section */}
            {salesOrder.itemsList && salesOrder.itemsList.length > 0 && (
              <div className="pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-between"
                  onClick={() => setExpanded(!expanded)}
                >
                  <span>Items Details</span>
                  <svg 
                    className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
                
                {expanded && (
                  <div className="mt-3 border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 text-xs sm:text-sm">#</th>
                          <th className="text-left p-2 text-xs sm:text-sm">Product</th>
                          <th className="text-right p-2 text-xs sm:text-sm">Qty</th>
                          <th className="text-left p-2 text-xs sm:text-sm">Unit</th>
                          <th className="text-right p-2 text-xs sm:text-sm">Rate</th>
                          <th className="text-right p-2 text-xs sm:text-sm">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesOrder.itemsList.map((item, index) => (
                          <tr 
                            key={item.id || index} 
                            className={index % 2 === 0 ? "bg-muted/50" : ""}
                          >
                            <td className="p-2 text-xs sm:text-sm">{index + 1}</td>
                            <td className="p-2 text-xs sm:text-sm">{item.productName}</td>
                            <td className="p-2 text-right text-xs sm:text-sm">{item.quantity}</td>
                            <td className="p-2 text-xs sm:text-sm">{item.unit || 'pcs'}</td>
                            <td className="p-2 text-right text-xs sm:text-sm">{formatCurrency(item.unitPrice ?? item.price ?? 0)}</td>
                            <td className="p-2 text-right text-xs sm:text-sm font-medium">{formatCurrency(item.total ?? ((item.price ?? item.unitPrice ?? 0) * item.quantity))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onViewDetails}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              {userRole === 'admin' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setShowDeleteConfirmation(true)}
                  title="Delete Sales Order"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Password Confirmation Dialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please enter your password to confirm deletion of order <strong>#{salesOrder.orderNumber}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                type="password" 
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                className={passwordError ? "border-destructive" : ""}
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteConfirmation(false);
                setPassword('');
                setPasswordError('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
            >
              Delete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
