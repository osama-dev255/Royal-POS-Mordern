import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Percent, Calendar, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface Discount {
  id: string;
  name: string;
  code?: string;
  type: "percentage" | "fixed";
  value: number;
  startDate: string;
  endDate?: string;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  status: "active" | "inactive" | "expired";
  description?: string;
  applicableTo: "all" | "specific_products" | "specific_categories";
  products?: string[];
  categories?: string[];
}

export const DiscountManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [discounts, setDiscounts] = useState<Discount[]>([
    {
      id: "1",
      name: "Summer Sale",
      code: "SUMMER2023",
      type: "percentage",
      value: 15,
      startDate: "2023-05-01",
      endDate: "2023-08-31",
      minPurchase: 50,
      maxDiscount: 100,
      usageLimit: 100,
      usedCount: 25,
      status: "active",
      description: "15% off on all products for summer sale",
      applicableTo: "all"
    },
    {
      id: "2",
      name: "New Customer Discount",
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      startDate: "2023-01-01",
      usageLimit: 500,
      usedCount: 150,
      status: "active",
      description: "10% off for new customers",
      applicableTo: "all"
    },
    {
      id: "3",
      name: "Clearance Sale",
      type: "fixed",
      value: 25,
      startDate: "2023-05-10",
      endDate: "2023-05-31",
      usedCount: 5,
      status: "active",
      description: "$25 off on clearance items",
      applicableTo: "specific_categories",
      categories: ["Electronics", "Home & Garden"]
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [newDiscount, setNewDiscount] = useState<Omit<Discount, "id" | "usedCount">>({
    name: "",
    code: "",
    type: "percentage",
    value: 0,
    startDate: new Date().toISOString().split('T')[0],
    status: "active",
    applicableTo: "all"
  });
  const { toast } = useToast();

  const handleAddDiscount = () => {
    if (!newDiscount.name || newDiscount.value <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "success"
      });
      return;
    }

    const discount: Discount = {
      ...newDiscount,
      id: Date.now().toString(),
      usedCount: 0
    };

    setDiscounts([...discounts, discount]);
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Discount created successfully"
    });
  };

  const handleUpdateDiscount = () => {
    if (!editingDiscount || !editingDiscount.name || editingDiscount.value <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "success"
      });
      return;
    }

    setDiscounts(discounts.map(d => d.id === editingDiscount.id ? editingDiscount : d));
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Discount updated successfully"
    });
  };

  const handleDeleteDiscount = (id: string) => {
    setDiscounts(discounts.filter(d => d.id !== id));
    toast({
      title: "Success",
      description: "Discount deleted successfully"
    });
  };

  const resetForm = () => {
    setNewDiscount({
      name: "",
      code: "",
      type: "percentage",
      value: 0,
      startDate: new Date().toISOString().split('T')[0],
      status: "active",
      applicableTo: "all"
    });
    setEditingDiscount(null);
  };

  const openEditDialog = (discount: Discount) => {
    setEditingDiscount(discount);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const activeDiscounts = discounts.filter(d => d.status === "active").length;

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = 
      discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (discount.code && discount.code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || discount.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Discount Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Discounts</h2>
            <p className="text-muted-foreground">Manage promotional discounts and offers</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search discounts..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Discount
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingDiscount ? "Edit Discount" : "Create New Discount"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Discount Name *</Label>
                    <Input
                      id="name"
                      value={editingDiscount ? editingDiscount.name : newDiscount.name}
                      onChange={(e) => 
                        editingDiscount 
                          ? setEditingDiscount({...editingDiscount, name: e.target.value}) 
                          : setNewDiscount({...newDiscount, name: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="code">Coupon Code</Label>
                    <Input
                      id="code"
                      value={editingDiscount ? editingDiscount.code || "" : newDiscount.code || ""}
                      onChange={(e) => 
                        editingDiscount 
                          ? setEditingDiscount({...editingDiscount, code: e.target.value}) 
                          : setNewDiscount({...newDiscount, code: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Discount Type *</Label>
                      <Select
                        value={editingDiscount ? editingDiscount.type : newDiscount.type}
                        onValueChange={(value: "percentage" | "fixed") => 
                          editingDiscount 
                            ? setEditingDiscount({...editingDiscount, type: value}) 
                            : setNewDiscount({...newDiscount, type: value})
                        }
                      >
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="value">Value *</Label>
                      <div className="relative">
                        {editingDiscount ? (
                          editingDiscount.type === "percentage" ? (
                            <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                          ) : (
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                          )
                        ) : newDiscount.type === "percentage" ? (
                          <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                        ) : (
                          <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        )}
                        <Input
                          id="value"
                          type="number"
                          step="0.01"
                          className={editingDiscount ? 
                            editingDiscount.type === "percentage" ? "pr-8" : "pl-8" : 
                            newDiscount.type === "percentage" ? "pr-8" : "pl-8"
                          }
                          value={editingDiscount ? editingDiscount.value : newDiscount.value}
                          onChange={(e) => 
                            editingDiscount 
                              ? setEditingDiscount({...editingDiscount, value: parseFloat(e.target.value) || 0}) 
                              : setNewDiscount({...newDiscount, value: parseFloat(e.target.value) || 0})
                          }
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={editingDiscount ? editingDiscount.startDate : newDiscount.startDate}
                        onChange={(e) => 
                          editingDiscount 
                            ? setEditingDiscount({...editingDiscount, startDate: e.target.value}) 
                            : setNewDiscount({...newDiscount, startDate: e.target.value})
                        }
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={editingDiscount ? editingDiscount.endDate || "" : newDiscount.endDate || ""}
                        onChange={(e) => 
                          editingDiscount 
                            ? setEditingDiscount({...editingDiscount, endDate: e.target.value || undefined}) 
                            : setNewDiscount({...newDiscount, endDate: e.target.value || undefined})
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="minPurchase">Min. Purchase</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input
                          id="minPurchase"
                          type="number"
                          step="0.01"
                          className="pl-8"
                          value={editingDiscount ? editingDiscount.minPurchase || "" : newDiscount.minPurchase || ""}
                          onChange={(e) => 
                            editingDiscount 
                              ? setEditingDiscount({...editingDiscount, minPurchase: parseFloat(e.target.value) || undefined}) 
                              : setNewDiscount({...newDiscount, minPurchase: parseFloat(e.target.value) || undefined})
                          }
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="maxDiscount">Max. Discount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input
                          id="maxDiscount"
                          type="number"
                          step="0.01"
                          className="pl-8"
                          value={editingDiscount ? editingDiscount.maxDiscount || "" : newDiscount.maxDiscount || ""}
                          onChange={(e) => 
                            editingDiscount 
                              ? setEditingDiscount({...editingDiscount, maxDiscount: parseFloat(e.target.value) || undefined}) 
                              : setNewDiscount({...newDiscount, maxDiscount: parseFloat(e.target.value) || undefined})
                          }
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="usageLimit">Usage Limit</Label>
                      <Input
                        id="usageLimit"
                        type="number"
                        value={editingDiscount ? editingDiscount.usageLimit || "" : newDiscount.usageLimit || ""}
                        onChange={(e) => 
                          editingDiscount 
                            ? setEditingDiscount({...editingDiscount, usageLimit: parseInt(e.target.value) || undefined}) 
                            : setNewDiscount({...newDiscount, usageLimit: parseInt(e.target.value) || undefined})
                        }
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editingDiscount ? editingDiscount.status : newDiscount.status}
                        onValueChange={(value: "active" | "inactive" | "expired") => 
                          editingDiscount 
                            ? setEditingDiscount({...editingDiscount, status: value}) 
                            : setNewDiscount({...newDiscount, status: value})
                        }
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="applicableTo">Applicable To</Label>
                    <Select
                      value={editingDiscount ? editingDiscount.applicableTo : newDiscount.applicableTo}
                      onValueChange={(value: "all" | "specific_products" | "specific_categories") => 
                        editingDiscount 
                          ? setEditingDiscount({...editingDiscount, applicableTo: value}) 
                          : setNewDiscount({...newDiscount, applicableTo: value})
                      }
                    >
                      <SelectTrigger id="applicableTo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="specific_products">Specific Products</SelectItem>
                        <SelectItem value="specific_categories">Specific Categories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editingDiscount ? editingDiscount.description || "" : newDiscount.description || ""}
                      onChange={(e) => 
                        editingDiscount 
                          ? setEditingDiscount({...editingDiscount, description: e.target.value}) 
                          : setNewDiscount({...newDiscount, description: e.target.value})
                      }
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingDiscount ? handleUpdateDiscount : handleAddDiscount}>
                    {editingDiscount ? "Update" : "Create"} Discount
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Discounts</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeDiscounts}</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{discounts.length}</div>
              <p className="text-xs text-muted-foreground">All discount codes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {discounts.reduce((sum, discount) => sum + discount.usedCount, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Times applied</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Discount Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No discounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDiscounts.map((discount) => (
                    <TableRow key={discount.id}>
                      <TableCell>
                        <div className="font-medium">{discount.name}</div>
                        {discount.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {discount.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {discount.code ? (
                          <Badge variant="secondary">{discount.code}</Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {discount.type === "percentage" ? "Percentage" : "Fixed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{discount.startDate}</div>
                          {discount.endDate && <div>to {discount.endDate}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {discount.usageLimit ? (
                          <div className="text-sm">
                            <div>{discount.usedCount} / {discount.usageLimit}</div>
                            <div className="w-20 bg-secondary rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-primary h-1.5 rounded-full" 
                                style={{ width: `${Math.min(100, (discount.usedCount / (discount.usageLimit || 1)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm">{discount.usedCount} used</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            discount.status === "active" ? "default" : 
                            discount.status === "inactive" ? "secondary" : "destructive"
                          }
                        >
                          {discount.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(discount)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteDiscount(discount.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};