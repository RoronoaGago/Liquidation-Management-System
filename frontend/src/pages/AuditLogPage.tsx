// AuditLogs.tsx
/* eslint-disable no-case-declarations */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import "../antd-custom.css";
import { toast } from "react-toastify";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import AuditLogsTable from "../components/tables/BasicTables/AuditLogsTable";
import Button from "../components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useState, useEffect, useRef } from "react";
import api from "@/api/axios";
import {
  DownloadIcon,
  FilterIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { FilterOptions, SortDirection } from "@/lib/types";
import DynamicContextualHelp from "@/components/help/DynamicContextualHelpComponent";

export interface AuditLog {
  id: number;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    school: any;
    date_of_birth: string | null;
    sex: string | null;
    phone_number: string | null;
    school_district: any;
    profile_picture: string | null;
    e_signature: string | null;
    is_active: boolean;
    date_joined: string;
    last_login: string;
  } | null;
  action: string;
  module: string;
  object_id: string | null;
  object_type: string | null;
  object_name: string | null;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  old_values: any;
  new_values: any;
}

export type SortableAuditField =
  | "id"
  | "timestamp"
  | "user"
  | "action"
  | "module"
  | "object_name"
  | "ip_address";

const actionOptions = [
  { value: "", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "archive", label: "Archive" },
  { value: "restore", label: "Restore" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "submit", label: "Submit" },
  { value: "download", label: "Download" },
  { value: "password_change", label: "Password Change" },
];

const moduleOptions = [
  { value: "", label: "All Modules" },
  { value: "user", label: "User Management" },
  { value: "school", label: "School Management" },
  { value: "request", label: "Request Management" },
  { value: "liquidation", label: "Liquidation Management" },
  { value: "priority", label: "Priority Management" },
  { value: "requirement", label: "Requirement Management" },
  { value: "district", label: "District Management" },
  { value: "system", label: "System Operations" },
  { value: "auth", label: "Authentication" },
];

interface AuditFilterOptions {
  action: string;
  module: string;
  dateRange: { start: string; end: string };
  searchTerm: string;
}

