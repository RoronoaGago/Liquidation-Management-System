// GenerateAgeingReport.tsx
import React, { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { DatePicker, Select } from "antd";
import api from "@/api/axios";
import { toast } from "react-toastify";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

export default function GenerateAgeingReport() {
  const [daysThreshold, setDaysThreshold] = useState<string>("30");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<AgingReportResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const fetchReport = async (page: number = 1, size: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        days: daysThreshold,
        page: page,
        page_size: size,
      };
      const res = await api.get("reports/unliquidated-schools/", { params });
      setReportData(res.data.results);
      setCurrentPage(page);
      setPageSize(size);
    } catch (err: any) {
      setError("Failed to fetch report");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(1);
    // eslint-disable-next-line
  }, [daysThreshold]);

  const handleExportExcel = async () => {
    try {
      const params: any = { days: daysThreshold, export: "excel" };
      const response = await api.get("reports/unliquidated-schools/", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `aging_report_${daysThreshold}_days.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to export Excel");
    }
  };

  const goToPage = (page: number) => {
    fetchReport(page);
  };

  const totalPages = reportData?.count
    ? Math.ceil(reportData.count / pageSize)
    : 0;
  const report = reportData?.results || [];

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Aging Report" />
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
                Aging Report for Unliquidated Requests
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                View and export schools with unliquidated requests by aging
                period.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 text-nowrap">
                Show requests older than:
              </span>
              <Select
                value={daysThreshold}
                onChange={setDaysThreshold}
                className="w-32"
              >
                <Option value="30">30 days</Option>
                <Option value="60">60 days</Option>
                <Option value="90">90 days</Option>
                <Option value="120">120 days</Option>
                <Option value="180">180 days</Option>
                <Option value="all">All</Option>
              </Select>
              <Button
                variant="primary"
                onClick={handleExportExcel}
                disabled={loading || report.length === 0}
                className="ml-2 text-nowrap"
              >
                Export Excel
              </Button>
            </div>
          </div>

          {/* Summary Statistics */}
          {/* {reportData?.filters?.aging_periods && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(reportData.filters.aging_periods).map(
                ([period, count]) => (
                  <div
                    key={period}
                    className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center"
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {period.replace("_", "-")} days
                    </div>
                    <div className="text-lg font-semibold text-gray-800 dark:text-white">
                      {count}
                    </div>
                  </div>
                )
              )}
            </div>
          )} */}

          {error && (
            <div className="p-3 mb-6 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-100 text-center">
              {error}
            </div>
          )}

          <div className="overflow-x-auto border rounded-lg bg-white dark:bg-gray-900 mb-6">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    School ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    School Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Downloaded At
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Days Elapsed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Aging Period
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {row.school_id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {row.school_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {row.request_id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {new Date(row.downloaded_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-800 dark:text-gray-200">
                        {row.days_elapsed}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-800 dark:text-gray-200">
                        {row.aging_period}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-800 dark:text-gray-200">
                        {row.amount.toLocaleString()}
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
              <div className="text-sm text-gray-600 dark:text-gray-400">
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
