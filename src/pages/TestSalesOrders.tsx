import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { SalesOrderCard } from "@/components/SalesOrderCard";
import { SalesOrderDetails } from "@/components/SalesOrderDetails";

export const TestSalesOrders = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Mock data for testing
  const mockOrders = [
    {
      id: "ORD-001",
      date: "2023-06-15T10:30:00Z",
      customer: "John Doe",
      items: 3,
      total: 125.99,
      paymentMethod: "cash",
      status: "completed" as const
    },
    {
      id: "ORD-002",
      date: "2023-06-14T14:22:00Z",
      customer: "Jane Smith",
      items: 5,
      total: 89.50,
      paymentMethod: "credit",
      status: "pending" as const
    },
    {
      id: "ORD-003",
      date: "2023-06-13T09:15:00Z",
      customer: "Bob Johnson",
      items: 2,
      total: 45.75,
      paymentMethod: "debit",
      status: "refunded" as const
    }
  ];

  const mockOrderDetails = {
    id: "ORD-001",
    date: "2023-06-15T10:30:00Z",
    customer: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890"
    },
    items: [
      {
        id: "ITEM-001",
        name: "Product A",
        quantity: 2,
        unitPrice: 25.99,
        totalPrice: 51.98
      },
      {
        id: "ITEM-002",
        name: "Product B",
        quantity: 1,
        unitPrice: 35.00,
        totalPrice: 35.00
      },
      {
        id: "ITEM-003",
        name: "Product C",
        quantity: 3,
        unitPrice: 13.00,
        totalPrice: 39.01
      }
    ],
    subtotal: 125.99,
    discount: 0,
    tax: 22.68,
    total: 148.67,
    paymentMethod: "cash",
    status: "completed" as const,
    notes: "Customer requested gift wrapping"
  };

  if (showDetails) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation 
          title="Test Sales Order Details" 
          onBack={onBack}
          onLogout={onLogout} 
          username={username}
        />
        <main className="container mx-auto p-6">
          <SalesOrderDetails
            {...mockOrderDetails}
            onBack={() => setShowDetails(false)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Test Sales Orders" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Test Sales Orders</h2>
          <p className="text-muted-foreground">Testing the Sales Order Card components</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockOrders.map((order) => (
            <SalesOrderCard
              key={order.id}
              {...order}
              onViewDetails={() => setShowDetails(true)}
            />
          ))}
        </div>
      </main>
    </div>
  );
};