import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import {
  Archive,
  ArchiveRestore,
  ArchiveIcon,
  ArchiveRestoreIcon,
  SquarePenIcon,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { useMemo, useState, useRef, useEffect } from "react";
import api from "@/api/axios";

type RequirementSortableField =
  | "requirementID"
  | "requirementTitle"
  | "is_required"
  | "is_active";
type SortDirection = "asc" | "desc";

interface Requirement {
  requirementID: number;
  requirementTitle: string;
  is_required: boolean;
  is_active: boolean;
}

interface RequirementsTableProps {
  requirements: Requirement[];
  setRequirements: React.Dispatch<React.SetStateAction<Requirement[]>>;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  fetchRequirements: () => Promise<void>;
  loading?: boolean;
  error?: Error | null;
}

export default function RequirementsTable({
  requirements,
  showArchived,
  setShowArchived,
  fetchRequirements,
  loading,
  error,
}: RequirementsTableProps) {
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selection
  const [selectedRequirements, setSelectedRequirements] = useState<number[]>(
    []
  );
  const [selectAll, setSelectAll] = useState(false);

  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isBulkArchiveDialogOpen, setIsBulkArchiveDialogOpen] = useState(false);

  // Form
  const [selectedRequirement, setSelectedRequirement] =
    useState<Requirement | null>(null);
  const [formErrors, setFormErrors] = useState<{ requirementTitle?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Archive/restore
  const [requirementToArchive, setRequirementToArchive] =
    useState<Requirement | null>(null);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: RequirementSortableField;
    direction: SortDirection;
  } | null>(null);

  // Pagination logic
  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) =>
      req.requirementTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requirements, searchTerm]);

  const sortedRequirements = useMemo(() => {
    const sorted = [...filteredRequirements];
    if (sortConfig) {
      sorted.sort((a, b) => {
        let aValue: string | number | boolean = a[sortConfig.key];
        let bValue: string | number | boolean = b[sortConfig.key];
        if (typeof aValue === "string") aValue = aValue.toLowerCase();
        if (typeof bValue === "string") bValue = bValue.toLowerCase();
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredRequirements, sortConfig]);

  const totalPages = Math.ceil(sortedRequirements.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRequirements.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRequirements, currentPage, itemsPerPage]);

  useEffect(() => {
    setSelectedRequirements([]);
    setSelectAll(false);
  }, [showArchived, requirements]);

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedRequirements([]);
    } else {
      setSelectedRequirements(currentItems.map((req) => req.requirementID));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectRequirement = (requirementID: number) => {
    setSelectedRequirements((prev) =>
      prev.includes(requirementID)
        ? prev.filter((id) => id !== requirementID)
        : [...prev, requirementID]
    );
  };

  const isSelected = (requirementID: number) =>
    selectedRequirements.includes(requirementID);

  // Archive/restore single
  const handleArchive = (req: Requirement) => {
    setRequirementToArchive(req);
    setIsArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!requirementToArchive) return;
    setIsSubmitting(true);
    try {
      const newStatus = !requirementToArchive.is_active;
      await api.patch(`requirements/${requirementToArchive.requirementID}/`, {
        is_active: newStatus,
      });
      toast.success(
        `Requirement ${newStatus ? "restored" : "archived"} successfully!`
      );
      await fetchRequirements();
    } catch {
      toast.error("Failed to update requirement status.");
    } finally {
      setIsSubmitting(false);
      setIsArchiveDialogOpen(false);
      setRequirementToArchive(null);
    }
  };

  // Bulk archive/restore
  const handleBulkArchive = async (archive: boolean) => {
    if (selectedRequirements.length === 0) return;
    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedRequirements.map((id) =>
          api.patch(`requirements/${id}/`, {
            is_active: !archive,
          })
        )
      );
      toast.success(
        `${selectedRequirements.length} requirement${
          selectedRequirements.length > 1 ? "s" : ""
        } ${archive ? "archived" : "restored"} successfully!`
      );
      await fetchRequirements();
      setSelectedRequirements([]);
      setSelectAll(false);
    } catch {
      toast.error(`Failed to ${archive ? "archive" : "restore"} requirements.`);
    } finally {
      setIsSubmitting(false);
      setIsBulkArchiveDialogOpen(false);
    }
  };

  // Edit/add dialog
  const handleEdit = (req: Requirement) => {
    setSelectedRequirement({ ...req });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRequirement) return;
    const { name, value, type, checked } = e.target;
    setSelectedRequirement((prev) => ({
      ...prev!,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (name === "requirementTitle" && !value.trim()) {
      setFormErrors({ requirementTitle: "This field is required" });
    } else {
      setFormErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRequirement) return;
    if (!selectedRequirement.requirementTitle.trim()) {
      setFormErrors({ requirementTitle: "This field is required" });
      return;
    }
    setIsSubmitting(true);
    try {
      const data = {
        requirementTitle: selectedRequirement.requirementTitle,
        is_required: selectedRequirement.is_required,
        is_active: selectedRequirement.is_active,
      };
      if (selectedRequirement.requirementID) {
        await api.put(
          `requirements/${selectedRequirement.requirementID}/`,
          data
        );
        toast.success("Requirement updated!");
      } else {
        await api.post("requirements/", data);
        toast.success("Requirement created!");
      }
      await fetchRequirements();
      setIsDialogOpen(false);
    } catch {
      toast.error("Failed to save requirement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination controls
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const requestSort = (key: RequirementSortableField) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/2">
            <Input
              type="text"
              placeholder="Search requirements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Button
              variant={showArchived ? "primary" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              startIcon={showArchived ? <ArchiveRestore /> : <Archive />}
            >
              {showArchived ? "View Active" : "View Archived"}
            </Button>
            {selectedRequirements.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsBulkArchiveDialogOpen(true)}
                startIcon={
                  isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : showArchived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )
                }
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing..."
                  : `${selectedRequirements.length} Selected`}
              </Button>
            )}
            <select
              value={itemsPerPage.toString()}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setItemsPerPage(Number(e.target.value))
              }
              className="min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="divide-y divide-gray-200">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer select-none"
                    onClick={() => requestSort("requirementID")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        requestSort("requirementID");
                      }
                    }}
                  >
                    Requirement ID
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 ${
                          sortConfig?.key === "requirementID" &&
                          sortConfig.direction === "asc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 ${
                          sortConfig?.key === "requirementID" &&
                          sortConfig.direction === "desc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase cursor-pointer select-none"
                >
                  <div
                    className="flex items-center gap-1 cursor-pointer select-none"
                    onClick={() => requestSort("requirementTitle")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        requestSort("requirementTitle");
                      }
                    }}
                  >
                    Requirement Title
                    <span className="inline-flex flex-col ml-1">
                      <ChevronUp
                        className={`h-3 w-3 ${
                          sortConfig?.key === "requirementTitle" &&
                          sortConfig.direction === "asc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 -mt-1 ${
                          sortConfig?.key === "requirementTitle" &&
                          sortConfig.direction === "desc"
                            ? "text-primary-500"
                            : "text-gray-400"
                        }`}
                      />
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  Type
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <span className="text-red-500">
                        Failed to load requirements.
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchRequirements}
                        startIcon={<RefreshCw className="h-4 w-4" />}
                      >
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentItems.length > 0 ? (
                currentItems.map((req) => (
                  <TableRow
                    key={req.requirementID}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <input
                        type="checkbox"
                        checked={isSelected(req.requirementID)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectRequirement(req.requirementID);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                        {req.requirementID}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                        {req.requirementTitle}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      <Badge color={req.is_required ? "primary" : "secondary"}>
                        {req.is_required ? "Required" : "Optional"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      <Badge color={req.is_active ? "success" : "error"}>
                        {req.is_active ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400 space-x-2">
                      <div className="flex justify-start space-x-2">
                        <button
                          onClick={() => handleEdit(req)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit"
                        >
                          <SquarePenIcon />
                        </button>
                        <button
                          onClick={() => handleArchive(req)}
                          className="text-gray-600 hover:text-gray-900"
                          title={req.is_active ? "Archive" : "Restore"}
                          disabled={isSubmitting}
                        >
                          {req.is_active ? (
                            <ArchiveIcon />
                          ) : (
                            <ArchiveRestoreIcon />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-gray-500"
                  >
                    No {showArchived ? "archived" : "active"} requirements
                    found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing{" "}
          {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}{" "}
          to {Math.min(currentPage * itemsPerPage, filteredRequirements.length)}{" "}
          of {filteredRequirements.length} entries
          {selectedRequirements.length > 0 && (
            <span className="ml-2">
              ({selectedRequirements.length} selected)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  variant={currentPage === pageNum ? "primary" : "outline"}
                  size="sm"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            variant="outline"
            size="sm"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRequirement?.requirementID
                ? "Edit Requirement"
                : "Add Requirement"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequirement?.requirementID
                ? "Update the requirement details below."
                : "Fill in the details for the new requirement."}
            </DialogDescription>
          </DialogHeader>
          {selectedRequirement && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="requirementTitle">Title *</Label>
                <Input
                  type="text"
                  id="requirementTitle"
                  name="requirementTitle"
                  value={selectedRequirement.requirementTitle}
                  onChange={handleChange}
                />
                {formErrors.requirementTitle && (
                  <p className="text-red-500 text-sm">
                    {formErrors.requirementTitle}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_required"
                    checked={selectedRequirement.is_required}
                    onChange={handleChange}
                  />
                  <span>Required</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label className="text-base">Status</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={selectedRequirement.is_active}
                      onChange={() =>
                        setSelectedRequirement({
                          ...selectedRequirement,
                          is_active: true,
                        })
                      }
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={!selectedRequirement.is_active}
                      onChange={() =>
                        setSelectedRequirement({
                          ...selectedRequirement,
                          is_active: false,
                        })
                      }
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Archived</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="animate-spin size-4" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Archive/Restore Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {requirementToArchive?.is_active
                ? "Archive Requirement"
                : "Restore Requirement"}
            </DialogTitle>
          </DialogHeader>
          {requirementToArchive && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to{" "}
                {requirementToArchive.is_active ? "archive" : "restore"} the
                requirement{" "}
                <strong>{requirementToArchive.requirementTitle}</strong>?
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsArchiveDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  color={requirementToArchive.is_active ? "warning" : "success"}
                  onClick={handleArchiveConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      {requirementToArchive.is_active
                        ? "Archiving..."
                        : "Restoring..."}
                    </span>
                  ) : requirementToArchive.is_active ? (
                    "Archive"
                  ) : (
                    "Restore"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Bulk Archive/Restore Dialog */}
      <Dialog
        open={isBulkArchiveDialogOpen}
        onOpenChange={setIsBulkArchiveDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showArchived ? "Restore Requirements" : "Archive Requirements"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to {showArchived ? "restore" : "archive"}{" "}
              {selectedRequirements.length} selected requirement
              {selectedRequirements.length > 1 ? "s" : ""}?
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBulkArchiveDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                color={showArchived ? "success" : "warning"}
                onClick={() => handleBulkArchive(!showArchived)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin size-4" />
                    {showArchived ? "Restoring..." : "Archiving..."}
                  </span>
                ) : showArchived ? (
                  "Restore Requirements"
                ) : (
                  "Archive Requirements"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
