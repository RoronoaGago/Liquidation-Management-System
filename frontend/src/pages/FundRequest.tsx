import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

const EXPENSES = [
  "Travelling Expense",
  "Internet Expense (Pocket Wifi)",
  "Training Expense",
  "Office/Other Supplies Expense (DBM)",
  "Training Expenses (GAD/INSET)",
  "Office/Other Supplies Expense (Outside DBM)",
  "Training Expenses (LAC Session)",
  "Fidelity Bond Premium",
  "Drugs and Medicines / Medical / Dental / Lab Supplies",
  "Electricity Expense",
  "Water Expense",
  "Mobile Expense",
  "Internet Expense (DSL/Globe)",
  "Security Services (Tanod/Non-Agency)",
  "Food Supplies Expense (Feeding)",
  "Security Services (Agency)",
  "Labor and Wages",
  "Janitorial Services (Non-Agency)",
  "Representation Expense",
  "Fuel, Oil, and Lubricants Expense",
  "Repair and Maintenance - B/SB/OE/FF/MV/OPPE",
  "Transportation and Delivery Expense (Hauling)",
];

const FundRequestPage = () => {
  const [selected, setSelected] = useState<{ [key: string]: string }>({});
  const [search, setSearch] = useState("");

  const handleCheck = (expense: string) => {
    setSelected((prev) => {
      if (expense in prev) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [expense]: _, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [expense]: "" };
      }
    });
  };

  const handleAmountChange = (expense: string, value: string) => {
    setSelected((prev) => ({ ...prev, [expense]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitted expenses:", selected);
    alert("Fund request submitted successfully!");
  };

  // Filter expenses based on search
  const filteredExpenses = EXPENSES.filter((expense) =>
    expense.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto rounded-2xl bg-white px-5 pb-5 pt-5 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <PageBreadcrumb pageTitle="Select List of Priorities" />

      <div className="mt-8">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-end mb-6">
            <input
              type="text"
              placeholder="Search expense..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 p-2 rounded-lg border transition-all border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 bg-white dark:bg-gray-800 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              style={{ minWidth: "140px" }}
            />
          </div>
          <div className="space-y-4">
            {filteredExpenses.length === 0 && (
              <div className="text-gray-500 text-center">
                No expenses found.
              </div>
            )}
            {filteredExpenses.map((expense) => (
              <div
                key={expense}
                className={`p-4 rounded-lg border transition-all ${
                  selected[expense] !== undefined
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={expense}
                      checked={selected[expense] !== undefined}
                      onChange={() => handleCheck(expense)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label
                      htmlFor={expense}
                      className="text-gray-700 dark:text-gray-300 font-medium"
                    >
                      {expense}
                    </label>
                  </div>

                  {selected[expense] !== undefined && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        ₱
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={selected[expense] || ""}
                        onChange={(e) =>
                          handleAmountChange(expense, e.target.value)
                        }
                        className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-800"
              disabled={Object.keys(selected).length === 0}
            >
              Submit Fund Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FundRequestPage;
