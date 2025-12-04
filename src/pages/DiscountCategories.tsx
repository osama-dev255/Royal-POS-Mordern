import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Percent, Filter, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getDiscountCategories,
  createDiscountCategory,
  deleteDiscountCategory,
  getCategories,
  getDiscounts
} from "@/services/databaseService";

interface DiscountCategory {
  discount_id: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

interface Discount {
  id: string;
  name: string;
}

export const DiscountCategories = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [discountCategories, setDiscountCategories] = useState<DiscountCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDiscountCategory, setNewDiscountCategory] = useState<Omit<DiscountCategory, "id">>({
    discount_id: "",
    category_id: ""
  });
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // In a real app, you would fetch this data from the database
        // For now, we'll use mock data
        const mockDiscountCategories: DiscountCategory[] = [
          { discount_id: "1", category_id: "1" },
          { discount_id: "1", category_id: "2" },
          { discount_id: "3", category_id: "1" }
        ];
        
        // Mock categories data
        const mockCategories: Category[] = [
          { id: "1", name: "Electronics" },
          { id: "2", name: "Home & Garden" },
          { id: "3", name: "Sports & Outdoors" }
        ];
        
        // Mock discounts data
        const mockDiscounts: Discount[] = [
          { id: "1", name: "Summer Sale" },
          { id: "2", name: "New Customer Discount" },
          { id: "3", name: "Clearance Sale" }
        ];
        
        setDiscountCategories(mockDiscountCategories);
        setCategories(mockCategories);
        setDiscounts(mockDiscounts);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "success"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddDiscountCategory = () => {
    if (!newDiscountCategory.discount_id || !newDiscountCategory.category_id) {
      toast({
        title: "Error",
        description: "Please select both discount and category",
        variant: "success"
      });
      return;
    }

    // Check if this combination already exists
    const exists = discountCategories.some(
      dc => dc.discount_id === newDiscountCategory.discount_id && dc.category_id === newDiscountCategory.category_id
    );
    
    if (exists) {
      toast({
        title: "Error",
        description: "This discount-category combination already exists",
        variant: "success"
      });
      return;
    }

    const discountCategory: DiscountCategory = {
      ...newDiscountCategory
    };

    setDiscountCategories([...discountCategories, discountCategory]);
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Discount category link created successfully"
    });
  };

  const handleDeleteDiscountCategory = (discountId: string, categoryId: string) => {
    setDiscountCategories(discountCategories.filter(
      dc => !(dc.discount_id === discountId && dc.category_id === categoryId)
    ));
    toast({
      title: "Success",
      description: "Discount category link deleted successfully"
    });
  };

  const resetForm = () => {
    setNewDiscountCategory({
      discount_id: "",
      category_id: ""
    });
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const filteredDiscountCategories = discountCategories.filter(dc => {
    const discount = discounts.find(d => d.id === dc.discount_id);
    const category = categories.find(c => c.id === dc.category_id);
    
    const matchesSearch = 
      (discount && discount.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (category && category.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const getDiscountName = (id: string) => {
    const discount = discounts.find(d => d.id === id);
    return discount ? discount.name : "Unknown Discount";
  };

  const getCategoryName = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category ? category.name : "Unknown Category";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Discount Categories" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Discount Categories</h2>
            <p className="text-muted-foreground">Manage which categories are eligible for discounts</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Link Discount to Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Link Discount to Category</DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discount" className="text-right">
                    Discount *
                  </Label>
                  <Select 
                    value={newDiscountCategory.discount_id}
                    onValueChange={(value) => setNewDiscountCategory({...newDiscountCategory, discount_id: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select discount" />
                    </SelectTrigger>
                    <SelectContent>
                      {discounts.map(discount => (
                        <SelectItem key={discount.id} value={discount.id}>
                          {discount.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category *
                  </Label>
                  <Select 
                    value={newDiscountCategory.category_id}
                    onValueChange={(value) => setNewDiscountCategory({...newDiscountCategory, category_id: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDiscountCategory}>
                  Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
              <Link className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{discountCategories.length}</div>
              <p className="text-xs text-muted-foreground">Discount-category combinations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Discounts</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(discountCategories.map(dc => dc.discount_id)).size}
              </div>
              <p className="text-xs text-muted-foreground">Discounts with categories</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Categories</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(discountCategories.map(dc => dc.category_id)).size}
              </div>
              <p className="text-xs text-muted-foreground">Categories with discounts</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search discounts or categories..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Discount Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Discount-Category Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading discount categories...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDiscountCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No discount-category links found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDiscountCategories.map((discountCategory, index) => (
                      <TableRow key={`${discountCategory.discount_id}-${discountCategory.category_id}-${index}`}>
                        <TableCell>
                          <div className="font-medium">{getDiscountName(discountCategory.discount_id)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{getCategoryName(discountCategory.category_id)}</div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteDiscountCategory(
                              discountCategory.discount_id, 
                              discountCategory.category_id
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};