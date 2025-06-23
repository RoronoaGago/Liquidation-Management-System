import { useState, useRef } from "react";

export function useLOPSearch(initial = "") {
  const [searchTerm, setSearchTerm] = useState(initial);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (
    value: string,
    setFilterOptions: (v: string) => void
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setFilterOptions(value);
    }, 400);
  };

  return {
    searchTerm,
    setSearchTerm,
    handleSearchChange,
  };
}

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
