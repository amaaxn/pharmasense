import { useState, useCallback, useRef, useEffect } from "react";
import { Input, Avatar } from "../../shared";
import { searchPatients, type Patient } from "../../api/patients";

export interface PatientSearchBarProps {
  onSelect: (patient: Patient) => void;
  selectedPatient: Patient | null;
  onClear: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export function PatientSearchBar({
  onSelect,
  selectedPatient,
  onClear,
}: PatientSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = "patient-search-results";

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    searchPatients(debouncedQuery)
      .then((data) => {
        setResults(data);
        setIsOpen(data.length > 0);
        setActiveIndex(-1);
      })
      .catch(() => setResults([]))
      .finally(() => setIsSearching(false));
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (patient: Patient) => {
      onSelect(patient);
      setQuery("");
      setResults([]);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1,
          );
          break;
        case "Enter": {
          e.preventDefault();
          const selected = results[activeIndex];
          if (activeIndex >= 0 && selected) {
            handleSelect(selected);
          }
          break;
        }
        case "Escape":
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, results, activeIndex, handleSelect],
  );

  if (selectedPatient) {
    return (
      <SelectedPatientChip patient={selectedPatient} onClear={onClear} />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        icon={<SearchIcon />}
        placeholder="Search patients by name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `patient-option-${activeIndex}` : undefined
        }
        autoComplete="off"
      />
      {isSearching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-purple border-t-transparent" />
        </div>
      )}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border-default bg-bg-card shadow-modal"
        >
          {results.map((patient, idx) => (
            <li
              key={patient.patientId}
              id={`patient-option-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className={[
                "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors",
                idx === activeIndex
                  ? "bg-bg-elevated"
                  : "hover:bg-bg-elevated",
              ].join(" ")}
              onClick={() => handleSelect(patient)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <Avatar
                fallback={`${patient.firstName} ${patient.lastName}`}
                size="sm"
              />
              <span className="flex-1 text-sm font-medium text-text-primary">
                {patient.firstName} {patient.lastName}
              </span>
              {patient.allergies.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-red/15 px-2 py-0.5 text-xs font-medium text-accent-red">
                  ⚠ {patient.allergies.length}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SelectedPatientChip({
  patient,
  onClear,
}: {
  patient: Patient;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-accent-purple/30 bg-accent-purple/5 px-4 py-3">
      <Avatar
        fallback={`${patient.firstName} ${patient.lastName}`}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-heading">
          {patient.firstName} {patient.lastName}
        </p>
        {patient.allergies.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {patient.allergies.map((allergy) => (
              <span
                key={allergy}
                className="inline-flex rounded-full bg-accent-red/15 px-2 py-0.5 text-xs font-medium text-accent-red"
              >
                {allergy}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded p-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        aria-label="Clear patient selection"
      >
        ✕
      </button>
    </div>
  );
}
