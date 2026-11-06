const TableSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 ">
      {/* Search Bar Skeleton */}
      <div className="p-4 border-b border-gray-200">
        <div className="h-10 bg-gray-200 rounded-lg w-full animate-pulse"></div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr className="border-b border-gray-200">
              {/* Checkbox column */}
              <th className="px-4 py-3 w-[5%]">
                <div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div>
              </th>
              {/* Other columns */}
              {[...Array(6)].map((_, index) => (
                <th key={index} className="px-4 py-3 w-[14%]">
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </th>
              ))}
              {/* Action column */}
              <th className="px-4 py-3 w-[11%]">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-100">
                {/* Checkbox cell */}
                <td className="px-4 py-3 w-[5%]">
                  <div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div>
                </td>
                {/* Data cells */}
                {[...Array(6)].map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3 w-[14%]">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  </td>
                ))}
                {/* Action button cell */}
                <td className="px-4 py-3 w-[11%]">
                  <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Skeleton */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="flex gap-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TableSkeleton;