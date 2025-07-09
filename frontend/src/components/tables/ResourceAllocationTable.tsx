import React, { useState, useMemo } from "react";
import { School } from "@/lib/types";
import Button from "../ui/button/Button";
import { Plus, Minus, ArrowUp, ArrowDown } from "lucide-react";

interface ResourceAllocationTableProps {
  schools: (School & { difference?: number })[];
  editingBudgets: Record<string, number>;
  handleBudgetChange: (schoolId: string, amount: number) => void;
  quickAdjust: (schoolId: string, delta: number) => void;
  quickAddAmount: number;
  requestSort: (key: keyof School | "difference") => void;
  sortConfig: { key: keyof School | "difference"; direction: "asc" | "desc" };
  loading: boolean;
  formatCurrency: (value: number) => string;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const ResourceAllocationTable: React.FC<ResourceAllocationTableProps> = ({
  schools,
  editingBudgets,
  handleBudgetChange,
  quickAdjust,
  quickAddAmount,
  requestSort,
  sortConfig,
  loading,
  formatCurrency,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Pagination logic
  const totalPages = Math.ceil(schools.length / itemsPerPage);
  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return schools.slice(start, start + itemsPerPage);
  }, [schools, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to page 1 if schools or itemsPerPage changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [schools, itemsPerPage]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
        <div>
          <span className="text-sm text-gray-600">
            Showing {paginatedSchools.length} of {schools.length} schools
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
            Rows per page:
          </label>
          <select
            id="itemsPerPage"
            className="border rounded px-2 py-1 text-sm"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => requestSort("schoolId")}
              >
                School ID{" "}
                {sortConfig.key === "schoolId" &&
                  (sortConfig.direction === "asc" ? (
                    <ArrowUp className="inline w-3 h-3" />
                  ) : (
                    <ArrowDown className="inline w-3 h-3" />
                  ))}
              </th>
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => requestSort("schoolName")}
              >
                School Name{" "}
                {sortConfig.key === "schoolName" &&
                  (sortConfig.direction === "asc" ? (
                    <ArrowUp className="inline w-3 h-3" />
                  ) : (
                    <ArrowDown className="inline w-3 h-3" />
                  ))}
              </th>
              <th className="px-3 py-2">District</th>
              <th className="px-3 py-2">Municipality</th>
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => requestSort("maxBudget")}
              >
                Previous Budget{" "}
                {sortConfig.key === "maxBudget" &&
                  (sortConfig.direction === "asc" ? (
                    <ArrowUp className="inline w-3 h-3" />
                  ) : (
                    <ArrowDown className="inline w-3 h-3" />
                  ))}
              </th>
              <th className="px-3 py-2">New Budget</th>
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => requestSort("difference")}
              >
                Difference{" "}
                {sortConfig.key === "difference" &&
                  (sortConfig.direction === "asc" ? (
                    <ArrowUp className="inline w-3 h-3" />
                  ) : (
                    <ArrowDown className="inline w-3 h-3" />
                  ))}
              </th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  Loading...
                </td>
              </tr>
            ) : paginatedSchools.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  No schools found.
                </td>
              </tr>
            ) : (
              paginatedSchools.map((school) => {
                const currentBudget = editingBudgets[school.schoolId] ?? 0;
                const prevBudget = school.maxBudget ?? 0;
                const difference = currentBudget - prevBudget;
                return (
                  <tr
                    key={school.schoolId}
                    className={
                      difference > 0
                        ? "bg-green-50"
                        : difference < 0
                        ? "bg-red-50"
                        : ""
                    }
                  >
                    <td className="px-3 py-2">{school.schoolId}</td>
                    <td className="px-3 py-2">{school.schoolName}</td>
                    <td className="px-3 py-2">{school.district}</td>
                    <td className="px-3 py-2">{school.municipality}</td>
                    <td className="px-3 py-2 font-mono">
                      {formatCurrency(prevBudget)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            quickAdjust(school.schoolId, -quickAddAmount)
                          }
                          disabled={currentBudget <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <input
                          type="number"
                          min={0}
                          className="w-24 border rounded px-2 py-1 text-right font-mono"
                          value={currentBudget}
                          onChange={(e) =>
                            handleBudgetChange(
                              school.schoolId,
                              Number(e.target.value)
                            )
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            quickAdjust(school.schoolId, quickAddAmount)
                          }
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                    <td
                      className={`px-3 py-2 font-mono ${
                        difference > 0
                          ? "text-green-600"
                          : difference < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {difference === 0
                        ? "-"
                        : (difference > 0 ? "+" : "") +
                          formatCurrency(Math.abs(difference))}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleBudgetChange(school.schoolId, prevBudget)
                        }
                        disabled={currentBudget === prevBudget}
                      >
                        Reset
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div className="flex flex-wrap justify-between items-center mt-4 gap-2">
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
};
export default ResourceAllocationTable;
