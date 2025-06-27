import { useState, useEffect, useCallback } from "react";
import api from "@/api/axios";
import { School } from "@/lib/types";
import { toast } from "react-toastify";
import Button from "../components/ui/button/Button";
import { Loader2, Undo2, Search, Plus, Minus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import Input from "@/components/form/input/InputField";
import ResourceAllocationTable from "../components/tables/ResourceAllocationTable"; // <-- You need to create this

type SortConfig = {
  key: keyof School | "difference";
  direction: "asc" | "desc";
};

const ResourceAllocation = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [editingBudgets, setEditingBudgets] = useState<Record<string, number>>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "schoolName",
    direction: "asc",
  });
  const [quickAddAmount, setQuickAddAmount] = useState(50000);

  // Fetch schools on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const schoolsRes = await api.get("schools/");
        setSchools(schoolsRes.data);

        // Initialize editing budgets
        const initialBudgets = schoolsRes.data.reduce((acc, school) => {
          acc[school.schoolId] = school.maxBudget || 0;
          return acc;
        }, {} as Record<string, number>);
        setEditingBudgets(initialBudgets);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle budget changes
  const handleBudgetChange = (schoolId: string, amount: number) => {
    setEditingBudgets((prev) => ({
      ...prev,
      [schoolId]: Math.max(0, amount), // Prevent negative values
    }));
  };

  // Quick adjust budget
  const quickAdjust = (schoolId: string, delta: number) => {
    const current = editingBudgets[schoolId] || 0;
    handleBudgetChange(schoolId, current + delta);
  };

  // Apply percentage increase to all
  const applyPercentageIncrease = (percent: number) => {
    const updated = { ...editingBudgets };
    for (const schoolId in updated) {
      updated[schoolId] = Math.round(updated[schoolId] * (1 + percent / 100));
    }
    setEditingBudgets(updated);
  };

  // Reset all changes
  const resetBudgets = () => {
    const initialBudgets = schools.reduce((acc, school) => {
      acc[school.schoolId] = school.maxBudget || 0;
      return acc;
    }, {} as Record<string, number>);
    setEditingBudgets(initialBudgets);
    toast.info("All changes reset");
  };

  // Save budgets
  const saveBudgets = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(editingBudgets).map(
        ([schoolId, budget]) => ({
          schoolId,
          maxBudget: budget,
        })
      );

      await api.patch("schools/batch_update/", { updates });
      const updatedSchools = schools.map((school) => ({
        ...school,
        maxBudget: editingBudgets[school.schoolId] || 0,
      }));

      setSchools(updatedSchools);
      toast.success("Budgets updated successfully!");
    } catch {
      toast.error("Failed to update budgets");
    } finally {
      setIsSaving(false);
    }
  };

  // Request sort
  const requestSort = (key: keyof School | "difference") => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Sort and filter schools
  const filteredAndSortedSchools = useCallback(() => {
    let filtered = [...schools];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (school) =>
          school.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          school.schoolId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Calculate differences for sorting
    filtered = filtered.map((school) => ({
      ...school,
      difference:
        (editingBudgets[school.schoolId] || 0) - (school.maxBudget || 0),
    }));

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue =
          sortConfig.key === "difference"
            ? a.difference
            : a[sortConfig.key as keyof School];
        const bValue =
          sortConfig.key === "difference"
            ? b.difference
            : b[sortConfig.key as keyof School];

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [schools, searchTerm, sortConfig, editingBudgets]);

  // Common quick add amounts
  const quickAddAmounts = [10000, 25000, 50000, 100000];

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Budget Summary */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold">Budget Allocation</h2>
            <p className="text-sm text-gray-600">Monthly budget adjustment</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search schools..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={quickAddAmount.toString()}
            onValueChange={(value) => setQuickAddAmount(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Quick add" />
            </SelectTrigger>
            <SelectContent>
              {quickAddAmounts.map((amount) => (
                <SelectItem key={amount} value={amount.toString()}>
                  +{formatCurrency(amount)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="secondary"
            onClick={() => applyPercentageIncrease(5)}
            disabled={isSaving}
          >
            +5% All
          </Button>
          <Button
            variant="secondary"
            onClick={() => applyPercentageIncrease(10)}
            disabled={isSaving}
          >
            +10% All
          </Button>
          <Button
            variant="secondary"
            onClick={resetBudgets}
            disabled={isSaving}
          >
            <Undo2 className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button variant="primary" onClick={saveBudgets} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Table with Pagination */}
      <ResourceAllocationTable
        schools={filteredAndSortedSchools()}
        editingBudgets={editingBudgets}
        handleBudgetChange={handleBudgetChange}
        quickAdjust={quickAdjust}
        quickAddAmount={quickAddAmount}
        requestSort={requestSort}
        sortConfig={sortConfig}
        loading={loading}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

export default ResourceAllocation;
