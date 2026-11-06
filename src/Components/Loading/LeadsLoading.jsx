import React from "react";
import TableSkeleton from "../../utils/TableSkeleton";

const LeadsLoading = ({ isDarkMode }) => {
  return (
    <div
      className={`min-h-screen ${
        isDarkMode
          ? "bg-gradient-to-br from-brand-dark via-brand-dark-secondary to-brand-muted"
          : "bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200"
      } animate-gradient`}
    >
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <div
            className={`h-8 ${
              isDarkMode ? "bg-brand-dark-secondary" : "bg-gray-200"
            } rounded-lg w-48 animate-pulse`}
          ></div>
          <div
            className={`h-8 ${
              isDarkMode ? "bg-brand-dark-secondary" : "bg-gray-200"
            } rounded-lg w-32 animate-pulse`}
          ></div>
        </div>
        <TableSkeleton />
      </div>
    </div>
  );
};

export default LeadsLoading; 