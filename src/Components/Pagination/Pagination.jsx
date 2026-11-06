// src/components/Pagination/Pagination.jsx
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const Pagination = ({
  currentPage,
  setCurrentPage,
  isLoading,
  pagination,
  itemsPerPage,
  setItemsPerPage,
}) => {
  const selectedRole = useSelector((state) => state.user.selectedRole);
  const isQualityCheckerRole =
    String(selectedRole || "").toLowerCase() === "quality-checker" ||
    (typeof window !== "undefined" &&
      window.location.pathname.toLowerCase().includes("/quality-checker"));
  const totalItems = Number(pagination?.totalItems || 0);
  const totalPages = Math.max(Number(pagination?.totalPages || 1), 1);
  const safeCurrentPage = Math.min(Math.max(Number(currentPage || 1), 1), totalPages);

  // If persisted page is now out of range for current dataset, bring it back in range.
  useEffect(() => {
    if (!isLoading && currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage, isLoading, setCurrentPage]);

  const rangeStart = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(safeCurrentPage * itemsPerPage, totalItems);

  const pageSizeOptions = PAGE_SIZE_OPTIONS.includes(Number(itemsPerPage))
    ? PAGE_SIZE_OPTIONS
    : [Number(itemsPerPage), ...PAGE_SIZE_OPTIONS].sort((a, b) => a - b);

  const handleItemsPerPageChange = (event) => {
    if (!setItemsPerPage || isLoading) return;
    const nextSize = Number(event.target.value);
    if (!nextSize || nextSize === Number(itemsPerPage)) return;
    setItemsPerPage(nextSize);
    setCurrentPage(1);
  };

  // Function to get visible page numbers based on screen size
  const getVisiblePageNumbers = () => {
    const isMobile = window.innerWidth < 640; // sm breakpoint
    const maxVisiblePages = isMobile ? 3 : 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= Math.ceil(maxVisiblePages / 2)) {
      return Array.from({ length: maxVisiblePages }, (_, i) => i + 1);
    }

    if (safeCurrentPage >= totalPages - Math.floor(maxVisiblePages / 2)) {
      return Array.from(
        { length: maxVisiblePages },
        (_, i) => totalPages - maxVisiblePages + i + 1
      );
    }

    return Array.from(
      { length: maxVisiblePages },
      (_, i) => safeCurrentPage - Math.floor(maxVisiblePages / 2) + i
    );
  };

  // Handle page change with validation
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && !isLoading) {
      setCurrentPage(newPage);
    }
  };

  // Handle previous page
  const handlePreviousPage = () => {
    if (safeCurrentPage > 1 && !isLoading) {
      handlePageChange(safeCurrentPage - 1);
    }
  };

  // Handle first page
  const handleFirstPage = () => {
    if (safeCurrentPage > 1 && !isLoading) {
      handlePageChange(1);
    }
  };

  // Handle next page
  const handleNextPage = () => {
    if (safeCurrentPage < totalPages && !isLoading) {
      handlePageChange(safeCurrentPage + 1);
    }
  };

  // Handle last page
  const handleLastPage = () => {
    if (safeCurrentPage < totalPages && !isLoading) {
      handlePageChange(totalPages);
    }
  };

  const pageButtonClass =
    "h-8 rounded-xl border text-[11px] sm:text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 disabled:opacity-45 disabled:cursor-not-allowed";

  return (
    <div className="rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-brand-dark">
          <span>
            Showing{" "}
            {rangeStart}{" "}
            to{" "}
            {rangeEnd}{" "}
            of {totalItems} entries
          </span>
          {typeof setItemsPerPage === "function" ? (
            <>
              <span className="hidden sm:inline text-gray-300">|</span>
              <label className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-slate-500">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  disabled={isLoading}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs sm:text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 disabled:opacity-45 disabled:cursor-not-allowed"
                  aria-label="Items per page"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span className="text-slate-500">per page</span>
              </label>
            </>
          ) : null}
          <span className="hidden sm:inline text-gray-300">|</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] sm:text-xs font-medium text-red-700 border border-red-100 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
            11-15 days & 35+ tenure
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-2 py-0.5 text-[11px] sm:text-xs font-medium text-white border border-brand-dark whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-brand-mark" aria-hidden="true" />
            Fraud
          </span>
          {!isQualityCheckerRole ? (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] sm:text-xs font-medium text-orange-600 line-through decoration-orange-600 border border-orange-200 whitespace-nowrap">
              Location suspicious
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-1.5">
          <button
            onClick={handleFirstPage}
            disabled={safeCurrentPage === 1 || isLoading}
            className={`${pageButtonClass} px-2.5 border-slate-200 bg-white text-brand-dark hover:bg-brand-light hover:border-brand/40`}
            aria-label="First page"
          >
            First
          </button>

          <button
            onClick={handlePreviousPage}
            disabled={safeCurrentPage === 1 || isLoading}
            className={`${pageButtonClass} w-8 p-0 border-slate-200 bg-white text-brand-dark hover:bg-brand-light hover:border-brand/40`}
            aria-label="Previous page"
          >
            <ChevronLeft className="mx-auto" size={16} />
          </button>

          {getVisiblePageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`${pageButtonClass} min-w-[32px] px-2 text-xs sm:text-sm ${
                safeCurrentPage === pageNum
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-white text-brand-dark border-slate-200 hover:bg-brand-light hover:border-brand/40"
              }`}
              disabled={isLoading}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={handleNextPage}
            disabled={
              safeCurrentPage === totalPages ||
              isLoading
            }
            className={`${pageButtonClass} w-8 p-0 border-slate-200 bg-white text-brand-dark hover:bg-brand-light hover:border-brand/40`}
            aria-label="Next page"
          >
            <ChevronRight className="mx-auto" size={16} />
          </button>

          <button
            onClick={handleLastPage}
            disabled={safeCurrentPage === totalPages || isLoading}
            className={`${pageButtonClass} px-2.5 border-slate-200 bg-white text-brand-dark hover:bg-brand-light hover:border-brand/40`}
            aria-label="Last page"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;