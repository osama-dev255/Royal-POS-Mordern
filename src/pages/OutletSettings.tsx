import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  ArrowLeft, 
  Store,
  Clock,
  Bell,
  Receipt,
  Users,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OutletSettingsProps {
  onBack: () => void;
  outletId?: string;
}

interface OutletConfig {
  name: string;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  closingHours: string;
  taxRate: number;
  currency: string;
  receiptFooter: string;
  enableNotifications: boolean;
  enableLoyalty: boolean;
  requireAuthForDiscount: boolean;
  autoPrintReceipt: boolean;
}

// Mock settings for outlet
const generateMockSettings = (outletId: string): OutletConfig => ({
  name: `Outlet ${outletId.slice(0, 8)}`,
  address: "123 Main Street, Dar es Salaam, Tanzania",
  phone: "+255 712 345 678",
  email: `outlet.${outletId.slice(0, 8)}@royalpos.com`,
  openingHours: "08:00",
  closingHours: "20:00",
  taxRate: 18,
  currency: "TZS",
  receiptFooter: "Thank you for shopping with us!\nReturns accepted within 7 days",
  enableNotifications: true,
  enableLoyalty: true,
  requireAuthForDiscount: true,
  autoPrintReceipt: false
});

export const OutletSettings = ({ onBack, outletId }: OutletSettingsProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<OutletConfig>(
    outletId ? generateMockSettings(outletId) : generateMockSettings('default')
  );
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // In a real app, this would save to database
    // For now, we just show a success message
    toast({
      title: "Settings Saved",
      description: "Outlet settings have been updated successfully"
    });
    setIsEditing(false);
  };

  const updateSetting = <K extends keyof OutletConfig>(
    key: K,
    value: OutletConfig[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Outlet Settings</h1>
          <p className="text-muted-foreground">Configure settings for this outlet</p>
        </div>
        <Button onClick={isEditing ? handleSave : () => setIsEditing(true)}>
          {isEditing ? 'Save Changes' : 'Edit Settings'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              General Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Outlet Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => updateSetting('name', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateSetting('email', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={settings.address}
                onChange={(e) => updateSetting('address', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => updateSetting('phone', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={settings.currency}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Operating Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening">Opening Time</Label>
                <Input
                  id="opening"
                  type="time"
                  value={settings.openingHours}
                  onChange={(e) => updateSetting('openingHours', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing">Closing Time</Label>
                <Input
                  id="closing"
                  type="time"
                  value={settings.closingHours}
                  onChange={(e) => updateSetting('closingHours', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="pt-2">
              <Badge variant="outline" className="w-full justify-center py-2">
                {settings.openingHours} - {settings.closingHours}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tax & Receipt Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Tax & Receipt Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value))}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptFooter">Receipt Footer Text</Label>
              <textarea
                id="receiptFooter"
                className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm"
                value={settings.receiptFooter}
                onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Notifications</span>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Loyalty Program</span>
              </div>
              <Switch
                checked={settings.enableLoyalty}
                onCheckedChange={(checked) => updateSetting('enableLoyalty', checked)}
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Auth for Discounts</span>
              </div>
              <Switch
                checked={settings.requireAuthForDiscount}
                onCheckedChange={(checked) => updateSetting('requireAuthForDiscount', checked)}
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Auto Print Receipt</span>
              </div>
              <Switch
                checked={settings.autoPrintReceipt}
                onCheckedChange={(checked) => updateSetting('autoPrintReceipt', checked)}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
