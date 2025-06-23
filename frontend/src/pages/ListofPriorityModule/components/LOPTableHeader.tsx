import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { LOPSortableField, SortDirection } from "@/lib/types";

interface LOPTableHeaderProps {
  currentSort: { key: LOPSortableField; direction: SortDirection } | null;
  onRequestSort: (key: LOPSortableField) => void;
}

const LOPTableHeader: React.FC<LOPTableHeaderProps> = ({
  currentSort,
  onRequestSort,
}) => (
  <thead>
    <tr>
      <th></th>
      <th className="cursor-pointer" onClick={() => onRequestSort("LOPID")}>
        List of Priority ID
        <ChevronUp
          className={
            currentSort?.key === "LOPID" && currentSort.direction === "asc"
              ? "text-primary-500"
              : "text-gray-400"
          }
        />
        <ChevronDown
          className={
            currentSort?.key === "LOPID" && currentSort.direction === "desc"
              ? "text-primary-500"
              : "text-gray-400"
          }
        />
      </th>
      <th
        className="cursor-pointer"
        onClick={() => onRequestSort("expenseTitle")}
      >
        List of Priority Title
        <ChevronUp
          className={
            currentSort?.key === "expenseTitle" &&
            currentSort.direction === "asc"
              ? "text-primary-500"
              : "text-gray-400"
          }
        />
        <ChevronDown
          className={
            currentSort?.key === "expenseTitle" &&
            currentSort.direction === "desc"
              ? "text-primary-500"
              : "text-gray-400"
          }
        />
      </th>
      <th>Requirements</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
);

export default LOPTableHeader;
