import { useState, useRef, useEffect, useId, useCallback } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string;
}

export interface CustomSelectProps<T extends string = string> {
  id?: string;
  testId?: string;
  ariaLabel?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  align?: "left" | "center" | "right";
}

export default function CustomSelect<T extends string = string>({
  id,
  testId,
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  className = "",
  triggerClassName = "",
  align = "center",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);

  const reactId = useId();
  const selectId = id || `select-${reactId}`;
  const listboxId = `listbox-${selectId}`;

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keep highlighted index in sync when opening
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  const selectOption = useCallback(
    (optionValue: T) => {
      onChange(optionValue);
      setIsOpen(false);
      triggerRef.current?.focus();
      // Dispatch synthetic event to native select for DOM consistency
      if (nativeSelectRef.current) {
        nativeSelectRef.current.value = optionValue;
        nativeSelectRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[highlightedIndex]) {
          selectOption(options[highlightedIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native select for form and automated test integration (Playwright selectOption) */}
      <select
        ref={nativeSelectRef}
        id={selectId}
        data-testid={testId}
        aria-hidden="true"
        tabIndex={-1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`group relative flex h-[50px] items-center justify-between rounded-[8px] border bg-tsurface px-3.5 sm:px-4 text-[0.875rem] sm:text-[1rem] font-medium text-tink2 transition-all duration-150 outline-none select-none cursor-pointer hover:border-taccent hover:bg-tsurface2 focus:border-taccent focus:ring-2 focus:ring-taccent/20 disabled:cursor-not-allowed disabled:opacity-60 ${
          isOpen ? "border-taccent ring-2 ring-taccent/20 shadow-xs" : "border-tinputline"
        } ${triggerClassName}`}
      >
        <span
          className={`flex-1 truncate capitalize tracking-tight ${
            align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
          }`}
        >
          {selectedOption ? selectedOption.label : value}
        </span>
        <CaretDown
          size={16}
          weight="bold"
          className={`ml-2 shrink-0 text-tmuted transition-transform duration-200 group-hover:text-taccent ${
            isOpen ? "rotate-180 text-taccent" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Floating Animated Dropdown Menu */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          className={`absolute z-50 mt-1.5 min-w-full w-max max-w-[240px] overflow-hidden rounded-[10px] border border-tlinesoft bg-tsurface py-1.5 shadow-xl transition-all duration-150 animate-in fade-in-0 zoom-in-95 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((option, idx) => {
            const isSelected = option.value === value;
            const isHighlighted = idx === highlightedIndex;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectOption(option.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`relative flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.875rem] sm:text-[0.9375rem] capitalize cursor-pointer transition-colors select-none ${
                  isSelected
                    ? "bg-tselbg font-semibold text-tseltext"
                    : isHighlighted
                      ? "bg-tselhover text-tink2"
                      : "text-toptiontext"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span>{option.label}</span>
                  {option.badge && (
                    <span className="rounded-full bg-tbadgebg px-1.5 py-0.5 text-[0.6875rem] font-medium text-tbadgetext">
                      {option.badge}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check
                    size={16}
                    weight="bold"
                    className="shrink-0 text-taccent"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
