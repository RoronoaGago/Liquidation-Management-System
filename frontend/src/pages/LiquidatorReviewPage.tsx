/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LiquidationReportTable from "@/components/tables/BasicTables/LiquidationReportTable";
import api from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

type Liquidation = {
  LiquidationID: string;
  status: string;
  created_at: string;
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

const LiquidatorReviewPage = () => {
  const { user } = useAuth();
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm] = useState("");
  const [itemsPerPage] = useState(10);
  const [currentPage] = useState(1);

  // Fetch liquidations from backend
  useEffect(() => {
    const fetchLiquidations = async () => {
      setLoading(true);
      try {
        const res = await api.get("/liquidations/");
        setLiquidations(res.data);
        console.log(res.data);
      } catch (err) {
        // Optionally handle error
      } finally {
        setLoading(false);
      }
    };
    fetchLiquidations();
  }, []);

  // Filtered and paginated data
  const filteredLiquidations = useMemo(() => {
    let filtered = liquidations;
    console.log("All liquidations:", filtered);
    console.log("User role:", user?.role);
    
    // Liquidators see liquidations approved by district admins
    if (user?.role === "liquidator") {
      filtered = filtered.filter(
        (liq) => liq.status === "under_review_liquidator"
      );
      console.log("Filtered liquidations for liquidator:", filtered);
    }
    
    if (!searchTerm) return filtered;
    return filtered.filter((liq) => {
      const userObj = liq.request?.user;
      const school = userObj?.school?.schoolName || "";
      return (
        liq.LiquidationID.toLowerCase().includes(searchTerm.toLowerCase()) ||
        liq.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        liq.request?.request_id
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (userObj &&
          (`${userObj.first_name} ${userObj.last_name}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
            school.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    });
  }, [liquidations, searchTerm, user]);

  const paginatedLiquidations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLiquidations.slice(start, start + itemsPerPage);
  }, [filteredLiquidations, currentPage, itemsPerPage]);

  return (
    <div className="container mx-auto px-5 py-10">
      <PageBreadcrumb pageTitle="Liquidator Review" />

      {/* Table */}
      <LiquidationReportTable
        liquidations={paginatedLiquidations}
        loading={loading}
        refreshList={async () => {
          setLoading(true);
          try {
            const res = await api.get("/liquidations/");
            setLiquidations(res.data);
          } catch (err) {
            // Optionally handle error
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
};

export default LiquidatorReviewPage;
