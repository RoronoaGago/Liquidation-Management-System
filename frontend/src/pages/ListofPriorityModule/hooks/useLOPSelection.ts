import { useState } from "react";

export function useLOPSelection<T extends { LOPID: number }>() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const toggleSelectAll = (currentItems: T[]) => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentItems.map((item) => item.LOPID));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isSelected = (id: number) => selectedIds.includes(id);

  return {
    selectedIds,
    setSelectedIds,
    selectAll,
    setSelectAll,
    toggleSelectAll,
    toggleSelect,
    isSelected,
  };
}
