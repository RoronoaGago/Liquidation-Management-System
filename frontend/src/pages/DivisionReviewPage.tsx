/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LiquidationReportTable from "@/components/tables/BasicTables/LiquidationReportTable";
import api from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Label from "@/components/form/Label";
import { Filter, Search, Calendar, X } from "lucide-react";

type Liquidation = {
  LiquidationID: string;
  status: string;
  created_at: string;
  reviewed_by_district?: {
    first_name: string;
    last_name: string;
  };
  reviewed_at_district?: string;
  reviewed_by_liquidator?: {
    first_name: string;
    last_name: string;
  };
  reviewed_at_liquidator?: string;
  reviewed_by_division?: {
    first_name: string;
    last_name: string;
  };
  reviewed_at_division?: string;
  date_districtApproved?: string;
  date_liquidatorApproved?: string;
  date_liquidated?: string;
  request?: {
    request_id?: string;
    user?: {
      first_name: string;
      last_name: string;
      school?: {
        schoolName: string;
        district?: string;
      };
    };
  };
};

const DivisionReviewPage = () => {
  const { user } = useAuth();
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterOptions, setFilterOptions] = useState({
    searchTerm: "",
    district: "",
    legislative_district: "",
    municipality: "",
    start_date: "",
    end_date: "",
  });
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLiquidations = async () => {
    setLoading(true);
    try {
      const statusParam =
        activeTab === "pending"
          ? "approved_liquidator,under_review_division"
          : filterStatus || "liquidated";

      const params: any = {
        status: statusParam,
        ordering: "-created_at",
      };
      if (filterOptions.searchTerm) params.search = filterOptions.searchTerm;
      if (filterOptions.legislative_district)
        params.legislative_district = filterOptions.legislative_district;
      if (filterOptions.municipality)
        params.municipality = filterOptions.municipality;
      if (filterOptions.district) params.district = filterOptions.district;
      if (filterOptions.start_date) params.start_date = filterOptions.start_date;
      if (filterOptions.end_date) params.end_date = filterOptions.end_date;

      const res = await api.get("/liquidations/", { params });
      setLiquidations(res.data);
    } catch (err) {
      setLiquidations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterOptions.district, filterOptions.legislative_district, filterOptions.municipality, filterOptions.start_date, filterOptions.end_date, filterStatus]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchLiquidations();
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions.searchTerm]);

  return (
    <div className="container mx-auto px-5 py-10">
      <PageBreadcrumb pageTitle="Division Accountant Review" />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "pending"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Liquidations
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "history"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("history")}
        >
          Liquidation History
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/2">
            <Input
              type="text"
              placeholder="Search liquidations..."
              value={filterOptions.searchTerm}
              onChange={(e) =>
                setFilterOptions((p) => ({ ...p, searchTerm: e.target.value }))
              }
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <div className="flex gap-4 w-full md:w-auto items-center">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              startIcon={<Filter className="size-4" />}
            >
              Filters
            </Button>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Items per page:
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md"
              >
                <option value={5}>Show 5</option>
                <option value={10}>Show 10</option>
                <option value={20}>Show 20</option>
                <option value={50}>Show 50</option>
              </select>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            {activeTab === "history" && (
              <div className="space-y-2">
                <Label htmlFor="filter-status" className="text-sm font-medium">
                  Status
                </Label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="liquidated">Liquidated</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Legislative District</Label>
              <Input
                placeholder="e.g. 1st District"
                value={filterOptions.legislative_district}
                onChange={(e) =>
                  setFilterOptions((p) => ({
                    ...p,
                    legislative_district: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Municipality</Label>
              <Input
                placeholder="e.g. SAN FERNANDO CITY"
                value={filterOptions.municipality}
                onChange={(e) =>
                  setFilterOptions((p) => ({ ...p, municipality: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">School District</Label>
              <Input
                placeholder="District ID"
                value={filterOptions.district}
                onChange={(e) =>
                  setFilterOptions((p) => ({ ...p, district: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <DatePicker.RangePicker
                  onChange={(dates, dateStrings) => {
                    if (!dates || !dates[0] || !dates[1]) {
                      setFilterOptions((p) => ({ ...p, start_date: "", end_date: "" }));
                      return;
                    }
                    const [start, end] = dates;
                    if (start.isAfter(end)) return;
                    setFilterOptions((p) => ({
                      ...p,
                      start_date: dateStrings[0],
                      end_date: dateStrings[1],
                    }));
                  }}
                  value={
                    filterOptions.start_date && filterOptions.end_date
                      ? [dayjs(filterOptions.start_date), dayjs(filterOptions.end_date)]
                      : null
                  }
                  disabledDate={(current) => current && current > dayjs().endOf("day")}
                  format="YYYY-MM-DD"
                  style={{ width: "100%", maxWidth: "300px" }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilterOptions({
                      searchTerm: "",
                      district: "",
                      legislative_district: "",
                      municipality: "",
                      start_date: "",
                      end_date: "",
                    })
                  }
                  startIcon={<X className="size-4" />}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <LiquidationReportTable
        liquidations={liquidations}
        loading={loading}
        refreshList={fetchLiquidations}
        showSearchBar={false}
        showPageSizeControl={false}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        onView={async (liq) => {
          try {
            // Division: advance from approved_liquidator -> under_review_division only
            if (liq.status === "approved_liquidator") {
              await api.patch(`/liquidations/${liq.LiquidationID}/`, {
                status: "under_review_division",
              });
              await fetchLiquidations();
            }
          } catch (e) {
            // ignore, handled by table toast
          }
        }}
      />
    </div>
  );
};

export default DivisionReviewPage;
