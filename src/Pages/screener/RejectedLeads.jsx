import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { UserCircle } from "lucide-react";

import { getAllRejectedLeads } from "../../services/functions/screener";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import { usePaginationState } from "../../hooks/usePaginationState";
import { openDetailModal } from "../../redux/slices/detailModal";

// Error boundary wrapper component
const RejectedLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <RejectedLeads />
    </ErrorBoundary>
  );
};

function RejectedLeads() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [expandedRow, setExpandedRow] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);

  const {
    data: leadData,
    isPending: isLoadingLeads,
    isError: isLeadError,
    error: leadError,
    refetch,
  } = useQuery({
    queryKey: ["screener-rejected-leads", currentPage, itemsPerPage, searchQuery],
    queryFn: () => getAllRejectedLeads(currentPage, itemsPerPage, searchQuery),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (leadData?.pagination?.currentPage) {
      syncWithApiResponse(leadData.pagination.currentPage);
    }
  }, [leadData?.pagination?.currentPage, syncWithApiResponse]);

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

  const data = useMemo(() => leadData?.leads || [], [leadData]);

  const handleRowClick = (user) => {
    setExpandedRow(expandedRow === user.id ? null : user.id);
  };

    const handleDetailsClick = (lead) => {
    if (Number(lead?.version) === 2 && lead?.pan) {
      const leadId = lead.lead_id || lead.id;
      navigate(`/sales-ops/rejected/summary-data/${lead.pan}?leadId=${leadId}`);
      return;
    }

    dispatch(
      openDetailModal({
        row: lead,
        showReject: false,
        showApprove: false,
        role: "Screener",
      })
    );
  };

  return (
    <div className="h-[89vh] overflow-hidden rounded-xl bg-slate-50">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white/80 shadow-lg shadow-gray-200 backdrop-blur-sm">
          <div className="flex-shrink-0 border-b border-slate-200 bg-white/70 p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/40 bg-brand/10">
                  <UserCircle className="h-5 w-5 text-brand-link" />
                </div>
                <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                  Rejected Leads
                </h1>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                <div className="assigned-leads-search-wrap min-w-[320px] flex-1 sm:min-w-[360px] sm:max-w-[520px] sm:flex-none">
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
                    Loading rejected leads...
                  </p>
                </div>
              </div>
            ) : isLeadError || leadError ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {leadError?.message ||
                      "Failed to load rejected leads. Please try again."}
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
            ) : data.length > 0 ? (
              <div className="h-full overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/70">
                    <TableHeader
                      showStatus={true}
                      showCommentColumn={true}
                    />
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={expandedRow}
                          selectedRows={new Set()}
                          loadingStates={{}}
                          handleRowClick={handleRowClick}
                          onDetailsClick={handleDetailsClick}
                          enableRowExpandOnClick={true}
                          isActionButtonNeeded={false}
                          isSelectButtonNeeded={false}
                          showStatus={true}
                          showCommentColumn={true}
                          isDetailedViewNeeded={true}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={null}
                            loadingState={{}}
                            mutateRejectLead={null}
                            isRejectionNeeded={false}
                            role=""
                            showReject={false}
                            isLeadRejected={true}
                            isUploadAddtionalDocumentNeeded={true}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4">
                  <div className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50/70 p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
                      <UserCircle className="h-8 w-8 text-brand-link" />
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-800">
                      No Rejected Leads Found
                    </h3>
                    <p className="mt-2 text-base text-slate-600">
                      There are currently no rejected leads to display.
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
              pagination={leadData?.pagination}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RejectedLeadsWithErrorBoundary;
