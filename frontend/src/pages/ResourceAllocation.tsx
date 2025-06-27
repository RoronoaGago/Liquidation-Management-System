import { useState, useEffect } from "react";
import api from "@/api/axios";
import { School } from "@/lib/types";
import { toast } from "react-toastify";
import Button from "../components/ui/button/Button";
import {
  Loader2,
  Undo2,
  ChevronUp,
  ChevronDown,
  Filter,
  Plus,
  Minus,
} from "lucide-react";

const ResourceAllocation = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [editingBudgets, setEditingBudgets] = useState<Record<string, number>>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "changed" | "increases" | "decreases"
  >("all");
  const [quickAddAmount, setQuickAddAmount] = useState(50000);

  // Fetch schools on mount (remove total budget fetch)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const schoolsRes = await api.get("schools/");
        setSchools(schoolsRes.data);

        // Initialize editing budgets
        const initialBudgets = schoolsRes.data.reduce((acc, school: School) => {
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

  // Filter schools based on current filter
  const filteredSchools = schools.filter((school) => {
    const original = school.maxBudget || 0;
    const edited = editingBudgets[school.schoolId] || 0;

    if (filter === "all") return true;
    if (filter === "changed") return original !== edited;
    if (filter === "increases") return edited > original;
    if (filter === "decreases") return edited < original;
    return true;
  });

  // Common quick add amounts
  const quickAddAmounts = [10000, 25000, 50000, 100000];

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setFilter("all")}
              className={
                filter === "all" ? "border-blue-500 text-blue-600" : ""
              }
            >
              <Filter className="w-4 h-4 mr-2" />
              All Schools
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setFilter("changed")}
            className={
              filter === "changed" ? "border-blue-500 text-blue-600" : ""
            }
          >
            Changed Only
          </Button>
          <Button
            variant="outline"
            onClick={() => setFilter("increases")}
            className={
              filter === "increases" ? "border-blue-500 text-blue-600" : ""
            }
          >
            Increases
          </Button>
          <Button
            variant="outline"
            onClick={() => setFilter("decreases")}
            className={
              filter === "decreases" ? "border-blue-500 text-blue-600" : ""
            }
          >
            Decreases
          </Button>
        </div>

        <div className="flex items-center gap-2">
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
            Reset All
          </Button>
          <Button variant="primary" onClick={saveBudgets} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save All Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Quick Add Amount Selector */}
      <div className="flex items-center gap-2">
        <p className="text-sm">Quick add amount:</p>
        {quickAddAmounts.map((amount) => (
          <Button
            key={amount}
            variant={quickAddAmount === amount ? "primary" : "outline"}
            size="sm"
            onClick={() => setQuickAddAmount(amount)}
          >
            +
            {amount.toLocaleString("en-PH", {
              style: "currency",
              currency: "PHP",
              maximumFractionDigits: 0,
            })}
          </Button>
        ))}
      </div>

      {/* School Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchools.map((school) => {
            const original = school.maxBudget || 0;
            const edited = editingBudgets[school.schoolId] || 0;
            const difference = edited - original;

            return (
              <div
                key={school.schoolId}
                className={`bg-white p-4 rounded-lg shadow border ${
                  difference > 0
                    ? "border-green-200"
                    : difference < 0
                    ? "border-red-200"
                    : "border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{school.schoolName}</h3>
                    <p className="text-sm text-gray-600">
                      ID: {school.schoolId}
                    </p>
                  </div>
                  {difference !== 0 && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        difference > 0
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {difference > 0 ? (
                        <ChevronUp className="inline w-4 h-4" />
                      ) : (
                        <ChevronDown className="inline w-4 h-4" />
                      )}
                      {Math.abs(difference).toLocaleString("en-PH", {
                        style: "currency",
                        currency: "PHP",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-600">Current</p>
                    <p className="font-medium">
                      {original.toLocaleString("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">New</p>
                    <p className="font-medium">
                      {edited.toLocaleString("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        quickAdjust(school.schoolId, -quickAddAmount)
                      }
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        quickAdjust(school.schoolId, quickAddAmount)
                      }
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      value={edited}
                      onChange={(e) =>
                        handleBudgetChange(
                          school.schoolId,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border rounded text-right"
                      min="0"
                      step="1000"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      ₱
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResourceAllocation;
