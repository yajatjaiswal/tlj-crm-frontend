import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllocatedLeadByCategory,
  rejectLeadById,
  toggleDisposeLead,
} from "../../services/functions/screener";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { UserCircle, X } from "lucide-react";
import StatusFlag from "../../Components/StatusFlag";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import RejectionModal from "../../Components/Modals/RejectionModal";
import ManualKycApproveModal from "../../Components/Modals/ManualKycApproveModal";
import FilterButton from "../../Components/Table/FilterButton";
import FilterModal from "../../Components/Modals/FilterModal";
import ReloanToggle from "../../Components/Table/ReloanToggle";
import { getStatusOptions } from "../../utils/statusOptions";
import { REJECTION_REASONS } from "../../utils/rejectionReasons";
import { usePaginationState } from "../../hooks/usePaginationState";
import { openDetailModal } from "../../redux/slices/detailModal";
import {
  getYesterdayIST,
  getLastMonthRangeIST,
  getThisWeekRangeIST,
  getLastWeekRangeIST,
} from "../../utils/istDateUtils";

// Error boundary wrapper component
const AllocatedPartialLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AllocatedPartialLeads />
    </ErrorBoundary>
  );
};

function AllocatedPartialLeads() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const rejectionReasons = REJECTION_REASONS;

  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [rejectingLead, setRejectingLead] = useState(null);
  const [loadingState, setLoadingState] = useState({});
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
  const [error, setError] = useState(null);
  const [showManualKycApproveModal, setShowManualKycApproveModal] = useState(false);
  const [approvingLead, setApprovingLead] = useState(null);

  // Filter states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [source, setSource] = useState(null);
  const [loanAmount, setLoanAmount] = useState(null);
  const [status, setStatus] = useState(null);
  const [caseType, setCaseType] = useState(null);
  const isReloanSelected = caseType === "reloan";
  const isReloanToggleAvailable = true;
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [timePeriod, setTimePeriod] = useState(null);
  const [orderBy, setOrderBy] = useState(null);

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
    const payload = {
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
  ]);

  console.log("status----->>> AllocatedPartialLeads", status);

  // Effect to set dates based on timePeriod
  useEffect(() => {
    if (timePeriod) {
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
        // Calendar now shows directly in FilterModal, dates are set when user applies filter
        // Keep existing dates if they were set
      } else {
        // For "Today", "This Week", "This Month", "This Year", clear dates
        setStartDate(null);
        setEndDate(null);
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

  // Use pagination hook for stable pagination
  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(1, searchQuery);

  const { data: leadData, isPending: isLoadingLeads, error: fetchError, refetch } = useQuery({
    queryKey: ["screener-partial-allocated-lead", currentPage, itemsPerPage, searchQuery, employeeId, source, loanAmount, status, caseType, startDate, endDate, timePeriod, orderBy, getFormattedTime],
    queryFn: () =>
      getAllocatedLeadByCategory("blinker", currentPage, itemsPerPage, searchQuery, employeeId, source, loanAmount, status, caseType, startDate, endDate, getFormattedTime, orderBy),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    onError: (error) => {
      console.error("Error fetching leads:", error);
      setError("Failed to load leads. Please try again later.");
      toast.error("Failed to load leads");
    }
  });

  // Sync with API pagination when available
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

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }) => rejectLeadById(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["screener-partial-allocated-lead"],
      });
      queryClient.invalidateQueries({
        queryKey: ["screener-rejected-leads"],
      });
      toast.success("Lead rejected successfully");
      setShowRejectionModal(false);
      setSelectedReason("");
      setRejectionNotes("");
      setRejectingLead(null);
      setLoadingState((prev) => ({ ...prev, [rejectingLead?.id]: false }));
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject lead");
      setLoadingState((prev) => ({ ...prev, [rejectingLead?.id]: false }));
    },
  });

  const disposeLeadMutation = useMutation({
    mutationFn: toggleDisposeLead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["screener-partial-allocated-lead"],
      });
      toast.success("Lead disposed successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to dispose lead");
    },
  });

  const data = useMemo(() => leadData?.leads || [], [leadData]);


  const handleRowClick = (user) => {
    setExpandedRow(expandedRow === user.id ? null : user.id);
  };

    const handleDetailsClick = (lead) => {
    if (Number(lead?.version) === 2 && lead?.pan) {
      const leadId = lead.lead_id || lead.id;
      navigate(`/sales-ops/allocated-partial/summary-data/${lead.pan}?leadId=${leadId}`);
      return;
    }

    dispatch(
      openDetailModal({
        row: lead,
        showReject: true,
        showApprove: lead?.lead_stage === "REJECT_AADHAR_KYC",
        role: "Screener",
      })
    );
  };

  const handleReject = (lead) => {
    setRejectingLead(lead);
    setSelectedReason("");
    setCustomReason("");
    setRejectionNotes("");
    setShowRejectionModal(true);
  };

  const handleManualKycApprove = (lead) => {
    setApprovingLead(lead);
    setShowManualKycApproveModal(true);
  }

  const submitRejection = () => {
    const finalReason =
      selectedReason === "Other" ? customReason.trim() : selectedReason;

    if (!finalReason) {
      toast.error("Please provide a rejection reason");
      return;
    }

    if (!rejectingLead) {
      toast.error("No lead selected for rejection");
      return;
    }

    setLoadingState((prev) => ({ ...prev, [rejectingLead.id]: true }));
    const remarks = `${finalReason}${rejectionNotes ? ` - ${rejectionNotes}` : ""
      }`;
    rejectMutation.mutate({ id: rejectingLead.id, remarks });
  };

  const handleModalOutsideClick = (e) => {
    try {
      if (e.target === e.currentTarget) {
        setShowRejectionModal(false);
        setRejectingLead(null);
        setSelectedReason("");
        setRejectionNotes("");
        setCustomReason("");
        setSelectedReason("");
        setRejectionNotes("");
        setCustomReason("");
      }
    } catch (err) {
      console.error("Error handling modal click:", err);
      setError("Error occurred while handling modal. Please try again.");
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
    setCaseType(null);
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
          // Calendar now shows directly in FilterModal, no need to show separate date picker
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
    setCaseType(null);
    setStartDate(null);
    setEndDate(null);
    setTimePeriod(null);
    setOrderBy(null);
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
              !(f.field === "status" && String(f.value) === String(meta.value))
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
        setTimePeriod(null);
        setOrderBy(null);
        setStartDate(null);
        setEndDate(null);
        break;
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
                  Allocated Partial Leads
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
                <div className="relative flex-shrink-0 flex flex-col items-end gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <ReloanToggle
                      checked={isReloanSelected}
                      onToggle={handleReloanToggle}
                      disabled={!isReloanToggleAvailable}
                      show={isReloanToggleAvailable}
                    />
                    <FilterButton
                      onFilter={() => setIsFilterModalOpen(true)}
                      hasActiveFilter={activeFilter.length > 0}
                    />
                    <FilterModal
                      isOpen={isFilterModalOpen}
                      onClose={() => setIsFilterModalOpen(false)}
                      onApply={handleFilterApply}
                      currentFilters={activeFilter || []}
                      showSource={true}
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
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {isLoadingLeads ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">Loading allocated partial leads...</p>
                </div>
              </div>
            ) : (fetchError || error) ? (
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
            ) : data.length > 0 ? (
              <div className="h-full overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/70">
                    <TableHeader
                      showStatus={true}
                      data={{ lead_stage: true }}
                      showSource={true}
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
                          loadingStates={loadingState}
                          handleRowClick={handleRowClick}
                          onDetailsClick={handleDetailsClick}
                          enableRowExpandOnClick={true}
                          isActionButtonNeeded={row.lead_stage === "REJECT_AADHAR_KYC" ? true : false}
                          isSelectButtonNeeded={false}
                          handleSingleAction={row.lead_stage === "REJECT_AADHAR_KYC" ? handleManualKycApprove : handleReject}
                          showStatus={true}
                          showSource={true}
                          showCommentColumn={true}
                          isDetailedViewNeeded={true}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={handleReject}
                            loadingState={loadingState}
                            mutateRejectLead={rejectMutation}
                            isRejectionNeeded={true}
                            isNCandNRNeeded={true}
                            isUploadAddtionalDocumentNeeded={true}
                            role="screener"
                            showReject={true}
                            leadID={row.lead_no}
                            isDisposeNeeded={false}
                            disposeLeadMutation={disposeLeadMutation}
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
                  <p className="text-sm font-medium text-slate-500">No allocated partial leads found.</p>
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

      <ManualKycApproveModal
        showManualKycApproveModal={showManualKycApproveModal}
        handleModalOutsideClick={handleModalOutsideClick}
        approvingLead={approvingLead}
        setShowManualKycApproveModal={setShowManualKycApproveModal}
      />

      <RejectionModal
        showRejectionModal={showRejectionModal}
        handleModalOutsideClick={handleModalOutsideClick}
        rejectingLead={rejectingLead}
        setShowRejectionModal={setShowRejectionModal}
        submitRejection={submitRejection}
        selectedReason={selectedReason}
        setSelectedReason={setSelectedReason}
        rejectionReasons={rejectionReasons}
        rejectionNotes={rejectionNotes}
        setRejectionNotes={setRejectionNotes}
        customReason={customReason}
        setCustomReason={setCustomReason}
        loadingState={loadingState}
        leadID={rejectingLead?.lead_no}
      />
    </div>
  );
}

export default AllocatedPartialLeadsWithErrorBoundary;
