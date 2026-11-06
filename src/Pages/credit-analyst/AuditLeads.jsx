import React, { useState, useMemo, useEffect } from "react";
import {
  Check,
  UserCircle,
} from "lucide-react";
import { getAuditLeads, selfAssignMultipleAuditLead, assignKycAudit } from "../../services/functions/credit-analyst";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal"
import { usePaginationState } from "../../hooks/usePaginationState";

// Error boundary wrapper component
const AuditLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <AuditLeads />
  </ErrorBoundary>
);

const AuditLeads = () => {
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

  // Modified API call to fetch data with pagination and error handling
  const { data: auditLeads, isPending: isLoading, error: fetchError } = useQuery({
    queryKey: ["audit-leads", currentPage, itemsPerPage, searchQuery],
    queryFn: () => getAuditLeads({ 
      page: currentPage, 
      limit: itemsPerPage, 
      view: "global_unassigned", 
      category: "pending",
      role: "CREDIT-TEAM",
      search_text: searchQuery || undefined 
    }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching audit leads:", error);
      setError("Failed to load audit leads. Please try again later.");
      toast.error("Failed to load audit leads");
    }
  });

  // Sync with API pagination when available
  useEffect(() => {
    if (auditLeads?.pagination?.currentPage) {
      syncWithApiResponse(auditLeads.pagination.currentPage);
    }
  }, [auditLeads?.pagination?.currentPage, syncWithApiResponse]);

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

  // Assign Leads with error handling
  const { mutate: mutateAssignAuditLead } = useMutation({
    mutationFn: selfAssignMultipleAuditLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["audit-leads"]);
      toast.success("Audit Leads Assigned Successfully");
      setSelectedRows(new Set());
      setIsLoadingMultipleAssign(false);
      setError(null);
    },
    onError: (error) => {
      console.error("Error assigning audit leads:", error);
      setError("Failed to assign audit leads. Please try again.");
      toast.error("Failed to Assign Audit Leads");
      setIsLoadingMultipleAssign(false);
    }
  });

  // KYC Audit Assignment with error handling
  const { mutate: mutateAssignKycAudit } = useMutation({
    mutationFn: assignKycAudit,
    onSuccess: () => {
      queryClient.invalidateQueries(["audit-leads"]);
      toast.success("KYC Audit Leads Assigned Successfully");
      setSelectedRows(new Set());
      setIsLoadingMultipleAssign(false);
      setShowAssignModal(false);
      setSelectedLead(null);
      setError(null);
    },
    onError: (error) => {
      console.error("Error assigning KYC audit leads:", error);
      setError("Failed to assign KYC audit leads. Please try again.");
      toast.error("Failed to Assign KYC Audit Leads");
      setIsLoadingMultipleAssign(false);
    }
  });

  const filteredData = useMemo(() => {
    try {
      if (!auditLeads?.audits) return [];
      
      // Flatten the audit data to make lead information accessible at top level
      const flattenedData = auditLeads.audits.map(audit => ({
        ...audit,
        // Spread lead data to top level
        ...audit.lead,
        // Use audit status for display in the status column
        lead_stage: audit.status_label || audit.lead_stage_mapped || audit.lead_stage,
        // Keep audit-specific fields
        audit_id: audit.id,
        audit_status: audit.status,
        audit_status_label: audit.status_label,
        audit_remarks: audit.remarks,
        audit_linkedin_url: audit.linkedin_url,
        audit_website_url: audit.website_url,
        audit_gst_no: audit.gst_no,
        audit_company_name: audit.company_name,
        audit_is_linkedin_verify: audit.is_linkedin_verify,
        audit_is_website_verify: audit.is_website_verify,
        audit_is_bsa_run: audit.is_bsa_run,
        audit_is_company_verify: audit.is_company_verify,
        audit_assigned_to: audit.assigned_to,
        audit_assigned_by: audit.assigned_by,
        audit_approved_by: audit.approved_by,
        audit_rejected_by: audit.rejected_by,
        audit_created_at: audit.created_at,
        audit_updated_at: audit.updated_at,
        lead_stage_mapped: audit.lead_stage_mapped
      }));

      return flattenedData;
    } catch (err) {
      console.error("Error in data filtering:", err);
      setError("Error occurred while filtering data. Please try again.");
      return auditLeads?.audits || [];
    }
  }, [auditLeads?.audits]);

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
        toast.error("Please select at least one audit lead to assign");
        return;
      }
      setShowAssignModal(true);
    } catch (err) {
      console.error("Error in handleAssign:", err);
      setError("Error occurred while preparing to assign audit leads. Please try again.");
    }
  };

  const handleSingleAssign = (lead, e) => {
    try {
      e.stopPropagation();
      setSelectedLead(lead);
      setShowAssignModal(true);
    } catch (err) {
      console.error("Error in handleSingleAssign:", err);
      setError("Error occurred while preparing to assign audit lead. Please try again.");
    }
  };

  const confirmAssign = () => {
    try {
      if (selectedLead) {
        setLoadingStates((prevStates) => ({ ...prevStates, [selectedLead.id]: true }));
        mutateAssignKycAudit({ audit_ids: [selectedLead.audit_id] });
      } else {
        setIsLoadingMultipleAssign(true);
        const selectedLeads = filteredData.filter(row => selectedRows.has(row.id)) || [];
        if (selectedLeads.length === 0) {
          setError("No audit leads selected for assignment");
          return;
        }
        mutateAssignKycAudit({ audit_ids: selectedLeads.map(lead => lead.audit_id) });
      }
    } catch (err) {
      console.error("Error in confirmAssign:", err);
      setError("Error occurred while assigning audit leads. Please try again.");
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
                  Audit Leads
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
                <div className="flex flex-shrink-0 items-center justify-end gap-2">
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
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">Loading audit leads...</p>
                </div>
              </div>
            ) : (fetchError || error) ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {error || "Failed to load audit leads. Please try again."}
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
                <table className="w-full min-w-[900px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/70">
                    <TableHeader showSource={true} showCommentColumn={false} showSelectColumn />
                  </thead>
                  <tbody>
                    {filteredData.map((row) => (
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
                          showSource={true}
                          showCommentColumn={false}
                        />
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">No audit leads found.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-2 py-2 sm:px-4">
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isLoading={isLoading}
              pagination={auditLeads?.pagination}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      <ActionModal
        showModal={showAssignModal}
        handleModalOutsideClick={handleModalOutsideClick}
        selectedLead={selectedLead}
        selectedRows={selectedRows}
        setShowModal={setShowAssignModal}
        setSelectedLead={setSelectedLead}
        confirmAction={confirmAssign}
        actionButtonText="Assigning..."
        modalTitle={`Assign Audit Lead ${selectedLead?.lead_no}`}
        modalDescription={`Are you sure you want to assign these audit leads?`}
        modalButtonText="Assign"
      />
    </div>
  );
}

export default AuditLeadsWithErrorBoundary;