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
import { District } from "@/lib/types";

interface SchoolFormData {
  schoolId: string;
  schoolName: string;
  districtId: string;
  municipality: string;
  legislativeDistrict: string;
}

const requiredFields = [
  "schoolId",
  "schoolName",
  "districtId",
  "municipality",
  "legislativeDistrict",
];
//TODO - Add validation for schoolId to ensure it is unique and follows a specific format if needed
//TODO - Filtering options in the backend
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const ManageSchools = () => {
  const [districts, setDistricts] = useState<District[]>([]);
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
    districtId: "",
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
    districtId: "",
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
        archived: showArchived,
      };
      if (filterOptions.searchTerm) params.search = filterOptions.searchTerm;
      if (filterOptions.legislative_district)
        params.legislative_district = filterOptions.legislative_district;
      if (filterOptions.municipality)
        params.municipality = filterOptions.municipality;
      if (filterOptions.districtId) params.district = filterOptions.districtId;
      if (sortConfig) {
        params.ordering =
          sortConfig.direction === "asc"
            ? sortConfig.key
            : `-${sortConfig.key}`;
      }

      // Fetch schools and districts in parallel
      const [schoolsResponse, districtsResponse] = await Promise.all([
        api.get("schools/", { params }),
        api.get("school-districts/"),
      ]);

      const schoolsData = schoolsResponse.data.results || schoolsResponse.data;
      const districtsData =
        districtsResponse.data.results || districtsResponse.data;

      // Create a mapping of district IDs to names with proper typing
      const districtMap: Record<string, string> = districtsData.reduce(
        (acc: Record<string, string>, district: District) => {
          acc[district.districtId] = district.districtName;
          return acc;
        },
        {} as Record<string, string> // Explicit type annotation
      );

      // Enhance schools data with district names
      const enhancedSchools = schoolsData.map((school: any) => ({
        ...school,
        district: {
          districtId: school.district,
          districtName: school.district
            ? districtMap[school.district] || ""
            : "",
        },
      }));

      setSchools(enhancedSchools);
      setTotalSchools(schoolsResponse.data.count ?? schoolsData.length);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch schools");
      setError(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const response = await api.get("school-districts/");
        // Handle both paginated and non-paginated responses
        const districtsData = response.data.results || response.data;
        // Ensure we always set an array
        setDistricts(Array.isArray(districtsData) ? districtsData : []);
      } catch (error) {
        console.error("Failed to fetch districts:", error);
        setDistricts([]); // Set empty array on error
      }
    };
    fetchDistricts();
  }, []);
  // Fetch legislative districts mapping from backend
  // Update the legislative districts fetch
  useEffect(() => {
    const fetchLegislativeDistricts = async () => {
      try {
        const response = await api.get("/school-districts/");
        const districts = response.data.results || response.data;

        // Transform the data into the expected structure
        const legislativeDistrictsMap: { [key: string]: string[] } = {};

        districts.forEach((district: District) => {
          if (district.legislativeDistrict) {
            if (!legislativeDistrictsMap[district.legislativeDistrict]) {
              legislativeDistrictsMap[district.legislativeDistrict] = [];
            }
            if (
              district.municipality &&
              !legislativeDistrictsMap[district.legislativeDistrict].includes(
                district.municipality
              )
            ) {
              legislativeDistrictsMap[district.legislativeDistrict].push(
                district.municipality
              );
            }
          }
        });

        setLegislativeDistricts(legislativeDistrictsMap);
        setLegislativeDistrictOptions(Object.keys(legislativeDistrictsMap));
      } catch (error) {
        console.error("Failed to fetch legislative districts:", error);
      }
    };

    fetchLegislativeDistricts();
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
    console.log("Submitting form data:", formData);
    setIsSubmitting(true);

    try {
      await api.post("http://127.0.0.1:8000/api/schools/", {
        ...formData,
        district: formData.districtId,
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
        districtId: "",
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
        districtId: "",
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

  useEffect(() => {
    const mun = formData.municipality;
    if (mun && Array.isArray(districts)) {
      // Add Array.isArray check
      const filteredDistricts = districts
        .filter(
          (district) => district.municipality === mun && district.is_active
        )
        .map((d) => d.districtId);

      setDistrictOptions(filteredDistricts);
      setFormData((prev) => ({
        ...prev,
        districtId: "",
      }));
    } else {
      setDistrictOptions([]);
      setFormData((prev) => ({
        ...prev,
        districtId: "",
      }));
    }
  }, [formData.municipality, districts]);

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
                    name="districtId"
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    value={formData.districtId}
                    onChange={handleChange}
                    disabled={
                      !formData.municipality || !Array.isArray(districts)
                    }
                  >
                    <option value="">Select District</option>
                    {Array.isArray(districts) &&
                      districts
                        .filter(
                          (district) =>
                            district.municipality === formData.municipality &&
                            district.is_active
                        )
                        .map((district) => (
                          <option
                            key={district.districtId}
                            value={district.districtId}
                          >
                            {district.districtName}
                          </option>
                        ))}
                  </select>
                  {errors.districtId && (
                    <p className="text-red-500 text-sm">{errors.districtId}</p>
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
                        districtId: "",
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
          districts={districts} // Add this line
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
