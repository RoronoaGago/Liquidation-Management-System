import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bounce, toast } from "react-toastify";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import LOPsTable from "../components/tables/BasicTables/LOPsTable";
import Button from "../components/ui/button/Button";
import { PlusIcon } from "../icons";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import api from "@/api/axios";
import {
  Requirement,
  ListOfPriority,
  LOPSortableField,
  SortDirection,
} from "@/lib/types";

interface LOPFormData {
  expenseTitle: string;
  requirement_ids: number[];
  is_active: boolean;
}

const requiredFields = ["expenseTitle"];

const ManageListOfPriorities = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [allLOPs, setAllLOPs] = useState<ListOfPriority[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterOptions, setFilterOptions] = useState<{ searchTerm: string }>({
    searchTerm: "",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: LOPSortableField;
    direction: SortDirection;
  } | null>({ key: "LOPID", direction: "desc" });
  const [formData, setFormData] = useState<LOPFormData>({
    expenseTitle: "",
    requirement_ids: [],
    is_active: true,
  });

  const isFormValid =
    requiredFields.every(
      (field) => formData[field as keyof LOPFormData]?.toString().trim() !== ""
    ) && Object.keys(errors).length === 0;

  // Fetch LOPs and requirements
  const fetchLOPs = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lopsRes, reqsRes] = await Promise.all([
        api.get("priorities/", { params: { archived: showArchived } }),
        api.get("requirements/"),
      ]);
      setAllLOPs(lopsRes.data);
      setRequirements(reqsRes.data);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to fetch List of Priorities");
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLOPs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  // Filtering and sorting logic
  const filteredLOPs = useMemo(() => {
    return allLOPs.filter((lop) => {
      if (filterOptions.searchTerm) {
        const term = filterOptions.searchTerm.toLowerCase();
        return (
          lop.expenseTitle.toLowerCase().includes(term) ||
          lop.LOPID.toString().includes(term)
        );
      }
      return true;
    });
  }, [allLOPs, filterOptions]);

  const sortedLOPs = useMemo(() => {
    if (!sortConfig) return filteredLOPs;
    return [...filteredLOPs].sort((a, b) => {
      if (sortConfig.key === "LOPID") {
        return sortConfig.direction === "asc"
          ? a.LOPID - b.LOPID
          : b.LOPID - a.LOPID;
      }
      if (sortConfig.key === "expenseTitle") {
        return sortConfig.direction === "asc"
          ? a.expenseTitle.localeCompare(b.expenseTitle)
          : b.expenseTitle.localeCompare(a.expenseTitle);
      }
      return 0;
    });
  }, [filteredLOPs, sortConfig]);

  const requestSort = (key: LOPSortableField) => {
    let direction: SortDirection = "asc";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : null;
    }
    setSortConfig(direction ? { key, direction } : null);
  };

  // Dialog form handlers (add/edit LOP)
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Simple validation
    const newErrors = { ...errors };
    if (requiredFields.includes(name) && !value.trim()) {
      newErrors[name] = "This field is required.";
    } else {
      delete newErrors[name];
    }
    setErrors(newErrors);
  };

  const handleRequirementToggle = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      requirement_ids: prev.requirement_ids.includes(id)
        ? prev.requirement_ids.filter((rid) => rid !== id)
        : [...prev.requirement_ids, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Please fill in all required fields correctly!");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("priorities/", formData);
      toast.success("List of Priority Added Successfully!", {
        position: "top-center",
        autoClose: 2000,
        transition: Bounce,
      });
      setFormData({
        expenseTitle: "",
        requirement_ids: [],
        is_active: true,
      });
      setErrors({});
      setIsDialogOpen(false);
      await fetchLOPs();
    } catch (error) {
      toast.error("Failed to add List of Priority. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Manage List of Priorities" />
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="md"
                variant="primary"
                startIcon={<PlusIcon className="size-6" />}
              >
                Add New List of Priority
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                  Add New List of Priority
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Fill in the details below
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="expenseTitle" className="text-base">
                    Expense Title *
                  </Label>
                  <Input
                    type="text"
                    id="expenseTitle"
                    name="expenseTitle"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="Enter expense title"
                    value={formData.expenseTitle}
                    onChange={handleChange}
                  />
                  {errors.expenseTitle && (
                    <p className="text-red-500 text-sm">
                      {errors.expenseTitle}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requirements" className="text-base">
                    Requirements
                  </Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {requirements.map((req) => (
                      <label
                        key={req.requirementID}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={formData.requirement_ids.includes(
                            req.requirementID
                          )}
                          onChange={() =>
                            handleRequirementToggle(req.requirementID)
                          }
                        />
                        {req.requirementTitle}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={() =>
                        setFormData((prev) => ({ ...prev, is_active: true }))
                      }
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="is_active"
                      checked={!formData.is_active}
                      onChange={() =>
                        setFormData((prev) => ({ ...prev, is_active: false }))
                      }
                    />
                    <span>Archived</span>
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setErrors({});
                      setFormData({
                        expenseTitle: "",
                        requirement_ids: [],
                        is_active: true,
                      });
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
                    {isSubmitting ? "Adding..." : "Add List of Priority"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <LOPsTable
          lops={allLOPs}
          setLOPs={setAllLOPs}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          fetchLOPs={fetchLOPs}
          sortedLOPs={sortedLOPs}
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
          onRequestSort={requestSort}
          currentSort={sortConfig}
          loading={loading}
          error={error}
          requirements={requirements}
        />
      </div>
    </div>
  );
};

export default ManageListOfPriorities;
