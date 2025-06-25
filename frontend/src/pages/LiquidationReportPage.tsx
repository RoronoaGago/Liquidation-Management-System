/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LiquidationReportTable from "@/components/tables/BasicTables/LiquidationReportTable";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import api from "@/api/axios";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

type Liquidation = {
  LiquidationID: string;
  status: string;
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
  // Add other fields as needed
};

const LiquidationReportPage = () => {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch liquidations from backend
  useEffect(() => {
    const fetchLiquidations = async () => {
      setLoading(true);
      try {
        const res = await api.get("/liquidations/");
        setLiquidations(res.data);
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
      return (
        liq.LiquidationID.toLowerCase().includes(searchTerm.toLowerCase()) ||
        liq.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const totalPages = Math.ceil(filteredLiquidations.length / itemsPerPage);
  const paginatedLiquidations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLiquidations.slice(start, start + itemsPerPage);
  }, [filteredLiquidations, currentPage, itemsPerPage]);

  // Pagination helpers
  const goToPage = (pageNum: number) => {
    setCurrentPage(Math.max(1, Math.min(pageNum, totalPages)));
  };

  return (
    <div className="container mx-auto px-5 py-10">
      <PageBreadcrumb pageTitle="District Liquidation Management" />

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

      {/* Pagination */}
    </div>
  );
};

export default LiquidationReportPage;
