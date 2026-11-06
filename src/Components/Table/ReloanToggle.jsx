import React from "react";
import { Repeat } from "lucide-react";

const ReloanToggle = ({
  checked = false,
  onToggle,
  disabled = false,
  show = true,
  label = "Reloan",
  className = "",
}) => {
  if (!show) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-checked={checked}
      role="switch"
      className={[
        "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm border transition-all duration-150 select-none",
        disabled
          ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-500"
          : checked
            ? "bg-brand text-white border-transparent shadow-sm shadow-brand/25 hover:bg-brand-hover hover:shadow-md"
            : "bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-brand hover:shadow-sm hover:shadow-brand/10",
        className,
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-4.5 w-4.5 items-center justify-center rounded-md",
          checked ? "bg-brand-dark/10" : "bg-brand-light",
        ].join(" ")}
      >
        <Repeat
          size={14}
          className={checked ? "text-brand-dark" : "text-brand-link"}
          aria-hidden="true"
        />
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
};

export default ReloanToggle;
