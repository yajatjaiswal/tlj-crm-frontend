import React, { useState, useMemo, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  Check,
  UserCircle,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  allocatMultipleLead,
  getLeadByCategory,
} from "../../services/functions/screener";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal";
import TableHeader from "../../Components/Table/TableHeader";
import FilterButton from "../../Components/Table/FilterButton";
import FilterModal from "../../Components/Modals/FilterModal";
import ReloanToggle from "../../Components/Table/ReloanToggle";
import { getStatusOptions } from "../../utils/statusOptions";
import DateRangePicker from "../admin/components/DateRangePicker";
import {
  getCurrentIST,
  formatDateIST,
  getYesterdayIST,
  getLastMonthRangeIST,
  getThisWeekRangeIST,
  getLastWeekRangeIST,
} from "../../utils/istDateUtils";
import { openDetailModal } from "../../redux/slices/detailModal";
import { usePaginationState } from "../../hooks/usePaginationState";

// Error boundary wrapper component
const PartialLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <PartialLeads />
    </ErrorBoundary>
  );
};

function PartialLeads() {
  const dispatch = useDispatch();
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [loadingStates, setLoadingStates] = useState({});
  const [isLoadingMultipleAssign, setIsLoadingMultipleAssign] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState(null);

  // Filter states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [source, setSource] = useState(null);
  const [loanAmount, setLoanAmount] = useState(null);
  const [status, setStatus] = useState(null);
  const [caseType, setCasetype] = useState(null);
  const isReloanSelected = caseType === "reloan";
  const isReloanToggleAvailable = true;
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [timePeriod, setTimePeriod] = useState(null);
  const [orderBy, setOrderBy] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

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
      setCasetype(parsed?.caseType ?? null);
      setTimePeriod(parsed?.timePeriod ?? null);
      setOrderBy(parsed?.orderBy ?? null);
      setStartDate(parsed?.startDate ?? null);
      setEndDate(parsed?.endDate ?? null);
      setDateRange({
        startDate: parsed?.dateRange?.startDate ?? null,
        endDate: parsed?.dateRange?.endDate ?? null,
      });
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
    const payload = {
      activeFilter,
      employeeId,
      source,
      loanAmount,
      status,
      caseType: caseType,
      startDate,
      endDate,
      timePeriod,
      orderBy,
      dateRange,
    };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  }, [
    activeFilter,
    employeeId,
    source,
    loanAmount,
    status,
    caseType,
    startDate,
    endDate,
    timePeriod,
    orderBy,
    dateRange,
  ]);
  const queryClient = useQueryClient();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Effect to set dates based on timePeriod
  useEffect(() => {
    if (timePeriod) {
      if (timePeriod === "Yesterday") {
        const yesterdayStr = getYesterdayIST();
        setStartDate(yesterdayStr);
        setEndDate(yesterdayStr);
        setDateRange({ startDate: null, endDate: null });
      } else if (timePeriod === "Last Month") {
        const { startStr, endStr } = getLastMonthRangeIST();
        setStartDate(startStr);
        setEndDate(endStr);
        setDateRange({ startDate: null, endDate: null });
      } else if (timePeriod === "Last Week") {
        const { startStr, endStr } = getLastWeekRangeIST();
        setStartDate(startStr);
        setEndDate(endStr);
        setDateRange({ startDate: null, endDate: null });
      } else if (timePeriod === "Date Range") {
        // Calendar now shows directly in FilterModal, dates are set when user applies filter
        // Keep existing dates if they were set
      } else {
        // For "Today", "This Week", "This Month", "This Year", clear dates
        setStartDate(null);
        setEndDate(null);
        setDateRange({ startDate: null, endDate: null });
      }
    }
  }, [timePeriod]);

  // Format time parameter based on timePeriod or startDate and endDate
  // Similar to Dashboard.jsx logic
  const getFormattedTime = useMemo(() => {
    // If timePeriod is set, format it accordingly
    if (timePeriod) {
      if (timePeriod === "Date Range") {
        // If Date Range is selected, use customDate with startDate and endDate
        if (startDate && endDate) {
          return "customDate";
        }
        return null;
      }
      if (timePeriod === "Yesterday" || timePeriod === "Last Month" ||
        timePeriod === "Last Week") {
        // These periods use customDate with calculated dates
        if (startDate && endDate) {
          return "customDate";
        }
        return null;
      }
      // Map time periods to API format (matching Dashboard.jsx)
      if (timePeriod === "Today") {
        return "today";
      }
      if (timePeriod === "This Week") {
        return "weekly";
      }
      if (timePeriod === "This Month") {
        return "monthly";
      }
      if (timePeriod === "This Year") {
        return "yearly";
      }
      // Default: convert to lowercase
      return timePeriod.toLowerCase();
    }
    // If startDate and endDate are provided without timePeriod, use "customDate"
    if (startDate && endDate) {
      return "customDate";
    }
    // Default to null if no date range is specified
    return null;
  }, [timePeriod, startDate, endDate]);

  const {
    data: leadData,
    isPending: isLoadingLeads,
    error: leadError,
    refetch,
  } = useQuery({
    queryKey: ["screener-partial-leads", currentPage, itemsPerPage, searchQuery, employeeId, source, status, caseType, startDate, endDate, timePeriod, orderBy, getFormattedTime],
    queryFn: () => getLeadByCategory("blinker", currentPage, itemsPerPage, searchQuery, employeeId, source, status, caseType, startDate, endDate, getFormattedTime, orderBy),
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (leadData?.pagination?.currentPage) {
      syncWithApiResponse(leadData.pagination.currentPage);
    }
  }, [leadData?.pagination?.currentPage, syncWithApiResponse]);

  const data = useMemo(() => leadData?.leads || [], [leadData]);

  const { mutate: mutateAssignLead } = useMutation({
    mutationFn: allocatMultipleLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["screener-partial-leads"]);
      toast.success("Leads Assigned Successfully");
      setSelectedRows(new Set());
      setIsLoadingMultipleAssign(false);
      setLoadingStates({});
      setSelectedLead(null);
      setError(null);
    },
    onError: (err) => {
      console.error("Error assigning leads:", err);
      setError("Failed to assign leads. Please try again.");
      toast.error("Failed to Assign Leads");
      setIsLoadingMultipleAssign(false);
      setLoadingStates({});
    },
  });

  const toggleSelection = (id) => {
    try {
      setSelectedRows(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
        return newSelected;
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
        role: "Screener",
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
        setLoadingStates((prevStates) => ({ ...prevStates, [selectedLead.id]: true }));
        mutateAssignLead([selectedLead.id]);
      } else {
        setIsLoadingMultipleAssign(true);
        const selectedLeads = data.filter(row => selectedRows.has(row.id)) || [];
        if (selectedLeads.length === 0) {
          setError("No leads selected for assignment");
          return;
        }
        mutateAssignLead(selectedLeads.map(lead => lead.id));
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

  // Filter handlers
  const handleFilterApply = (filters) => {
    setCurrentPage(1);
    setActiveFilter(filters);

    // Reset all filter states
    setEmployeeId(null);
    setSource(null);
    setLoanAmount(null);
    setStatus(null);
    setCasetype(null);
    setStartDate(null);
    setEndDate(null);
    setTimePeriod(null);
    setOrderBy(null);
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
        case "caseType":
          setCasetype(filter.value);
          break;
        case "startDate":
          setStartDate(filter.value);
          break;
        case "endDate":
          setEndDate(filter.value);
          break;
        case "timePeriod":
          setTimePeriod(filter.value);
          // Calendar now shows directly in FilterModal, no need to show separate date picker
          setShowDatePicker(false);
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

  const handleFilterClear = () => {
    setCurrentPage(1);
    setActiveFilter([]);
    setEmployeeId(null);
    setSource(null);
    setLoanAmount(null);
    setStatus(null);
    setCasetype(null);
    setStartDate(null);
    setEndDate(null);
    setTimePeriod(null);
    setOrderBy(null);
    setDateRange({ startDate: null, endDate: null });
    setShowDatePicker(false);
    setIsFilterModalOpen(false);
  };

  const handleDateRangeSelect = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    setStartDate(startDate);
    setEndDate(endDate);
    setShowDatePicker(false);
  };

  const handleReloanToggle = () => {
    if (!isReloanToggleAvailable) return;

    const nextSelected = !isReloanSelected;
    const nextCaseType = nextSelected ? "reloan" : null;

    setCasetype(nextCaseType);
    setActiveFilter((prevFilters) => {
      const safePrev = prevFilters || [];
      const otherFilters = safePrev.filter((f) => f.field !== "caseType");
      return nextSelected
        ? [...otherFilters, { field: "caseType", value: "reloan" }]
        : otherFilters;
    });
    setCurrentPage(1);
  };

  const filterChipMetas = useMemo(() => {
    const metas = [];

    // Time period chip (including Date Range bundle)
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

    // Status chip
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

    // Case type chip (Reloan/Fresh)
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
        setDateRange({ startDate: null, endDate: null });
        setShowDatePicker(false);
        break;
      case "status":
        setStatus(null);
        break;
      case "caseType":
        setCasetype(null);
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
                  Partial Leads
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
                <div className="relative flex-shrink-0 flex flex-wrap items-center gap-2 sm:gap-4">
                  <ReloanToggle
                    checked={isReloanSelected}
                    onToggle={handleReloanToggle}
                    disabled={!isReloanToggleAvailable}
                    show={isReloanToggleAvailable}
                  />
                  {filterChipMetas.length > 0 && (
                    <div className="flex max-w-[min(100%,28rem)] flex-wrap items-center gap-1.5">
                      {filterChipMetas.map((meta, idx) => (
                        <div
                          key={`${meta.kind}-${idx}-${meta.label}`}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand/40 bg-brand-light/90 py-0.5 pl-2.5 pr-1 text-xs font-medium text-brand-link shadow-sm"
                        >
                          <span className="max-w-[14rem] truncate sm:max-w-[18rem]">
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
                  <FilterButton
                    onFilter={() => setIsFilterModalOpen(true)}
                    hasActiveFilter={!!activeFilter}
                  />
                  <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={handleFilterApply}
                    currentFilters={activeFilter || []}
                    showSource={true}
                    showCasetype={true}
                    showStartDate={true}
                    showEndDate={true}
                    showStatus={true}
                    showTimePeriod={true}
                    statusOptions={getStatusOptions("partial-leads")}
                  />
                </div>
                {/* <div className="flex flex-shrink-0 items-center justify-end gap-2">
                  <span className="whitespace-nowrap text-xs text-slate-600 sm:text-sm">
                    {selectedRows.size} selected
                  </span>
                  <button
                    onClick={handleAssign}
                    disabled={isLoadingMultipleAssign}
                    className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  >
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {isLoadingMultipleAssign ? "Assigning..." : "Assign Selected"}
                  </button>
                </div> */}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {isLoadingLeads ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">Loading partial leads...</p>
                </div>
              </div>
            ) : (leadError || error) ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {error || leadError?.message || "Failed to load leads. Please try again."}
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
                    <TableHeader showStatus={true} showEmail={false} data={data[0]} showSource={true} showSelectColumn />
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={expandedRow}
                          selectedRows={selectedRows}
                          loadingStates={loadingStates}
                          handleRowClick={handleRowClick}
                          onDetailsClick={handleDetailsClick}
                          enableRowExpandOnClick={true}
                          isActionButtonNeeded={true}
                          isSelectButtonNeeded={true}
                          toggleSelection={toggleSelection}
                          handleSingleAction={handleSingleAssign}
                          showStatus={true}
                          showEmail={false}
                          isDetailedViewNeeded={false}
                          actionButtonText="Assigning..."
                          modalButtonText="Assign"
                          showSource={true}
                        />
                        {/* {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={null}
                            isNCandNRNeeded={true}
                            loadingState={loadingStates}
                            mutateRejectLead={null}
                            isRejectionNeeded={false}
                            role=""
                            showReject={false}
                            isUploadAddtionalDocumentNeeded={true}
                          />
                        )} */}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">No partial leads found.</p>
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

      <ActionModal
        showModal={showAssignModal}
        handleModalOutsideClick={handleModalOutsideClick}
        selectedLead={selectedLead}
        selectedRows={selectedRows}
        setShowModal={setShowAssignModal}
        setSelectedLead={setSelectedLead}
        confirmAction={confirmAssign}
        actionButtonText="Assigning..."
        modalTitle={`Assign Lead ${selectedLead?.lead_no}`}
        modalDescription={`Are you sure you want to assign these leads?`}
        modalButtonText="Assign"
      />

      {/* Date Range Picker Modal */}
      {showDatePicker && (
        <DateRangePicker
          onDateRangeSelect={handleDateRangeSelect}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
}

export default PartialLeadsWithErrorBoundary;
