import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import FilterButton from "../../Components/Table/FilterButton";
import FilterModal from "../../Components/Modals/FilterModal";
import LocationAnalysisModal from "../../Components/Modals/LocationAnalysisModal";
import { usePaginationState } from "../../hooks/usePaginationState";
import { getLocationSuspiciousClearedLeads } from "../../services/functions/credit-analyst";
import { openDetailModal } from "../../redux/slices/detailModal";

const TIME_OPTIONS = [
  { value: "Today", label: "Today" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
  { value: "Date Range", label: "Date Range" },
];

const OUTCOME_OPTIONS = [
  { value: "all", label: "All approved" },
  { value: "cleared", label: "Cleared by checker" },
  { value: "speed_cleared", label: "Cleared by speed rule" },
  { value: "ip_cleared", label: "Cleared by same-IP rule" },
];

const toApiTime = (timePeriod) => {
  if (timePeriod === "Today") return "today";
  if (timePeriod === "This Week") return "weekly";
  if (timePeriod === "This Month") return "monthly";
  if (timePeriod === "Date Range") return "customDate";
  return undefined;
};

const ApprovedLocationLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <ApprovedLocationLeads />
  </ErrorBoundary>
);

const ApprovedLocationLeads = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userRoles = useSelector((state) => state.user.allRoles);
  const isQualityChecker =
    Array.isArray(userRoles) &&
    userRoles.some((role) => String(role).toUpperCase() === "QUALITY-CHECKER");
  const [expandedRow, setExpandedRow] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([
    { field: "outcome", value: "all", label: "Outcome: All approved" },
    { field: "timePeriod", value: "This Month", label: "Time Period: This Month" },
  ]);
  const [outcome, setOutcome] = useState("all");
  const [timePeriod, setTimePeriod] = useState("This Month");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
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
  const [error, setError] = useState(null);
  const [locationLeadId, setLocationLeadId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);

  const {
    data: clearedLeads,
    isPending: isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: [
      "location-suspicious-cleared",
      currentPage,
      itemsPerPage,
      searchQuery,
      outcome,
      timePeriod,
      startDate,
      endDate,
    ],
    queryFn: () =>
      getLocationSuspiciousClearedLeads({
        page: currentPage,
        limit: itemsPerPage,
        search_text: searchQuery || undefined,
        outcome: outcome || "all",
        time: toApiTime(timePeriod),
        startDate:
          timePeriod === "Date Range" && startDate ? startDate : undefined,
        endDate: timePeriod === "Date Range" && endDate ? endDate : undefined,
      }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  useEffect(() => {
    if (fetchError) {
      setError("Failed to load approved location leads. Please try again later.");
      toast.error("Failed to load approved location leads");
    }
  }, [fetchError]);

  useEffect(() => {
    if (clearedLeads?.pagination?.currentPage) {
      syncWithApiResponse(clearedLeads.pagination.currentPage);
    }
  }, [clearedLeads?.pagination?.currentPage, syncWithApiResponse]);

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

  const filteredData = useMemo(() => {
    const leads = Array.isArray(clearedLeads?.leads)
      ? clearedLeads.leads
      : Array.isArray(clearedLeads?.data)
        ? clearedLeads.data
        : [];
    return leads.map((item) => {
      const lead = item?.lead ? { ...item.lead, ...item } : item;
      return {
        ...lead,
        id: lead.id ?? lead.lead_id,
        lead_stage: lead.lead_stage_mapped || lead.lead_stage,
        location_suspicious: false,
      };
    });
  }, [clearedLeads]);

  const handleFilterApply = (filters) => {
    setCurrentPage(1);
    setActiveFilter(filters);
    setOutcome("all");
    setTimePeriod(null);
    setStartDate(null);
    setEndDate(null);
    filters.forEach((filter) => {
      switch (filter.field) {
        case "outcome":
          setOutcome(filter.value);
          break;
        case "timePeriod":
          setTimePeriod(filter.value);
          break;
        case "startDate":
          setStartDate(filter.value);
          break;
        case "endDate":
          setEndDate(filter.value);
          break;
        default:
          break;
      }
    });
    setIsFilterModalOpen(false);
  };

  const handleRemoveFilter = (filter) => {
    setCurrentPage(1);
    setActiveFilter((current) =>
      (current || []).filter((item) => {
        const isSame =
          item.field === filter.field && String(item.value) === String(filter.value);
        if (isSame) return false;
        if (
          filter.field === "timePeriod" &&
          (item.field === "startDate" || item.field === "endDate")
        ) {
          return false;
        }
        return true;
      })
    );
    switch (filter.field) {
      case "outcome":
        setOutcome("all");
        break;
      case "timePeriod":
        setTimePeriod(null);
        setStartDate(null);
        setEndDate(null);
        break;
      case "startDate":
        setStartDate(null);
        break;
      case "endDate":
        setEndDate(null);
        break;
      default:
        break;
    }
  };

  const handleRowClick = (row) => {
    setExpandedRow(expandedRow === row.id ? null : row.id);
  };

  const handleViewLocation = (row, event) => {
    event?.stopPropagation?.();
    const leadId = row?.lead_id || row?.id;
    if (!leadId) {
      toast.error("Lead id is not available");
      return;
    }
    setLocationLeadId(leadId);
  };

  const handleDetailsClick = (lead) => {
    if (Number(lead?.version) === 2 && lead?.pan) {
      const leadId = lead.lead_id || lead.id;
      navigate(
        `/quality-checker/approved-location-leads/summary-data/${lead.pan}?leadId=${leadId}`
      );
      return;
    }

    dispatch(
      openDetailModal({
        row: lead,
        showReject: false,
        showApprove: false,
        role: "Quality-Checker",
      })
    );
  };

  const totalApproved = Number(clearedLeads?.pagination?.totalItems || 0);

  return (
    <div className="h-[90vh] overflow-hidden bg-slate-50 px-3 py-3 sm:px-4">
      <div className="mx-auto flex h-full min-h-0 max-w-[98vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base font-semibold text-slate-900">
                    Approved Location Suspicious Leads
                  </h1>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {isLoading ? "…" : totalApproved} approved
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  Leads cleared by a quality checker, the speed rule, or the same-IP rule.
                </p>
              </div>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="min-w-0 flex-1 sm:w-80">
                <SearchField
                  onSearch={(value) => {
                    setSearchQuery(value);
                  }}
                  defaultValue={searchQuery}
                />
              </div>
              <div className="relative shrink-0">
                <FilterButton
                  onFilter={() => setIsFilterModalOpen(true)}
                  hasActiveFilter={activeFilter.length > 0}
                />
                <FilterModal
                  isOpen={isFilterModalOpen}
                  onClose={() => setIsFilterModalOpen(false)}
                  onApply={handleFilterApply}
                  currentFilters={activeFilter}
                  showOutcome
                  showTimePeriod
                  outcomeOptions={OUTCOME_OPTIONS}
                  timePeriodOptions={TIME_OPTIONS}
                />
              </div>
            </div>
          </div>
          {activeFilter.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilter.map((filter) => (
                <button
                  key={`${filter.field}-${filter.value}`}
                  type="button"
                  onClick={() => handleRemoveFilter(filter)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {filter.label} ×
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm font-medium text-slate-500">
                Loading approved leads...
              </p>
            </div>
          ) : fetchError || error ? (
            <div className="p-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  {error || "Could not load approved leads. Try again."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    refetch();
                  }}
                  className="mt-3 inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : filteredData.length > 0 ? (
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <TableHeader showStatus showCommentColumn />
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
                      handleSingleAction={handleViewLocation}
                      onDetailsClick={handleDetailsClick}
                      isActionButtonNeeded={isQualityChecker}
                      actionButtonLabel="View"
                      actionButtonClassName="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer w-24 flex items-center justify-center font-semibold"
                      isSelectButtonNeeded={false}
                      isDetailedViewNeeded={false}
                      showStatus
                      showCommentColumn
                    />
                    {expandedRow === row.id && (
                      <LeadExpandedRow
                        row={row}
                        handleReject={null}
                        loadingState={{}}
                        mutateRejectLead={null}
                        isRejectionNeeded={false}
                        isUploadAddtionalDocumentNeeded={true}
                        role=""
                        showReject={false}
                      />
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <CheckCircle className="text-slate-300" size={28} />
              <p className="text-sm font-medium text-slate-700">
                No approved leads
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                {clearedLeads?.message ||
                  "Nothing matches these filters. Remove a filter to see more leads."}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200">
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isLoading={isLoading}
            pagination={clearedLeads?.pagination}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
        </div>
      </div>
      {isQualityChecker && locationLeadId && (
        <LocationAnalysisModal
          leadId={locationLeadId}
          mode="cleared"
          onClose={() => setLocationLeadId(null)}
        />
      )}
    </div>
  );
};

export default ApprovedLocationLeadsWithErrorBoundary;
