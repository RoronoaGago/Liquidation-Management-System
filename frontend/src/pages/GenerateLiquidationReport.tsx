// GenerateLiquidationReport.tsx
import React, { useState, useEffect } from "react";
import { DatePicker, ConfigProvider } from "antd";
import type { ThemeConfig } from "antd";
import dayjs from "dayjs";
import Button from "@/components/ui/button/Button";
import api from "@/api/axios";
import { toast } from "react-toastify";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DownloadIcon,
  FileText,
  Filter,
  UploadIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Paperclip,
  MessageCircleIcon,
  Info,
  Clock,
  XCircle,
  RefreshCw,
} from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

const { RangePicker } = DatePicker;

// Add this interface for summary stats
interface LiquidationSummary {
  total_liquidations: number;
  liquidated: number;
  pending_review: number;
  needs_revision: number;
  draft: number;
}
interface LiquidationReportItem {
  liquidation_id: string;
  request_id: string;
  school_id: string;
  school_name: string;
  district_name: string;
  municipality: string;
  legislative_district: string;
  request_month: string;
  status: string;
  created_at: string;
  date_submitted: string | null;
  date_liquidated: string | null;
  refund: number | null;
  reviewed_by_district: string;
  reviewed_by_liquidator: string;
  reviewed_by_division: string;
}

interface LiquidationReportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LiquidationReportItem[];
  total_count: number;
  filters: any;
  summary?: LiquidationSummary;
}

const tabs = ["Monthly", "Quarterly", "Custom"];

const lightTheme: ThemeConfig = {
  components: {
    DatePicker: {
      fontFamily: "Outfit, sans-serif",
      colorPrimary: "#3641f5",
      colorBorder: "#e5e7eb",
      colorText: "#374151",
      colorTextPlaceholder: "#9ca3af",
      colorBgContainer: "#ffffff",
      colorBgElevated: "#ffffff",
      colorTextHeading: "#111827",
      colorTextDescription: "#6b7280",
      colorIcon: "#9ca3af",
      colorLink: "#3b82f6",
      colorLinkHover: "#2563eb",
      borderRadius: 6,
      fontSize: 14,
      paddingSM: 8,
      controlHeight: 40,
      algorithm: true,
    },
  },
};
const statusIcons: Record<string, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  submitted: <Clock className="h-4 w-4" />,
  under_review_district: <RefreshCw className="h-4 w-4 animate-spin" />,
  under_review_division: <RefreshCw className="h-4 w-4 animate-spin" />,
  under_review_liquidator: <RefreshCw className="h-4 w-4 animate-spin" />,
  resubmit: <AlertCircle className="h-4 w-4" />,
  approved_district: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  liquidated: <CheckCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

