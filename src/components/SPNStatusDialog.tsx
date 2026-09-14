import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { SavedSupplierPurchaseNote } from "@/utils/supplierPurchaseNoteUtils";

interface SPNStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: SavedSupplierPurchaseNote;
  onSave: (
    noteId: string,
    newStatus: string,
    approvedBy: string,
    rejectedBy: string,
    verifiedBy: string,
    rejectedReason: string
  ) => Promise<void>;
}

export const SPNStatusDialog = ({ open, onOpenChange, note, onSave }: SPNStatusDialogProps) => {
  const currentStatus = note.status || "draft";
  const [newStatus, setNewStatus] = useState<string>(currentStatus);
  const [approvedBy, setApprovedBy] = useState(note.approvedBy || "");
  const [rejectedBy, setRejectedBy] = useState(note.rejectedBy || "");
  const [verifiedBy, setVerifiedBy] = useState(note.verifiedBy || "");
  const [rejectedReason, setRejectedReason] = useState(note.rejectedReason || "");
  const [saving, setSaving] = useState(false);

  // Reset state when dialog opens with a new note
  useEffect(() => {
    if (open) {
      setNewStatus(note.status || "draft");
      setApprovedBy(note.approvedBy || "");
      setRejectedBy(note.rejectedBy || "");
      setVerifiedBy(note.verifiedBy || "");
      setRejectedReason(note.rejectedReason || "");
    }
  }, [open, note]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(note.id, newStatus, approvedBy, rejectedBy, verifiedBy, rejectedReason);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating SPN status:", error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
      case "verified":
        return "default" as const;
      case "pending":
      case "draft":
        return "outline" as const;
      case "rejected":
      case "cancelled":
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
      case "verified":
        return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
      case "draft":
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
            Update SPN Status
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            SPN #{note.purchaseNoteNumber || note.id.substring(0, 8)} — {note.supplierName || "Unknown Supplier"}
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
            {currentStatus === "approved" && note.approvedBy && (
              <span className="text-xs text-muted-foreground">by {note.approvedBy}</span>
            )}
            {currentStatus === "rejected" && note.rejectedBy && (
              <span className="text-xs text-muted-foreground">by {note.rejectedBy}{note.rejectedReason ? `: ${note.rejectedReason}` : ''}</span>
            )}
            {currentStatus === "verified" && note.verifiedBy && (
              <span className="text-xs text-muted-foreground">by {note.verifiedBy}</span>
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
                <SelectItem value="verified">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    Verified
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
              <Label htmlFor="approved-by">Approved By <span className="text-red-500">*</span></Label>
              <Input
                id="approved-by"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Enter name of approver"
              />
            </div>
          )}

          {/* Rejected By + Reason — shown when status is rejected */}
          {newStatus === "rejected" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rejected-by">Rejected By <span className="text-red-500">*</span></Label>
                <Input
                  id="rejected-by"
                  value={rejectedBy}
                  onChange={(e) => setRejectedBy(e.target.value)}
                  placeholder="Enter name of rejecter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejected-reason">Rejection Reason <span className="text-red-500">*</span></Label>
                <Textarea
                  id="rejected-reason"
                  value={rejectedReason}
                  onChange={(e) => setRejectedReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Verified By — shown when status is verified */}
          {newStatus === "verified" && (
            <div className="space-y-2">
              <Label htmlFor="verified-by">Verified By <span className="text-red-500">*</span></Label>
              <Input
                id="verified-by"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="Enter name of verifier"
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
                {newStatus === "rejected" && rejectedBy && ` (rejected by ${rejectedBy}${rejectedReason ? `: ${rejectedReason}` : ''})`}
                {newStatus === "verified" && verifiedBy && ` (verified by ${verifiedBy})`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              (newStatus === "approved" && !approvedBy.trim()) ||
              (newStatus === "rejected" && (!rejectedBy.trim() || !rejectedReason.trim())) ||
              (newStatus === "verified" && !verifiedBy.trim())
            }
          >
            {saving ? "Saving..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
