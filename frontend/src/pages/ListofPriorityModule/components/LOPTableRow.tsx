import React from "react";
import { ListOfPriority } from "@/lib/types";
import Badge from "@/components/ui/badge/Badge";
import { SquarePenIcon, ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";

interface LOPTableRowProps {
  lop: ListOfPriority;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onEdit: (lop: ListOfPriority) => void;
  onArchive: (lop: ListOfPriority) => void;
  onView: (lop: ListOfPriority) => void;
}

const LOPTableRow: React.FC<LOPTableRowProps> = ({
  lop,
  isSelected,
  onSelect,
  onEdit,
  onArchive,
  onView,
}) => (
  <tr
    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
    onClick={() => onView(lop)}
  >
    <td>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation();
          onSelect(lop.LOPID);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </td>
    <td>{lop.LOPID}</td>
    <td>{lop.expenseTitle}</td>
    <td>
      <div className="flex flex-wrap gap-1">
        {lop.requirements?.slice(0, 3).map((req) => (
          <Badge key={req.requirementID} color="primary">
            {req.requirementTitle}
          </Badge>
        ))}
        {lop.requirements && lop.requirements.length > 3 && (
          <span className="ml-1 text-gray-500">...</span>
        )}
      </div>
    </td>
    <td>
      <Badge color={lop.is_active ? "success" : "error"}>
        {lop.is_active ? "Active" : "Archived"}
      </Badge>
    </td>
    <td>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(lop);
        }}
      >
        <SquarePenIcon />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onArchive(lop);
        }}
      >
        {lop.is_active ? <ArchiveIcon /> : <ArchiveRestoreIcon />}
      </button>
    </td>
  </tr>
);

export default LOPTableRow;
