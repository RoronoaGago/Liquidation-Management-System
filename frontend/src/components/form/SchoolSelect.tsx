// src/components/form/SchoolSelect.tsx
import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Label,
} from "@headlessui/react";
import { searchSchools } from "@/services/SchoolApi";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { School } from "@/lib/types";

interface SchoolSelectProps {
  value: number | School | null;
  onChange: (value: number | null) => void;
  required?: boolean;
  error?: string | undefined;
}

export default function SchoolSelect({
  value,
  onChange,
  required = false,
  error,
}: SchoolSelectProps) {
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      setIsLoading(true);
      const timer = setTimeout(async () => {
        const results = await searchSchools(query);
        setSchools(results);
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSchools([]);
    }
  }, [query]);

  // Set selectedSchool based on value (ID or School object)
  useEffect(() => {
    if (typeof value === "object" && value !== null) {
      setSelectedSchool(value);
    } else if (typeof value === "number" && schools.length > 0) {
      const found = schools.find((s) => Number(s.schoolId) === value);
      setSelectedSchool(found || null);
    } else {
      setSelectedSchool(null);
    }
  }, [value, schools]);

  const handleChange = (school: School | null) => {
    setSelectedSchool(school);
    onChange(school ? Number(school.schoolId) : null);
  };

  return (
    <div className="space-y-2">
      <Combobox as="div" value={selectedSchool} onChange={handleChange}>
        <Label className="block text-base font-medium text-gray-700 dark:text-gray-300">
          School {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative mt-1">
          <ComboboxInput
            className="h-11 appearance-none px-4  placeholder:text-gray-400  dark:bg-gray-900  dark:placeholder:text-white/30 w-full py-2 pl-3 pr-10 shadow-sm  focus:outline-none sm:text-sm  p-3.5 border-2 rounded-lg focus:ring-2  text-base bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
            onChange={(event) => setQuery(event.target.value)}
            displayValue={(school: School) => school?.schoolName || ""}
            placeholder="Search for a school..."
          />
          <ComboboxButton className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
            <ChevronsUpDownIcon className="size-5" />
          </ComboboxButton>

          <ComboboxOptions
            as="div"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border-2 border-gray-200 bg-white py-1 text-base shadow-lg focus:outline-none dark:border-gray-700 dark:bg-gray-800 custom-scrollbar"
          >
            {isLoading && query.length > 2 ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                Searching...
              </div>
            ) : schools.length > 0 ? (
              schools.map((school) => (
                <ComboboxOption
                  key={school.schoolId}
                  value={school}
                  className={({ focus }) =>
                    `relative cursor-pointer select-none px-4 py-2.5 ${
                      focus
                        ? "bg-brand-100 text-gray-900 dark:bg-brand-900 dark:text-white"
                        : "text-gray-900 dark:text-gray-200"
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <div className="flex items-center justify-between">
                        <span
                          className={`block truncate ${
                            selected ? "font-semibold" : "font-normal"
                          }`}
                        >
                          {school.schoolName}
                        </span>
                        {selected && (
                          <span className="flex items-center text-brand-600 dark:text-brand-400">
                            <CheckIcon className="size-5" />
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-xs ${"text-gray-500 dark:text-gray-400"}`}
                      >
                        {school.district.districtName}, {school.municipality}
                      </div>
                    </>
                  )}
                </ComboboxOption>
              ))
            ) : query.length > 2 ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                No schools found
              </div>
            ) : null}
          </ComboboxOptions>
        </div>
      </Combobox>
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
