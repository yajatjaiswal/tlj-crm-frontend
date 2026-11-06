import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAllCompletedLeads } from "../../services/functions/screener";
import toast from "react-hot-toast";
import Pagination from "../../Components/Pagination/Pagination";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import TableHeader from "../../Components/Table/TableHeader";
import { EmptyState, ErrorState } from "../../Components/ErrorStates/ErrorAndEmptyStates";
import LeadsLoading from "../../Components/Loading/LeadsLoading";
import TableHeading from "../../Components/Table/TableHeading";
import SearchField from "../../Components/Table/SearchField";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import { useDispatch } from "react-redux";
import { openDetailModal } from "../../redux/slices/detailModal";
import { usePaginationState } from "../../hooks/usePaginationState";
import { UserCircle } from "lucide-react";

// Error boundary wrapper component
const CompletedLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <CompletedLeads />
    </ErrorBoundary>
  );
};

const CompletedLeads = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Use pagination hook for stable pagination + session persistence.
  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);

  const { data: leadData, isPending: isLoadingLeads, error } = useQuery({
    queryKey: ["screener-completed-leads", currentPage, itemsPerPage],
    queryFn: () => getAllCompletedLeads(currentPage, itemsPerPage),
    staleTime: 0,
    gcTime: 0,
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to fetch completed leads");
    }
  });

  // Sync with API pagination current page when available.
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

  const filteredData = useMemo(() => {
    if (!leadData?.leads) return [];
    if (!searchQuery) return leadData.leads;

    try {
      const searchLower = searchQuery.toLowerCase();
      return leadData.leads.filter((row) => {
        return Object.entries(row).some(([key, value]) => {
          if (key === "selected" || key === "id") return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    } catch (error) {
      toast.error("Error filtering data:", error);
      return leadData.leads;
    }
  }, [leadData?.leads, searchQuery]);

  if (isLoadingLeads) {
    return <LeadsLoading />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!leadData?.leads || leadData.leads.length === 0) {
    return <EmptyState tableName={"Completed Leads"} />;
  }

  const handleRowClick = (row) => {
    setExpandedRow((prev) => (prev === row.id ? null : row.id));
  };

    const handleDetailsClick = (lead) => {
    if (Number(lead?.version) === 2 && lead?.pan) {
      const leadId = lead.lead_id || lead.id;
      navigate(`/sales-ops/completed/summary-data/${lead.pan}?leadId=${leadId}`);
      return;
    }

    // Completed leads: hide Reject in CustomerModal (details eye).
    dispatch(
      openDetailModal({
        row: lead,
        showReject: false,
        showApprove: true,
        role: "Screener",
      })
    );
  };

  return (
    <div className="h-[90vh] overflow-hidden rounded-xl bg-slate-50">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col">
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white/80 shadow-lg shadow-gray-200 backdrop-blur-sm overflow-hidden">
          <div className="flex-shrink-0 border-b border-slate-200 bg-white/70 p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-brand/10 border border-brand/40 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-brand-link" />
                </div>
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  Completed Leads
                </h1>
              </div>

              <div className="flex items-center gap-2 sm:justify-end w-full sm:w-auto">
                <div className="assigned-leads-search-wrap flex-1 sm:flex-none min-w-[320px] sm:min-w-[360px] sm:max-w-[520px]">
                  <SearchField
                    onSearch={(value) => setSearchQuery(value)}
                    defaultValue={searchQuery}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {isLoadingLeads ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">
                    Loading completed leads...
                  </p>
                </div>
              </div>
            ) : (error ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {error?.message || "Failed to fetch completed leads. Please try again."}
                  </p>
                </div>
              </div>
            ) : filteredData.length > 0 ? (
              <div className="h-full overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/70">
                    <TableHeader showStatus={true} />
                  </thead>
                  <tbody>
                    {filteredData.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={expandedRow}
                          selectedRows={new Set()}
                          loadingStates={{}}
                          handleRowClick={handleRowClick}
                          isActionButtonNeeded={false}
                          isSelectButtonNeeded={false}
                          onDetailsClick={handleDetailsClick}
                          showStatus={true}
                          enableRowExpandOnClick={true}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={null}
                            isRejectionNeeded={false}
                            showReject={false}
                            mutateRejectLead={null}
                            isUploadAddtionalDocumentNeeded={true}
                            isNCandNRNeeded={false}
                            role=""
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
                      No Completed Leads Found
                    </h3>
                    <p className="mt-2 text-base text-slate-600">
                      No leads match your current search.
                    </p>
                  </div>
                </div>
              </div>
            ))}
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

export default CompletedLeadsWithErrorBoundary;
