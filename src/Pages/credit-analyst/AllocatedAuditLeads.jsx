import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Check,
  UserCircle,
} from "lucide-react";
import { getAuditLeads, approveAuditLead } from "../../services/functions/credit-analyst";
import { toggleDisposeLead } from "../../services/functions/screener";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal"
import FilterModal from "../../Components/Modals/FilterModal";
import { getStatusOptions } from "../../utils/statusOptions";
import { usePaginationState } from "../../hooks/usePaginationState";
import { openDetailModal } from "../../redux/slices/detailModal";
import FilterButton from "../../Components/Table/FilterButton";

// Error boundary wrapper component
const AllocatedAuditLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <AllocatedAuditLeads />
  </ErrorBoundary>
);

const AllocatedAuditLeads = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
  const [loadingStates, setLoadingStates] = useState({});
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [calculatedLoanAmount, setCalculatedLoanAmount] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [branchName, setBranchName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [salaryDate, setSalaryDate] = useState("");
  const [error, setError] = useState(null);
  
  // Filter states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [source, setSource] = useState(null);
  const [loanAmount, setLoanAmount] = useState(null);
  const [status, setStatus] = useState(null);

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
    } catch (e) {
      // ignore corrupted storage
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
    };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  }, [activeFilter, employeeId, source, loanAmount, status]);

  const queryClient = useQueryClient();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Use pagination hook for stable pagination
  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(1, searchQuery);

  // API call to fetch allocated audit leads
  const { data: auditLeads, isPending: isLoading, error: fetchError } = useQuery({
    queryKey: ["allocated-audit-leads", currentPage, itemsPerPage, searchQuery, employeeId, source, loanAmount, status],
    queryFn: () => getAuditLeads({ 
      page: currentPage, 
      limit: itemsPerPage, 
      view: "personal", 
      category: "assign",
      search_text: searchQuery || undefined,
      employee_id: employeeId,
      source: source,
      loan_amount: loanAmount,
      lead_stage: status
      // role:"CREDI"
    }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching allocated audit leads:", error);
      setError("Failed to load allocated audit leads. Please try again later.");
      toast.error("Failed to load allocated audit leads");
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


  // Approve Audit Lead mutation
  const { mutate: mutateApproveAuditLead } = useMutation({
    mutationFn: approveAuditLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["allocated-audit-leads"]);
      toast.success("Audit Lead Approved Successfully");
      setShowApprovalModal(false);
      setSelectedLead(null);
      setCalculatedLoanAmount("");
      setApprovalRemarks("");
      setBranchName("");
      setBankAccountNo("");
      setIfscCode("");
      setSalaryDate("");
      setError(null);
    },
    onError: (error) => {
      console.error("Error approving audit lead:", error);
      setError("Failed to approve audit lead. Please try again.");
      toast.error("Failed to Approve Audit Lead");
    }
  });

  // Dispose Lead mutation
  const disposeLeadMutation = useMutation({
    mutationFn: toggleDisposeLead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["allocated-audit-leads"],
      });
      toast.success("Lead disposed successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to dispose lead");
    },
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

  const handleRowClick = (user) => {
    try {
      setExpandedRow(expandedRow === user.id ? null : user.id);
    } catch (err) {
      console.error("Error expanding row:", err);
      setError("Error occurred while expanding lead details. Please try again.");
    }
  };

  const handleApprove = (lead, e) => {
    try {
      e.stopPropagation();
      setSelectedLead(lead);
      setShowApprovalModal(true);
    } catch (err) {
      console.error("Error in handleApprove:", err);
      setError("Error occurred while preparing to approve audit lead. Please try again.");
    }
  };

    const handleDetailsClick = (lead) => {
    if (Number(lead?.version) === 2 && lead?.pan) {
      const leadId = lead.lead_id || lead.id;
      navigate(
        `/credit-analyst/allocated-leads-audit/summary-data/${lead.pan}?leadId=${leadId}`
      );
      return;
    }

    dispatch(
      openDetailModal({
        row: lead,
        showReject: false,
        showApprove: true,
        role: "Credit-Analyst",
      })
    );
  };

  const confirmApprove = () => {
    try {
      if (!selectedLead) {
        toast.error("No audit lead selected for approval");
        return;
      }

      if (!calculatedLoanAmount) {
        toast.error("Please enter the calculated loan amount");
        return;
      }

      setLoadingStates((prevStates) => ({ ...prevStates, [selectedLead.id]: true }));
      
      mutateApproveAuditLead({
        id: selectedLead.audit_id,
        calculated_loan_amount: calculatedLoanAmount,
        branch_name: branchName,
        bank_acc_no: bankAccountNo,
        ifsc_code: ifscCode,
        salary_date: salaryDate,
        remarks: approvalRemarks,
      });
    } catch (err) {
      console.error("Error in confirmApprove:", err);
      setError("Error occurred while approving audit lead. Please try again.");
      setLoadingStates({});
    }
  };

  const handleModalOutsideClick = (e) => {
    try {
      if (e.target === e.currentTarget) {
        setShowApprovalModal(false);
        setSelectedLead(null);
        setCalculatedLoanAmount("");
        setApprovalRemarks("");
        setBranchName("");
        setBankAccountNo("");
        setIfscCode("");
        setSalaryDate("");
        setLoadingStates({});
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
    setIsFilterModalOpen(false);
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
                  Allocated Audit Leads
                </h1>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                <div className="assigned-leads-search-wrap min-w-[320px] flex-1 sm:min-w-[360px] sm:max-w-[520px] sm:flex-none">
                  <SearchField
                    onSearch={(value) => {
                      setSearchQuery(value);
                    }}
                    defaultValue={searchQuery}
                  />
                </div>
                <div className="relative flex-shrink-0">
                  {/* <FilterButton
                    onFilter={() => setIsFilterModalOpen(true)}
                    hasActiveFilter={activeFilter.length > 0}
                  /> */}
                  <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={handleFilterApply}
                    currentFilters={activeFilter || []}
                    showAssignee={true}
                    showSource={true}
                    showLoanAmount={true}
                    showStatus={true}
                    statusOptions={getStatusOptions("audit")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">Loading allocated audit leads...</p>
                </div>
              </div>
            ) : (fetchError || error) ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {error || "Failed to load allocated audit leads. Please try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      queryClient.invalidateQueries(["allocated-audit-leads"]);
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
                    <TableHeader showSource={true} showCommentColumn={true} />
                  </thead>
                  <tbody>
                    {filteredData.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={expandedRow}
                          selectedRows={new Set()}
                          loadingStates={loadingStates}
                          handleRowClick={handleRowClick}
                          onDetailsClick={handleDetailsClick}
                          enableRowExpandOnClick={true}
                          isActionButtonNeeded={true}
                          isSelectButtonNeeded={false}
                          handleSingleAction={handleApprove}
                          isDetailedViewNeeded={true}
                          actionButtonText="Action"
                          modalButtonText="Action"
                          showSource={true}
                          showCommentColumn={true}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={null}
                            loadingState={loadingStates}
                            isNCandNRNeeded={true}
                            mutateRejectLead={null}
                            isRejectionNeeded={false}
                            isUploadAddtionalDocumentNeeded={true}
                            role=""
                            showReject={false}
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
                  <p className="text-sm font-medium text-slate-500">No allocated audit leads found.</p>
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

      {/* Approval Modal */}
      <ActionModal
        showModal={showApprovalModal}
        handleModalOutsideClick={handleModalOutsideClick}
        selectedLead={selectedLead}
        selectedRows={new Set()}
        setShowModal={setShowApprovalModal}
        setSelectedLead={setSelectedLead}
        confirmAction={confirmApprove}
        actionButtonText="Approving..."
        modalTitle={`Approve Audit Lead ${selectedLead?.lead_no}`}
        modalDescription={`Are you sure you want to approve this audit lead?`}
        modalButtonText="Approve"
        isInputNeeded={true}
        calculatedLoanAmount={calculatedLoanAmount}
        setCalculatedLoanAmount={setCalculatedLoanAmount}
        approvalRemarks={approvalRemarks}
        setApprovalRemarks={setApprovalRemarks}
        branchName={branchName}
        setBranchName={setBranchName}
        bankAccountNo={bankAccountNo}
        setBankAccountNo={setBankAccountNo}
        ifscCode={ifscCode}
        setIfscCode={setIfscCode}
        salaryDate={salaryDate}
        setSalaryDate={setSalaryDate}
        modalType="allocated-audit"
        onApproveWithVerification={() => {
          queryClient.invalidateQueries(["allocated-audit-leads"]);
          setError(null);
        }}
        onRejectWithVerification={() => {
          queryClient.invalidateQueries(["allocated-audit-leads"]);
          setError(null);
        }}
      />
    </div>
  );
}

export default AllocatedAuditLeadsWithErrorBoundary; 