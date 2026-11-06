import React, { useState, useEffect, useMemo } from "react";
import { FaUserCheck } from "react-icons/fa";
import { useQuery } from "@tanstack/react-query";
import { getAllDisbursal } from "../../services/functions/disbursal";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import LeadRow from "../../Components/Table/LeadRow";
import TableHeader from "../../Components/Table/TableHeader";
import SearchField from "../../Components/Table/SearchField";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import { usePaginationState } from "../../hooks/usePaginationState";

const DisbursalLeadsWithErroBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Disbursed />
    </ErrorBoundary>
  );
};

const Disbursed = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);

  const {
    data: disbursedLeads,
    isPending: isLoadingLeads,
    error: leadError,
    refetch,
  } = useQuery({
    queryKey: ["all-disbursal", currentPage, itemsPerPage, searchQuery],
    queryFn: () =>
      getAllDisbursal({
        page: currentPage,
        limit: itemsPerPage,
        search_text: searchQuery,
      }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (disbursedLeads?.pagination?.currentPage) {
      syncWithApiResponse(disbursedLeads.pagination.currentPage);
    }
  }, [disbursedLeads?.pagination?.currentPage, syncWithApiResponse]);

  const data = useMemo(
    () => disbursedLeads?.data || disbursedLeads?.leads || [],
    [disbursedLeads]
  );

  const handleRowClick = (user) => {
    setExpandedRow(expandedRow === user.id ? null : user.id);
  };

  return (
    <div className="h-[89vh] overflow-hidden rounded-xl bg-slate-50">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white/80 shadow-lg shadow-gray-200 backdrop-blur-sm">
          <div className="flex-shrink-0 border-b border-slate-200 bg-white/70 p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/40 bg-brand/10">
                  <FaUserCheck className="h-5 w-5 text-brand-link" />
                </div>
                <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                  Disbursed Leads
                </h1>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                <div className="assigned-leads-search-wrap min-w-0 flex-1 sm:min-w-[360px] sm:max-w-[520px] sm:flex-none">
                  <SearchField
                    onSearch={(value) => {
                      setSearchQuery(value);
                    }}
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
                    Loading disbursed leads...
                  </p>
                </div>
              </div>
            ) : leadError ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {leadError?.message ||
                      "Failed to load disbursed leads. Please try again."}
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
                      showEmail={false}
                      data={data[0]}
                      showSource={true}
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
                          enableRowExpandOnClick={true}
                          isActionButtonNeeded={false}
                          showEmail={false}
                          isSelectButtonNeeded={false}
                          showSource={true}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={null}
                            mutateRejectBreRejectedLead={null}
                            isRejectionNeeded={false}
                            role=""
                            showReject={false}
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
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">
                    No disbursed leads found.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-2 py-2 sm:px-4">
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isLoading={isLoadingLeads}
              pagination={disbursedLeads?.pagination}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisbursalLeadsWithErroBoundary;
