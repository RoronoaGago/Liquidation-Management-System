import React, { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { DatePicker } from "antd";
import api from "@/api/axios";
import { toast } from "react-toastify";

export default function GenerateReport() {
  const [month, setMonth] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<
    { schoolId: string; schoolName: string; has_unliquidated: boolean }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (month) params.month = month;
      const res = await api.get("reports/unliquidated-schools/", { params });
      setReport(res.data);
    } catch (err: any) {
      setError("Failed to fetch report");
      setReport([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line
  }, [month]);

  const handleMonthChange = (date: any, dateString: string) => {
    setMonth(dateString);
  };

  const handleExportCSV = async () => {
    try {
      const params: any = {};
      if (month) params.month = month;
      params.export = "csv";
      const response = await api.get("reports/unliquidated-schools/", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "unliquidated_schools_report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to export CSV");
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Generate Report" />
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
                Schools with Unliquidated Requests
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                View and export schools with unliquidated requests for a
                selected month.
              </p>
            </div>
            <div className="flex items-center gap-2 ">
              <span className="text-sm text-gray-600 text-nowrap">
                Select Month:
              </span>
              <DatePicker
                picker="month"
                format="YYYY-MM"
                onChange={handleMonthChange}
                allowClear
                className="w-40"
              />
              <Button
                variant="primary"
                onClick={handleExportCSV}
                disabled={loading || report.length === 0}
                className="ml-2 text-nowrap"
              >
                Export CSV
              </Button>
            </div>
          </div>
          {error && (
            <div className="p-3 mb-6 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-100 text-center">
              {error}
            </div>
          )}
          <div className="overflow-x-auto border rounded-lg bg-white dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    School ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    School Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Unliquidated Request
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : report.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500">
                      No data found.
                    </td>
                  </tr>
                ) : (
                  report.map((row) => (
                    <tr key={row.schoolId}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {row.schoolId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                        {row.schoolName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-green-700 dark:text-green-400 font-semibold">
                        {row.has_unliquidated ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
