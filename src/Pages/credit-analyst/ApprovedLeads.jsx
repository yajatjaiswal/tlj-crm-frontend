import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { getBreRejectedApprovedLeads } from "../../services/functions/credit-analyst";
import { useQuery } from "@tanstack/react-query";
import Pagination from "../../Components/Pagination/Pagination";
import LeadRow from "../../Components/Table/LeadRow";
import TableHeader from "../../Components/Table/TableHeader";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import SearchField from "../../Components/Table/SearchField";
import FilterModal from "../../Components/Modals/FilterModal";
import { getStatusOptions } from "../../utils/statusOptions";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import { usePaginationState } from "../../hooks/usePaginationState";
import { UserCircle } from "lucide-react";
import { openDetailModal } from "../../redux/slices/detailModal";

// Error boundary wrapper component
const ApprovedBreRejectedLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <ApprovedLeads />
    </ErrorBoundary>
  );
};

const ApprovedLeads = () => {
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
  const [error, setError] = useState("");

  // Filter states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [source, setSource] = useState(null);
  const [loanAmount, setLoanAmount] = useState(null);
  const [status, setStatus] = useState(null);

  const hasHydratedFiltersRef = useRef(false);
  const getFiltersStorageKey = () => {
    if (typeof window === "undefined") return null;
    return `filters:${window.location.pathname}`;
  };

  // Hydrate filters so they persist after full page view navigation.
  useEffect(() => {
    const key = getFiltersStorageKey();
    if (!key) {
      hasHydratedFiltersRef.current = true;
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setActiveFilter(parsed?.activeFilter || []);
      setEmployeeId(parsed?.employeeId ?? null);
      setSource(parsed?.source ?? null);
      setLoanAmount(parsed?.loanAmount ?? null);
      setStatus(parsed?.status ?? null);
    } catch (e) {
      // ignore corrupted storage
    } finally {
      hasHydratedFiltersRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedFiltersRef.current) return;
    const key = getFiltersStorageKey();
    if (!key) return;
    const payload = {
      activeFilter,
      employeeId,
      source,
      loanAmount,
      status,
    };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  }, [activeFilter, employeeId, source, loanAmount, status]);

  // Use pagination hook for stable pagination
  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);

  const {
    data: breRejectedApprovedLeads,
    isPending: isLoading,
    error: apiError,
    refetch,
  } = useQuery({
    queryKey: [
      "approved-leads",
      currentPage,
      itemsPerPage,
      searchQuery,
      employeeId,
      source,
      loanAmount,
      status,
    ],
    queryFn: () =>
      getBreRejectedApprovedLeads({
        page: currentPage,
        limit: itemsPerPage,
        search_text: searchQuery || undefined,
        employee_id: employeeId,
        source: source,
        loan_amount: loanAmount,
        lead_stage: status,
      }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      setError(
        error.message ||
          "Failed to fetch approved leads. Please try again later."
      );
    },
  });

  // Sync current page with API pagination when available
  useEffect(() => {
    if (breRejectedApprovedLeads?.pagination?.currentPage) {
      syncWithApiResponse(breRejectedApprovedLeads.pagination.currentPage);
    }
  }, [breRejectedApprovedLeads?.pagination?.currentPage, syncWithApiResponse]);

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

  const filteredData = useMemo(() => {
    try {
      if (!breRejectedApprovedLeads?.leads) return [];
      return breRejectedApprovedLeads.leads;
    } catch (err) {
      console.error("Error in data filtering:", err);
      setError("Error occurred while filtering data. Please try again.");
      return breRejectedApprovedLeads?.leads || [];
    }
  }, [breRejectedApprovedLeads?.leads]);

  const handleRowClick = (user) => {
    try {
      setExpandedRow(expandedRow === user.id ? null : user.id);
    } catch (error) {
      console.error("Error handling row click:", error);
    }
  };

    const handleDetailsClick = (lead) => {
    if (Number(lead?.version) === 2 && lead?.pan) {
      const leadId = lead.lead_id || lead.id;
      navigate(
        `/credit-analyst/approved-application/summary-data/${lead.pan}?leadId=${leadId}`
      );
      return;
    }

    dispatch(
      openDetailModal({
        row: lead,
        showReject: false,
        showApprove: false,
        role: "Credit-Analyst",
      })
    );
  };

  // Filter handlers
  const handleFilterApply = (filters) => {
    setCurrentPage(1);
    setActiveFilter(filters);

    // Reset all filter states
    setEmployeeId(null);
    setSource(null);
    setLoanAmount(null);
    setStatus(null);

    // Apply filters based on the received filter array
    filters.forEach((filter) => {
      switch (filter.field) {
        case "assignee":
          setEmployeeId(filter.value);
          break;
        case "source":
          setSource(filter.value);
          break;
        case "loan_amount":
          setLoanAmount(filter.value);
          break;
        case "status":
          setStatus(filter.value);
          break;
        default:
          break;
      }
    });

    setIsFilterModalOpen(false);
  };

  const handleFilterClear = () => {
    setCurrentPage(1);
    setActiveFilter([]);
    setEmployeeId(null);
    setSource(null);
    setLoanAmount(null);
    setStatus(null);
    setIsFilterModalOpen(false);
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
                  Approved BRE Rejected Leads
                </h1>
              </div>

              <div className="flex items-center gap-2 sm:justify-end w-full sm:w-auto">
                <div className="assigned-leads-search-wrap flex-1 sm:flex-none min-w-[320px] sm:min-w-[360px] sm:max-w-[520px]">
                  <SearchField
                    onSearch={(value) => {
                      setSearchQuery(value);
                    }}
                    defaultValue={searchQuery}
                  />
                </div>

                <div className="relative flex-shrink-0">
                  <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={handleFilterApply}
                    currentFilters={activeFilter || []}
                    showSource={true}
                    showLoanAmount={true}
                    showStatus={true}
                    statusOptions={getStatusOptions("bre-approved")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {isLoading ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">Loading approved leads...</p>
                </div>
              </div>
            ) : (apiError || error) ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {error || "Failed to fetch approved leads. Please try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      refetch();
                    }}
                    className="mt-3 inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : filteredData?.length > 0 ? (
              <div className="h-full overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/70">
                    <TableHeader showCommentColumn={true} />
                  </thead>
                  <tbody>
                    {filteredData?.map((row) => (
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
                          showCommentColumn={true}
                        />

                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={null}
                            loadingState={{}}
                            mutateRejectLead={null}
                            isRejectionNeeded={false}
                            isNCandNRNeeded={true}
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
                  <p className="text-sm font-medium text-slate-500">No approved leads found.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-2 py-2 sm:px-4">
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isLoading={isLoading}
              pagination={breRejectedApprovedLeads?.pagination}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovedBreRejectedLeadsWithErrorBoundary;
