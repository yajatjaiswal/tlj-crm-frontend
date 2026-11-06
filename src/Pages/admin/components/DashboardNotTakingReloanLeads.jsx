import React, { useState, useMemo, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { getDashboardLeads } from "../../../services/functions/admin";
import { toast } from "react-hot-toast";
import ErrorBoundary from "../../../Components/ErrorBoundary";
import ErrorFallback from "../../../Components/ErrorFallback";
import SearchField from "../../../Components/Table/SearchField";
import TableHeader from "../../../Components/Table/TableHeader";
import LeadRow from "../../../Components/Table/LeadRow";
import LeadExpandedRow from "../../../Components/Table/LeadExpandedRow";
import Pagination from "../../../Components/Pagination/Pagination";
import FilterButton from "../../../Components/Table/FilterButton";
import FilterModal from "../../../Components/Modals/FilterModal";
import { getStatusOptions } from "../../../utils/statusOptions";
import { useLocation, useNavigate } from "react-router-dom";
import { usePaginationState } from "../../../hooks/usePaginationState";
import { openDetailModal } from "../../../redux/slices/detailModal";
import { Ban } from "lucide-react";

const DASHBOARD_LEAD_STATUS = "NOT_TAKING_RELOAN";

const DashboardNotTakingReloanLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <DashboardNotTakingReloanLeads />
    </ErrorBoundary>
  );
};

function DashboardNotTakingReloanLeads() {
  const dispatch = useDispatch();
  const [expandedRow, setExpandedRow] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [error, setError] = useState(null);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [source, setSource] = useState(null);
  const [loanAmount, setLoanAmount] = useState(null);
  const [status, setStatus] = useState(null);

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

  const hasHydratedFiltersRef = useRef(false);
  const getFiltersStorageKey = () => {
    if (typeof window === "undefined") return null;
    return `filters:${window.location.pathname}`;
  };

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

  const location = useLocation();
  const navigate = useNavigate();
  const timePeriod = location.state?.timePeriod || "Today";
  const startDate = location.state?.startDate || null;
  const endDate = location.state?.endDate || null;
  const caseType = location.state?.caseType || null;
  const routedEmployeeId = location.state?.employee_id || null;
  const effectiveEmployeeId = routedEmployeeId || employeeId;

  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(
    1,
    searchQuery
  );

  const {
    data: leadData,
    isPending: isLoadingLeads,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: [
      "admin-not-taking-reloan-leads",
      currentPage,
      itemsPerPage,
      timePeriod,
      startDate,
      endDate,
      caseType,
      searchQuery,
      effectiveEmployeeId,
      source,
      loanAmount,
      status,
    ],
    queryFn: () =>
      getDashboardLeads(
        DASHBOARD_LEAD_STATUS,
        currentPage,
        itemsPerPage,
        timePeriod,
        startDate,
        endDate,
        caseType,
        searchQuery,
        effectiveEmployeeId,
        source,
        loanAmount,
        status
      ),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    onError: (err) => {
      console.error("Error fetching not-taking-reloan leads:", err);
      setError("Failed to load leads. Please try again later.");
      toast.error("Failed to load leads");
    },
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
    dispatch(
      openDetailModal({
        row: lead,
        showReject: false,
        showApprove: false,
        role: "admin",
      })
    );
  };

  const handleFilterApply = (filters) => {
    setCurrentPage(1);
    setActiveFilter(filters);
    setEmployeeId(null);
    setSource(null);
    setLoanAmount(null);
    setStatus(null);
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

  return (
    <div className="h-[89vh] overflow-hidden rounded-xl bg-slate-50">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col px-0 sm:px-2">
        <div className="mb-2 flex flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:mb-3">
          <button
            type="button"
            onClick={() =>
              navigate(
                location.pathname.includes("/sales-ops/")
                  ? "/sales-ops/dashboard"
                  : "/admin/dashboard"
              )
            }
            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
          >
            ← Back
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white/80 shadow-lg shadow-gray-200 backdrop-blur-sm">
          <div className="flex-shrink-0 border-b border-slate-200 bg-white/70 p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-600/10">
                  <Ban className="h-5 w-5 text-rose-700" />
                </div>
                <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                  Not taking reloan
                </h1>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <div className="assigned-leads-search-wrap min-w-[280px] flex-1 sm:min-w-[360px] sm:max-w-[520px] sm:flex-none">
                  <SearchField
                    onSearch={(value) => setSearchQuery(value)}
                    defaultValue={searchQuery}
                  />
                </div>
                <div className="relative flex flex-shrink-0 items-center">
                  <FilterButton
                    onFilter={() => setIsFilterModalOpen(true)}
                    hasActiveFilter={!!activeFilter?.length}
                  />
                  <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={handleFilterApply}
                    currentFilters={activeFilter || []}
                    showAssignee={false}
                    showSource={true}
                    showLoanAmount={false}
                    showStatus={false}
                    statusOptions={getStatusOptions("total-leads")}
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
                    Loading not taking reloan leads...
                  </p>
                </div>
              </div>
            ) : fetchError || error ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {error ||
                      fetchError?.message ||
                      "Failed to load leads. Please try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      refetch();
                    }}
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
                      data={{ lead_stage: true }}
                      showAssignee={true}
                      showSource={true}
                      showCommentColumn={false}
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
                          showAssignee={true}
                          showSource={true}
                          showCommentColumn={false}
                          isDetailedViewNeeded={true}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            isRejectionNeeded={false}
                            isNCandNRNeeded={true}
                            role="admin"
                            showReject={false}
                            leadID={row.lead_no}
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
                    No not taking reloan leads found.
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

export default DashboardNotTakingReloanLeadsWithErrorBoundary;
