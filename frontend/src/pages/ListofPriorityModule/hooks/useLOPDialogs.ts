import { useState } from "react";
import { ListOfPriority } from "@/lib/types";

export function useLOPDialogs() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isBulkArchiveDialogOpen, setIsBulkArchiveDialogOpen] = useState(false);
  const [selectedLOP, setSelectedLOP] = useState<ListOfPriority | null>(null);

  return {
    isDialogOpen,
    setIsDialogOpen,
    isViewDialogOpen,
    setIsViewDialogOpen,
    isArchiveDialogOpen,
    setIsArchiveDialogOpen,
    isBulkArchiveDialogOpen,
    setIsBulkArchiveDialogOpen,
    selectedLOP,
    setSelectedLOP,
  };
}
