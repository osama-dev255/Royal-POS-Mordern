import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart, 
  Package, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  Archive,
  Settings
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { getAssetTransactions, updateAssetTransaction, deleteAssetTransaction } from "@/services/databaseService";
import { AssetTransaction } from "@/services/databaseService";
import { formatCurrency } from "@/lib/currency";

interface AssetsManagementProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
  onNavigate?: (view: string) => void;
}

export const AssetsManagement = ({ username, onBack, onLogout, onNavigate }: AssetsManagementProps) => {
  const [activeTab, setActiveTab] = useState<"buy" | "sell" | "dispose" | "adjust" | "history">("buy");
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AssetTransaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<AssetTransaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  // Fetch real transaction data from the database
  useEffect(() => {
    if (activeTab === "history") {
      setLoading(true);
      getAssetTransactions().then((data) => {
        setTransactions(data);
        setLoading(false);
      }).catch((error) => {
        console.error("Error fetching asset transactions:", error);
        setTransactions([]);
        setLoading(false);
      });
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Assets Management</h1>
              <p className="text-muted-foreground">Manage company assets and transactions</p>
            </div>
            <Button variant="outline" onClick={onBack}>
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Asset Transactions</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Buying Asset Card */}
            <DashboardCard
              title="Buying Assets"
              description="Purchase new assets for your business"
              icon={TrendingDown}
              onClick={() => setActiveTab("buy")}
              className="bg-white border border-gray-200 hover:shadow-md transition-shadow"
            />

            {/* Selling Asset Card */}
            <DashboardCard
              title="Selling Assets"
              description="Sell existing assets from your business"
              icon={TrendingUp}
              onClick={() => setActiveTab("sell")}
              className="bg-white border border-gray-200 hover:shadow-md transition-shadow"
            />

            {/* Asset Disposal Card */}
            <DashboardCard
              title="Asset Disposal"
              description="Dispose of assets that are no longer useful"
              icon={Archive}
              onClick={() => {
                if (onNavigate) {
                  onNavigate("dispose-assets");
                }
              }}
              className="bg-white border border-gray-200 hover:shadow-md transition-shadow"
            />

            {/* Asset Adjustment Card */}
            <DashboardCard
              title="Asset Adjustment"
              description="Adjust asset values and statuses"
              icon={Settings}
              onClick={() => {
                if (onNavigate) {
                  onNavigate("adjust-assets");
                }
              }}
              className="bg-white border border-gray-200 hover:shadow-md transition-shadow"
            />

            {/* Transaction History Card */}
            <DashboardCard
              title="Transaction History"
              description="View asset purchase and sale history"
              icon={Package}
              onClick={() => setActiveTab("history")}
              className="bg-white border border-gray-200 hover:shadow-md transition-shadow"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "buy" 
                ? "Buy Assets" 
                : activeTab === "sell" 
                  ? "Sell Assets" 
                  : activeTab === "dispose" 
                    ? "Dispose Assets" 
                    : activeTab === "adjust" 
                      ? "Adjust Assets" 
                      : "Asset Transaction History"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === "history" ? (
              // Transaction History Content
              <div className="py-4">
                {loading ? (
                  <div className="text-center py-8">
                    <p>Loading transaction history...</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {transaction.description || 'Unnamed Asset'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                {transaction.transaction_type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(transaction.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Completed
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={() => {
                                      // View transaction details
                                      setViewingTransaction(transaction);
                                      setIsViewing(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="View"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      // Edit transaction
                                      setEditingTransaction(transaction);
                                      setIsEditing(true);
                                    }}
                                    className="text-indigo-600 hover:text-indigo-900"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      // Delete transaction
                                      if (window.confirm(`Are you sure you want to delete this transaction: ${transaction.description}?`)) {
                                        const success = await deleteAssetTransaction(transaction.id);
                                        if (success) {
                                          // Remove from local state
                                          setTransactions(transactions.filter(t => t.id !== transaction.id));
                                          alert('Transaction deleted successfully');
                                        } else {
                                          alert('Failed to delete transaction');
                                        }
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {transactions.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No asset transactions found.</p>
                      </div>
                    )}
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Showing {transactions.length} of {transactions.length} transactions
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 rounded-md border border-gray-300 text-sm">Previous</button>
                        <button className="px-3 py-1 rounded-md border border-gray-300 text-sm">Next</button>
                      </div>
                    </div>
                    
                    {/* Edit Transaction Modal */}
                    {isEditing && editingTransaction && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                          <h3 className="text-lg font-semibold mb-4">Edit Transaction</h3>
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target as HTMLFormElement);
                            const updatedData = {
                              transaction_type: formData.get('transactionType') as 'purchase' | 'sale' | 'disposal' | 'adjustment',
                              transaction_date: formData.get('transactionDate') as string,
                              amount: parseFloat(formData.get('amount') as string),
                              description: formData.get('description') as string,
                              buyer_seller: formData.get('buyerSeller') as string,
                              notes: formData.get('notes') as string
                            };
                            
                            const updatedTransaction = await updateAssetTransaction(editingTransaction.id, updatedData);
                            if (updatedTransaction) {
                              // Update local state
                              setTransactions(transactions.map(t => 
                                t.id === editingTransaction.id ? {...t, ...updatedData} : t
                              ));
                              setIsEditing(false);
                              setEditingTransaction(null);
                              alert('Transaction updated successfully');
                            } else {
                              alert('Failed to update transaction');
                            }
                          }}>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                                <select 
                                  name="transactionType"
                                  defaultValue={editingTransaction.transaction_type}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                >
                                  <option value="purchase">Purchase</option>
                                  <option value="sale">Sale</option>
                                  <option value="disposal">Disposal</option>
                                  <option value="adjustment">Adjustment</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Transaction Date</label>
                                <input 
                                  type="date" 
                                  name="transactionDate"
                                  defaultValue={editingTransaction.transaction_date}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Amount</label>
                                <input 
                                  type="number" 
                                  name="amount"
                                  defaultValue={editingTransaction.amount}
                                  step="0.01"
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <input 
                                  type="text" 
                                  name="description"
                                  defaultValue={editingTransaction.description || ''}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Buyer/Seller</label>
                                <input 
                                  type="text" 
                                  name="buyerSeller"
                                  defaultValue={editingTransaction.buyer_seller || ''}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Notes</label>
                                <textarea 
                                  name="notes"
                                  defaultValue={editingTransaction.notes || ''}
                                  rows={3}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                              <button 
                                type="button"
                                onClick={() => {
                                  setIsEditing(false);
                                  setEditingTransaction(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                              >
                                Save Changes
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                    
                    {/* View Transaction Modal */}
                    {isViewing && viewingTransaction && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                          <h3 className="text-lg font-semibold mb-4">View Transaction</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                              <div className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50 p-2">
                                {viewingTransaction.transaction_type}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Transaction Date</label>
                              <div className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50 p-2">
                                {viewingTransaction.transaction_date}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Amount</label>
                              <div className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50 p-2">
                                {formatCurrency(viewingTransaction.amount)}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Description</label>
                              <div className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50 p-2">
                                {viewingTransaction.description || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Buyer/Seller</label>
                              <div className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50 p-2">
                                {viewingTransaction.buyer_seller || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Notes</label>
                              <div className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-50 p-2 min-h-[60px]">
                                {viewingTransaction.notes || 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 flex justify-end">
                            <button 
                              type="button"
                              onClick={() => {
                                setIsViewing(false);
                                setViewingTransaction(null);
                              }}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // Buy/Sell/Dispose/Adjust Asset Content
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  {activeTab === "buy" ? (
                    <ShoppingCart className="h-8 w-8 text-primary" />
                  ) : activeTab === "sell" ? (
                    <DollarSign className="h-8 w-8 text-primary" />
                  ) : activeTab === "dispose" ? (
                    <Archive className="h-8 w-8 text-primary" />
                  ) : (
                    <Settings className="h-8 w-8 text-primary" />
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {activeTab === "buy" 
                    ? "Asset Purchase Management" 
                    : activeTab === "sell" 
                      ? "Asset Sale Management" 
                      : activeTab === "dispose" 
                        ? "Asset Disposal Management" 
                        : "Asset Adjustment Management"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === "buy" 
                    ? "Manage the purchase of new assets for your business" 
                    : activeTab === "sell" 
                      ? "Manage the sale of existing business assets" 
                      : activeTab === "dispose" 
                        ? "Manage the disposal of assets that are no longer useful" 
                        : "Manage adjustments to asset values and statuses"}
                </p>
                <Button onClick={() => {
                  // Add a check to ensure user is still authenticated before navigating
                  if (onNavigate) {
                    // Check if we have a valid user context
                    const view = 
                      activeTab === "buy" ? "purchase-assets" : 
                      activeTab === "sell" ? "sell-assets" : 
                      activeTab === "dispose" ? "dispose-assets" : 
                      "adjust-assets";
                    onNavigate(view);
                  }
                }}>
                  {activeTab === "buy" 
                    ? "Start Purchasing Assets" 
                    : activeTab === "sell" 
                      ? "Start Selling Assets" 
                      : activeTab === "dispose" 
                        ? "Start Disposing Assets" 
                        : "Start Adjusting Assets"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};