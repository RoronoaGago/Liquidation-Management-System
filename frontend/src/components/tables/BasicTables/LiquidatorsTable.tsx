/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import api from "@/api/axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import Button from "@/components/ui/button/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Input from "@/components/form/input/InputField";
import { toast } from "react-toastify";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  X,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { CheckCircle, AlertCircle, Eye as LucideEye } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

type Liquidation = {
  reviewed_at_district?: any;
  reviewed_by_district?: any;
  reviewed_at_liquidator?: any;
  reviewed_by_liquidator?: any;
  reviewed_at_division?: any;
  reviewed_by_division?: any;
  date_districtApproved?: string;
  date_liquidatorApproved?: string;
  date_liquidated?: string;
  created_at?: any;
  LiquidationID: string;
  status: string;
  request?: {
    request_id?: string;
    user?: {
      first_name: string;
      last_name: string;
      school?: {
        schoolName: string;
        legislativeDistrict?: string;
        municipality?: string;
        district?: string;
      };
    };
    priorities?: any[];
  };
};

interface Requirement {
  requirementID: number;
  requirementTitle: string;
  is_required: boolean;
}

interface Document {
  id: number;
  document_url: string;
  requirement_obj: {
    requirementTitle: string;
  };
  is_approved: boolean;
  reviewer_comment: string | null;
}

interface Expense {
  id: string | number;
  title: string;
  requirements: Requirement[];
  amount: number;
}

interface LiquidationReportTableProps {
  liquidations: Liquidation[];
  loading: boolean;
  refreshList: () => Promise<void>;
  onView: (liq: Liquidation) => void;
}

