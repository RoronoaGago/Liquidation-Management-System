/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import PrioritySubmissionsTable from "@/components/tables/BasicTables/PrioritySubmissionsTable";
import { Submission } from "@/lib/types";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

// Set up Axios request interceptor to include the token in the headers
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const MOOERequestPage = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  useAuth();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/user-requests/");
        setSubmissions(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        setError("Failed to load requests.");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // Sorting logic (client-side)
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setSubmissions((prev) =>
      [...prev].sort((a, b) => {
        if ((a as any)[key] < (b as any)[key])
          return direction === "asc" ? -1 : 1;
        if ((a as any)[key] > (b as any)[key])
          return direction === "asc" ? 1 : -1;
        return 0;
      })
    );
  };

  // View handler (could open a modal or details page)
  const handleView = (submission: Submission) => {
    // For now, just alert or implement a modal
    alert(`Viewing request: ${submission.request_id}`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Requests History" />
      <PrioritySubmissionsTable
        submissions={submissions}
        onView={handleView}
        loading={loading}
        error={error}
        sortConfig={sortConfig}
        requestSort={handleSort}
      />
    </div>
  );
};

export default MOOERequestPage;
