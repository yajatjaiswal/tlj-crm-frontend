import React, { useState, useMemo, useEffect, useRef } from "react";
import { UserCircle, X } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getLeadRepaymentSummary } from "../../services/functions/screener";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import Pagination from "../../Components/Pagination/Pagination";
import FilterButton from "../../Components/Table/FilterButton";
import FilterModal from "../../Components/Modals/FilterModal";
import {
  getYesterdayIST,
  getLastMonthRangeIST,
  getLastWeekRangeIST,
} from "../../utils/istDateUtils";
import { usePaginationState } from "../../hooks/usePaginationState";

const RepaymentLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <RepaymentLeads />
  </ErrorBoundary>
);

const formatName = (name) => {
  if (!name) return "N/A";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === "") return "N/A";
  const parsed = Number(amount);
  if (Number.isNaN(parsed)) return "N/A";
  return `₹${Math.round(parsed).toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const thClass =
  "px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200/70";

const RepaymentLeads = () => {
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

  const getFiltersStorageKey = () => {
    if (typeof window === "undefined") return null;
    return `filters:${window.location.pathname}`;
  };

  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const [error, setError] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([]);
  const [timePeriod, setTimePeriod] = useState(null);
  const [caseType, setCaseType] = useState(null);
  const [paymentType, setPaymentType] = useState(null);
  const [isActive, setIsActive] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const hasHydratedFiltersRef = useRef(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);

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
      const savedFilters = parsed?.activeFilter || [];
      if (savedFilters.length === 0) return;
      setActiveFilter(savedFilters);
      setTimePeriod(parsed?.timePeriod ?? null);
      setCaseType(parsed?.caseType ?? null);
      setPaymentType(parsed?.payment_type ?? null);
      setIsActive(
        parsed?.is_active !== undefined && parsed?.is_active !== null
          ? parsed.is_active
          : null
      );
      setStartDate(parsed?.startDate ?? null);
      setEndDate(parsed?.endDate ?? null);
    } catch {
      // ignore corrupted storage
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
        timePeriod,
        caseType,
        payment_type: paymentType,
        is_active: isActive,
        startDate,
        endDate,
      })
    );
  }, [activeFilter, timePeriod, caseType, paymentType, isActive, startDate, endDate]);

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

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
    } else if (timePeriod !== "Date Range") {
      setStartDate(null);
      setEndDate(null);
    }
  }, [timePeriod]);

  const formattedTime = useMemo(() => {
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
    return null;
  }, [timePeriod, startDate, endDate]);

  const requestBody = useMemo(() => {
    const body = {};
    if (formattedTime) {
      body.time = formattedTime;
      if (formattedTime === "customDate" && startDate && endDate) {
        body.startDate = startDate;
        body.endDate = endDate;
      }
    }
    if (caseType) body.caseType = caseType;
    if (paymentType) body.payment_type = paymentType;
    if (isActive !== null && isActive !== undefined) {
      body.is_active = isActive;
    }
    return body;
  }, [formattedTime, caseType, paymentType, isActive, startDate, endDate]);

  const {
    data: leadData,
    isPending: isLoadingLeads,
    isFetching: isFetchingLeads,
    isError: isLeadError,
    error: leadError,
    refetch,
  } = useQuery({
    queryKey: [
      "repayment-leads",
      currentPage,
      itemsPerPage,
      searchQuery,
      requestBody,
    ],
    queryFn: () =>
      getLeadRepaymentSummary({
        page: currentPage,
        limit: itemsPerPage,
        search_text: searchQuery || undefined,
        body: requestBody,
      }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 2,
    onError: (fetchError) => {
      console.error("Error fetching repayment leads:", fetchError);
      setError("Failed to load repayment leads. Please try again later.");
      toast.error("Failed to load repayment leads");
    },
  });

  useEffect(() => {
    if (leadData?.pagination?.currentPage) {
      syncWithApiResponse(leadData.pagination.currentPage);
    }
  }, [leadData?.pagination?.currentPage, syncWithApiResponse]);

  const data = useMemo(() => leadData?.leads || [], [leadData]);

  const pagination = useMemo(
    () =>
      leadData?.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 },
    [leadData]
  );

  const filterChipMetas = useMemo(() => {
    const chips = [];
    if (timePeriod) {
      const label =
        timePeriod === "Date Range" && startDate && endDate
          ? `Time: ${startDate} – ${endDate}`
          : `Time: ${timePeriod}`;
      chips.push({ kind: "timePeriod", label });
    }
    if (caseType) {
      chips.push({
        kind: "caseType",
        label: `Case: ${caseType === "reloan" ? "Reloan" : "Fresh"}`,
      });
    }
    if (paymentType) {
      chips.push({
        kind: "payment_type",
        label: `Payment: ${paymentType.toUpperCase()}`,
      });
    }
    if (isActive !== null && isActive !== undefined) {
      chips.push({
        kind: "is_active",
        label: isActive ? "Status: Active" : "Status: Inactive",
      });
    }
    return chips;
  }, [timePeriod, startDate, endDate, caseType, paymentType, isActive]);

  const handleFilterApply = (filters) => {
    setCurrentPage(1);
    setActiveFilter(filters);
    setTimePeriod(null);
    setCaseType(null);
    setPaymentType(null);
    setIsActive(null);
    setStartDate(null);
    setEndDate(null);

    if (!filters?.length) {
      setIsFilterModalOpen(false);
      return;
    }

    filters.forEach((filter) => {
      switch (filter.field) {
        case "caseType":
          setCaseType(filter.value);
          break;
        case "payment_type":
          setPaymentType(filter.value);
          break;
        case "is_active":
          setIsActive(filter.value === "true" || filter.value === true);
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
        default:
          break;
      }
    });

    setIsFilterModalOpen(false);
  };

  const handleRemoveFilterChip = (meta) => {
    setCurrentPage(1);
    let nextActiveFilter = activeFilter;

    switch (meta.kind) {
      case "timePeriod":
        setTimePeriod(null);
        setStartDate(null);
        setEndDate(null);
        nextActiveFilter = (activeFilter || []).filter(
          (f) =>
            !["timePeriod", "startDate", "endDate", "order_by"].includes(f.field)
        );
        break;
      case "caseType":
        setCaseType(null);
        nextActiveFilter = (activeFilter || []).filter((f) => f.field !== "caseType");
        break;
      case "payment_type":
        setPaymentType(null);
        nextActiveFilter = (activeFilter || []).filter(
          (f) => f.field !== "payment_type"
        );
        break;
      case "is_active":
        setIsActive(null);
        nextActiveFilter = (activeFilter || []).filter((f) => f.field !== "is_active");
        break;
      default:
        break;
    }

    setActiveFilter(nextActiveFilter);
  };

  const displayError = error || leadError;
  const isTableLoading = isLoadingLeads && !leadData;

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
                  Repayment Leads
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

                <div className="relative flex flex-shrink-0 flex-col items-end gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FilterButton
                      onFilter={() => setIsFilterModalOpen(true)}
                      hasActiveFilter={filterChipMetas.length > 0}
                    />
                    <FilterModal
                      isOpen={isFilterModalOpen}
                      onClose={() => setIsFilterModalOpen(false)}
                      onApply={handleFilterApply}
                      currentFilters={activeFilter}
                      showCasetype
                      showTimePeriod
                      showPaymentType
                      showIsActive
                      showAssignee={false}
                      showSource={true}
                      showLoanAmount={false}
                      showStatus={false}
                      showStartDate={false}
                      showEndDate={false}
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
            {isTableLoading ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">
                    Loading repayment leads...
                  </p>
                </div>
              </div>
            ) : isLeadError || displayError ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {displayError?.message ||
                      displayError ||
                      "Failed to load repayment leads. Please try again."}
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
                    <tr className="border-b border-slate-200 text-slate-700">
                      <th className={thClass}>PAN</th>
                      <th className={thClass}>Lead ID</th>
                      <th className={thClass}>Full name</th>
                      <th className={thClass}>Repayment amount</th>
                      <th className={thClass}>Repayment date</th>
                      <th className={thClass}>DPD</th>
                      <th className={`${thClass} border-r-0`}>Collection status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => {
                      const rowId = row.id ?? row.pan;
                      const collectionActive =
                        row.collection_active !== undefined
                          ? row.collection_active
                          : row.is_active ?? row.isActive;

                      return (
                        <tr
                          key={rowId}
                          className="group border-b border-slate-100 hover:bg-slate-50/80"
                        >
                          <td className="border-r border-slate-200/50 px-4 py-3 text-sm text-slate-800">
                            {row.pan || "N/A"}
                          </td>
                          <td className="border-r border-slate-200/50 px-4 py-3 text-sm text-slate-800">
                            {row.id ?? row.lead_no ?? row.leadNo ?? "N/A"}
                          </td>
                          <td className="border-r border-slate-200/50 px-4 py-3 text-sm text-slate-800">
                            {formatName(row.full_name || row.fullName)}
                          </td>
                          <td className="border-r border-slate-200/50 px-4 py-3 text-sm text-slate-800">
                            {formatCurrency(
                              row.repayment_amount ?? row.repaymentAmount
                            )}
                          </td>
                          <td className="border-r border-slate-200/50 px-4 py-3 text-sm text-slate-800">
                            {formatDate(
                              row.repayment_date ??
                                row.repaymentDate ??
                                row.latest_repayment_date_disbursed
                            )}
                          </td>
                          <td className="border-r border-slate-200/50 px-4 py-3 text-sm text-slate-800">
                            {row.dpd !== undefined && row.dpd !== null
                              ? `${row.dpd} days`
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                collectionActive === false ||
                                collectionActive === "false"
                                  ? "bg-green-50 text-green-700"
                                  : collectionActive === true ||
                                      collectionActive === "true"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {collectionActive === false ||
                              collectionActive === "false"
                                ? "Recovered"
                                : collectionActive === true ||
                                    collectionActive === "true"
                                  ? "Active"
                                  : "N/A"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">
                    No repayment leads found.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-2 py-2 sm:px-4">
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isLoading={isFetchingLeads}
              pagination={pagination}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepaymentLeadsWithErrorBoundary;
