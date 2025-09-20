// GenerateLiquidationReport.tsx
import React, { useState, useEffect } from "react";
import { DatePicker, Select, ConfigProvider } from "antd";
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
} from "lucide-react";

const { Option } = Select;
const { RangePicker } = DatePicker;

interface LiquidationReportItem {
  LiquidationID: string;
  request: {
    request_id: string;
    user: {
      first_name: string;
      last_name: string;
      school: {
        schoolId: string;
        schoolName: string;
        district: {
          districtId: string;
          districtName: string;
        };
      };
    };
    request_monthyear: string;
  };
  status: string;
  created_at: string;
  date_submitted: string;
  date_liquidated: string;
  refund: number;
  reviewed_by_district: {
    first_name: string;
    last_name: string;
  } | null;
  reviewed_by_liquidator: {
    first_name: string;
    last_name: string;
  } | null;
  reviewed_by_division: {
    first_name: string;
    last_name: string;
  } | null;
}

interface LiquidationReportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LiquidationReportItem[];
  total_count: number;
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [reportData, setReportData] =
    useState<LiquidationReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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

      const res = await api.get("liquidations/", { params });
      setReportData(res.data);
      console.log(res.data);
      setCurrentPage(page);
      setPageSize(size);
    } catch (err: any) {
      setError("Failed to fetch liquidation report");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(1);
  }, [activeTab, statusFilter, dateRange]);

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

      const response = await api.get("liquidations/", {
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
  const report = reportData?.results || [];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Liquidation Report</h1>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 xl:px-10 xl:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 text-theme-xl sm:text-2xl">
                Liquidation Report
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                View and export liquidation reports with filtering options.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 text-nowrap">
                  Status:
                </span>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  className="w-32"
                >
                  <Option value="all">All</Option>
                  <Option value="draft">Draft</Option>
                  <Option value="submitted">Submitted</Option>
                  <Option value="under_review_district">
                    Under Review (District)
                  </Option>
                  <Option value="under_review_liquidator">
                    Under Review (Liquidator)
                  </Option>
                  <Option value="under_review_division">
                    Under Review (Division)
                  </Option>
                  <Option value="resubmit">Needs Revision</Option>
                  <Option value="approved_district">
                    Approved by District
                  </Option>
                  <Option value="approved_liquidator">
                    Approved by Liquidator
                  </Option>
                  <Option value="liquidated">Liquidated</Option>
                </Select>
              </div>

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

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto mb-6">
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

            {activeTab === "Custom" && (
              <ConfigProvider theme={lightTheme}>
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
              </ConfigProvider>
            )}
          </div>

          {error && (
            <div className="p-3 mb-6 text-sm text-red-700 bg-red-100 rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="overflow-x-auto border rounded-lg bg-white mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Liquidation ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Refund
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
                    <tr key={row.LiquidationID}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.LiquidationID}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.request.request_id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.request.user.school.schoolName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.request.user.school.district.districtName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.request.request_monthyear}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            row.status === "liquidated"
                              ? "bg-green-100 text-green-800"
                              : row.status === "submitted"
                              ? "bg-blue-100 text-blue-800"
                              : row.status.includes("approved")
                              ? "bg-purple-100 text-purple-800"
                              : row.status.includes("review")
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {row.status.replace(/_/g, " ")}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {row.refund ? row.refund.toLocaleString() : "N/A"}
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
