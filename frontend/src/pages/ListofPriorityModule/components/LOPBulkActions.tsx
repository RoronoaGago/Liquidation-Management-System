import React from "react";
import Button from "@/components/ui/button/Button";

interface LOPBulkActionsProps {
  selectedCount: number;
  onArchive: () => void;
  isArchiving: boolean;
}

const LOPBulkActions: React.FC<LOPBulkActionsProps> = ({
  selectedCount,
  onArchive,
  isArchiving,
}) => (
  <div className="flex gap-2">
    <Button
      variant="outline"
      onClick={onArchive}
      disabled={isArchiving || selectedCount === 0}
    >
      {isArchiving ? "Processing..." : `Archive (${selectedCount})`}
    </Button>
  </div>
);

export default LOPBulkActions;