const LiquidatorsTable: React.FC<LiquidationReportTableProps> = ({
  liquidations,
  refreshList,
  loading,
  onView,
}) => {
  const [selected, setSelected] = useState<Liquidation | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [expenseList, setExpenseList] = useState<Expense[]>([]);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [, setDisabledLiquidationIDs] = useState<string[]>([]);
  const [districtAdmins, setDistrictAdmins] = useState<
    Record<number, { first_name: string; last_name: string }>
  >({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterLegislativeDistrict, setFilterLegislativeDistrict] =
    useState("");
  const [filterMunicipality, setFilterMunicipality] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");

  // Extract filter options from liquidations
  const legislativeDistrictOptions = useMemo(() => {
    const districts = new Set<string>();
    liquidations.forEach((liq) => {
      const district = liq.request?.user?.school?.legislativeDistrict;
      if (district) districts.add(district);
    });
    return Array.from(districts).sort();
  }, [liquidations]);

  const filterMunicipalityOptions = useMemo(() => {
    const municipalities = new Set<string>();
    liquidations.forEach((liq) => {
      if (
        liq.request?.user?.school?.legislativeDistrict ===
        filterLegislativeDistrict
      ) {
        const municipality = liq.request?.user?.school?.municipality;
        if (municipality) municipalities.add(municipality);
      }
    });
    return Array.from(municipalities).sort();
  }, [liquidations, filterLegislativeDistrict]);

  const filterDistrictOptions = useMemo(() => {
    const districts = new Set<string>();
    liquidations.forEach((liq) => {
      if (
        liq.request?.user?.school?.municipality === filterMunicipality &&
        liq.request?.user?.school?.legislativeDistrict ===
          filterLegislativeDistrict
      ) {
        const district = liq.request?.user?.school?.district;
        if (district) districts.add(district);
      }
    });
    return Array.from(districts).sort();
  }, [liquidations, filterMunicipality, filterLegislativeDistrict]);

  // Filtered and paginated data
  const filteredLiquidations = useMemo(() => {
    let result = liquidations;

    // Apply search term filter
    if (searchTerm) {
      result = result.filter((liq) => {
        const user = liq.request?.user;
        const school = user?.school?.schoolName || "";
        return (
          liq.LiquidationID.toLowerCase().includes(searchTerm.toLowerCase()) ||
          liq.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          liq.request?.request_id
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (user &&
            (`${user.first_name} ${user.last_name}`
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
              school.toLowerCase().includes(searchTerm.toLowerCase())))
        );
      });
    }

    // Apply location filters
    if (filterLegislativeDistrict) {
      result = result.filter(
        (liq) =>
          liq.request?.user?.school?.legislativeDistrict ===
          filterLegislativeDistrict
      );
    }

    if (filterMunicipality) {
      result = result.filter(
        (liq) => liq.request?.user?.school?.municipality === filterMunicipality
      );
    }

    if (filterDistrict) {
      result = result.filter(
        (liq) => liq.request?.user?.school?.district === filterDistrict
      );
    }

    return result;
  }, [
    liquidations,
    searchTerm,
    filterLegislativeDistrict,
    filterMunicipality,
    filterDistrict,
  ]);

  // Helper to safely access sortable fields
  const getSortableValue = (
    liq: Liquidation,
    key: string
  ): string | number | undefined => {
    switch (key) {
      case "LiquidationID":
        return liq.LiquidationID;
      case "status":
        return liq.status;
      case "created_at":
        return liq.created_at;
      case "school_head":
        return liq.request?.user
          ? `${liq.request.user.first_name} ${liq.request.user.last_name}`
          : "";
      case "school_name":
        return liq.request?.user?.school?.schoolName || "";
      default:
        return "";
    }
  };

  const sortedLiquidations = useMemo(() => {
    if (!sortConfig) return filteredLiquidations;
    const sorted = [...filteredLiquidations].sort((a, b) => {
      const aValue = getSortableValue(a, sortConfig.key);
      const bValue = getSortableValue(b, sortConfig.key);
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
      return 0;
    });
    return sorted;
  }, [filteredLiquidations, sortConfig]);

  const totalPages = Math.ceil(filteredLiquidations.length / itemsPerPage);
  const paginatedLiquidations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedLiquidations.slice(start, start + itemsPerPage);
  }, [sortedLiquidations, currentPage, itemsPerPage]);

  const handleView = async (liq: Liquidation) => {
    try {
      // Change status to under_review_liquidator when liquidator views
      if (liq.status === "approved_district") {
        await api.patch(`/liquidations/${liq.LiquidationID}/`, {
          status: "under_review_liquidator",
        });
        await refreshList(); // Refresh the list to show new status
      }
      
      setSelected(liq);
      setExpandedExpense(null);
      setDocLoading(true);
      const priorities = liq.request?.priorities || [];
      const expenses: Expense[] = priorities.map((p: any) => ({
        id: p.id || p.priority?.LOPID || "",
        title: p.priority?.expenseTitle || "",
        amount: Number(p.amount) || 0,
        requirements: (p.priority?.requirements || []).map((req: any) => ({
          requirementID: req.requirementID,
          requirementTitle: req.requirementTitle,
          is_required: req.is_required,
        })),
      }));
      setExpenseList(expenses);

      const res = await api.get(`/liquidations/${liq.LiquidationID}/documents/`);
      setDocuments(res.data);
      setDocLoading(false);
    } catch (err) {
      toast.error("Failed to update status");
      setDocLoading(false);
    }
  };

  const getCompletion = () => {
    const totalRequired = documents.filter(
      (doc) => doc.requirement_obj && doc.is_approved !== undefined
    ).length;
    const approved = documents.filter((doc) => doc.is_approved).length;
    return { approved, totalRequired };
  };

  const totalRequired = documents.length;
  const approvedCount = documents.filter((doc) => doc.is_approved).length;
  const hasAnyComment = documents.some(
    (doc) => doc.reviewer_comment && doc.reviewer_comment.trim() !== ""
  );

  const canApprove = totalRequired > 0 && approvedCount === totalRequired;
  const canReject = hasAnyComment;
  const allReviewed = documents.every((doc) => doc.is_approved !== null);

  const handleApproveReport = async () => {
    await api.patch(`/liquidations/${selected?.LiquidationID}/`, {
      status: "approved_district",
      reviewed_at_district: new Date().toISOString(),
    });
    refreshList();
    toast.success("Liquidation report approved!");
    if (selected?.LiquidationID) {
      setDisabledLiquidationIDs((prev) => [...prev, selected.LiquidationID]);
    }
    setSelected(null);
  };

  const handleRejectReport = async () => {
    await api.patch(`/liquidations/${selected?.LiquidationID}/`, {
      status: "resubmit",
    });
    refreshList();
    toast.info("Liquidation report sent back for revision.");
    if (selected?.LiquidationID) {
      setDisabledLiquidationIDs((prev) => [...prev, selected.LiquidationID]);
    }
    setSelected(null);
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  useEffect(() => {
    const ids = Array.from(
      new Set(
        liquidations
          .map((liq) =>
            typeof liq.reviewed_by_district === "number"
              ? liq.reviewed_by_district
              : null
          )
          .filter((id): id is number => !!id)
      )
    );
    if (ids.length === 0) return;

    Promise.all(
      ids.map((id) =>
        api.get(`/users/${id}/`).then((res) => ({ id, ...res.data }))
      )
    ).then((results) => {
      const map: Record<number, { first_name: string; last_name: string }> = {};
      results.forEach((user) => {
        map[user.id] = {
          first_name: user.first_name,
          last_name: user.last_name,
        };
      });
      setDistrictAdmins(map);
    });
  }, [liquidations]);

  return (
    <div>
      {/* Search and controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search liquidations..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
        </div>
        <div className="flex gap-2 items-center mt-2 md:mt-0">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<Filter className="size-4" />}
          >
            Filters
          </Button>
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Items per page:
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((num) => (
              <option key={num} value={num}>
                Show {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 mb-4">
          <div className="space-y-2">
            <label
              htmlFor="filter-legislative-district"
              className="text-sm font-medium"
            >
              Legislative District
            </label>
            <select
              id="filter-legislative-district"
              value={filterLegislativeDistrict}
              onChange={(e) => {
                setFilterLegislativeDistrict(e.target.value);
                setFilterMunicipality("");
                setFilterDistrict("");
                setCurrentPage(1);
              }}
              className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            >
              <option value="">All</option>
              {legislativeDistrictOptions.map((ld) => (
                <option key={ld} value={ld}>
                  {ld}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="filter-municipality"
              className="text-sm font-medium"
            >
              Municipality
            </label>
            <select
              id="filter-municipality"
              value={filterMunicipality}
              onChange={(e) => {
                setFilterMunicipality(e.target.value);
                setFilterDistrict("");
                setCurrentPage(1);
              }}
              className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              disabled={!filterLegislativeDistrict}
            >
              <option value="">All</option>
              {filterMunicipalityOptions.map((mun) => (
                <option key={mun} value={mun}>
                  {mun}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="filter-district" className="text-sm font-medium">
              District
            </label>
            <select
              id="filter-district"
              value={filterDistrict}
              onChange={(e) => {
                setFilterDistrict(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              disabled={!filterMunicipality}
            >
              <option value="">All</option>
              {filterDistrictOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterLegislativeDistrict("");
                setFilterMunicipality("");
                setFilterDistrict("");
                setCurrentPage(1);
              }}
              startIcon={<X className="size-4" />}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

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
                  <div
                    className="cursor-pointer select-none flex items-center"
                    onClick={() => handleSort("LiquidationID")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleSort("LiquidationID");
                    }}
                  >
                    Liquidation ID
                    <span className="inline-block align-middle ml-1">
                      {sortConfig?.key === "LiquidationID" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="inline w-4 h-4" />
                        ) : (
                          <ChevronDown className="inline w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="inline w-4 h-4 text-gray-300" />
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="cursor-pointer select-none flex items-center"
                    onClick={() => handleSort("status")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleSort("status");
                    }}
                  >
                    Status
                    <span className="inline-block align-middle ml-1">
                      {sortConfig?.key === "status" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="inline w-4 h-4" />
                        ) : (
                          <ChevronDown className="inline w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="inline w-4 h-4 text-gray-300" />
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="cursor-pointer select-none flex items-center"
                    onClick={() => handleSort("created_at")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleSort("created_at");
                    }}
                  >
                    Date Reviewed
                    <span className="inline-block align-middle ml-1">
                      {sortConfig?.key === "created_at" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="inline w-4 h-4" />
                        ) : (
                          <ChevronDown className="inline w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="inline w-4 h-4 text-gray-300" />
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="cursor-pointer select-none flex items-center"
                    onClick={() => handleSort("reviewed_by_district")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleSort("reviewed_by_district");
                    }}
                  >
                    Reviewed By
                    <span className="inline-block align-middle ml-1">
                      {sortConfig?.key === "reviewed_by_district" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="inline w-4 h-4" />
                        ) : (
                          <ChevronDown className="inline w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="inline w-4 h-4 text-gray-300" />
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="cursor-pointer select-none flex items-center"
                    onClick={() => handleSort("school_head")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleSort("school_head");
                    }}
                  >
                    School Head
                    <span className="inline-block align-middle ml-1">
                      {sortConfig?.key === "school_head" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="inline w-4 h-4" />
                        ) : (
                          <ChevronDown className="inline w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="inline w-4 h-4 text-gray-300" />
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-6 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 uppercase"
                >
                  <div
                    className="cursor-pointer select-none flex items-center"
                    onClick={() => handleSort("school_name")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        handleSort("school_name");
                    }}
                  >
                    School Name
                    <span className="inline-block align-middle ml-1">
                      {sortConfig?.key === "school_name" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="inline w-4 h-4" />
                        ) : (
                          <ChevronDown className="inline w-4 h-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="inline w-4 h-4 text-gray-300" />
                      )}
                    </span>
                  </div>
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
              {paginatedLiquidations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-gray-500"
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLiquidations.map((liq) => (
                  <TableRow
                    key={liq.LiquidationID}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {liq.LiquidationID}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeStyle(
                          liq.status
                        )}`}
                      >
                        {STATUS_LABELS[liq.status] || liq.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {liq.reviewed_at_district
                        ? new Date(
                            liq.reviewed_at_district
                          ).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {typeof liq.reviewed_by_district === "object" &&
                      liq.reviewed_by_district
                        ? `${liq.reviewed_by_district.first_name} ${liq.reviewed_by_district.last_name}`
                        : typeof liq.reviewed_by_district === "number" &&
                          districtAdmins[liq.reviewed_by_district]
                        ? `${
                            districtAdmins[liq.reviewed_by_district].first_name
                          } ${
                            districtAdmins[liq.reviewed_by_district].last_name
                          }`
                        : "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {liq.request?.user
                        ? `${liq.request.user.first_name} ${liq.request.user.last_name}`
                        : "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {liq.request?.user?.school?.schoolName || "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        className={`text-blue-600 hover:underline font-medium ${
                          loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        onClick={() => !loading && onView(liq)}
                        disabled={loading}
                      >
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing{" "}
          {paginatedLiquidations.length > 0
            ? (currentPage - 1) * itemsPerPage + 1
            : 0}{" "}
          to {Math.min(currentPage * itemsPerPage, filteredLiquidations.length)}{" "}
          of {filteredLiquidations.length} entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage(pageNum)}
                  variant={currentPage === pageNum ? "primary" : "outline"}
                  size="sm"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            variant="outline"
            size="sm"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="w-full max-w-[90vw] lg:max-w-4xl rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              Liquidation Report Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Review and finalize this liquidation report.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              {/* Details Card */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
                        Liquidation ID:
                      </span>
                      <span className="font-mono text-gray-900 dark:text-white break-all min-w-0">
                        {selected.LiquidationID}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
                        School Head:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {selected.request?.user
                          ? `${selected.request.user.first_name} ${selected.request.user.last_name}`
                          : "N/A"}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          (School Head)
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">
                        School:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {selected.request?.user?.school?.schoolName || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">
                        Status:
                      </span>
                      <Badge
                        color={
                          selected.status === "approved_district"
                            ? "success"
                            : selected.status === "resubmit"
                            ? "error"
                            : selected.status === "under_review_district"
                            ? "warning"
                            : "info"
                        }
                      >
                        {STATUS_LABELS[selected.status] || selected.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Reviewed at:{" "}
                    {selected.reviewed_at_district
                      ? new Date(selected.reviewed_at_district).toLocaleString()
                      : "N/A"}
                    <br />
                    Reviewed by:{" "}
                    {selected.reviewed_by_district
                      ? `${selected.reviewed_by_district.first_name} ${selected.reviewed_by_district.last_name}`
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Priorities Table */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                  List of Priorities
                </h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Expense
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {expenseList.map((exp, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                              {exp.title}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                              ₱
                              {Number(exp.amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50/50 dark:bg-gray-700/30 font-semibold">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                            TOTAL
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                            ₱
                            {expenseList
                              .reduce((sum, p) => sum + Number(p.amount), 0)
                              .toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Finalize Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="success"
                  onClick={async () => {
                    try {
                      await api.patch(
                        `/liquidations/${selected.LiquidationID}/`,
                        {
                          status: "liquidated",
                        }
                      );
                      if (selected.request?.request_id) {
                        await api.patch(
                          `/requests/${selected.request.request_id}/`,
                          {
                            status: "liquidated",
                          }
                        );
                      }
                      toast.success(
                        "Liquidation report finalized and marked as liquidated!"
                      );
                      setSelected(null);
                      refreshList();
                    } catch (err) {
                      toast.error("Failed to finalize liquidation report.");
                    }
                  }}
                  disabled={selected.status === "liquidated"}
                >
                  Finalize the liquidation report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document View Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewDoc?.requirement_obj.requirementTitle}
            </DialogTitle>
            <DialogDescription>
              Review the document and take action.
            </DialogDescription>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 items-center">
                <a
                  href={viewDoc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline mb-2"
                >
                  View Fullscreen
                </a>
                {/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(
                  viewDoc.document_url
                ) ? (
                  <img
                    src={viewDoc.document_url}
                    alt="Document Preview"
                    className="w-full max-w-3xl max-h-[60vh] rounded border shadow object-contain"
                    style={{ display: "block" }}
                  />
                ) : (
                  <iframe
                    src={viewDoc.document_url}
                    title="Document Preview"
                    className="w-full h-[60vh] border rounded"
                  />
                )}
              </div>
              <div>
                <textarea
                  value={viewDoc.reviewer_comment || ""}
                  readOnly={!isEditingComment}
                  onClick={() => setIsEditingComment(true)}
                  onChange={(e) =>
                    setViewDoc((prev) => ({
                      ...prev!,
                      reviewer_comment: e.target.value,
                    }))
                  }
                  placeholder="Enter reviewer comment"
                  className={`w-full border rounded p-2 mt-2 ${
                    !isEditingComment ? "bg-gray-100 cursor-pointer" : ""
                  }`}
                  rows={3}
                />
                {!isEditingComment && (
                  <div className="text-xs text-gray-400 mt-1">
                    Click to add or edit comment
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="success"
                    disabled={actionLoading || viewDoc.is_approved}
                    startIcon={<CheckCircle className="h-5 w-5" />}
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        await api.patch(
                          `/liquidations/${selected?.LiquidationID}/documents/${viewDoc.id}/`,
                          {
                            is_approved: true,
                            reviewer_comment: viewDoc.reviewer_comment,
                          }
                        );
                        toast.success("Document approved!");
                        const res = await api.get(
                          `/liquidations/${selected?.LiquidationID}/documents/`
                        );
                        setDocuments(res.data);
                        setViewDoc(null);
                      } catch (err) {
                        toast.error("Failed to update document status.");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={actionLoading}
                    startIcon={<AlertCircle className="h-5 w-5" />}
                    onClick={async () => {
                      if (!viewDoc.reviewer_comment?.trim()) {
                        toast.error("Comment is required to reject.");
                        return;
                      }
                      setActionLoading(true);
                      try {
                        await api.patch(
                          `/liquidations/${selected?.LiquidationID}/documents/${viewDoc.id}/`,
                          {
                            is_approved: false,
                            reviewer_comment: viewDoc.reviewer_comment,
                          }
                        );
                        toast.success("Document rejected!");
                        const res = await api.get(
                          `/liquidations/${selected?.LiquidationID}/documents/`
                        );
                        setDocuments(res.data);
                        setViewDoc(null);
                      } catch (err) {
                        toast.error("Failed to update document status.");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiquidatorsTable;

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review_district: "Under Review (District)",
  under_review_division: "Under Review (Division)",
  resubmit: "Needs Revision",
  approved_district: "Approved by District",
  approved_division: "Approved by Division",
  approved: "Fully Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const statusBadgeStyle = (status: string) => {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300";
    case "submitted":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "under_review_district":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "approved_district":
    case "approved_division":
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "resubmit":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "cancelled":
      return "bg-gray-200 text-gray-500 dark:bg-gray-700/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300";
  }
};
