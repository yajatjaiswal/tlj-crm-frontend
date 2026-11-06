import React, { useState, useMemo, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { Check, UserCircle, X } from "lucide-react";
import {
  getBreRejectedLeads,
  selfAssignMultipleBreRejectedLead,
} from "../../services/functions/credit-analyst";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal";
import { usePaginationState } from "../../hooks/usePaginationState";
import ReloanToggle from "../../Components/Table/ReloanToggle";
import FilterButton from "../../Components/Table/FilterButton";
import FilterModal from "../../Components/Modals/FilterModal";
import { getStatusOptions } from "../../utils/statusOptions";
import {
  getYesterdayIST,
  getLastMonthRangeIST,
  getLastWeekRangeIST,
} from "../../utils/istDateUtils";
import { openDetailModal } from "../../redux/slices/detailModal";

// Error boundary wrapper component
const BreRejectedLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <BreRejectedLeads />
  </ErrorBoundary>
);

const BreRejectedLeads = () => {
  const dispatch = useDispatch();
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
  const [loadingStates, setLoadingStates] = useState({});
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isLoadingMultipleAssign, setIsLoadingMultipleAssign] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([]);
  const [status, setStatus] = useState(null);
  const [caseType, setCaseType] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [timePeriod, setTimePeriod] = useState(null);
  const [orderBy, setOrderBy] = useState(null);
  const isReloanSelected = caseType === "reloan";
  const isReloanToggleAvailable = true;

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
      setStatus(parsed?.status ?? null);
      setCaseType(parsed?.caseType ?? null);
      setStartDate(parsed?.startDate ?? null);
      setEndDate(parsed?.endDate ?? null);
      setTimePeriod(parsed?.timePeriod ?? null);
      setOrderBy(parsed?.orderBy ?? null);
    } catch (e) {
      // ignore
    } finally {
      hasHydratedFiltersRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedFiltersRef.current) return;
    const key = getFiltersStorageKey();
    if (!key) return;
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        activeFilter,
        status,
        caseType,
        startDate,
        endDate,
        timePeriod,
        orderBy,
      })
    );
  }, [activeFilter, status, caseType, startDate, endDate, timePeriod, orderBy]);

  useEffect(() => {
    if (!timePeriod) return;
    if (timePeriod === "Yesterday") {
      const yesterdayStr = getYesterdayIST();
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (timePeriod === "Last Month") {
      const { startStr, endStr } = getLastMonthRangeIST();
      setStartDate(startStr);
      setEndDate(endStr);
    } else if (timePeriod === "Last Week") {
      const { startStr, endStr } = getLastWeekRangeIST();
      setStartDate(startStr);
      setEndDate(endStr);
    } else if (timePeriod === "Date Range") {
      // Dates from FilterModal on apply
    } else {
      setStartDate(null);
      setEndDate(null);
    }
  }, [timePeriod]);

  const getFormattedTime = useMemo(() => {
    if (timePeriod) {
      if (timePeriod === "Date Range") {
        if (startDate && endDate) return "customDate";
        return null;
      }
      if (
        timePeriod === "Yesterday" ||
        timePeriod === "Last Month" ||
        timePeriod === "Last Week"
      ) {
        if (startDate && endDate) return "customDate";
        return null;
      }
      if (timePeriod === "Today") return "today";
      if (timePeriod === "This Week") return "weekly";
      if (timePeriod === "This Month") return "monthly";
      if (timePeriod === "This Year") return "yearly";
      return timePeriod.toLowerCase();
    }
    if (startDate && endDate) return "customDate";
    return null;
  }, [timePeriod, startDate, endDate]);

  const queryClient = useQueryClient();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(
    1,
    searchQuery
  );

  const {
    data: breRejectedLeads,
    isPending: isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: [
      "bre-rejected-leads",
      currentPage,
      itemsPerPage,
      searchQuery,
      caseType,
      status,
      startDate,
      endDate,
      timePeriod,
      orderBy,
      getFormattedTime,
    ],
    queryFn: () =>
      getBreRejectedLeads({
        page: currentPage,
        limit: itemsPerPage,
        search_text: searchQuery || undefined,
        lead_stage: status,
        case_type: caseType,
        startDate,
        endDate,
        time: getFormattedTime,
        order_by: orderBy,
      }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (err) => {
      console.error("Error fetching leads:", err);
      setError("Failed to load leads. Please try again later.");
      toast.error("Failed to load leads");
    },
  });

  useEffect(() => {
    if (breRejectedLeads?.pagination?.currentPage) {
      syncWithApiResponse(breRejectedLeads.pagination.currentPage);
    }
  }, [breRejectedLeads?.pagination?.currentPage, syncWithApiResponse]);

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

  const { mutate: mutateAssignBreRejectedLead } = useMutation({
    mutationFn: selfAssignMultipleBreRejectedLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["bre-rejected-leads"]);
      toast.success("Leads Assigned Successfully");
      setSelectedRows(new Set());
      setIsLoadingMultipleAssign(false);
      setError(null);
    },
    onError: (err) => {
      console.error("Error assigning leads:", err);
      setError("Failed to assign leads. Please try again.");
      toast.error("Failed to Assign Leads");
      setIsLoadingMultipleAssign(false);
    },
  });

  const filteredData = useMemo(() => {
    try {
      if (!breRejectedLeads?.leads) return [];
      return breRejectedLeads.leads;
    } catch (err) {
      console.error("Error in data filtering:", err);
      setError("Error occurred while filtering data. Please try again.");
      return breRejectedLeads?.leads || [];
    }
  }, [breRejectedLeads?.leads]);

  const toggleSelection = (id) => {
    try {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } catch (err) {
      console.error("Error toggling selection:", err);
      setError("Error occurred while selecting lead. Please try again.");
    }
  };

  const handleRowClick = (user) => {
    try {
      setExpandedRow(expandedRow === user.id ? null : user.id);
    } catch (err) {
      console.error("Error expanding row:", err);
      setError("Error occurred while expanding lead details. Please try again.");
    }
  };

  const handleDetailsClick = (lead) => {
    dispatch(
      openDetailModal({
        row: lead,
        showReject: false,
        showApprove: false,
        role: "Credit-Analyst",
      })
    );
  };

  const handleAssign = () => {
    try {
      if (selectedRows.size === 0) {
        toast.error("Please select at least one lead to assign");
        return;
      }
      setShowAssignModal(true);
    } catch (err) {
      console.error("Error in handleAssign:", err);
      setError("Error occurred while preparing to assign leads. Please try again.");
    }
  };

  const handleSingleAssign = (lead, e) => {
    try {
      e.stopPropagation();
      setSelectedLead(lead);
      setShowAssignModal(true);
    } catch (err) {
      console.error("Error in handleSingleAssign:", err);
      setError("Error occurred while preparing to assign lead. Please try again.");
    }
  };

  const confirmAssign = () => {
    try {
      if (selectedLead) {
        setLoadingStates((prev) => ({ ...prev, [selectedLead.id]: true }));
        mutateAssignBreRejectedLead({ id: [selectedLead.id] });
      } else {
        setIsLoadingMultipleAssign(true);
        const selectedLeads =
          breRejectedLeads?.leads?.filter((row) => selectedRows.has(row.id)) || [];
        if (selectedLeads.length === 0) {
          setError("No leads selected for assignment");
          setIsLoadingMultipleAssign(false);
          return;
        }
        mutateAssignBreRejectedLead({ id: selectedLeads.map((lead) => lead.id) });
      }
      setShowAssignModal(false);
      setSelectedLead(null);
    } catch (err) {
      console.error("Error in confirmAssign:", err);
      setError("Error occurred while assigning leads. Please try again.");
      setLoadingStates({});
      setIsLoadingMultipleAssign(false);
    }
  };

  const handleModalOutsideClick = (e) => {
    try {
      if (e.target === e.currentTarget) {
        setShowAssignModal(false);
        setSelectedLead(null);
        setLoadingStates({});
        setIsLoadingMultipleAssign(false);
      }
    } catch (err) {
      console.error("Error in handleModalOutsideClick:", err);
      setError("Error occurred while closing modal. Please try again.");
    }
  };

  const handleFilterApply = (filters) => {
    setCurrentPage(1);
    setActiveFilter(filters);
    setStatus(null);
    setCaseType(null);
    setStartDate(null);
    setEndDate(null);
    setTimePeriod(null);
    setOrderBy(null);
    filters.forEach((filter) => {
      switch (filter.field) {
        case "status":
          setStatus(filter.value);
          break;
        case "caseType":
          setCaseType(filter.value);
          break;
        case "startDate":
          setStartDate(filter.value);
          break;
        case "endDate":
          setEndDate(filter.value);
          break;
        case "timePeriod":
          setTimePeriod(filter.value);
          break;
        case "order_by":
          setOrderBy(filter.value);
          break;
        default:
          break;
      }
    });
    setIsFilterModalOpen(false);
  };

  const handleReloanToggle = () => {
    if (!isReloanToggleAvailable) return;
    const nextSelected = !isReloanSelected;
    const nextCaseType = nextSelected ? "reloan" : null;
    setCaseType(nextCaseType);
    setActiveFilter((prevFilters) => {
      const safePrev = prevFilters || [];
      const otherFilters = safePrev.filter((f) => f.field !== "caseType");
      return nextSelected
        ? [
            ...otherFilters,
            {
              field: "caseType",
              value: "reloan",
              label: "Case Type: Reloan",
            },
          ]
        : otherFilters;
    });
    setCurrentPage(1);
  };

  const filterChipMetas = useMemo(() => {
    const metas = [];
    if (timePeriod) {
      if (timePeriod === "Date Range" && startDate && endDate) {
        metas.push({
          kind: "date-range",
          value: "Date Range",
          label: `Date range: ${startDate} – ${endDate}`,
        });
      } else {
        metas.push({
          kind: "timePeriod",
          value: timePeriod,
          label: `Time Period: ${timePeriod}`,
        });
      }
    }
    if (status) {
      const statusOptions = getStatusOptions("partial-leads") || [];
      const matched = statusOptions.find(
        (o) => String(o.value) === String(status)
      );
      metas.push({
        kind: "status",
        value: status,
        label: matched ? `Status: ${matched.label}` : `Status: ${status}`,
      });
    }
    if (caseType) {
      const mapped =
        caseType === "reloan"
          ? "Reloan"
          : caseType === "fresh"
            ? "Fresh"
            : caseType;
      metas.push({
        kind: "caseType",
        value: caseType,
        label: `Case Type: ${mapped}`,
      });
    }
    return metas;
  }, [timePeriod, startDate, endDate, status, caseType]);

  const handleRemoveFilterChip = (meta) => {
    setCurrentPage(1);
    setActiveFilter((prev) => {
      const safePrev = prev || [];
      switch (meta.kind) {
        case "date-range":
          return safePrev.filter(
            (f) =>
              !(
                (f.field === "timePeriod" && f.value === "Date Range") ||
                f.field === "startDate" ||
                f.field === "endDate" ||
                f.field === "order_by"
              )
          );
        case "timePeriod":
          return safePrev.filter(
            (f) =>
              !(
                f.field === "timePeriod" &&
                String(f.value) === String(meta.value)
              )
              && f.field !== "order_by"
          );
        case "status":
          return safePrev.filter(
            (f) =>
              !(
                f.field === "status" && String(f.value) === String(meta.value)
              )
          );
        case "caseType":
          return safePrev.filter(
            (f) =>
              !(
                f.field === "caseType" &&
                String(f.value) === String(meta.value)
              )
          );
        default:
          return safePrev;
      }
    });
    switch (meta.kind) {
      case "date-range":
      case "timePeriod":
        setTimePeriod(null);
        setOrderBy(null);
        setStartDate(null);
        setEndDate(null);
        break;
      case "status":
        setStatus(null);
        break;
      case "caseType":
        setCaseType(null);
        break;
      default:
        break;
    }
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
                  BRE Rejected Leads
                </h1>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                <div className="assigned-leads-search-wrap min-w-0 flex-1 sm:min-w-[360px] sm:max-w-[520px] sm:flex-none">
                  <SearchField
                    onSearch={(value) => setSearchQuery(value)}
                    defaultValue={searchQuery}
                  />
                </div>
                <div className="relative flex-shrink-0 flex flex-col items-end gap-1.5 sm:gap-2">
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                    <ReloanToggle
                      checked={isReloanSelected}
                      onToggle={handleReloanToggle}
                      disabled={!isReloanToggleAvailable}
                      show={isReloanToggleAvailable}
                    />
                    {/* <FilterButton
                      onFilter={() => setIsFilterModalOpen(true)}
                      hasActiveFilter={activeFilter.length > 0}
                    /> */}
                    <FilterModal
                      isOpen={isFilterModalOpen}
                      onClose={() => setIsFilterModalOpen(false)}
                      onApply={handleFilterApply}
                      currentFilters={activeFilter || []}
                      showAssignee={false}
                      showSource={true}
                      showLoanAmount={true}
                      showStatus={true}
                      showCasetype={true}
                      showTimePeriod={true}
                      statusOptions={getStatusOptions("partial-leads")}
                    />
                  </div>
                  {filterChipMetas.length > 0 && (
                    <div className="flex max-w-[min(100%,26rem)] flex-wrap items-center justify-end gap-1.5">
                      {filterChipMetas.map((meta, idx) => (
                        <div
                          key={`${meta.kind}-${idx}-${meta.label}`}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand/40 bg-brand-light/90 py-0.5 pl-2 pr-1 text-[11px] font-medium text-brand-link shadow-sm"
                        >
                          <span className="max-w-[11rem] truncate sm:max-w-[15rem]">
                            {meta.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFilterChip(meta)}
                            className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-brand-link transition-colors hover:bg-brand-light/80 hover:text-brand-dark"
                            aria-label={`Remove filter ${meta.label}`}
                          >
                            <X className="h-3 w-3" strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center justify-end gap-2 sm:ml-0">
                  <span className="whitespace-nowrap text-xs text-slate-600 sm:text-sm">
                    {selectedRows.size} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={isLoadingMultipleAssign}
                    className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  >
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {isLoadingMultipleAssign ? "Assigning..." : "Assign Selected"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">Loading BRE rejected leads...</p>
                </div>
              </div>
            ) : (error || fetchError) ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {error || "Failed to load leads. Please try again."}
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
            ) : filteredData?.length > 0 ? (
              <div className="h-full overflow-x-auto overflow-y-auto">
                <table className="min-w-[900px] w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50/70">
                    <TableHeader
                      showSource={true}
                      showCommentColumn={false}
                      showStatus={true}
                      showSalary={true}
                      showSalaryDate={true}
                      showCreatedAt={true}
                      showSelectColumn
                    />
                  </thead>
                  <tbody>
                    {filteredData.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={expandedRow}
                          loadingStates={loadingStates}
                          selectedRows={selectedRows}
                          handleRowClick={handleRowClick}
                          onDetailsClick={handleDetailsClick}
                          enableRowExpandOnClick={true}
                          isActionButtonNeeded={true}
                          isSelectButtonNeeded={true}
                          isDetailedViewNeeded={false}
                          toggleSelection={toggleSelection}
                          handleSingleAction={handleSingleAssign}
                          actionButtonText="Assigning..."
                          modalButtonText="Assign"
                          showSource={true}
                          showCommentColumn={false}
                          showStatus={true}
                          showSalary={true}
                          showSalaryDate={true}
                          showCreatedAt={true}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={null}
                            loadingState={loadingStates}
                            mutateRejectLead={null}
                            isRejectionNeeded={false}
                            isUploadAddtionalDocumentNeeded={true}
                            isNCandNRNeeded={true}
                            role="Credit-Analyst"
                            showReject={false}
                            leadID={row.lead_no}
                            isDisposeNeeded={false}
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
                  <p className="text-sm font-medium text-slate-500">No BRE rejected leads found.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-2 py-2 sm:px-4">
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isLoading={isLoading}
              pagination={breRejectedLeads?.pagination}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          </div>
        </div>

        <ActionModal
          showModal={showAssignModal}
          handleModalOutsideClick={handleModalOutsideClick}
          selectedLead={selectedLead}
          selectedRows={selectedRows}
          setShowModal={setShowAssignModal}
          setSelectedLead={setSelectedLead}
          confirmAction={confirmAssign}
          actionButtonText="Assigning..."
          modalTitle={`Assign Lead ${selectedLead?.lead_no ?? ""}`}
          modalDescription="Are you sure you want to assign these leads?"
          modalButtonText="Assign"
        />
      </div>
    </div>
  );
};

export default BreRejectedLeadsWithErrorBoundary;
