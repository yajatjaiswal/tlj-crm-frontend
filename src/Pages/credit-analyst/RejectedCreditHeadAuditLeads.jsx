import React, { useState, useMemo, useEffect } from "react";
import { getAuditLeads } from "../../services/functions/credit-analyst";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import TableHeading from "../../Components/Table/TableHeading";
import { usePaginationState } from "../../hooks/usePaginationState";

const RejectedCreditHeadAuditLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <RejectedCreditHeadAuditLeads />
  </ErrorBoundary>
);

const RejectedCreditHeadAuditLeads = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Use pagination hook for stable pagination
  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(1, searchQuery);

  // API call to fetch rejected audit leads for credit head
  const { data: auditLeads, isPending: isLoading, error: fetchError, refetch } = useQuery({
    queryKey: ["rejected-credit-head-audit-leads", currentPage, itemsPerPage, searchQuery],
    queryFn: () => getAuditLeads({ 
      page: currentPage, 
      limit: itemsPerPage, 
      view: "personal", 
      category: "rejected",
      role: "CREDIT-HEAD",
      search_text: searchQuery || undefined
    }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      setError("Failed to load rejected audit leads. Please try again later.");
      toast.error("Failed to load rejected audit leads");
    }
  });

  // Sync with API pagination when available
  useEffect(() => {
    if (auditLeads?.pagination?.currentPage) {
      syncWithApiResponse(auditLeads.pagination.currentPage);
    }
  }, [auditLeads?.pagination?.currentPage, syncWithApiResponse]);

  const filteredData = useMemo(() => {
    if (!auditLeads?.audits) return [];
    const flattenedData = auditLeads.audits.map(audit => ({
      ...audit,
      ...audit.lead,
      lead_stage: audit.status_label || audit.lead_stage_mapped || audit.lead_stage,
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

  const handleRowClick = (user) => {
    setExpandedRow(expandedRow === user.id ? null : user.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-0 sm:px-6 py-6">
      <div className="mx-auto">
        <div className="flex justify-between items-center">
          <TableHeading heading="Rejected Audit Leads"/>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <SearchField
            onSearch={(value) => {
              setSearchQuery(value);
            }}
            defaultValue={searchQuery}
          />
          <div className="min-h-[420px] overflow-hidden">
            {isLoading ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">Loading rejected audit leads...</p>
                </div>
              </div>
            ) : (fetchError || error) ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {error || "Failed to load rejected audit leads. Please try again."}
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
            ) : filteredData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <TableHeader showCommentColumn={true} />
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
                          isActionButtonNeeded={false}
                          isSelectButtonNeeded={false}
                          isDetailedViewNeeded={true}
                          showCommentColumn={true}
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
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">No rejected audit leads found.</p>
                </div>
              </div>
            )}
          </div>
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
  );
};

export default RejectedCreditHeadAuditLeadsWithErrorBoundary; 