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
  reviewed_by_district?: {
    first_name: string;
    last_name: string;
  };
  reviewed_at_district?: string;
  reviewed_by_liquidator?: {
    first_name: string;
    last_name: string;
  };
  reviewed_at_liquidator?: string;
  reviewed_by_division?: {
    first_name: string;
    last_name: string;
  };
  reviewed_at_division?: string;
  date_districtApproved?: string;
  date_liquidatorApproved?: string;
  date_liquidated?: string;
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

const DivisionReviewPage = () => {
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
    
    // Backend already filters liquidations by role, so we don't need additional filtering here
    // The backend LiquidationManagementListCreateAPIView.get_queryset() already handles:
    // - district_admin: filters by status='submitted' and district
    // - liquidator: filters by status='under_review_liquidator' and 'approved_district'  
    // - accountant: filters by status='under_review_division' and 'approved_liquidator'
    // - school_head: shows only their latest liquidation
    console.log("Backend should have already filtered liquidations by role and status");
    
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
      <PageBreadcrumb pageTitle="Division Accountant Review" />

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

export default DivisionReviewPage;
