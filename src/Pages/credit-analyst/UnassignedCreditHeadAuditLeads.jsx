import React, { useState, useMemo, useEffect } from "react";
import { getAuditLeads, assignKycAudit } from "../../services/functions/credit-analyst";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal";
import { usePaginationState } from "../../hooks/usePaginationState";
import { UserCircle } from "lucide-react";

const UnassignedCreditHeadAuditLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <UnassignedCreditHeadAuditLeads />
  </ErrorBoundary>
);

const UnassignedCreditHeadAuditLeads = () => {
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Use pagination hook for stable pagination
  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(1, searchQuery);

  // API call to fetch unassigned audit leads for credit head
  const { data: auditLeads, isPending: isLoading, error: fetchError, refetch } = useQuery({
    queryKey: ["unassigned-credit-head-audit-leads", currentPage, itemsPerPage, searchQuery],
    queryFn: () => getAuditLeads({ 
      page: currentPage, 
      limit: itemsPerPage, 
      view: "personal", 
      category: "pending",
      role: "CREDIT-HEAD",
      search_text: searchQuery || undefined
    }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      setError("Failed to load audit leads. Please try again later.");
      toast.error("Failed to load audit leads");
    }
  });

  // Sync current page with API pagination when available
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

  // Assign mutation
  const { mutate: mutateAssignKycAudit, isLoading: isAssigning } = useMutation({
    mutationFn: assignKycAudit,
    onSuccess: () => {
      queryClient.invalidateQueries(["unassigned-credit-head-audit-leads"]);
      toast.success("Audit Lead Assigned Successfully");
      setShowAssignModal(false);
      setSelectedLead(null);
      setLoadingStates({});
      setError(null);
    },
    onError: (error) => {
      setError("Failed to assign audit lead. Please try again.");
      toast.error("Failed to assign audit lead");
      setLoadingStates({});
    }
  });

  const filteredData = useMemo(() => {
    if (!auditLeads?.audits) return [];
    const flattenedData = auditLeads.audits.map(audit => ({
      ...audit,
      ...audit.lead,
      lead_stage: audit.lead_stage_mapped || audit.lead_stage,
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
  }, [auditLeads?.audits]);

  const handleAssign = (lead, e) => {
    e.stopPropagation();
    setSelectedLead(lead);
    setShowAssignModal(true);
  };

  const confirmAssign = () => {
    if (!selectedLead) return;
    setLoadingStates((prev) => ({ ...prev, [selectedLead.id]: true }));
    mutateAssignKycAudit({ audit_ids: [selectedLead.audit_id], assign_type: 'credit_head' });
  };

  const handleModalOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowAssignModal(false);
      setSelectedLead(null);
      setLoadingStates({});
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

              <div className="assigned-leads-search-wrap min-w-[320px] flex-1 sm:min-w-[360px] sm:max-w-[520px] sm:flex-none">
                <SearchField
                  onSearch={(value) => {
                    setSearchQuery(value);
                  }}
                  defaultValue={searchQuery}
                />
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
                    <TableHeader
                      showSource={true}
                      showStatus={true}
                      showCommentColumn={true}
                    />
                  </thead>
                  <tbody>
                    {filteredData.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={null}
                          selectedRows={new Set()}
                          loadingStates={loadingStates}
                          handleRowClick={() => {}}
                          enableRowExpandOnClick={false}
                          isActionButtonNeeded={true}
                          isSelectButtonNeeded={false}
                          handleSingleAction={handleAssign}
                          actionButtonText={loadingStates[row.id] ? "Assigning..." : "Assign"}
                          modalButtonText="Assign"
                          isDetailedViewNeeded={false}
                          showSource={true}
                          showStatus={true}
                          showCommentColumn={true}
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
        selectedRows={new Set()}
        setShowModal={setShowAssignModal}
        setSelectedLead={setSelectedLead}
        confirmAction={confirmAssign}
        actionButtonText={isAssigning ? "Assigning..." : "Assign"}
        modalTitle={`Assign Audit Lead ${selectedLead?.lead_no}`}
        modalDescription={`Are you sure you want to assign this audit lead?`}
        modalButtonText="Assign"
      />
    </div>
  );
};

export default UnassignedCreditHeadAuditLeadsWithErrorBoundary; 