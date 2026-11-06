import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { XCircle } from "lucide-react";
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
import { usePaginationState } from "../../hooks/usePaginationState";
import { getLocationSuspiciousRejectedLeads } from "../../services/functions/credit-analyst";
import { openDetailModal } from "../../redux/slices/detailModal";
import { getStatusOptions } from "../../utils/statusOptions";

const TIME_OPTIONS = [
  { value: "Today", label: "Today" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
  { value: "This Year", label: "This Year" },
];

const toApiTime = (timePeriod) => {
  if (timePeriod === "Today") return "today";
  if (timePeriod === "This Week") return "weekly";
  if (timePeriod === "This Month") return "monthly";
  if (timePeriod === "This Year") return "yearly";
  return undefined;
};

const RejectedLocationLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <RejectedLocationLeads />
  </ErrorBoundary>
);

const RejectedLocationLeads = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [expandedRow, setExpandedRow] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([
    { field: "outcome", value: "checker", label: "Outcome: Rejected by checker" },
    { field: "timePeriod", value: "This Month", label: "Time Period: This Month" },
    { field: "order_by", value: "created_at", label: "Order By: Created At" },
  ]);
  const [outcome, setOutcome] = useState("checker");
  const [source, setSource] = useState(null);
  const [leadStage, setLeadStage] = useState(null);
  const [caseType, setCaseType] = useState(null);
  const [timePeriod, setTimePeriod] = useState("This Month");
  const [orderBy, setOrderBy] = useState("created_at");
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);

  const {
    data: rejectedLeads,
    isPending: isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: [
      "location-suspicious-rejected",
      currentPage,
      itemsPerPage,
      searchQuery,
      outcome,
      timePeriod,
      orderBy,
      source,
      leadStage,
      caseType,
    ],
    queryFn: () =>
      getLocationSuspiciousRejectedLeads({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        outcome: outcome || undefined,
        time: toApiTime(timePeriod),
        order_by: orderBy || "created_at",
        source: source || undefined,
        lead_stage: leadStage || undefined,
        caseType: caseType || undefined,
      }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  useEffect(() => {
    if (fetchError) {
      setError("Failed to load rejected leads. Please try again later.");
      toast.error("Failed to load rejected leads");
    }
  }, [fetchError]);

  useEffect(() => {
    if (rejectedLeads?.pagination?.currentPage) {
      syncWithApiResponse(rejectedLeads.pagination.currentPage);
    }
  }, [rejectedLeads?.pagination?.currentPage, syncWithApiResponse]);

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

  const filteredData = useMemo(() => {
    const leads = Array.isArray(rejectedLeads?.leads)
      ? rejectedLeads.leads
      : Array.isArray(rejectedLeads?.data)
        ? rejectedLeads.data
        : [];
    return leads.map((item) => {
      const lead = item?.lead ? { ...item.lead, ...item } : item;
      return {
        ...lead,
        id: lead.id ?? lead.lead_id,
        lead_stage: lead.lead_stage_mapped || lead.lead_stage,
      };
    });
  }, [rejectedLeads]);

  const handleFilterApply = (filters) => {
    setCurrentPage(1);
    setActiveFilter(filters);
    setOutcome(null);
    setSource(null);
    setLeadStage(null);
    setCaseType(null);
    setTimePeriod(null);
    setOrderBy("created_at");
    filters.forEach((filter) => {
      switch (filter.field) {
        case "outcome":
          setOutcome(filter.value);
          break;
        case "source":
          setSource(filter.value);
          break;
        case "status":
          setLeadStage(filter.value);
          break;
        case "caseType":
          setCaseType(filter.value);
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

  const handleRemoveFilter = (filter) => {
    setCurrentPage(1);
    setActiveFilter((current) =>
      (current || []).filter(
        (item) =>
          !(item.field === filter.field && String(item.value) === String(filter.value))
      )
    );
    switch (filter.field) {
      case "outcome":
        setOutcome(null);
        break;
      case "source":
        setSource(null);
        break;
      case "status":
        setLeadStage(null);
        break;
      case "caseType":
        setCaseType(null);
        break;
      case "timePeriod":
        setTimePeriod(null);
        break;
      case "order_by":
        setOrderBy("created_at");
        break;
      default:
        break;
    }
  };

  const handleRowClick = (row) => {
    setExpandedRow(expandedRow === row.id ? null : row.id);
  };

  const handleDetailsClick = (lead) => {
    if (Number(lead?.version) === 2 && lead?.pan) {
      const leadId = lead.lead_id || lead.id;
      navigate(
        `/quality-checker/rejected-leads/summary-data/${lead.pan}?leadId=${leadId}`
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

  const totalRejected = Number(rejectedLeads?.pagination?.totalItems || 0);

  return (
    <div className="h-[90vh] overflow-hidden bg-slate-50 px-3 py-3 sm:px-4">
      <div className="mx-auto flex h-full min-h-0 max-w-[98vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <XCircle size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base font-semibold text-slate-900">
                    Rejected Leads
                  </h1>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {isLoading ? "…" : totalRejected} rejected
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  Leads turned down after a location check, or rejected elsewhere. Open a row to see the details.
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
                  showSource
                  showStatus
                  showCasetype
                  statusOptions={getStatusOptions("rejected")}
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
                Loading rejected leads...
              </p>
            </div>
          ) : fetchError || error ? (
            <div className="p-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  {error || "Could not load rejected leads. Try again."}
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
                      onDetailsClick={handleDetailsClick}
                      isActionButtonNeeded={false}
                      isSelectButtonNeeded={false}
                      isDetailedViewNeeded
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
                        isLeadRejected
                      />
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <XCircle className="text-slate-300" size={28} />
              <p className="text-sm font-medium text-slate-700">
                No rejected leads
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                {rejectedLeads?.message ||
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
            pagination={rejectedLeads?.pagination}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
        </div>
      </div>
    </div>
  );
};

export default RejectedLocationLeadsWithErrorBoundary;
