// Automation service for the POS system
export class AutomationService {
  // Automated inventory management
  static checkLowStock(products: any[], threshold: number = 10) {
    return products.filter(product => product.stock <= threshold);
  }

  // Automated reorder suggestions
  static suggestReorders(lowStockItems: any[]) {
    return lowStockItems.map(item => ({
      productId: item.id,
      productName: item.name,
      currentStock: item.stock,
      suggestedOrderQuantity: Math.max(20 - item.stock, 10)
    }));
  }

  // Automated customer loyalty points calculation
  static calculateLoyaltyPoints(transactionAmount: number, loyaltyRate: number = 0.01) {
    return Math.floor(transactionAmount * loyaltyRate);
  }

  // Automated discount suggestions based on inventory
  static suggestDiscounts(products: any[], daysInInventoryThreshold: number = 30) {
    // In a real system, this would check actual inventory age
    // For demo, we'll suggest discounts for items with low stock
    return products
      .filter(product => product.stock < 5)
      .map(product => ({
        productId: product.id,
        productName: product.name,
        suggestedDiscount: product.stock < 2 ? 20 : 10 // % discount
      }));
  }

  // Automated financial reporting
  static generateDailyReport(transactions: any[]) {
    const today = new Date();
    const todayTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.toDateString() === today.toDateString();
    });

    const totalSales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = todayTransactions.length;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    return {
      date: today.toISOString().split('T')[0],
      totalSales,
      totalTransactions,
      averageTransaction,
      topProducts: this.getTopSellingProducts(todayTransactions)
    };
  }

  // Get top selling products
  static getTopSellingProducts(transactions: any[]) {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

    transactions.forEach(transaction => {
      transaction.items.forEach((item: any) => {
        if (!productSales[item.id]) {
          productSales[item.id] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.id].quantity += item.quantity;
        productSales[item.id].revenue += item.price * item.quantity;
      });
    });

    return Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }

  // Automated customer segmentation
  static segmentCustomers(customers: any[]) {
    return customers.map(customer => {
      const totalSpent = customer.totalSpent || 0;
      const loyaltyPoints = customer.loyaltyPoints || 0;

      let segment = 'Bronze';
      if (totalSpent > 1000 || loyaltyPoints > 500) segment = 'Gold';
      else if (totalSpent > 500 || loyaltyPoints > 200) segment = 'Silver';

      return {
        ...customer,
        segment
      };
    });
  }

  // Automated expense categorization
  static categorizeExpenses(expenses: any[]) {
    return expenses.map(expense => {
      let category = 'Other';
      
      if (expense.description.toLowerCase().includes('inventory') || 
          expense.description.toLowerCase().includes('stock')) {
        category = 'Inventory';
      } else if (expense.description.toLowerCase().includes('rent') || 
                 expense.description.toLowerCase().includes('lease')) {
        category = 'Facility';
      } else if (expense.description.toLowerCase().includes('salary') || 
                 expense.description.toLowerCase().includes('payroll')) {
        category = 'Payroll';
      } else if (expense.description.toLowerCase().includes('utility') || 
                 expense.description.toLowerCase().includes('electric') ||
                 expense.description.toLowerCase().includes('water')) {
        category = 'Utilities';
      } else if (expense.description.toLowerCase().includes('marketing') || 
                 expense.description.toLowerCase().includes('advertising')) {
        category = 'Marketing';
      }

      return {
        ...expense,
        category
      };
    });
  }

  // Automated supplier performance tracking
  static trackSupplierPerformance(suppliers: any[], purchaseOrders: any[]) {
    return suppliers.map(supplier => {
      const supplierOrders = purchaseOrders.filter(po => po.supplierId === supplier.id);
      const completedOrders = supplierOrders.filter(po => po.status === 'received');
      const onTimeDeliveries = completedOrders.filter(po => 
        new Date(po.deliveryDate) <= new Date(po.expectedDeliveryDate)
      );

      const performance = {
        totalOrders: supplierOrders.length,
        onTimeDeliveryRate: supplierOrders.length > 0 
          ? (onTimeDeliveries.length / supplierOrders.length) * 100 
          : 0,
        averageOrderValue: supplierOrders.length > 0
          ? supplierOrders.reduce((sum, po) => sum + po.total, 0) / supplierOrders.length
          : 0
      };

      return {
        ...supplier,
        performance
      };
    });
  }
}