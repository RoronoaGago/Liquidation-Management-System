/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LiquidationReportTable from "@/components/tables/BasicTables/LiquidationReportTable";
import api from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

type Liquidation = {
  LiquidationID: string;
  status: string;
  created_at: string; // Add this property to match the expected type
  request?: {
    request_id?: string;
    user?: {
      first_name: string;
      last_name: string;
      school?: {
        schoolName: string;
        district?: string; // <-- Add this line
      };
    };
  };
  // Add other fields as needed
};

const LiquidationReportPage = () => {
  const { user } = useAuth();
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  const fetchLiquidations = async () => {
    setLoading(true);
    try {
      // District admin: tab-based statuses
      const statusParam =
        activeTab === "pending"
          ? "submitted,under_review_district,resubmit"
          : "approved_district,under_review_liquidator,approved_liquidator,under_review_division,liquidated";

      const res = await api.get("/liquidations/", {
        params: {
          status: statusParam,
          ordering: "-created_at",
        },
      });
      setLiquidations(res.data);
    } catch (err) {
      setLiquidations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidations();
  }, [activeTab]);

  return (
    <div className="container mx-auto px-5 py-10">
      <PageBreadcrumb pageTitle="District Liquidation Management" />

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

      <LiquidationReportTable
        liquidations={liquidations}
        loading={loading}
        refreshList={fetchLiquidations}
      />
    </div>
  );
};

export default LiquidationReportPage;
