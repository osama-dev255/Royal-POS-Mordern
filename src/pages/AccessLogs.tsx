import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, Calendar, Filter, LogIn, LogOut } from "lucide-react";

interface AccessLog {
  id: string;
  userId: string;
  username: string;
  action: "login" | "logout" | "create" | "update" | "delete" | "view" | "export" | "error";
  module: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "failed";
  details?: string;
}

export const AccessLogs = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [logs, setLogs] = useState<AccessLog[]>([
    {
      id: "1",
      userId: "1",
      username: "admin",
      action: "login",
      module: "Authentication",
      timestamp: "2023-05-18 14:30:25",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/113.0.0.0",
      status: "success"
    },
    {
      id: "2",
      userId: "1",
      username: "admin",
      action: "create",
      module: "Products",
      timestamp: "2023-05-18 14:35:12",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/113.0.0.0",
      status: "success",
      details: "Created new product: Wireless Headphones"
    },
    {
      id: "3",
      userId: "2",
      username: "cashier1",
      action: "login",
      module: "Authentication",
      timestamp: "2023-05-18 14:40:05",
      ipAddress: "192.168.1.101",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) Chrome/113.0.0.0",
      status: "success"
    },
    {
      id: "4",
      userId: "1",
      username: "admin",
      action: "delete",
      module: "Customers",
      timestamp: "2023-05-18 14:45:33",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/113.0.0.0",
      status: "success",
      details: "Deleted customer record: John Smith"
    },
    {
      id: "5",
      userId: "3",
      username: "manager",
      action: "login",
      module: "Authentication",
      timestamp: "2023-05-18 14:50:17",
      ipAddress: "192.168.1.102",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/113.0",
      status: "failed",
      details: "Invalid credentials"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const actionTypes = [
    { id: "login", name: "Login", icon: LogIn },
    { id: "logout", name: "Logout", icon: LogOut },
    { id: "create", name: "Create", icon: null },
    { id: "update", name: "Update", icon: null },
    { id: "delete", name: "Delete", icon: null },
    { id: "view", name: "View", icon: null },
    { id: "export", name: "Export", icon: null },
    { id: "error", name: "Error", icon: null }
  ];

  const getActionIcon = (action: string) => {
    const actionType = actionTypes.find(type => type.id === action);
    return actionType?.icon ? <actionType.icon className="h-4 w-4 mr-1" /> : null;
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      "Authentication": "bg-blue-100 text-blue-800",
      "Products": "bg-green-100 text-green-800",
      "Customers": "bg-purple-100 text-purple-800",
      "Sales": "bg-yellow-100 text-yellow-800",
      "Reports": "bg-indigo-100 text-indigo-800",
      "Settings": "bg-gray-100 text-gray-800"
    };
    return colors[module] || "bg-gray-100 text-gray-800";
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    
    // Date filter would be implemented with actual date comparison in a real app
    const matchesDate = dateFilter === "all";
    
    return matchesSearch && matchesAction && matchesStatus && matchesDate;
  });

  const totalLogs = logs.length;
  const successfulActions = logs.filter(log => log.status === "success").length;
  const failedActions = logs.filter(log => log.status === "failed").length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Access Logs" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Access Logs</h2>
          <p className="text-muted-foreground">Monitor user activity and system access</p>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLogs}</div>
              <p className="text-xs text-muted-foreground">Access events</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <LogIn className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{successfulActions}</div>
              <p className="text-xs text-muted-foreground">Completed actions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{failedActions}</div>
              <p className="text-xs text-muted-foreground">Access errors</p>
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
                  placeholder="Search logs..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {actionTypes.map(action => (
                      <SelectItem key={action.id} value={action.id}>
                        <div className="flex items-center">
                          {getActionIcon(action.id)}
                          {action.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-32">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline">
                  Export Logs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No access logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="font-medium">{log.username}</div>
                        <div className="text-sm text-muted-foreground">ID: {log.userId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className="flex items-center gap-1"
                        >
                          {getActionIcon(log.action)}
                          {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getModuleColor(log.module)}>
                          {log.module}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.timestamp}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono">{log.ipAddress}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.status === "success" ? "default" : "destructive"}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.details && (
                          <div className="text-sm max-w-xs truncate" title={log.details}>
                            {log.details}
                          </div>
                        )}
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