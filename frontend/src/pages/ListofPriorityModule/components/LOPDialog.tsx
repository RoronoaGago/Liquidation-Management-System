import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { ListOfPriority, Requirement } from "@/lib/types";

interface LOPDialogProps {
  open: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => void;
  lop?: ListOfPriority | null;
  requirements: Requirement[];
  isSubmitting: boolean;
  formErrors: Record<string, string>;
  selectedRequirements: number[];
  setSelectedRequirements: (ids: number[]) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const LOPDialog: React.FC<LOPDialogProps> = ({
  open,
  onClose,
  onSubmit,
  lop,
  isSubmitting,
  onChange,
}) => {
  // ...implement form fields and requirement selection...
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {lop ? "Edit List of Priority" : "Create List of Priority"}
          </DialogTitle>
        </DialogHeader>
        {/* Form fields here */}
        <form onSubmit={onSubmit}>
          <Input
            name="expenseTitle"
            value={lop?.expenseTitle || ""}
            onChange={onChange}
            placeholder="List of Priority Title"
          />
          {/* Requirements selection */}
          {/* ... */}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LOPDialog;
