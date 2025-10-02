// GenerateAgeingReport.tsx
import { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { Select } from "antd";
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
  AlertCircle,
  Clock,
  XCircle,
} from "lucide-react";

const { Option } = Select;

interface AgingReportItem {
  school_id: string;
  school_name: string;
  request_id: string;
  downloaded_at: string;
  days_elapsed: number;
  aging_period: string;
  amount: number;
}

interface AgingReportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AgingReportItem[];
  total_count: number;
  filters: {
    days_threshold: string;
    aging_periods: {
      [key: string]: number;
    };
  };
}

interface AgingSummary {
  total_requests: number;
  demand_letter_ready: number;
  overdue_30_60: number;
  overdue_61_90: number;
  overdue_91_plus: number;
}

export default function GenerateAgeingReport() {
  const [daysThreshold, setDaysThreshold] = useState<string>("30");
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [reportData, setReportData] = useState<AgingReportResponse | null>(
    null
  );
  const [summaryData, setSummaryData] = useState<AgingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showFilters, setShowFilters] = useState(false);

  const fetchReport = async (page: number = 1, size: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        days: daysThreshold,
        page: page,
        page_size: size,
      };
      const res = await api.get("reports/unliquidated-schools/", { params });
      const responseData = res.data;

      console.log("Raw API response:", responseData); // Debug log

      // Handle the nested response structure
      let results: AgingReportItem[] = [];
      let totalCount = 0;

      // Check for nested results structure
      if (
        responseData.results &&
        responseData.results.results &&
        Array.isArray(responseData.results.results)
      ) {
        results = responseData.results.results;
        totalCount =
          responseData.results.total_count ||
          responseData.count ||
          results.length;
      }
      // Fallback to direct results array
      else if (responseData.results && Array.isArray(responseData.results)) {
        results = responseData.results;
        totalCount =
          responseData.total_count || responseData.count || results.length;
      }
      // Fallback to direct array
      else if (Array.isArray(responseData)) {
        results = responseData;
        totalCount = responseData.length;
      }
      // Fallback to data property
      else if (responseData.data && Array.isArray(responseData.data)) {
        results = responseData.data;
        totalCount =
          responseData.total_count || responseData.count || results.length;
      }

      console.log("Extracted results:", results); // Debug log

      setReportData({
        count: responseData.count || totalCount,
        next: responseData.next || null,
        previous: responseData.previous || null,
        results: results,
        total_count: totalCount,
        filters: responseData.results?.filters || responseData.filters || {},
      });

      // Generate summary data from the results
      const summary: AgingSummary = {
        total_requests: results.length,
        demand_letter_ready: results.filter(
          (item: AgingReportItem) => item.days_elapsed === 29
        ).length,
        overdue_30_60: results.filter(
          (item: AgingReportItem) =>
            item.days_elapsed >= 30 && item.days_elapsed <= 60
        ).length,
        overdue_61_90: results.filter(
          (item: AgingReportItem) =>
            item.days_elapsed >= 61 && item.days_elapsed <= 90
        ).length,
        overdue_91_plus: results.filter(
          (item: AgingReportItem) => item.days_elapsed >= 91
        ).length,
      };
      setSummaryData(summary);

      setCurrentPage(page);
      setPageSize(size);
    } catch (error) {
      console.error("Failed to fetch report:", error);
      setError("Failed to fetch report");
      setReportData(null);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(1);
    // eslint-disable-next-line
  }, [daysThreshold]);

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const params: Record<string, string> = {
        days: daysThreshold,
        export: "excel",
      };
      const response = await api.get("reports/unliquidated-schools/", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      let filename = "aging_report";
      if (daysThreshold === "demand_letter") {
        filename += "_demand_letter";
      } else {
        filename += `_${daysThreshold}_days`;
      }

      link.setAttribute("download", `${filename}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Excel exported successfully");
    } catch (error) {
      console.error("Failed to export Excel:", error);
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
  const report = reportData?.results || [];

  // Summary Cards Component
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
        title: "Total Requests",
        value: summaryData.total_requests || 0,
        icon: <FileText className="h-5 w-5" />,
        color: "bg-blue-50 border-blue-200 text-blue-700",
      },
      {
        title: "Demand Letter Ready",
        value: summaryData.demand_letter_ready || 0,
        icon: <AlertCircle className="h-5 w-5" />,
        color: "bg-orange-50 border-orange-200 text-orange-700",
      },
      {
        title: "Overdue 30-60 Days",
        value: summaryData.overdue_30_60 || 0,
        icon: <Clock className="h-5 w-5" />,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
      },
      {
        title: "Overdue 91+ Days",
        value: summaryData.overdue_91_plus || 0,
        icon: <XCircle className="h-5 w-5" />,
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
      <PageBreadcrumb pageTitle="Generate Aging Report" />

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 xl:px-10 xl:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 text-theme-xl sm:text-2xl">
                Aging Report
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                View and export schools with unliquidated requests by aging
                period.
              </p>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto mb-6 justify-between items-start md:items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 text-nowrap">
                Show requests:
              </span>
              <Select
                value={daysThreshold}
                onChange={setDaysThreshold}
                className="w-48"
                disabled={loading}
              >
                <Option value="30">30+ days</Option>
                <Option value="60">60+ days</Option>
                <Option value="90">90+ days</Option>
                <Option value="120">120+ days</Option>
                <Option value="180">180+ days</Option>
                <Option value="demand_letter">Demand Letter (29 days)</Option>
                <Option value="all">All</Option>
              </Select>
            </div>

            <div className="flex gap-4">
              {/* <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<Filter className="size-4" />}
              >
                Filters
              </Button> */}

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

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="filter-days">
                  Days Threshold
                </label>
                <Select
                  value={daysThreshold}
                  onChange={setDaysThreshold}
                  className="w-full"
                  disabled={loading}
                >
                  <Option value="30">30+ days</Option>
                  <Option value="60">60+ days</Option>
                  <Option value="90">90+ days</Option>
                  <Option value="120">120+ days</Option>
                  <Option value="180">180+ days</Option>
                  <Option value="demand_letter">Demand Letter (29 days)</Option>
                  <Option value="all">All</Option>
                </Select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDaysThreshold("30");
                    setShowFilters(false);
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
                    School ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloaded At
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Elapsed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aging Period
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : report.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No data found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  report.map((row) => (
                    <tr key={`${row.school_id}-${row.request_id}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.school_id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.school_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.request_id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {new Date(row.downloaded_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-800">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            row.days_elapsed === 29
                              ? "bg-orange-100 text-orange-800"
                              : row.days_elapsed >= 91
                              ? "bg-red-100 text-red-800"
                              : row.days_elapsed >= 61
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {row.days_elapsed}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-800">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            row.aging_period === "0-30 days"
                              ? "bg-blue-100 text-blue-800"
                              : row.aging_period === "31-60 days"
                              ? "bg-yellow-100 text-yellow-800"
                              : row.aging_period === "61-90 days"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {row.aging_period}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-800">
                        ₱{row.amount.toLocaleString()}
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
                total requests
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
