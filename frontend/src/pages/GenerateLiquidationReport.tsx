// GenerateLiquidationReport.tsx
import { useState, useEffect } from "react";
import { DatePicker, ConfigProvider, Modal } from "antd";
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
  CheckCircle,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  Calendar,
  MapPin,
  Building,
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
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [previewData, setPreviewData] = useState<LiquidationReportItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

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
        // Ensure dates are properly formatted
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
      // FIXED: Properly handle summary data
      if (responseData.summary) {
        setSummaryData(responseData.summary);
      } else {
        // Fallback if summary is not in the expected location
        setSummaryData(null);
      }

      // Handle results array
      if (responseData.results && Array.isArray(responseData.results)) {
        setReportData({
          count: responseData.count,
          next: responseData.next,
          previous: responseData.previous,
          results: responseData.results,
          total_count: responseData.total_count || responseData.count,
          filters: responseData.filters || {},
          summary: responseData.summary, // Include summary here too for consistency
        });
      } else {
        // Fallback handling
        setReportData({
          count: responseData.count || 0,
          next: responseData.next || null,
          previous: responseData.previous || null,
          results: [],
          total_count: responseData.total_count || 0,
          filters: responseData.filters || {},
          summary: responseData.summary,
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

  // Function to get export preview information
  const getExportPreview = () => {
    const preview: any = {
      period: "",
      filters: [],
      recordCount: reportData?.total_count || 0,
      filename: "liquidation_report"
    };

    // Determine period
    if (activeTab === "Monthly") {
      const currentMonth = dayjs().format("YYYY-MM");
      preview.period = `Current Month (${currentMonth})`;
      preview.filename += `_${currentMonth}`;
    } else if (activeTab === "Quarterly") {
      const currentQuarter = Math.floor((dayjs().month() + 3) / 3);
      preview.period = `Current Quarter (Q${currentQuarter} ${dayjs().year()})`;
      preview.filename += `_Q${currentQuarter}_${dayjs().year()}`;
    } else if (activeTab === "Custom" && dateRange) {
      preview.period = `Custom Range (${dateRange[0]} to ${dateRange[1]})`;
      preview.filename += `_${dateRange[0]}_to_${dateRange[1]}`;
    } else {
      preview.period = "All Time";
    }

    // Add filters
    if (statusFilter !== "all") {
      preview.filters.push(`Status: ${STATUS_LABELS[statusFilter] || statusFilter}`);
      preview.filename += `_${statusFilter}`;
    }
    if (filterLegislativeDistrict) {
      preview.filters.push(`Legislative District: ${filterLegislativeDistrict}`);
    }
    if (filterMunicipality) {
      preview.filters.push(`Municipality: ${filterMunicipality}`);
    }
    if (filterDistrict) {
      const districtName = districts.find(d => d.districtId === filterDistrict)?.districtName || filterDistrict;
      preview.filters.push(`School District: ${districtName}`);
    }

    preview.filename += ".xlsx";
    return preview;
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

      const preview = getExportPreview();
      link.setAttribute("download", preview.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Excel exported successfully");
    } catch (err) {
      toast.error("Failed to export Excel");
    } finally {
      setExportLoading(false);
      setShowExportConfirm(false);
    }
  };

  const handleExportClick = () => {
    setShowExportConfirm(true);
    // Auto-fetch preview data when modal opens
    fetchPreviewData();
  };

  const fetchPreviewData = async () => {
    setPreviewLoading(true);
    try {
      const params: any = {
        page: 1,
        page_size: 10, // Show only first 10 records for preview
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
      setPreviewData(res.data.results || []);
    } catch (err) {
      console.error("Failed to fetch preview data:", err);
      setPreviewData([]);
    } finally {
      setPreviewLoading(false);
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
  // Update your SummaryCards component
  const SummaryCards = () => {
    if (!summaryData) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 p-4 bg-gray-50 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="p-2 rounded-full bg-gray-300">
                  <div className="h-5 w-5"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const cards = [
      {
        title: "Total Liquidations",
        value: summaryData.total_liquidations || 0,
        icon: <FileText className="h-5 w-5" />,
        color: "bg-blue-50 border-blue-200 text-blue-700",
      },
      {
        title: "Liquidated",
        value: summaryData.liquidated || 0,
        icon: <CheckCircle className="h-5 w-5" />,
        color: "bg-green-50 border-green-200 text-green-700",
      },
      {
        title: "Pending Review",
        value: summaryData.pending_review || 0,
        icon: <Clock className="h-5 w-5" />,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
      },
      {
        title: "Needs Revision",
        value: summaryData.needs_revision || 0,
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
                onClick={handleExportClick}
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

      {/* Export Confirmation Modal */}
      <Modal
        title={null}
        open={showExportConfirm}
        onCancel={() => {
          setShowExportConfirm(false);
        }}
        footer={null}
        width="90vw"
        centered
        className="export-confirm-modal"
        styles={{
          body: { padding: 0, maxHeight: '90vh', overflow: 'hidden' }
        }}
      >
        <div className="bg-white">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <FileSpreadsheet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Export Liquidation Report</h3>
                  <p className="text-blue-100 text-sm">Review and download your data export</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                  <span className="text-white text-sm font-medium">Excel Format</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Ready to Export</span>
              </div>
            </div>
          
            {/* Enhanced Export Summary */}
            {(() => {
              const preview = getExportPreview();
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Period Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-blue-900 mb-1">Time Period</div>
                        <div className="text-sm font-medium text-blue-800 truncate">{preview.period}</div>
                      </div>
                    </div>
                  </div>

                  {/* Record Count Card */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-3 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg flex-shrink-0">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-green-900 mb-1">Records to Export</div>
                        <div className="text-sm font-medium text-green-800">
                          {preview.recordCount.toLocaleString()} liquidation{preview.recordCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filters Card */}
                  {preview.filters.length > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 lg:col-span-2">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <Filter className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-purple-900 mb-2">Applied Filters</div>
                          <div className="flex flex-wrap gap-2">
                            {preview.filters.map((filter: string, index: number) => (
                              <div key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-white/60 rounded-full text-sm font-medium text-purple-800">
                                {filter.includes('Legislative District') && <MapPin className="h-3 w-3" />}
                                {filter.includes('Municipality') && <MapPin className="h-3 w-3" />}
                                {filter.includes('School District') && <Building className="h-3 w-3" />}
                                {filter.includes('Status') && <CheckCircle className="h-3 w-3" />}
                                <span>{filter}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filename Card */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 lg:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500 rounded-lg">
                        <DownloadIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-amber-900 mb-1">Export File Name</div>
                        <div className="text-base font-mono font-medium text-amber-800 bg-white/50 px-3 py-2 rounded-lg border">
                          {preview.filename}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Enhanced Data Preview Section */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Data Preview</h4>
                    <p className="text-sm text-gray-600">First 10 records of your export</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-gray-600">Live Preview</span>
                </div>
              </div>
                
              {previewLoading ? (
                <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                    <p className="text-sm font-medium text-gray-600">Loading preview data...</p>
                    <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
                  </div>
                </div>
              ) : previewData.length === 0 ? (
                <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12">
                  <div className="flex flex-col items-center justify-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-600">No data found</p>
                    <p className="text-xs text-gray-500 mt-1">No records match your selected criteria</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto max-h-80">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            School
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            District
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Month
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {previewData.map((row, index) => (
                          <tr key={row.liquidation_id} className={`hover:bg-blue-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {row.liquidation_id}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-800 max-w-48 truncate" title={row.school_name}>
                              {row.school_name}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-800 max-w-48 truncate" title={row.district_name}>
                              {row.district_name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                              {row.request_month}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadgeStyle(
                                  row.status
                                )}`}
                              >
                                {STATUS_LABELS[row.status] ||
                                  row.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                              {new Date(row.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      Showing {previewData.length} of {reportData?.total_count || 0} total records
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Action Buttons */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-b-lg border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Export ready • Excel format • {reportData?.total_count || 0} records</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowExportConfirm(false);
                    }}
                    disabled={exportLoading}
                    className="px-6 py-2.5 font-medium border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleExportExcel}
                    loading={exportLoading}
                    startIcon={<DownloadIcon />}
                    className="px-8 py-2.5 font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    {exportLoading ? "Preparing Download..." : "Download Excel"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
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
