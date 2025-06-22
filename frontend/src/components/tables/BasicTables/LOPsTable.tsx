/* eslint-disable @typescript-eslint/no-unused-vars */
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
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Archive,
  ArchiveRestore,
  ArchiveIcon,
  ArchiveRestoreIcon,
  SquarePenIcon,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import axios from "axios";
import Badge from "@/components/ui/badge/Badge";
// import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import SkeletonRow from "@/components/ui/skeleton";
import api from "@/api/axios";
import {
  ListOfPriority,
  Requirement,
  SortDirection,
  LOPSortableField, // <-- import the new type
} from "@/lib/types";

interface LOPsTableProps {
  lops: ListOfPriority[];
  setLOPs: React.Dispatch<React.SetStateAction<ListOfPriority[]>>;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  itemsPerPage?: number;
  sortedLOPs: ListOfPriority[];
  filterOptions: {
    searchTerm: string;
  };
  setFilterOptions: React.Dispatch<
    React.SetStateAction<{
      searchTerm: string;
    }>
  >;
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  onRequestSort: (key: LOPSortableField) => void;
  currentSort: {
    key: LOPSortableField;
    direction: SortDirection;
  } | null;
  fetchLOPs: () => Promise<void>;
  loading?: boolean;
  error?: Error | null;
  requirements: Requirement[];
}

interface FormErrors {
  expenseTitle?: string;
  requirements?: string;
}

