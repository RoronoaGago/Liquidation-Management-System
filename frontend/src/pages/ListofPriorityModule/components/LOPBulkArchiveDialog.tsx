import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "@/components/ui/button/Button";

interface LOPBulkArchiveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  isArchiving: boolean;
  isSubmitting: boolean;
}

const LOPBulkArchiveDialog: React.FC<LOPBulkArchiveDialogProps> = ({
  open,
  onClose,
  onConfirm,
  count,
  isArchiving,
  isSubmitting,
}) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {isArchiving ? "Archive" : "Restore"} {count} List of Priorities
        </DialogTitle>
      </DialogHeader>
      <div>
        Are you sure you want to {isArchiving ? "archive" : "restore"} {count}{" "}
        selected List of Priorities?
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant={isArchiving ? "destructive" : "success"}
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : isArchiving ? "Archive" : "Restore"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default LOPBulkArchiveDialog;
