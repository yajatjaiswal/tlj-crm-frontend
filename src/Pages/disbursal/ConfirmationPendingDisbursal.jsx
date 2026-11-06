import React, { useState, useEffect, useMemo } from "react";
import { CreditCard, Download } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  exportPendingManualDisbursal,
  getPendingManualDisbursal,
} from "../../services/functions/disbursal";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import LeadRow from "../../Components/Table/LeadRow";
import TableHeader from "../../Components/Table/TableHeader";
import SearchField from "../../Components/Table/SearchField";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import { usePaginationState } from "../../hooks/usePaginationState";

const ConfirmationPendingDisbursalWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <ConfirmationPendingDisbursal />
    </ErrorBoundary>
  );
};

const ConfirmationPendingDisbursal = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);

  const {
    data: pendingDisbursalLeads,
    isPending: isLoadingLeads,
    error: leadError,
    refetch,
  } = useQuery({
    queryKey: ["pending-manual-disbursal", currentPage, itemsPerPage, searchQuery],
    queryFn: () =>
      getPendingManualDisbursal({
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
    if (pendingDisbursalLeads?.pagination?.currentPage) {
      syncWithApiResponse(pendingDisbursalLeads.pagination.currentPage);
    }
  }, [pendingDisbursalLeads?.pagination?.currentPage, syncWithApiResponse]);

  useEffect(() => {
    setSelectedRows(new Set());
  }, [currentPage, searchQuery]);

  const data = useMemo(
    () => pendingDisbursalLeads?.data || pendingDisbursalLeads?.leads || [],
    [pendingDisbursalLeads]
  );

  const { mutate: exportLeads, isPending: isExporting } = useMutation({
    mutationFn: exportPendingManualDisbursal,
    onSuccess: () => {
      toast.success("IMPS export downloaded successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to export pending disbursal");
    },
  });

  const handleRowClick = (user) => {
    setExpandedRow(expandedRow === user.id ? null : user.id);
  };

  const toggleSelection = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    const selectedLeads =
      selectedRows.size > 0
        ? data.filter((row) => selectedRows.has(row.id))
        : data;

    const loanNos = selectedLeads
      .map((row) => row.loan_no)
      .filter(Boolean);

    if (loanNos.length === 0) {
      toast.error(
        selectedRows.size > 0
          ? "Selected leads do not have loan numbers"
          : "No loan numbers available to export"
      );
      return;
    }

    exportLeads(loanNos);
  };

  return (
    <div className="h-[89vh] overflow-hidden rounded-xl bg-slate-50">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white/80 shadow-lg shadow-gray-200 backdrop-blur-sm">
          <div className="flex-shrink-0 border-b border-slate-200 bg-white/70 p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/40 bg-brand/10">
                  <CreditCard className="h-5 w-5 text-brand-link" />
                </div>
                <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                  Confirmation Pending Disbursal
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
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting || isLoadingLeads || data.length === 0}
                  className="inline-flex h-8.5 flex-shrink-0 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {isExporting
                    ? "Exporting..."
                    : selectedRows.size > 0
                      ? `Export (${selectedRows.size})`
                      : "Export"}
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {isLoadingLeads ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">
                    Loading confirmation pending disbursal leads...
                  </p>
                </div>
              </div>
            ) : leadError ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {leadError?.message ||
                      "Failed to load confirmation pending disbursal leads. Please try again."}
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
                      showEmail={false}
                      data={data[0]}
                      showSource={true}
                      showSelectColumn
                    />
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={expandedRow}
                          selectedRows={selectedRows}
                          loadingStates={{}}
                          handleRowClick={handleRowClick}
                          enableRowExpandOnClick={true}
                          isActionButtonNeeded={false}
                          showStatus={true}
                          showEmail={false}
                          isManualDisbursal={true}
                          isSelectButtonNeeded={true}
                          toggleSelection={toggleSelection}
                          showSource={true}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={null}
                            isNCandNRNeeded={true}
                            mutateRejectBreRejectedLead={null}
                            isRejectionNeeded={false}
                            role=""
                            showReject={false}
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
                    No confirmation pending disbursal leads found.
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
              pagination={pendingDisbursalLeads?.pagination}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPendingDisbursalWithErrorBoundary;
