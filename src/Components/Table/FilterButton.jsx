import React from "react";
import { Filter } from "lucide-react";

const FilterButton = ({ onFilter, className = "", children = "", hasActiveFilter = false }) => {
  return (
    <button
      className={`inline-flex items-center p-2 border rounded-xl shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand ${
        hasActiveFilter 
          ? "border-brand bg-brand-light text-brand hover:bg-brand-extra-light" 
          : "border-gray-300 bg-white text-brand-dark hover:bg-gray-50"
      } ${className}`}
      onClick={onFilter}
    >
      <Filter className="w-4 h-4" />
      {children}
    </button>
  );
};

export default FilterButton;
