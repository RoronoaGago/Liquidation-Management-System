import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListOfPriority } from "@/lib/types";

interface LOPViewDialogProps {
  open: boolean;
  onClose: () => void;
  lop?: ListOfPriority | null;
}

const LOPViewDialog: React.FC<LOPViewDialogProps> = ({
  open,
  onClose,
  lop,
}) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>List of Priority Details</DialogTitle>
      </DialogHeader>
      {lop && (
        <div>
          <div>ID: {lop.LOPID}</div>
          <div>Title: {lop.expenseTitle}</div>
          {/* Add more fields as needed */}
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default LOPViewDialog;
