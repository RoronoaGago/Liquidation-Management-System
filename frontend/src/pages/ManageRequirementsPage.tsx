import PageBreadcrumb from "../components/common/PageBreadCrumb";
import RequirementsTable from "../components/tables/BasicTables/RequirementsTable";
import Button from "../components/ui/button/Button";
import { PlusIcon } from "../icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { Bounce, toast } from "react-toastify";
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export interface Requirement {
  requirementID: number;
  requirementTitle: string;
  is_required: boolean;
  is_active: boolean;
}

const requiredFields = ["requirementTitle"];

const ManageRequirementsPage = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Requirement>({
    requirementID: 0,
    requirementTitle: "",
    is_required: false,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch requirements
  const fetchRequirements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/requirements/`, {
        params: { archived: showArchived },
      });
      setRequirements(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch requirements")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  // Validation
  const isFormValid =
    requiredFields.every(
      (field) => formData[field as keyof Requirement]?.toString().trim() !== ""
    ) && Object.keys(errors).length === 0;

  // Dialog form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Please fill in all required fields correctly!");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/requirements/`, formData);
      toast.success("Requirement added successfully!", {
        position: "top-center",
        autoClose: 2000,
        transition: Bounce,
      });
      setFormData({
        requirementID: 0,
        requirementTitle: "",
        is_required: false,
        is_active: true,
      });
      setErrors({});
      setIsDialogOpen(false);
      await fetchRequirements();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Failed to add requirement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Manage Requirements" />
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="md"
                variant="primary"
                startIcon={<PlusIcon className="size-6" />}
              >
                Add New Requirement
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                  Add New Requirement
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Fill in the details below
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="requirementTitle" className="text-base">
                    Requirement Title *
                  </Label>
                  <Input
                    type="text"
                    id="requirementTitle"
                    name="requirementTitle"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="Enter requirement title"
                    value={formData.requirementTitle}
                    onChange={handleChange}
                  />
                  {errors.requirementTitle && (
                    <p className="text-red-500 text-sm">
                      {errors.requirementTitle}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150 w-full">
                    <input
                      type="checkbox"
                      name="is_required"
                      checked={formData.is_required}
                      onChange={handleChange}
                      className="h-5 w-5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                      style={{ minWidth: 20, minHeight: 20 }}
                    />
                    <span className="text-base">Required</span>
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
                        requirementID: 0,
                        requirementTitle: "",
                        is_required: false,
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
                    {isSubmitting ? "Adding..." : "Add Requirement"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <RequirementsTable
          requirements={requirements}
          setRequirements={setRequirements}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          fetchRequirements={fetchRequirements}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
};

export default ManageRequirementsPage;
