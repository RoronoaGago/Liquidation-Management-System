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
import Button from "../components/ui/button/Button";
import { PlusIcon } from "../icons";
import { XIcon } from "lucide-react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useState, useEffect, useRef } from "react";
import api from "@/api/axios";
import { Loader2Icon } from "lucide-react";
import DistrictsTable from "@/components/tables/BasicTables/DistrictsTable";

interface DistrictFormData {
  districtName: string;
  municipality: string;
  legislativeDistrict: string;
  logo: string;
}

const requiredFields = [
  "districtName",
  "municipality",
  "legislativeDistrict",
  "logo",
];

const ManageDistricts = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] =
    useState<DistrictFormData | null>(null);
  const [districts, setDistricts] = useState<any[]>([]);
  const [totalDistricts, setTotalDistricts] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    searchTerm: "",
    legislative_district: "",
    municipality: "",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "districtName", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState<DistrictFormData>({
    districtName: "",
    municipality: "",
    legislativeDistrict: "",
    logo: "",
  });
  const [legislativeDistricts, setLegislativeDistricts] = useState<{
    [key: string]: string[];
  }>({});
  const [legislativeDistrictOptions, setLegislativeDistrictOptions] = useState<
    string[]
  >([]);
  const [municipalityOptions, setMunicipalityOptions] = useState<string[]>([]);

  const isFormValid =
    requiredFields.every(
      (field) => formData[field as keyof DistrictFormData]?.trim() !== ""
    ) && Object.keys(errors).length === 0;

  // Fetch districts from backend with pagination, filtering, sorting
  const fetchDistricts = async () => {
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
      if (sortConfig) {
        params.ordering =
          sortConfig.direction === "asc"
            ? sortConfig.key
            : `-${sortConfig.key}`;
      }
      const response = await api.get("school-districts/", { params });
      setDistricts(response.data.results || response.data);
      setTotalDistricts(response.data.count ?? response.data.length);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch districts");
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
    fetchDistricts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived, filterOptions, sortConfig, currentPage, itemsPerPage]);

  // When legislativeDistrict changes, update municipality options
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
      }));
    } else {
      setMunicipalityOptions([]);
      setFormData((prev) => ({
        ...prev,
        municipality: "",
      }));
    }
    // eslint-disable-next-line
  }, [formData.legislativeDistrict, legislativeDistricts]);

  // Form change and validation
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    const newErrors = { ...errors };
    if (requiredFields.includes(name) && !value.trim()) {
      newErrors[name] = "This field is required.";
    } else {
      delete newErrors[name];
    }
    setErrors(newErrors);
  };

  // Handle logo file upload
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData((prevData) => ({
          ...prevData,
          logo: result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation logic (existing code)
    const finalErrors: Record<string, string> = {};
    requiredFields.forEach((field) => {
      if (!formData[field as keyof DistrictFormData]?.trim()) {
        finalErrors[field] = "This field is required.";
      }
    });

    setErrors(finalErrors);

    if (Object.keys(finalErrors).length > 0) {
      toast.error("Please fill in all required fields correctly!");
      return;
    }

    // Show confirmation dialog instead of submitting immediately
    setPendingFormData({ ...formData });
    setShowConfirmation(true);
  };

  const confirmSubmit = async () => {
    if (!pendingFormData) return;

    setIsSubmitting(true);

    try {
      const submitData = {
        districtName: pendingFormData.districtName,
        municipality: pendingFormData.municipality,
        legislativeDistrict: pendingFormData.legislativeDistrict,
        ...(pendingFormData.logo && { logo_base64: pendingFormData.logo }),
      };

      await api.post("school-districts/", submitData, {
        headers: { "Content-Type": "application/json" },
      });

      await fetchDistricts();
      toast.success("School District Added Successfully!", {
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

      // Reset form
      setFormData({
        districtName: "",
        municipality: "",
        legislativeDistrict: "",
        logo: "",
      });
      setErrors({});
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error("Failed to add school district. Please try again.", {
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
      setShowConfirmation(false);
      setPendingFormData(null);
    }
  };

  const cancelSubmit = () => {
    setShowConfirmation(false);
    setPendingFormData(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Manage School Districts" />
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="md"
                variant="primary"
                startIcon={<PlusIcon className="size-6" />}
              >
                Add New School District
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                  Add New School District
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Fill in the school district details below
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="logo" className="text-base">
                    District Logo *
                  </Label>
                  <div className="flex items-center gap-4">
                    {formData.logo ? (
                      <div className="relative">
                        <img
                          src={formData.logo}
                          className="w-16 h-16 rounded-full object-cover"
                          alt="Preview"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              logo: "",
                            }));
                            const fileInput = document.getElementById(
                              "logo"
                            ) as HTMLInputElement;
                            if (fileInput) fileInput.value = "";
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                          aria-label="Remove district logo"
                        >
                          <XIcon />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <PlusIcon className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <input
                      type="file"
                      id="logo"
                      name="logo"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Label
                      htmlFor="logo"
                      className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      {formData.logo ? "Change Logo" : "Upload Logo"}
                    </Label>
                  </div>
                </div>
                {errors.logo && (
                  <p className="text-red-500 text-sm">{errors.logo}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="districtName" className="text-base">
                    School District Name *
                  </Label>
                  <Input
                    type="text"
                    id="districtName"
                    name="districtName"
                    className="w-full p-3.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="School District Name"
                    value={formData.districtName}
                    onChange={handleChange}
                  />
                  {errors.districtName && (
                    <p className="text-red-500 text-sm">
                      {errors.districtName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legislativeDistrict" className="text-base">
                    Legislative District *
                  </Label>
                  <select
                    id="legislativeDistrict"
                    name="legislativeDistrict"
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300"
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
                    className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300"
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

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setErrors({});
                      setFormData({
                        districtName: "",
                        municipality: "",
                        legislativeDistrict: "",
                        logo: "",
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
                      "Add School District"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          {/* Confirmation Dialog */}
          <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
            <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
                  Confirm District Creation
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">
                  Are you sure you want to create the school district "
                  {pendingFormData?.districtName}"?
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelSubmit}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={confirmSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2Icon className="animate-spin size-4" />
                      Creating...
                    </span>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <DistrictsTable
          districts={districts}
          setDistricts={setDistricts}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          fetchDistricts={fetchDistricts}
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
          onRequestSort={setSortConfig}
          currentSort={sortConfig}
          loading={loading}
          error={error}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalDistricts={totalDistricts}
          // Pass any constants needed for items per page
        />
      </div>
    </div>
  );
};

export default ManageDistricts;
