import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";

import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import Pagination from "../../Components/Pagination/Pagination";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import { getMyNotTakenReloanLeads } from "../../services/functions/screener";
import { usePaginationState } from "../../hooks/usePaginationState";

const AssignedNotTakenReloanLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AssignedNotTakenReloanLeads />
    </ErrorBoundary>
  );
};

const AssignedNotTakenReloanLeads = () => {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedRow, setExpandedRow] = useState(null);

  const getSearchStorageKey = () => {
    if (typeof window === "undefined") return null;
    return `search:${window.location.pathname}`;
  };

  const getInitialSearchQuery = () => {
    if (typeof window === "undefined") return "";
    const key = getSearchStorageKey();
    if (!key) return "";
    return window.sessionStorage.getItem(key) || "";
  };

  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);

  const { currentPage, setCurrentPage } = usePaginationState(1, searchQuery);

  const {
    data: leadData,
    isPending: isLoadingLeads,
    isError: isLeadError,
    error: leadError,
    refetch,
  } = useQuery({
    queryKey: ["my-not-taken-reloan-leads"],
    queryFn: getMyNotTakenReloanLeads,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

  const allLeads = useMemo(() => {
    if (Array.isArray(leadData?.data)) return leadData.data;
    if (Array.isArray(leadData?.leads)) return leadData.leads;
    if (Array.isArray(leadData)) return leadData;
    return [];
  }, [leadData]);

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allLeads;

    return allLeads.filter((lead) =>
      [
        lead.lead_no,
        lead.full_name,
        lead.pan,
        lead.mobile,
        lead.loan_no,
      ].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [allLeads, searchQuery]);

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const pagination = useMemo(
    () => ({
      totalItems: filteredLeads.length,
      totalPages: Math.max(Math.ceil(filteredLeads.length / itemsPerPage), 1),
      currentPage,
    }),
    [filteredLeads.length, currentPage, itemsPerPage]
  );

  const totalCount = leadData?.count ?? allLeads.length;
  const fromDate = leadData?.from_date;

  const handleRowClick = (lead) => {
    setExpandedRow(expandedRow === lead.id ? null : lead.id);
  };

  return (
    <div className="h-[89vh] overflow-hidden rounded-xl bg-slate-50">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white/80 shadow-lg shadow-gray-200 backdrop-blur-sm">
          <div className="flex-shrink-0 border-b border-slate-200 bg-white/70 p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/40 bg-brand/10">
                  <UserCheck className="h-5 w-5 text-brand-link" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                    Assigned Not Taken Reloan Leads
                  </h1>
                  <p className="text-xs text-slate-500">
                    {totalCount} lead{totalCount === 1 ? "" : "s"}
                    {fromDate ? ` · From ${fromDate}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                <div className="assigned-leads-search-wrap min-w-[280px] flex-1 sm:min-w-[320px] sm:max-w-[420px] sm:flex-none">
                  <SearchField
                    onSearch={(value) => setSearchQuery(value)}
                    defaultValue={searchQuery}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {isLoadingLeads ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">
                    Loading assigned not taken reloan leads...
                  </p>
                </div>
              </div>
            ) : isLeadError || leadError ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {leadError?.message ||
                      "Failed to load assigned not taken reloan leads. Please try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-3 inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : paginatedLeads.length > 0 ? (
              <div className="h-full overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[1060px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/70">
                    <TableHeader
                      hideSelectColumn={true}
                      showLoanNo={true}
                      showDateReceived={true}
                      showActions={false}
                    />
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead, index) => (
                      <LeadRow
                        key={lead.id || lead.lead_no || lead.pan || index}
                        row={lead}
                        expandedRow={expandedRow}
                        selectedRows={new Set()}
                        loadingStates={{}}
                        handleRowClick={handleRowClick}
                        enableRowExpandOnClick={false}
                        isActionButtonNeeded={false}
                        isSelectButtonNeeded={false}
                        toggleSelection={() => {}}
                        handleSingleAction={() => {}}
                        modalButtonText="Assign"
                        showLoanNo={true}
                        showDateReceived={true}
                        showCopyMobile={true}
                        showCopyLoanNo={true}
                        isDetailedViewNeeded={false}
                        showActions={false}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4">
                  <div className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50/70 p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
                      <UserCheck className="h-8 w-8 text-brand-link" />
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-800">
                      {searchQuery.trim()
                        ? "No Matching Leads Found"
                        : "No Assigned Not Taken Reloan Leads Found"}
                    </h3>
                    <p className="mt-2 text-base text-slate-600">
                      {searchQuery.trim()
                        ? "Try adjusting your search terms."
                        : "You have no assigned not taken reloan leads to display."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-2 py-2 sm:px-4">
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isLoading={isLoadingLeads}
              pagination={pagination}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignedNotTakenReloanLeadsWithErrorBoundary;
