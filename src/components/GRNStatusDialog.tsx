import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { SavedGRN } from "@/utils/grnUtils";

interface GRNStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grn: SavedGRN;
  onSave: (grnId: string, newStatus: string, approvedBy: string, rejectedBy: string) => Promise<void>;
}

export const GRNStatusDialog = ({ open, onOpenChange, grn, onSave }: GRNStatusDialogProps) => {
  const currentStatus = grn.data?.status || "pending";
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [approvedBy, setApprovedBy] = useState(grn.data?.approvedBy || "");
  const [rejectedBy, setRejectedBy] = useState(grn.data?.rejectedBy || "");
  const [saving, setSaving] = useState(false);

  // Reset state when dialog opens with a new GRN
  useEffect(() => {
    if (open) {
      setNewStatus(grn.data?.status || "pending");
      setApprovedBy(grn.data?.approvedBy || "");
      setRejectedBy(grn.data?.rejectedBy || "");
    }
  }, [open, grn]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(grn.id, newStatus, approvedBy, rejectedBy);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating GRN status:", error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "default" as const;
      case "checked":
        return "secondary" as const;
      case "received":
      case "pending":
        return "outline" as const;
      case "rejected":
        return "destructive" as const;
      default:
        return "default" as const;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Update GRN Status
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            GRN #{grn.data?.grnNumber || grn.id.substring(0, 8)} — {grn.data?.supplierName || "Unknown Supplier"}
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Current Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Current Status:</span>
            <Badge variant={getStatusVariant(currentStatus)}>
              <div className="flex items-center gap-1">
                {getStatusIcon(currentStatus)}
                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              </div>
            </Badge>
            {currentStatus === "approved" && grn.data?.approvedBy && (
              <span className="text-xs text-muted-foreground">by {grn.data.approvedBy}</span>
            )}
            {currentStatus === "rejected" && grn.data?.rejectedBy && (
              <span className="text-xs text-muted-foreground">by {grn.data.rejectedBy}</span>
            )}
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status-select">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="status-select">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Pending
                  </div>
                </SelectItem>
                <SelectItem value="approved">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Approved
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Rejected
                  </div>
                </SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Completed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Approved By — shown when status is approved */}
          {newStatus === "approved" && (
            <div className="space-y-2">
              <Label htmlFor="approved-by">Approved By</Label>
              <Input
                id="approved-by"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Enter name of approver"
              />
            </div>
          )}

          {/* Rejected By — shown when status is rejected */}
          {newStatus === "rejected" && (
            <div className="space-y-2">
              <Label htmlFor="rejected-by">Rejected By</Label>
              <Input
                id="rejected-by"
                value={rejectedBy}
                onChange={(e) => setRejectedBy(e.target.value)}
                placeholder="Enter name of rejecter"
              />
            </div>
          )}

          {/* Preview of what will be saved */}
          {newStatus !== currentStatus && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm">
                Status will change from{" "}
                <span className="font-semibold">{currentStatus}</span>
                {" "}to{" "}
                <span className="font-semibold">{newStatus}</span>
                {newStatus === "approved" && approvedBy && ` (approved by ${approvedBy})`}
                {newStatus === "rejected" && rejectedBy && ` (rejected by ${rejectedBy})`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
