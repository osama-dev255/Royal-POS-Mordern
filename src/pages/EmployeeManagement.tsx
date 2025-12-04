import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Edit, Trash2, User, Shield, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} from "@/services/databaseService";
import { signUp } from "@/services/authService";
import { getCurrentUserRole, hasModuleAccess } from "@/utils/salesPermissionUtils";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "cashier" | "staff";
  status: "active" | "inactive";
  hireDate: string;
  lastLogin?: string;
  permissions: string[];
  password?: string;
}

const roles = [
  { id: "admin", name: "Administrator", description: "Full access to all system features" },
  { id: "manager", name: "Manager", description: "Manage sales, inventory, and staff" },
  { id: "cashier", name: "Cashier/Salesman", description: "Process sales and handle transactions" },
  { id: "staff", name: "Staff", description: "Limited access to basic functions" },
];

const permissionsList = [
  "manage_products",
  "process_sales",
  "view_reports",
  "manage_customers",
  "manage_employees",
  "manage_inventory",
  "view_financials",
  "refund_transactions",
  "manage_suppliers",
  "manage_expenses",
  "manage_discounts",
  "view_audit_logs"
];

export const EmployeeManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, "id">>({
    name: "",
    email: "",
    role: "staff",
    status: "active",
    hireDate: new Date().toISOString().split('T')[0],
    permissions: [],
    password: ""
  });
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check user permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      const userRole = await getCurrentUserRole();
      const access = hasModuleAccess(userRole, "employees");
      setHasAccess(access);
      
      if (!access) {
        // Redirect back if user doesn't have access
        onBack();
      }
    };
    
    checkPermissions();
  }, [onBack]);

  // Load employees from database
  useEffect(() => {
    const loadEmployees = async () => {
      // Don't load employees if user doesn't have access
      if (hasAccess === false) {
        return;
      }
      
      try {
        setLoading(true);
        const userData = await getUsers();
        
        // Transform database user data to Employee format
        const employeeData: Employee[] = userData.map(user => ({
          id: user.id || '',
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
          email: user.email || '',
          role: (user.role as "admin" | "manager" | "cashier" | "staff") || 'staff',
          status: user.is_active ? "active" : "inactive",
          hireDate: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          // Note: Last login and permissions would need to be handled separately
          // This is a simplified implementation
          lastLogin: undefined,
          permissions: []
        }));
        
        setEmployees(employeeData);
      } catch (error) {
        console.error("Error loading employees:", error);
        toast({
          title: "Error",
          description: "Failed to load employees",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [hasAccess, toast]);

  // If we're still checking permissions, show a loading state
  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If user doesn't have access, don't render anything (they'll be redirected)
  if (!hasAccess) {
    return null;
  }

  const resetForm = () => {
    setNewEmployee({
      name: "",
      email: "",
      role: "staff",
      status: "active",
      hireDate: new Date().toISOString().split('T')[0],
      permissions: [],
      password: ""
    });
    setEditingEmployee(null);
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check if email already exists
    if (employees.some(emp => emp.email === newEmployee.email)) {
      toast({
        title: "Error",
        description: "An employee with this email already exists",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create user with password using signUp function
      const [firstName, ...lastNameParts] = newEmployee.name.split(' ');
      const lastName = lastNameParts.join(' ') || '';
      
      const userData = {
        username: newEmployee.email.split('@')[0],
        email: newEmployee.email,
        first_name: firstName,
        last_name: lastName,
        role: newEmployee.role,
        is_active: newEmployee.status === "active"
      };

      const signUpResult = await signUp(newEmployee.email, newEmployee.password, userData);
      
      if (signUpResult.error) {
        throw new Error(signUpResult.error.message);
      }

      // Check if email confirmation is required
      if (signUpResult.user && !signUpResult.user.confirmed_at) {
        toast({
          title: "Email Confirmation Required",
          description: "An email confirmation has been sent to the user. They must confirm their email before they can log in.",
          variant: "destructive"
        });
        // Still add the user to the list for display purposes
        const employee: Employee = {
          id: signUpResult.user.id || '',
          name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown',
          email: signUpResult.user.email || '',
          role: (userData.role as "admin" | "manager" | "cashier" | "staff") || 'staff',
          status: userData.is_active ? "active" : "inactive",
          hireDate: signUpResult.user.created_at ? new Date(signUpResult.user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          permissions: []
        };

        setEmployees([...employees, employee]);
        resetForm();
        setIsDialogOpen(false);
        return;
      }

      if (signUpResult.user) {
        // Transform created user back to Employee format
        const employee: Employee = {
          id: signUpResult.user.id || '',
          name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown',
          email: signUpResult.user.email || '',
          role: (userData.role as "admin" | "manager" | "cashier" | "staff") || 'staff',
          status: userData.is_active ? "active" : "inactive",
          hireDate: signUpResult.user.created_at ? new Date(signUpResult.user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          permissions: []
        };

        setEmployees([...employees, employee]);
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Employee added successfully. If email confirmation is enabled, the user must confirm their email before logging in."
        });
      } else {
        throw new Error("Failed to create user");
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      toast({
        title: "Error",
        description: "Failed to create employee: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    // Check if email already exists (excluding current employee)
    if (employees.some(emp => emp.email === editingEmployee.email && emp.id !== editingEmployee.id)) {
      toast({
        title: "Error",
        description: "An employee with this email already exists",
        variant: "destructive"
      });
      return;
    }

    try {
      const userData = {
        first_name: editingEmployee.name.split(' ')[0] || '',
        last_name: editingEmployee.name.split(' ').slice(1).join(' ') || '',
        email: editingEmployee.email,
        role: editingEmployee.role,
        is_active: editingEmployee.status === "active"
      };

      await updateUser(editingEmployee.id, userData);

      // Update local state
      setEmployees(employees.map(emp => emp.id === editingEmployee.id ? editingEmployee : emp));
      setEditingEmployee(null);
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Employee updated successfully"
      });
    } catch (error) {
      console.error("Error updating employee:", error);
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    // Check if user is trying to delete themselves
    const currentUser = employees.find(emp => emp.email === username);
    if (currentUser && currentUser.id === id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive"
      });
      return;
    }

    try {
      await deleteUser(id);
      setEmployees(employees.filter(emp => emp.id !== id));
      
      toast({
        title: "Success",
        description: "Employee deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive"
      });
    }
  };

  const filteredEmployees = employees.filter(employee => 
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.status === "active").length;
  const adminEmployees = employees.filter(emp => emp.role === "admin").length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Employee Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Manage Employees</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Add, edit, and manage your team members
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminEmployees}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Add Employee */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? "Edit Employee" : "Add New Employee"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={editingEmployee ? editingEmployee.name : newEmployee.name}
                    onChange={(e) => 
                      editingEmployee 
                        ? setEditingEmployee({...editingEmployee, name: e.target.value})
                        : setNewEmployee({...newEmployee, name: e.target.value})
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingEmployee ? editingEmployee.email : newEmployee.email}
                    onChange={(e) => 
                      editingEmployee 
                        ? setEditingEmployee({...editingEmployee, email: e.target.value})
                        : setNewEmployee({...newEmployee, email: e.target.value})
                    }
                    className="col-span-3"
                  />
                </div>
                {!editingEmployee && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select
                    value={editingEmployee ? editingEmployee.role : newEmployee.role}
                    onValueChange={(value) => 
                      editingEmployee 
                        ? setEditingEmployee({...editingEmployee, role: value as any})
                        : setNewEmployee({...newEmployee, role: value as any})
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select
                    value={editingEmployee ? editingEmployee.status : newEmployee.status}
                    onValueChange={(value) => 
                      editingEmployee 
                        ? setEditingEmployee({...editingEmployee, status: value as any})
                        : setNewEmployee({...newEmployee, status: value as any})
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
                  disabled={loading}
                >
                  {editingEmployee ? "Update" : "Add"} Employee
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <User className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium">No employees found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get started by adding a new employee.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roles.find(r => r.id === employee.role)?.name || employee.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.hireDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingEmployee(employee);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee.id)}
                            disabled={employee.email === username}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};