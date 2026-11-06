import React, { useState, useMemo, useEffect } from "react";
import {
  Check,
  UserCircle,
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
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal";
import { usePaginationState } from "../../hooks/usePaginationState";

// Error boundary wrapper component
const MarketingLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <MarketingLeads />
    </ErrorBoundary>
  );
};

const MarketingLeads = () => {
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

  const queryClient = useQueryClient();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Use pagination hook for stable pagination
  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(1, searchQuery);

  const {
    data: leadData,
    isPending: isLoadingLeads,
    error: leadError,
    refetch,
  } = useQuery({
    queryKey: ["screener-marketing-leads", currentPage, itemsPerPage, searchQuery],
    queryFn: () => getLeadByCategory("marketing", currentPage, itemsPerPage, searchQuery),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
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

  const data = useMemo(() => leadData?.leads || [], [leadData]);

  const { mutate: mutateAssignLead } = useMutation({
    mutationFn: allocatMultipleLead,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["screener-marketing-leads"], exact: true });
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

  const handleAssign = () => {
    try {
      if (selectedRows.size === 0) {
        toast.error("Please select at least one lead to assign");
        // setError("No leads selected for assignment");
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
                  Marketing Leads
                </h1>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                <div className="assigned-leads-search-wrap min-w-0 flex-1 sm:min-w-[360px] sm:max-w-[520px] sm:flex-none">
                  <SearchField
                    onSearch={val => {
                      setSearchQuery(val);
                    }}
                    defaultValue={searchQuery}
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
                  <p className="text-sm font-medium text-slate-500">Loading marketing leads...</p>
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
                    <TableHeader showSelectColumn />
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={null}
                          selectedRows={selectedRows}
                          loadingStates={loadingStates}
                          handleRowClick={() => {}}
                          enableRowExpandOnClick={false}
                          isActionButtonNeeded={true}
                          isSelectButtonNeeded={true}
                          toggleSelection={toggleSelection}
                          handleSingleAction={handleSingleAssign}
                          isDetailedViewNeeded={false}
                          actionButtonText="Assigning..."
                          modalButtonText="Assign"
                        />
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">No marketing leads found.</p>
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
    </div>
  );
};

export default MarketingLeadsWithErrorBoundary;