const AuditLogPage = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterOptions, setFilterOptions] = useState<AuditFilterOptions>({
    action: "",
    module: "",
    dateRange: { start: "", end: "" },
    searchTerm: "",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: SortableAuditField;
    direction: SortDirection;
  } | null>({ key: "timestamp", direction: "desc" });
  const [showFilters, setShowFilters] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };

      if (filterOptions.action) params.action = filterOptions.action;
      if (filterOptions.module) params.module = filterOptions.module;
      if (filterOptions.searchTerm) params.search = filterOptions.searchTerm;
      if (filterOptions.dateRange?.start)
        params.timestamp_after = filterOptions.dateRange.start;
      if (filterOptions.dateRange?.end)
        params.timestamp_before = filterOptions.dateRange.end;

      if (sortConfig) {
        params.ordering =
          sortConfig.direction === "asc"
            ? sortConfig.key
            : `-${sortConfig.key}`;
      }

      const response = await api.get("audit-logs/", { params });

      // Ensure we're handling paginated response correctly
      if (response.data.results !== undefined) {
        setAuditLogs(response.data.results);
        setTotalLogs(response.data.count);
      } else {
        // Fallback for non-paginated response (shouldn't happen with proper backend)
        setAuditLogs(response.data);
        setTotalLogs(response.data.length);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch audit logs");
      setError(error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filterOptions, sortConfig, currentPage, itemsPerPage]);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [searchTerm, setSearchTerm] = useState(filterOptions.searchTerm || "");

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setFilterOptions((prev) => ({ ...prev, searchTerm }));
    }, 400);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [searchTerm]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = {};
      if (filterOptions.action) params.action = filterOptions.action;
      if (filterOptions.module) params.module = filterOptions.module;
      if (filterOptions.searchTerm) params.search = filterOptions.searchTerm;
      if (filterOptions.dateRange?.start)
        params.timestamp_after = filterOptions.dateRange.start;
      if (filterOptions.dateRange?.end)
        params.timestamp_before = filterOptions.dateRange.end;

      const response = await api.get("audit-logs/export/", {
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Audit logs exported successfully!");
    } catch (error) {
      toast.error("Failed to export audit logs");
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setFilterOptions({
      action: "",
      module: "",
      dateRange: { start: "", end: "" },
      searchTerm: "",
    });
    setSearchTerm("");
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailDialogOpen(true);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "success";
      case "update":
        return "primary";
      case "archive":
        return "warning";
      case "restore":
        return "success";
      case "login":
        return "success";
      case "logout":
        return "secondary";
      case "approve":
        return "success";
      case "reject":
        return "error";
      case "submit":
        return "primary";
      case "download":
        return "secondary";
      case "password_change":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getModuleColor = (module: string) => {
    switch (module) {
      case "user":
        return "primary";
      case "school":
        return "success";
      case "request":
        return "warning";
      case "liquidation":
        return "error";
      case "priority":
        return "secondary";
      case "requirement":
        return "info";
      case "district":
        return "primary";
      case "system":
        return "secondary";
      case "auth":
        return "success";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Audit Trail" />
      <div className="space-y-6">
        <DynamicContextualHelp variant="inline" className="mb-6" /> 
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-1/2">
              <Input
                type="text"
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
                className="pl-10"
              />
              <RefreshCwIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<FilterIcon className="size-4" />}
              >
                Filters
              </Button>
              <Button
                variant="primary"
                onClick={fetchAuditLogs}
                startIcon={<RefreshCwIcon className="size-4" />}
              >
                Refresh
              </Button>
              <select
                value={itemsPerPage.toString()}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setItemsPerPage(Number(e.target.value))
                }
                className="min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
              <div className="space-y-2">
                <Label htmlFor="action-filter" className="text-sm font-medium">
                  Action
                </Label>
                <select
                  id="action-filter"
                  value={filterOptions.action}
                  onChange={(e) =>
                    setFilterOptions((prev) => ({
                      ...prev,
                      action: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="module-filter" className="text-sm font-medium">
                  Module
                </Label>
                <select
                  id="module-filter"
                  value={filterOptions.module}
                  onChange={(e) =>
                    setFilterOptions((prev) => ({
                      ...prev,
                      module: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {moduleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="date-range-start"
                  className="text-sm font-medium"
                >
                  Date Range
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Input
                      type="date"
                      id="date-range-start"
                      value={filterOptions.dateRange.start}
                      onChange={(e) =>
                        setFilterOptions((prev) => ({
                          ...prev,
                          dateRange: {
                            ...prev.dateRange,
                            start: e.target.value,
                          },
                        }))
                      }
                      className="w-full p-2 pr-8"
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type="date"
                      id="date-range-end"
                      value={filterOptions.dateRange.end}
                      onChange={(e) =>
                        setFilterOptions((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value },
                        }))
                      }
                      className="w-full p-2 pr-8"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        <AuditLogsTable
          auditLogs={auditLogs}
          loading={loading}
          error={error}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalLogs={totalLogs}
          onRequestSort={(key) => {
            let direction: SortDirection = "asc";
            if (sortConfig && sortConfig.key === key) {
              direction = sortConfig.direction === "asc" ? "desc" : null;
            }
            setSortConfig(direction ? { key, direction } : null);
          }}
          currentSort={sortConfig}
          onViewDetails={handleViewDetails}
          getActionColor={getActionColor}
          getModuleColor={getModuleColor}
        />
      </div>

      {/* Audit Log Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="w-full rounded-lg bg-white dark:bg-gray-800 p-8 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar lg:max-w-4xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
              Audit Log Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Detailed information about this audit log entry
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Log ID
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        #{selectedLog.id}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Timestamp
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Action
                      </Label>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 bg-${getActionColor(
                          selectedLog.action
                        )}-100 text-${getActionColor(selectedLog.action)}-800`}
                      >
                        {selectedLog.action}
                      </span>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Module
                      </Label>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 bg-${getModuleColor(
                          selectedLog.module
                        )}-100 text-${getModuleColor(selectedLog.module)}-800`}
                      >
                        {selectedLog.module}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                    User & Session
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        User
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {selectedLog.user
                          ? `${selectedLog.user.first_name} ${selectedLog.user.last_name} (${selectedLog.user.email})`
                          : "System"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        IP Address
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        {selectedLog.ip_address || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        User Agent
                      </Label>
                      <p className="text-gray-800 dark:text-gray-200 mt-1 text-sm break-words">
                        {selectedLog.user_agent || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                  Object Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Object Type
                    </Label>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">
                      {selectedLog.object_type || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Object ID
                    </Label>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">
                      {selectedLog.object_id || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Object Name
                    </Label>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">
                      {selectedLog.object_name || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                  Description
                </h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {selectedLog.description}
                </p>
              </div>

              {(selectedLog.old_values || selectedLog.new_values) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b pb-2">
                    Changes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedLog.old_values && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Old Values
                        </Label>
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm overflow-auto max-h-40">
                          {JSON.stringify(selectedLog.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.new_values && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          New Values
                        </Label>
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm overflow-auto max-h-40">
                          {JSON.stringify(selectedLog.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDetailDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogPage;
