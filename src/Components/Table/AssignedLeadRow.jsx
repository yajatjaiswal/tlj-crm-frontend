import React from "react";
import { Check } from "lucide-react";

const AssignedLeadRow = ({
  row,
  isDarkMode,
  expandedRow,
  loadingStates,
  // isApproving,
  handleRowClick,
  toggleSelection,
  handleSingleApprove,
}) => {
  return (
    <tr
      className={`border-b ${isDarkMode ? 'border-brand/10 hover:bg-brand-dark/50' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-all duration-300
        ${expandedRow === row.id ? (isDarkMode ? 'bg-brand-dark/50' : 'bg-gray-50') : ''}`}
      onClick={() => handleRowClick(row)}
    >
      <td
        className="px-6 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-5 h-5 rounded-lg border cursor-pointer flex items-center justify-center transition-all duration-300
            ${
              row.selected
                ? `${isDarkMode ? 'bg-brand border-brand shadow-lg shadow-brand/20' : 'bg-brand border-brand-hover shadow-lg '}`
                : `${isDarkMode ? 'border-brand/50 hover:border-brand' : 'border-gray-300 hover:border-brand-hover'}`
            }`}
          onClick={() => toggleSelection(row.id)}
        >
          {row.selected && (
            <Check size={14} className="text-brand-dark" />
          )}
        </div>
      </td>
      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-white/90' : 'text-gray-900'} font-medium`}>{row.lead_no}</td>
      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-white/90' : 'text-gray-900'} font-medium`}>{row.full_name}</td>
      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-white/90' : 'text-gray-900'} font-medium`}>{row.mobile}</td>
      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-white/90' : 'text-gray-900'} font-medium`}>{row.pan}</td>
      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-white/90' : 'text-gray-900'} font-medium`}>{row.personal_email}</td>
      <td
        className="px-6 py-4 flex justify-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => handleSingleApprove(row, e)}
          disabled={loadingStates[row.id]}
          className={`px-4 py-2 text-sm ${isDarkMode ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-brand-hover text-white hover:bg-brand-hover'} rounded-lg transition-all duration-300 hover:scale-105 font-medium shadow-lg ${isDarkMode ? 'shadow-brand/20' : ''} cursor-pointer`}
        >
          {loadingStates[row.id] ? "Approving..." : "Approve"}
        </button>
        <button
          onClick={() => handleRowClick(row)}
          className={`px-4 py-2 text-sm ${isDarkMode ? 'bg-brand-dark/50 text-brand hover:bg-brand-dark' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'} rounded-lg transition-all duration-300 hover:scale-105 font-medium cursor-pointer`}
        >
          {expandedRow === row.id ? "Hide" : "Details"}
        </button>
      </td>
    </tr>
  );
};

export default AssignedLeadRow; 