export default function GenerateLiquidationReport() {
  const [activeTab, setActiveTab] = useState<string>("Monthly");
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [summaryData, setSummaryData] = useState<LiquidationSummary | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [reportData, setReportData] =
    useState<LiquidationReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [legislativeDistricts, setLegislativeDistricts] = useState<{
    [key: string]: string[];
  }>({});
  const [legislativeDistrictOptions, setLegislativeDistrictOptions] = useState<
    string[]
  >([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [filterLegislativeDistrict, setFilterLegislativeDistrict] =
    useState("");
  const [filterMunicipality, setFilterMunicipality] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterMunicipalityOptions, setFilterMunicipalityOptions] = useState<
    string[]
  >([]);
  const [filterDistrictOptions, setFilterDistrictOptions] = useState<string[]>(
    []
  );

  const fetchReport = async (page: number = 1, size: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: page,
        page_size: size,
      };

      // Add status filter if not "all"
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      // Add date range based on active tab
      if (activeTab === "Monthly") {
        const currentMonth = dayjs().format("YYYY-MM");
        params.start_date = dayjs(currentMonth)
          .startOf("month")
          .format("YYYY-MM-DD");
        params.end_date = dayjs(currentMonth)
          .endOf("month")
          .format("YYYY-MM-DD");
      } else if (activeTab === "Quarterly") {
        const currentQuarter = Math.floor((dayjs().month() + 3) / 3);
        const quarterStartMonth = (currentQuarter - 1) * 3;
        params.start_date = dayjs()
          .month(quarterStartMonth)
          .startOf("month")
          .format("YYYY-MM-DD");
        params.end_date = dayjs()
          .month(quarterStartMonth + 2)
          .endOf("month")
          .format("YYYY-MM-DD");
      } else if (activeTab === "Custom" && dateRange) {
        params.start_date = dateRange[0];
        params.end_date = dateRange[1];
      }

      // Add filter parameters
      if (filterLegislativeDistrict) {
        params.legislative_district = filterLegislativeDistrict;
      }
      if (filterMunicipality) {
        params.municipality = filterMunicipality;
      }
      if (filterDistrict) {
        params.school_district = filterDistrict;
      }

      const res = await api.get("reports/liquidation/", { params });
      // Handle both response structures
      const responseData = res.data;
      console.log(responseData);
      if (responseData.summary) {
        setSummaryData(responseData.summary);
      }
      if (responseData.results && Array.isArray(responseData.results)) {
        // If results is directly an array
        setReportData({
          count: responseData.count,
          next: responseData.next,
          previous: responseData.previous,
          results: responseData.results,
          total_count: responseData.total_count || responseData.count,
          filters: responseData.filters || {},
        });
      } else if (responseData.results && responseData.results.results) {
        // If results has a nested results property
        setReportData({
          count: responseData.count,
          next: responseData.next,
          previous: responseData.previous,
          results: responseData.results.results,
          total_count: responseData.results.total_count || responseData.count,
          filters: responseData.results.filters || {},
        });
      } else {
        // Fallback
        setReportData({
          count: responseData.count || 0,
          next: responseData.next || null,
          previous: responseData.previous || null,
          results: [],
          total_count: responseData.total_count || 0,
          filters: responseData.filters || {},
        });
      }
      setCurrentPage(page);
      setPageSize(size);
    } catch (err: any) {
      setError("Failed to fetch liquidation report");
      setReportData(null);
      setSummaryData(null);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(1);
  }, [
    activeTab,
    statusFilter,
    dateRange,
    filterLegislativeDistrict,
    filterMunicipality,
    filterDistrict,
  ]);

  // Load legislative districts and districts for filters
  useEffect(() => {
    const fetchLegislativeDistrictsAndDistricts = async () => {
      try {
        const legislativeResponse = await api.get("/school-districts/");
        const legislativeDistrictsData =
          legislativeResponse.data.results || legislativeResponse.data;

        const map: { [key: string]: string[] } = {};
        (legislativeDistrictsData || []).forEach((d: any) => {
          if (d.legislativeDistrict) {
            if (!map[d.legislativeDistrict]) map[d.legislativeDistrict] = [];
            if (
              d.municipality &&
              !map[d.legislativeDistrict].includes(d.municipality)
            ) {
              map[d.legislativeDistrict].push(d.municipality);
            }
          }
        });
        setLegislativeDistricts(map);
        setLegislativeDistrictOptions(Object.keys(map));

        const districtsResponse = await api.get(
          "school-districts/?show_all=true"
        );
        const districtsData =
          districtsResponse.data.results || districtsResponse.data;
        setDistricts(Array.isArray(districtsData) ? districtsData : []);
      } catch (error) {
        console.error(
          "Failed to fetch legislative districts or districts:",
          error
        );
      }
    };
    fetchLegislativeDistrictsAndDistricts();
  }, []);

  // Update municipality options when legislative district changes
  useEffect(() => {
    if (
      filterLegislativeDistrict &&
      legislativeDistricts[filterLegislativeDistrict]
    ) {
      setFilterMunicipalityOptions(
        legislativeDistricts[filterLegislativeDistrict]
      );
    } else {
      setFilterMunicipalityOptions([]);
    }
    setFilterMunicipality("");
    setFilterDistrict("");
  }, [filterLegislativeDistrict, legislativeDistricts]);

  // Update district options when municipality changes
  useEffect(() => {
    if (filterMunicipality) {
      const districtsForMunicipality = districts
        .filter((d) => d.municipality === filterMunicipality && d.is_active)
        .map((d) => d.districtId);
      setFilterDistrictOptions(districtsForMunicipality);
    } else {
      setFilterDistrictOptions([]);
    }
    setFilterDistrict("");
  }, [filterMunicipality, districts]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== "Custom") {
      setDateRange(null);
    }
  };

  const handleDateRangeChange = (dates: any, dateStrings: [string, string]) => {
    if (dates) {
      setDateRange(dateStrings);
    } else {
      setDateRange(null);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const params: any = { export: "excel" };

      // Add status filter if not "all"
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      // Add date range based on active tab
      if (activeTab === "Monthly") {
        const currentMonth = dayjs().format("YYYY-MM");
        params.start_date = dayjs(currentMonth)
          .startOf("month")
          .format("YYYY-MM-DD");
        params.end_date = dayjs(currentMonth)
          .endOf("month")
          .format("YYYY-MM-DD");
      } else if (activeTab === "Quarterly") {
        const currentQuarter = Math.floor((dayjs().month() + 3) / 3);
        const quarterStartMonth = (currentQuarter - 1) * 3;
        params.start_date = dayjs()
          .month(quarterStartMonth)
          .startOf("month")
          .format("YYYY-MM-DD");
        params.end_date = dayjs()
          .month(quarterStartMonth + 2)
          .endOf("month")
          .format("YYYY-MM-DD");
      } else if (activeTab === "Custom" && dateRange) {
        params.start_date = dateRange[0];
        params.end_date = dateRange[1];
      }

      // Add filter parameters
      if (filterLegislativeDistrict) {
        params.legislative_district = filterLegislativeDistrict;
      }
      if (filterMunicipality) {
        params.municipality = filterMunicipality;
      }
      if (filterDistrict) {
        params.school_district = filterDistrict;
      }

      const response = await api.get("reports/liquidation/", {
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      let filename = "liquidation_report";
      if (activeTab === "Monthly") {
        filename += `_${dayjs().format("YYYY-MM")}`;
      } else if (activeTab === "Quarterly") {
        const currentQuarter = Math.floor((dayjs().month() + 3) / 3);
        filename += `_Q${currentQuarter}_${dayjs().year()}`;
      } else if (activeTab === "Custom" && dateRange) {
        filename += `_${dateRange[0]}_to_${dateRange[1]}`;
      }

      if (statusFilter !== "all") {
        filename += `_${statusFilter}`;
      }

      link.setAttribute("download", `${filename}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Excel exported successfully");
    } catch (err) {
      toast.error("Failed to export Excel");
    } finally {
      setExportLoading(false);
    }
  };

  const goToPage = (page: number) => {
    fetchReport(page);
  };

  const totalPages = reportData?.count
    ? Math.ceil(reportData.count / pageSize)
    : 0;
  const report = reportData?.results || []; // Directly access results array
  // Add summary cards component
  const SummaryCards = () => {
    if (!summaryData) return null;

    const cards = [
      {
        title: "Total Liquidations",
        value: summaryData.total_liquidations,
        icon: <FileText className="h-5 w-5" />,
        color: "bg-blue-50 border-blue-200 text-blue-700",
      },
      {
        title: "Liquidated",
        value: summaryData.liquidated,
        icon: <CheckCircle className="h-5 w-5" />,
        color: "bg-green-50 border-green-200 text-green-700",
      },
      {
        title: "Pending Review",
        value: summaryData.pending_review,
        icon: <Clock className="h-5 w-5" />,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
      },
      {
        title: "Needs Revision",
        value: summaryData.needs_revision,
        icon: <AlertCircle className="h-5 w-5" />,
        color: "bg-red-50 border-red-200 text-red-700",
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => (
          <div key={index} className={`rounded-lg border p-4 ${card.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className="p-2 rounded-full bg-white bg-opacity-50">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Generate Liquidation Report" />

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 xl:px-10 xl:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 text-theme-xl sm:text-2xl">
                Liquidation Report
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                View and export list of liquidation reports.
              </p>
            </div>
          </div>

          {/* Moved Filters and Export button to same row as tabs */}
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto mb-6 justify-between items-start md:items-center">
            <div className="flex space-x-1 p-1 rounded-md bg-white border border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-brand-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => handleTabChange(tab)}
                  disabled={loading}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<Filter className="size-4" />}
              >
                Filters
              </Button>

              <Button
                variant="primary"
                onClick={handleExportExcel}
                disabled={loading || report.length === 0 || exportLoading}
                loading={exportLoading}
                startIcon={<DownloadIcon />}
                className="text-nowrap"
              >
                Export Excel
              </Button>
            </div>
          </div>

          {activeTab === "Custom" && (
            <ConfigProvider theme={lightTheme}>
              <div className="mb-6">
                <RangePicker
                  onChange={handleDateRangeChange}
                  value={
                    dateRange
                      ? [dayjs(dateRange[0]), dayjs(dateRange[1])]
                      : null
                  }
                  disabledDate={(current) =>
                    current && current > dayjs().endOf("day")
                  }
                  format="YYYY-MM-DD"
                  style={{
                    width: "100%",
                    maxWidth: "300px",
                  }}
                />
              </div>
            </ConfigProvider>
          )}

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 mb-6">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="filter-status">
                  Status
                </label>
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                >
                  <option value="all">All</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review_district">
                    Under Review (District)
                  </option>
                  <option value="under_review_liquidator">
                    Under Review (Liquidator)
                  </option>
                  <option value="under_review_division">
                    Under Review (Division)
                  </option>
                  <option value="resubmit">Needs Revision</option>
                  <option value="approved_district">
                    Approved by District
                  </option>
                  <option value="approved_liquidator">
                    Approved by Liquidator
                  </option>
                  <option value="liquidated">Liquidated</option>
                </select>
              </div>

              {/* Legislative District */}
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="filter-legislative-district"
                >
                  Legislative District
                </label>
                <select
                  id="filter-legislative-district"
                  value={filterLegislativeDistrict}
                  onChange={(e) => setFilterLegislativeDistrict(e.target.value)}
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

              {/* Municipality */}
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="filter-municipality"
                >
                  Municipality
                </label>
                <select
                  id="filter-municipality"
                  value={filterMunicipality}
                  onChange={(e) => setFilterMunicipality(e.target.value)}
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

              {/* District */}
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="filter-school-district"
                >
                  School District
                </label>
                <select
                  id="filter-school-district"
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border-2 border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  disabled={!filterMunicipality}
                >
                  <option value="">All Districts</option>
                  {filterDistrictOptions.map((districtId) => {
                    const d = districts.find(
                      (dd) => dd.districtId === districtId
                    );
                    return (
                      <option key={districtId} value={districtId}>
                        {d?.districtName}
                      </option>
                    );
                  })}
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
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 mb-6 text-sm text-red-700 bg-red-100 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Add Summary Cards */}
          <SummaryCards />
          <div className="overflow-x-auto border rounded-lg bg-white mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Liquidation ID
                  </th>
                  {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th> */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    District
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Liquidated At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : report.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-500">
                      No data found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  report.map((row) => (
                    <tr key={row.liquidation_id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.liquidation_id}
                      </td>
                      {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.request_id}
                      </td> */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.school_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.district_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.request_month}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        <span
                          className={`px-2 py-1 rounded-full text-xs capitalize ${statusBadgeStyle(
                            row.status
                          )}`}
                        >
                          {STATUS_LABELS[row.status] ||
                            row.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.date_submitted
                          ? new Date(row.date_submitted).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.date_liquidated
                          ? new Date(row.date_liquidated).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {reportData && reportData.count > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} • {reportData.total_count}{" "}
                total liquidations
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
                        variant={
                          currentPage === pageNum ? "primary" : "outline"
                        }
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
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review_district: "Under Review (District)",
  under_review_liquidator: "Under Review (Liquidator)",
  under_review_division: "Under Review (Division)",
  resubmit: "Needs Revision",
  approved_district: "Approved by District",
  approved_liquidator: "Approved by Liquidator",
  liquidated: "Liquidated",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusBadgeStyle = (status: string) => {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300";
    case "submitted":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "under_review_district":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "under_review_liquidator":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "under_review_division":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "approved_district":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "approved_liquidator":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "liquidated":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
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
