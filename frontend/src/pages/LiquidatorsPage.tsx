/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LiquidatorsTable from "@/components/tables/BasicTables/LiquidatorsTable";
import api from "@/api/axios";

// Define the Liquidation type if not imported from elsewhere
type Liquidation = {
  LiquidationID: string;
  status: string;
  reviewed_by_district?: {
    first_name: string;
    last_name: string;
  };
  reviewed_at_district?: string; // Add this property
  created_at?: string; // Add this property
  request?: {
    request_id?: string;
    user?: {
      first_name: string;
      last_name: string;
      school?: {
        schoolName: string;
      };
    };
  };
};

const LiquidatorsPage = () => {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm] = useState("");
  const [itemsPerPage] = useState(10);
  const [currentPage] = useState(1);

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
    if (!searchTerm) return liquidations;
    return liquidations.filter((liq) => {
      const user = liq.request?.user;
      const school = user?.school?.schoolName || "";
      const reviewer = liq.reviewed_by_district
        ? `${liq.reviewed_by_district.first_name} ${liq.reviewed_by_district.last_name}`
        : "";
      return (
        liq.LiquidationID.toLowerCase().includes(searchTerm.toLowerCase()) ||
        liq.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reviewer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        liq.request?.request_id
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (user &&
          (`${user.first_name} ${user.last_name}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
            school.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    });
  }, [liquidations, searchTerm]);

  const paginatedLiquidations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLiquidations.slice(start, start + itemsPerPage);
  }, [filteredLiquidations, currentPage, itemsPerPage]);

  return (
    <div className="container mx-auto px-5 py-10">
      <PageBreadcrumb pageTitle="Division Liquidators" />
      <LiquidatorsTable
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

export default LiquidatorsPage;
