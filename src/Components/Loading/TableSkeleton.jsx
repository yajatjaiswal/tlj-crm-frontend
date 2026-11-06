import React from 'react';

const TableSkeleton = ({ isDarkMode }) => {
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#1a103c]' : 'bg-gray-50'} p-10`}>
      <div className="mx-auto">
        {/* Header Skeleton */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`h-8 w-48 rounded-lg ${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-200'} animate-pulse`}></div>
          </div>
          <div className="flex gap-4">
            <div className={`h-10 w-32 rounded-lg ${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-200'} animate-pulse`}></div>
            <div className={`h-10 w-40 rounded-lg ${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-200'} animate-pulse`}></div>
          </div>
        </div>

        {/* Table Container */}
        <div className={`rounded-lg shadow-sm border ${isDarkMode ? 'border-gray-700 bg-[#1a103c]' : 'border-gray-200 bg-white'}`}>
          {/* Search Bar Skeleton */}
          <div className="p-4 border-b border-gray-200">
            <div className={`h-10 w-full rounded-lg ${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-200'} animate-pulse`}></div>
          </div>

          {/* Table Skeleton */}
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header Skeleton */}
              <thead>
                <tr className={`${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-50'}`}>
                  {[...Array(8)].map((_, index) => (
                    <th key={index} className="px-6 py-3">
                      <div className={`h-4 rounded ${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-200'} animate-pulse`}></div>
                    </th>
                  ))}
                </tr>
              </thead>
              {/* Table Body Skeleton */}
              <tbody>
                {[...Array(5)].map((_, rowIndex) => (
                  <tr key={rowIndex} className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    {[...Array(8)].map((_, colIndex) => (
                      <td key={colIndex} className="px-6 py-4">
                        <div className={`h-4 rounded ${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-200'} animate-pulse`}></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Skeleton */}
          <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
            <div className={`h-8 w-24 rounded ${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-200'} animate-pulse`}></div>
            <div className="flex gap-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className={`h-8 w-8 rounded ${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-200'} animate-pulse`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton; 