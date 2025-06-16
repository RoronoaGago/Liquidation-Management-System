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
import SchoolsTable from "../components/tables/BasicTables/SchoolsTable";
import Button from "../components/ui/button/Button";
import { PlusIcon } from "../icons";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import api from "@/api/axios";
import { Loader2Icon } from "lucide-react";
import { laUnionMunicipalities } from "@/lib/constants";

interface SchoolFormData {
  schoolId: string;
  schoolName: string;
  district: string;
  municipality: string;
  legislativeDistrict: string;
}

const requiredFields = [
  "schoolId",
  "schoolName",
  "district",
  "municipality",
  "legislativeDistrict",
];

const ManageSchools = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allSchools, setAllSchools] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    searchTerm: "",
    district: "",
    municipality: "",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "schoolName", direction: "asc" });
  const [formData, setFormData] = useState<SchoolFormData>({
    schoolId: "",
    schoolName: "",
    district: "",
    municipality: "",
    legislativeDistrict: "",
  });

  const isFormValid =
    requiredFields.every(
      (field) => formData[field as keyof SchoolFormData]?.trim() !== ""
    ) && Object.keys(errors).length === 0;

  const fetchSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("http://127.0.0.1:8000/api/schools/", {
        params: {
          archived: showArchived,
          search: filterOptions.searchTerm || undefined,
          district: filterOptions.district || undefined,
          municipality: filterOptions.municipality || undefined,
        },
      });
      setAllSchools(response.data);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch schools");
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived, filterOptions]);

  const filteredSchools = useMemo(() => {
    return allSchools.filter((school) => {
      if (filterOptions.searchTerm) {
        const term = filterOptions.searchTerm.toLowerCase();
        return (
          school.schoolName.toLowerCase().includes(term) ||
          school.schoolId.toLowerCase().includes(term) ||
          school.district.toLowerCase().includes(term) ||
          school.municipality.toLowerCase().includes(term) ||
          school.legislativeDistrict.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [allSchools, filterOptions]);

  const sortedSchools = useMemo(() => {
    if (!sortConfig) return filteredSchools;
    return [...filteredSchools].sort((a, b) => {
      const aValue = a[sortConfig.key] ?? "";
      const bValue = b[sortConfig.key] ?? "";
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue, undefined, {
          sensitivity: "base",
        });
        return sortConfig.direction === "asc" ? comparison : -comparison;
      }
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredSchools, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc";
    }
    setSortConfig({ key, direction });
  };

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      const newErrors = { ...errors };
      if (requiredFields.includes(name) && !value.trim()) {
        newErrors[name] = "This field is required.";
      } else {
        delete newErrors[name];
      }
      setErrors(newErrors);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const finalErrors: Record<string, string> = {};
    requiredFields.forEach((field) => {
      if (!formData[field as keyof SchoolFormData]?.trim()) {
        finalErrors[field] = "This field is required.";
      }
    });

    setErrors(finalErrors);

    if (Object.keys(finalErrors).length > 0) {
      toast.error("Please fill in all required fields correctly!");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("http://127.0.0.1:8000/api/schools/", {
        ...formData,
        headers: { "Content-Type": "application/json" },
      });
      await fetchSchools();
      toast.success("School Added Successfully!", {
        position: "top-center",
        autoClose: 2000,
        style: { fontFamily: "Outfit, sans-serif" },
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      });
      setFormData({
        schoolId: "",
        schoolName: "",
        district: "",
        municipality: "",
        legislativeDistrict: "",
      });
      setErrors({});
      setIsDialogOpen(false);
    } catch (error: any) {
      let errorMessage = "Failed to add school. Please try again.";
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data.schoolId) {
          errorMessage = "School ID already exists.";
        }
      }
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 2000,
        style: { fontFamily: "Outfit, sans-serif" },
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Manage Schools" />
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="md"
                variant="primary"
                startIcon={<PlusIcon className="size-6" />}
              >
                Add New School
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                  Add New School
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Fill in the school details below
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="schoolId" className="text-base">
                    School ID *
                  </Label>
                  <Input
                    type="text"
                    id="schoolId"
                    name="schoolId"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="School ID"
                    value={formData.schoolId}
                    onChange={handleChange}
                  />
                  {errors.schoolId && (
                    <p className="text-red-500 text-sm">{errors.schoolId}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolName" className="text-base">
                    School Name *
                  </Label>
                  <Input
                    type="text"
                    id="schoolName"
                    name="schoolName"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="School Name"
                    value={formData.schoolName}
                    onChange={handleChange}
                  />
                  {errors.schoolName && (
                    <p className="text-red-500 text-sm">{errors.schoolName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district" className="text-base">
                    District *
                  </Label>
                  <Input
                    type="text"
                    id="district"
                    name="district"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="District"
                    value={formData.district}
                    onChange={handleChange}
                  />
                  {errors.district && (
                    <p className="text-red-500 text-sm">{errors.district}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="municipality" className="text-base">
                    Municipality *
                  </Label>
                  <select
                    id="municipality"
                    name="municipality"
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    value={formData.municipality}
                    onChange={handleChange}
                  >
                    <option value="">Select Municipality</option>
                    {laUnionMunicipalities.map((mun) => (
                      <option key={mun} value={mun}>
                        {mun}
                      </option>
                    ))}
                  </select>

                  {errors.municipality && (
                    <p className="text-red-500 text-sm">
                      {errors.municipality}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legislativeDistrict" className="text-base">
                    Legislative District *
                  </Label>
                  <Input
                    type="text"
                    id="legislativeDistrict"
                    name="legislativeDistrict"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="Legislative District"
                    value={formData.legislativeDistrict}
                    onChange={handleChange}
                  />
                  {errors.legislativeDistrict && (
                    <p className="text-red-500 text-sm">
                      {errors.legislativeDistrict}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsDialogOpen(false);
                      setErrors({});
                      setFormData({
                        schoolId: "",
                        schoolName: "",
                        district: "",
                        municipality: "",
                        legislativeDistrict: "",
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
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2Icon className="animate-spin size-4" />
                        Adding...
                      </span>
                    ) : (
                      "Add School"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <SchoolsTable
          schools={allSchools}
          setSchools={setAllSchools}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          fetchSchools={fetchSchools}
          sortedSchools={sortedSchools}
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
          onRequestSort={requestSort}
          currentSort={sortConfig}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
};

export default ManageSchools;
