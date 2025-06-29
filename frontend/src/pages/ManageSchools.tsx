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
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import api from "@/api/axios";
import { Loader2Icon } from "lucide-react";
import {
  laUnionMunicipalities,
  municipalityDistricts,
  firstDistrictMunicipalities,
} from "@/lib/constants";

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
//TODO - Add validation for schoolId to ensure it is unique and follows a specific format if needed
//TODO - Filtering options in the backend
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const ManageSchools = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [totalSchools, setTotalSchools] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    searchTerm: "",
    legislative_district: "",
    district: "",
    municipality: "",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "schoolName", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState<SchoolFormData>({
    schoolId: "",
    schoolName: "",
    district: "",
    municipality: "",
    legislativeDistrict: "",
  });
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [autoLegislativeDistrict, setAutoLegislativeDistrict] = useState("");
  const [legislativeDistricts, setLegislativeDistricts] = useState<{
    [key: string]: string[];
  }>({});
  const [legislativeDistrictOptions, setLegislativeDistrictOptions] = useState<
    string[]
  >([]);

  const isFormValid =
    requiredFields.every(
      (field) => formData[field as keyof SchoolFormData]?.trim() !== ""
    ) && Object.keys(errors).length === 0;

  // Fetch schools from backend with pagination, filtering, sorting
  const fetchSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
        archived: showArchived, // <-- this is important!
      };
      if (filterOptions.searchTerm) params.search = filterOptions.searchTerm;
      if (filterOptions.legislative_district)
        params.legislative_district = filterOptions.legislative_district;
      if (filterOptions.municipality)
        params.municipality = filterOptions.municipality;
      if (filterOptions.district) params.district = filterOptions.district;
      if (sortConfig) {
        params.ordering =
          sortConfig.direction === "asc"
            ? sortConfig.key
            : `-${sortConfig.key}`;
      }
      const response = await api.get("schools/", { params });
      setSchools(response.data.results || response.data);
      setTotalSchools(response.data.count ?? response.data.length);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch schools");
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch legislative districts mapping from backend
  useEffect(() => {
    api.get("/legislative-districts/").then((res) => {
      setLegislativeDistricts(res.data);
      setLegislativeDistrictOptions(Object.keys(res.data));
    });
  }, []);

  useEffect(() => {
    fetchSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived, filterOptions, sortConfig, currentPage, itemsPerPage]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
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

  // When legislativeDistrict changes, update municipality options
  const [municipalityOptions, setMunicipalityOptions] = useState<string[]>([]);
  useEffect(() => {
    if (
      formData.legislativeDistrict &&
      legislativeDistricts[formData.legislativeDistrict]
    ) {
      setMunicipalityOptions(
        legislativeDistricts[formData.legislativeDistrict]
      );
      setFormData((prev) => ({
        ...prev,
        municipality: "",
        district: "",
      }));
    } else {
      setMunicipalityOptions([]);
      setFormData((prev) => ({
        ...prev,
        municipality: "",
        district: "",
      }));
    }
    // eslint-disable-next-line
  }, [formData.legislativeDistrict, legislativeDistricts]);

  // When municipality changes, update district options (if needed)
  useEffect(() => {
    const mun = formData.municipality;
    if (mun) {
      setDistrictOptions(municipalityDistricts[mun] || []);
      setFormData((prev) => ({
        ...prev,
        district: "",
      }));
    } else {
      setDistrictOptions([]);
      setFormData((prev) => ({
        ...prev,
        district: "",
      }));
    }
    // eslint-disable-next-line
  }, [formData.municipality]);

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
                  <Label htmlFor="legislativeDistrict" className="text-base">
                    Legislative District *
                  </Label>
                  <select
                    id="legislativeDistrict"
                    name="legislativeDistrict"
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    value={formData.legislativeDistrict}
                    onChange={handleChange}
                  >
                    <option value="">Select Legislative District</option>
                    {legislativeDistrictOptions.map((ld) => (
                      <option key={ld} value={ld}>
                        {ld}
                      </option>
                    ))}
                  </select>
                  {errors.legislativeDistrict && (
                    <p className="text-red-500 text-sm">
                      {errors.legislativeDistrict}
                    </p>
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
                    disabled={!formData.legislativeDistrict}
                  >
                    <option value="">Select Municipality</option>
                    {municipalityOptions.map((mun) => (
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
                  <Label htmlFor="district" className="text-base">
                    District *
                  </Label>
                  <select
                    id="district"
                    name="district"
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={!formData.municipality}
                  >
                    <option value="">Select District</option>
                    {districtOptions.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  {errors.district && (
                    <p className="text-red-500 text-sm">{errors.district}</p>
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
          schools={schools}
          setSchools={setSchools}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          fetchSchools={fetchSchools}
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
          onRequestSort={requestSort}
          currentSort={sortConfig}
          loading={loading}
          error={error}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalSchools={totalSchools}
          ITEMS_PER_PAGE_OPTIONS={ITEMS_PER_PAGE_OPTIONS}
        />
      </div>
    </div>
  );
};

export default ManageSchools;