export default function LOPsTable({
  showArchived,
  setShowArchived,
  fetchLOPs,
  sortedLOPs,
  filterOptions,
  setFilterOptions,
  onRequestSort,
  currentSort,
  loading,
  error,
  requirements,
}: LOPsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState(filterOptions.searchTerm || "");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedLOPs, setSelectedLOPs] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isBulkArchiveDialogOpen, setIsBulkArchiveDialogOpen] = useState(false);
  const [selectedLOP, setSelectedLOP] = useState<ListOfPriority | null>(null);
  const [LOPToDelete, setLOPToDelete] = useState<ListOfPriority | null>(null);
  const [LOPToView, setLOPToView] = useState<ListOfPriority | null>(null);
  const [LOPToArchive, setLOPToArchive] = useState<ListOfPriority | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [selectedRequirements, setSelectedRequirements] = useState<number[]>(
    []
  );
  const [dialogSearchTerm, setDialogSearchTerm] = useState(""); // <-- Add this line

  const isFormValid = useMemo(() => {
    if (!selectedLOP) return false;

    // Check required fields are filled
    const titleValid = selectedLOP.expenseTitle?.trim() !== "";

    // Check no validation errors
    const noErrors = Object.keys(formErrors).length === 0;

    return titleValid && noErrors;
  }, [selectedLOP, formErrors]);

  useEffect(() => {
    if (selectedLOP) {
      setSelectedRequirements(
        selectedLOP.requirements?.map((req) => req.requirementID) || []
      );
    }
  }, [selectedLOP]);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedLOPs([]);
    setSelectAll(false);
  }, [showArchived]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilterOptions((prev) => ({
        ...prev,
        searchTerm,
      }));
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm, setFilterOptions]);

  const totalPages = Math.ceil(sortedLOPs.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedLOPs.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedLOPs, currentPage, itemsPerPage]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLOPs([]);
    } else {
      setSelectedLOPs(currentItems.map((lop) => lop.LOPID));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectLOP = (LOPId: number) => {
    setSelectedLOPs((prev) =>
      prev.includes(LOPId)
        ? prev.filter((id) => id !== LOPId)
        : [...prev, LOPId]
    );
  };

  const isSelected = (LOPId: number) => selectedLOPs.includes(LOPId);

  const handleBulkArchive = async (archive: boolean) => {
    if (selectedLOPs.length === 0) return;
    setIsSubmitting(true);

    try {
      await Promise.all(
        selectedLOPs.map((LOPId) =>
          api.patch(`priorities/${LOPId}/`, {
            is_active: !archive,
          })
        )
      );

      toast.success(
        `${selectedLOPs.length} LOP${selectedLOPs.length > 1 ? "s" : ""} ${
          archive ? "archived" : "restored"
        } successfully!`
      );

      await fetchLOPs();
      setSelectedLOPs([]);
      setSelectAll(false);
    } catch (error) {
      toast.error(
        `Failed to ${archive ? "archive" : "restore"} LOPs. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
      setIsBulkArchiveDialogOpen(false);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleEditLOP = (lop: ListOfPriority) => {
    setSelectedLOP({ ...lop });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  //   const handleDeleteClick = (lop: ListOfPriority) => {
  //     setLOPToDelete(lop);
  //     setIsDeleteDialogOpen(true);
  //   };

  const handleViewLOP = (lop: ListOfPriority) => {
    setLOPToView(lop);
    setIsViewDialogOpen(true);
  };

  const handleArchiveClick = (lop: ListOfPriority) => {
    setLOPToArchive(lop);
    setIsArchiveDialogOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedLOP) return;
    const { name, value } = e.target;

    setSelectedLOP((prev) => ({
      ...prev!,
      [name]: value,
    }));

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      const newErrors = { ...formErrors };

      if (name === "expenseTitle" && !value.trim()) {
        newErrors.expenseTitle = "This field is required";
      } else {
        delete newErrors.expenseTitle;
      }

      setFormErrors(newErrors);
    }, 500);
  };

  const toggleRequirement = (requirementId: number) => {
    setSelectedRequirements((prev) =>
      prev.includes(requirementId)
        ? prev.filter((id) => id !== requirementId)
        : [...prev, requirementId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLOP) return;

    if (!isFormValid) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        expenseTitle: selectedLOP.expenseTitle,
        requirement_ids: selectedRequirements,
        is_active: selectedLOP.is_active,
      };

      if (selectedLOP.LOPID) {
        // Update existing LOP
        await api.put(`priorities/${selectedLOP.LOPID}/`, data);
        toast.success("List of Priority updated successfully!");
      } else {
        // Create new LOP
        await api.post("priorities/", data);
        toast.success("List of Priority created successfully!");
      }

      await fetchLOPs();
      setIsDialogOpen(false);
    } catch (error) {
      let errorMessage = "Failed to save List of Priority. Please try again.";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!LOPToDelete) return;
    setIsSubmitting(true);

    try {
      await api.delete(`priorities/${LOPToDelete.LOPID}/`);
      toast.success("List of Priority deleted successfully!");
      await fetchLOPs();
    } catch (error) {
      toast.error("Failed to delete List of Priority");
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setLOPToDelete(null);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!LOPToArchive) return;
    setIsSubmitting(true);

    try {
      const newStatus = !LOPToArchive.is_active;
      await api.patch(`priorities/${LOPToArchive.LOPID}/`, {
        is_active: newStatus,
      });

      toast.success(`LOP ${newStatus ? "restored" : "archived"} successfully!`);

      await fetchLOPs();
    } catch (error) {
      toast.error(
        `Failed to ${
          LOPToArchive.is_active ? "archive" : "restore"
        } List of Priority`
      );
    } finally {
      setIsSubmitting(false);
      setIsArchiveDialogOpen(false);
      setLOPToArchive(null);
    }
  };

  //   const handleFilterChange = (name: string, value: string) => {
  //     setFilterOptions((prev) => ({
  //       ...prev,
  //       [name]: value,
  //     }));
  //   };

  //   const resetFilters = () => {
  //     setFilterOptions({
  //       searchTerm: "",
  //     });
  //     setSearchTerm("");
  //   };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-64">
            <Input
              type="text"
              placeholder="Search LOPs..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchTerm(e.target.value);
              }}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <Button
              variant={showArchived ? "primary" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              startIcon={
                showArchived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )
              }
            >
              {showArchived ? "View Active" : "View Archived"}
            </Button>

            {selectedLOPs.length > 0 && (
              <div className="flex gap-2">
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
                    : `${selectedLOPs.length} Selected`}
                </Button>
              </div>
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
                  List of Priority ID
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  List of Priority Title
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  Requirements
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
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <span className="text-red-500">
                        Failed to load LOPs: {error.message}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLOPs()}
                        startIcon={<RefreshCw className="h-4 w-4" />}
                      >
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentItems.length > 0 ? (
                currentItems.map((lop) => (
                  <TableRow
                    key={lop.LOPID}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleViewLOP(lop)}
                  >
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <input
                        type="checkbox"
                        checked={isSelected(lop.LOPID)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectLOP(lop.LOPID);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                          {lop.LOPID}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                          {lop.expenseTitle}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      <div className="flex flex-wrap gap-1">
                        {lop.requirements?.slice(0, 3).map((req) => (
                          <Badge key={req.requirementID} color="primary">
                            {req.requirementTitle}
                          </Badge>
                        ))}
                        {lop.requirements && lop.requirements.length > 3 && (
                          <span className="ml-1 text-gray-500">...</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                      <Badge color={lop.is_active ? "success" : "error"}>
                        {lop.is_active ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 whitespace-nowrap py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400 space-x-2">
                      <div className="flex justify-start space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditLOP(lop);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit LOP"
                        >
                          <SquarePenIcon />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveClick(lop);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title={lop.is_active ? "Archive LOP" : "Restore LOP"}
                        >
                          {lop.is_active ? (
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
                    className="py-8 text-center text-gray-500"
                    colSpan={9}
                  >
                    No {showArchived ? "archived" : "active"} LOPs found
                    matching your criteria
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
          to {Math.min(currentPage * itemsPerPage, sortedLOPs.length)} of{" "}
          {sortedLOPs.length} entries
          {selectedLOPs.length > 0 && (
            <span className="ml-2">({selectedLOPs.length} selected)</span>
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

      {/* Edit LOP Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar [&>button]:hidden">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              {selectedLOP?.LOPID
                ? "Edit List of Priority"
                : "Create New List of Priority"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {selectedLOP?.LOPID
                ? "Update the List of Priority details below"
                : "Fill in the details for the new List of Priority"}
            </DialogDescription>
          </DialogHeader>

          {selectedLOP && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="expenseTitle" className="text-base">
                  List of Priority *
                </Label>
                <Input
                  type="text"
                  id="expenseTitle"
                  name="expenseTitle"
                  className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  placeholder="Enter list of priority"
                  value={selectedLOP.expenseTitle}
                  onChange={handleChange}
                />
                {formErrors.expenseTitle && (
                  <p className="text-red-500 text-sm">
                    {formErrors.expenseTitle}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="requirements" className="text-base">
                    Requirements *
                  </Label>
                  <div className="relative w-64">
                    <Input
                      type="text"
                      placeholder="Search requirements..."
                      onChange={(e) => setDialogSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {requirements
                    .filter((req) =>
                      req.requirementTitle
                        .toLowerCase()
                        .includes(dialogSearchTerm.toLowerCase())
                    )
                    .map((req) => (
                      <div
                        key={req.requirementID}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`req-${req.requirementID}`}
                            checked={selectedRequirements.includes(
                              req.requirementID
                            )}
                            onChange={() =>
                              toggleRequirement(req.requirementID)
                            }
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <Label
                            htmlFor={`req-${req.requirementID}`}
                            className="ml-2"
                          >
                            {req.requirementTitle}
                          </Label>
                        </div>
                        <Badge
                          color={req.is_required ? "primary" : "secondary"}
                        >
                          {req.is_required ? "Required" : "Optional"}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Status</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={selectedLOP.is_active}
                      onChange={() =>
                        setSelectedLOP({ ...selectedLOP, is_active: true })
                      }
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={!selectedLOP.is_active}
                      onChange={() =>
                        setSelectedLOP({ ...selectedLOP, is_active: false })
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
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedLOP(null);
                    setFormErrors({});
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View LOP Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-w-6xl">
          <DialogHeader className="mb-6">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
                {LOPToView?.expenseTitle}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                List of Priority Details
              </DialogDescription>
            </div>
          </DialogHeader>

          {LOPToView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information and Status sections remain the same */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        List of Priority ID
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {LOPToView.LOPID}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        List of Priority Title
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {LOPToView.expenseTitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                    Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-none">
                        Status
                      </Label>
                      <Badge color={LOPToView.is_active ? "success" : "error"}>
                        {LOPToView.is_active ? "Active" : "Archived"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Updated Requirements Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                  All Requirements ({LOPToView.requirements?.length || 0})
                </h3>
                {LOPToView?.requirements?.length ? (
                  <div
                    className="max-h-72 overflow-y-auto pr-2"
                    style={{ minHeight: "60px" }}
                  >
                    <div className="space-y-2">
                      {LOPToView.requirements.map((req) => (
                        <div
                          key={req.requirementID}
                          className="p-3 border rounded-lg flex justify-between items-center"
                        >
                          <div className="font-medium">
                            {req.requirementTitle}
                          </div>
                          <Badge
                            color={req.is_required ? "primary" : "secondary"}
                          >
                            {req.is_required ? "Required" : "Optional"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No requirements assigned to this LOP
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              Delete List of Priority
            </DialogTitle>
          </DialogHeader>

          {LOPToDelete && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to permanently delete List of Priority{" "}
                <strong>{LOPToDelete.expenseTitle}</strong>? This action cannot
                be undone.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setLOPToDelete(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="error"
                  onClick={handleDeleteConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      Deleting...
                    </span>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              {LOPToArchive?.is_active
                ? "Archive List of Priority"
                : "Restore List of Priority"}
            </DialogTitle>
          </DialogHeader>

          {LOPToArchive && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to{" "}
                {LOPToArchive.is_active ? "archive" : "restore"} List of
                Priority <strong>{LOPToArchive.expenseTitle}</strong>?{" "}
                {LOPToArchive.is_active
                  ? "Archived List of Priorities will not be available for new requests."
                  : "Restored List of Priorities will be available for requests."}
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsArchiveDialogOpen(false);
                    setLOPToArchive(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  color={LOPToArchive.is_active ? "warning" : "success"}
                  onClick={handleArchiveConfirm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      {LOPToArchive.is_active ? "Archiving..." : "Restoring..."}
                    </span>
                  ) : LOPToArchive.is_active ? (
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

      {/* Bulk Archive Confirmation Dialog */}
      <Dialog
        open={isBulkArchiveDialogOpen}
        onOpenChange={setIsBulkArchiveDialogOpen}
      >
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
              {showArchived
                ? "Restore List of Priorities"
                : "Archive List of Priorities"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to {showArchived ? "restore" : "archive"}{" "}
              {selectedLOPs.length} selected List of Priority
              {selectedLOPs.length > 1 ? "ies" : "y"}?{" "}
              {showArchived
                ? "Restored List of Priorities will be available for requests."
                : "Archived List of Priorities will not be available for new requests."}
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
                  "Restore LOPs"
                ) : (
                  "Archive LOPs"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
