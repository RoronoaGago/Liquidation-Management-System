import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Button from "@/components/ui/button/Button";
import { ListOfPriority } from "@/lib/types";

interface LOPArchiveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lop?: ListOfPriority | null;
  isSubmitting: boolean;
}

const LOPArchiveDialog: React.FC<LOPArchiveDialogProps> = ({
  open,
  onClose,
  onConfirm,
  lop,
  isSubmitting,
}) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {lop?.is_active ? "Archive" : "Restore"} List of Priority
        </DialogTitle>
      </DialogHeader>
      <div>
        Are you sure you want to {lop?.is_active ? "archive" : "restore"}{" "}
        <strong>{lop?.expenseTitle}</strong>?
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant={lop?.is_active ? "destructive" : "success"}
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Processing..."
            : lop?.is_active
            ? "Archive"
            : "Restore"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default LOPArchiveDialog;
