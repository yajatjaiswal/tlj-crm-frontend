import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import { usePaginationState } from "../../hooks/usePaginationState";
import { getLocationSuspiciousLeads } from "../../services/functions/credit-analyst";
import { openDetailModal } from "../../redux/slices/detailModal";
import LocationAnalysisModal from "../../Components/Modals/LocationAnalysisModal";

const LocationSuspiciousLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <LocationSuspiciousLeads />
  </ErrorBoundary>
);

const LocationSuspiciousLeads = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userRoles = useSelector((state) => state.user.allRoles);
  const isQualityChecker =
    Array.isArray(userRoles) &&
    userRoles.some((role) => String(role).toUpperCase() === "QUALITY-CHECKER");
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
  const [error, setError] = useState(null);
  const [locationLeadId, setLocationLeadId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, searchQuery);

  const {
    data: locationLeads,
    isPending: isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: [
      "location-suspicious-leads",
      currentPage,
      itemsPerPage,
      searchQuery,
    ],
    queryFn: () =>
      getLocationSuspiciousLeads({
        page: currentPage,
        limit: itemsPerPage,
        search_text: searchQuery || undefined,
      }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  useEffect(() => {
    if (fetchError) {
      setError("Failed to load location suspicious leads. Please try again later.");
      toast.error("Failed to load location suspicious leads");
    }
  }, [fetchError]);

  useEffect(() => {
    if (locationLeads?.pagination?.currentPage) {
      syncWithApiResponse(locationLeads.pagination.currentPage);
    }
  }, [locationLeads?.pagination?.currentPage, syncWithApiResponse]);

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

  const filteredData = useMemo(() => {
    const leads = Array.isArray(locationLeads?.leads) ? locationLeads.leads : [];
    return leads.map((item) => {
      const lead = item?.lead ? { ...item.lead, ...item } : item;
      return {
        ...lead,
        id: lead.id ?? lead.lead_id,
        lead_stage: lead.lead_stage_mapped || lead.lead_stage,
        location_suspicious:
          lead.location_suspicious ?? lead["location-suspicious"] ?? true,
      };
    });
  }, [locationLeads?.leads]);

  const handleRowClick = (row) => {
    setExpandedRow(expandedRow === row.id ? null : row.id);
  };

  const handleCheck = (row, event) => {
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
        `/quality-checker/location-suspicious-leads/summary-data/${lead.pan}?leadId=${leadId}`
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

  const totalFlagged = Number(locationLeads?.pagination?.totalItems || 0);

  return (
    <div className="h-[90vh] overflow-hidden bg-slate-50 px-3 py-3 sm:px-4">
      <div className="mx-auto flex h-full min-h-0 max-w-[98vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <MapPin size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900">
                  Location Suspicious Leads
                </h1>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {isLoading ? "…" : totalFlagged} to check
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                A check or address is farther than allowed. Open Check, then allow or reject the lead.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-80">
            <SearchField
              onSearch={(value) => {
                setSearchQuery(value);
              }}
              defaultValue={searchQuery}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm font-medium text-slate-500">
                Loading flagged leads...
              </p>
            </div>
          ) : fetchError || error ? (
            <div className="p-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  {error || "Could not load these leads. Try again."}
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
                      handleSingleAction={handleCheck}
                      onDetailsClick={handleDetailsClick}
                      isActionButtonNeeded={isQualityChecker}
                      actionButtonLabel="Check"
                      actionButtonClassName="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer w-24 flex items-center justify-center font-semibold"
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
              <MapPin className="text-slate-300" size={28} />
              <p className="text-sm font-medium text-slate-700">
                No flagged leads
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                {locationLeads?.message ||
                  "Nothing is waiting for a location check."}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200">
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isLoading={isLoading}
            pagination={locationLeads?.pagination}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
        </div>
      </div>
      {isQualityChecker && locationLeadId && (
        <LocationAnalysisModal
          leadId={locationLeadId}
          onClose={() => setLocationLeadId(null)}
        />
      )}
    </div>
  );
};

export default LocationSuspiciousLeadsWithErrorBoundary;
