import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  createAsset, 
  getAssets, 
  createAssetTransaction,
  getAssetTransactions
} from "@/services/databaseService";

export const TestAssets = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testAssetCreation = async () => {
    setLoading(true);
    try {
      // Create a test asset
      const assetData: any = {
        name: "Test Computer",
        description: "A test computer for development",
        category: "Technology",
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: 1200.00,
        current_value: 1200.00,
        depreciation_rate: 0.00,
        estimated_lifespan: 3,
        status: 'active' as const,
        serial_number: null,
        location: "Office",
        notes: "Test asset for development"
      };

      const createdAsset = await createAsset(assetData);
      console.log("Created asset:", createdAsset);

      if (createdAsset) {
        // Create a purchase transaction for the asset
        const transactionData: any = {
          asset_id: createdAsset.id,
          transaction_type: 'purchase' as const,
          transaction_date: assetData.purchase_date,
          amount: assetData.purchase_price,
          description: `Purchase of ${assetData.name}`,
          buyer_seller: 'Self',
          notes: null,
          reference_number: null
        };

        const createdTransaction = await createAssetTransaction(transactionData);
        console.log("Created transaction:", createdTransaction);

        // Refresh the data
        refreshData();
      }
    } catch (error) {
      console.error("Error creating test asset:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const assetsData = await getAssets();
      setAssets(assetsData);
      
      const transactionsData = await getAssetTransactions();
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Test Assets Management</h1>
        <p className="text-muted-foreground">Test the asset management functionality</p>
      </header>

      <div className="mb-6">
        <Button onClick={testAssetCreation} disabled={loading}>
          {loading ? "Creating Test Asset..." : "Create Test Asset"}
        </Button>
        <Button onClick={refreshData} variant="outline" className="ml-2" disabled={loading}>
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading assets...</p>
            ) : assets.length > 0 ? (
              <div className="space-y-4">
                {assets.map((asset) => (
                  <div key={asset.id} className="border p-4 rounded-md">
                    <h3 className="font-semibold">{asset.name}</h3>
                    <p className="text-sm text-muted-foreground">{asset.description}</p>
                    <p className="text-sm">Value: ${asset.current_value.toFixed(2)}</p>
                    <p className="text-sm">Category: {asset.category}</p>
                    <p className="text-sm">Status: {asset.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No assets found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading transactions...</p>
            ) : transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="border p-4 rounded-md">
                    <h3 className="font-semibold">{transaction.description}</h3>
                    <p className="text-sm">Type: {transaction.transaction_type}</p>
                    <p className="text-sm">Amount: ${transaction.amount.toFixed(2)}</p>
                    <p className="text-sm">
                      Date: {transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No transactions found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestAssets;