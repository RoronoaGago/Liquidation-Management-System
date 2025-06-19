import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import LOPsTable from "../components/tables/BasicTables/LOPsTable";
import Button from "../components/ui/button/Button";
import { PlusIcon } from "../icons";
import api from "@/api/axios";
import type {
  Requirement,
  ListOfPriority,
  LOPSortableField,
} from "@/lib/types";

interface LOPsFilterOptions {
  searchTerm: string;
}

const ManageExpenseAccounts = () => {
  const [lops, setLOPs] = useState<ListOfPriority[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterOptions, setFilterOptions] = useState<LOPsFilterOptions>({
    searchTerm: "",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: LOPSortableField;
    direction: "asc" | "desc" | null;
  } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchLOPs = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lopsRes, reqsRes] = await Promise.all([
        api.get("priorities/"),
        api.get("requirements/"),
      ]);
      setLOPs(lopsRes.data);
      setRequirements(reqsRes.data);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch LOPs");
      setError(error);
      toast.error("Failed to load List of Priorities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLOPs();
  }, []);

  const handleSort = (key: LOPSortableField) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : null;
    }
    setSortConfig(direction ? { key, direction } : null);
  };

  const sortedLOPs = useMemo(() => {
    if (!sortConfig) return lops;

    return [...lops].sort((a, b) => {
      if (sortConfig.key === "LOPID") {
        return sortConfig.direction === "asc"
          ? a.LOPID - b.LOPID
          : b.LOPID - a.LOPID;
      } else if (sortConfig.key === "expenseTitle") {
        return sortConfig.direction === "asc"
          ? a.expenseTitle.localeCompare(b.expenseTitle)
          : b.expenseTitle.localeCompare(a.expenseTitle);
      }
      return 0;
    });
  }, [lops, sortConfig]);

  const filteredLOPs = useMemo(() => {
    if (!filterOptions.searchTerm) return sortedLOPs;

    const term = filterOptions.searchTerm.toLowerCase();
    return sortedLOPs.filter(
      (lop) =>
        lop.expenseTitle.toLowerCase().includes(term) ||
        lop.LOPID.toString().includes(term)
    );
  }, [sortedLOPs, filterOptions.searchTerm]);

  const handleAddNewLOP = async () => {
    try {
      const response = await api.post("priorities/", {
        expenseTitle: "New Expense",
        requirement_ids: [],
      });
      setLOPs([...lops, response.data]);
      toast.success("New LOP created successfully!");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Failed to create new LOP");
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageBreadcrumb pageTitle="Manage List of Priorities" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">List of Priorities</h2>
          <Button
            size="md"
            variant="primary"
            startIcon={<PlusIcon className="size-6" />}
            onClick={handleAddNewLOP}
          >
            Add New LOP
          </Button>
        </div>

        <LOPsTable
          lops={filteredLOPs}
          setLOPs={setLOPs}
          fetchLOPs={fetchLOPs}
          sortedLOPs={filteredLOPs}
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
          onRequestSort={handleSort}
          currentSort={sortConfig}
          loading={loading}
          error={error}
          requirements={requirements}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
        />
      </div>
    </div>
  );
};

export default ManageExpenseAccounts;
