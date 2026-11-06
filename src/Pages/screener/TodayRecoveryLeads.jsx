import React, { useState, useMemo, useEffect } from "react";
import { Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTodayRecoveryLeads, selfAssignReloanLead } from "../../services/functions/screener";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import LeadsLoading from "../../Components/Loading/LeadsLoading";
import { EmptyState, ErrorState } from "../../Components/ErrorStates/ErrorAndEmptyStates";
import TableHeading from "../../Components/Table/TableHeading";
import SearchField from "../../Components/Table/SearchField";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal";
import SvgLoader from "../../ui/SvgLoader";
import { usePaginationState } from "../../hooks/usePaginationState";

// Error boundary wrapper component
const TodayRecoveryLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <TodayRecoveryLeads />
    </ErrorBoundary>
  );
};

const TodayRecoveryLeads = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [loadingStates, setLoadingStates] = useState({});
  const [isLoadingMultipleAssign, setIsLoadingMultipleAssign] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const queryClient = useQueryClient();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Use pagination hook for stable pagination
  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(1, searchQuery);

  const {
    data: leadData,
    isPending: isLoadingLeads,
    isError: isLeadError,
    error: leadError,
  } = useQuery({
    queryKey: ["today-recovery-leads", currentPage, itemsPerPage, searchQuery],
    queryFn: () => getTodayRecoveryLeads(currentPage, itemsPerPage, searchQuery),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching today recovery leads:", error);
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

  const data = useMemo(() => {
    // Handle different possible response structures
    if (leadData?.leads) return leadData.leads;
    if (leadData?.data) return leadData.data;
    if (Array.isArray(leadData)) return leadData;
    return [];
  }, [leadData]);

  const { mutate: mutateAssignLead, mutateAsync: mutateAssignLeadAsync } = useMutation({
    mutationFn: selfAssignReloanLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-recovery-leads"] });
      queryClient.refetchQueries({ queryKey: ["today-recovery-leads"] });
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

  const handleRowClick = (user) => {
    try {
      const rowId = user.id || user.lead_no || user.pan;
      setExpandedRow(expandedRow === rowId ? null : rowId);
    } catch (err) {
      console.error("Error expanding row:", err);
      setError("Error occurred while expanding lead details. Please try again.");
    }
  };

  const handleAssign = () => {
    try {
      if (selectedRows.size === 0) {
        toast.error("Please select at least one lead to assign");
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

  const confirmAssign = async () => {
    try {
      if (selectedLead) {
        const leadId = selectedLead.id || selectedLead.lead_no || selectedLead.pan;
        setLoadingStates((prevStates) => ({ ...prevStates, [leadId]: true }));
        try {
          await mutateAssignLeadAsync(leadId);
          queryClient.invalidateQueries({ queryKey: ["today-recovery-leads"] });
          queryClient.refetchQueries({ queryKey: ["today-recovery-leads"] });
          toast.success("Lead Assigned Successfully");
          setLoadingStates({});
          setSelectedLead(null);
          setError(null);
        } catch (err) {
          setLoadingStates((prevStates) => {
            const newStates = { ...prevStates };
            delete newStates[leadId];
            return newStates;
          });
          throw err;
        }
      } else {
        setIsLoadingMultipleAssign(true);
        const selectedLeads = data.filter(row => {
          const rowId = row.id || row.lead_no || row.pan;
          return selectedRows.has(rowId);
        }) || [];
        if (selectedLeads.length === 0) {
          setError("No leads selected for assignment");
          setIsLoadingMultipleAssign(false);
          return;
        }
        const leadIds = selectedLeads.map(lead => lead.id || lead.lead_no || lead.pan);
        // Call the API for each lead ID
        try {
          await Promise.all(leadIds.map(leadId => mutateAssignLeadAsync(leadId)));
          queryClient.invalidateQueries({ queryKey: ["today-recovery-leads"] });
          queryClient.refetchQueries({ queryKey: ["today-recovery-leads"] });
          toast.success("Leads Assigned Successfully");
          setSelectedRows(new Set());
          setError(null);
        } catch (err) {
          throw err;
        } finally {
          setIsLoadingMultipleAssign(false);
        }
      }
      setShowAssignModal(false);
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

  if (isLoadingLeads) return <LeadsLoading />;

  if (isLeadError || leadError || error) {
    return <ErrorState error={error || leadError} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-0 sm:px-6 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <TableHeading heading="Today Recovery Leads" />
          <div className="flex gap-4">
            <span className="text-sm text-gray-600 self-center">
              {selectedRows.size} leads selected
            </span>
            <button
              onClick={handleAssign}
              className="px-4 py-2 bg-brand text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isLoadingMultipleAssign ? "" : <Check size={16} />}
              {isLoadingMultipleAssign ? <SvgLoader/> : "Assign Selected"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <SearchField
              onSearch={(value) => {
                setSearchQuery(value);
              }}
              defaultValue={searchQuery}
            />
          </div>

          {data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 font-bold text-gray-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-12"></th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">PAN</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">LEAD NO</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">FULL NAME</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">REPAYMENT AMOUNT</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">LATEST REPAYMENT DATE</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ALLOCATED TO</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">RECOVERY STATUS</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 sticky right-0 bg-white border-l border-gray-200">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    const rowId = row.id || row.lead_no || row.pan;
                    return (
                      <React.Fragment key={rowId}>
                        <tr
                          className={`group border-b border-gray-100 hover:bg-gray-50 ${
                            expandedRow === rowId ? "bg-gray-50" : ""
                          }`}
                        >
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <div
                              className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center ${
                                selectedRows.has(rowId)
                                  ? "bg-brand border-bg-brand-hover"
                                  : "border-gray-300 hover:border-brand-hover"
                              }`}
                              onClick={() => toggleSelection(rowId)}
                            >
                              {selectedRows.has(rowId) && (
                                <Check size={14} className="text-brand-dark" />
                              )}
                            </div>
                          </td>
                          <td 
                            className="px-4 py-3 text-sm text-gray-800 cursor-pointer"
                            onClick={() => handleRowClick(row)}
                          >
                            {row.pan || "N/A"}
                          </td>
                          <td 
                            className="px-4 py-3 text-sm text-gray-800 cursor-pointer"
                            onClick={() => handleRowClick(row)}
                          >
                            {row.lead_no || "N/A"}
                          </td>
                          <td 
                            className="px-4 py-3 text-sm text-gray-800 cursor-pointer"
                            onClick={() => handleRowClick(row)}
                          >
                            {row.full_name
                              ? row.full_name
                                  .split(" ")
                                  .map(
                                    (word) =>
                                      word.charAt(0).toUpperCase() +
                                      word.slice(1).toLowerCase()
                                  )
                                  .join(" ")
                              : "N/A"}
                          </td>
                          <td 
                            className="px-4 py-3 text-sm text-gray-800 cursor-pointer"
                            onClick={() => handleRowClick(row)}
                          >
                            {row.repayment_amount
                              ? `₹${parseInt(row.repayment_amount).toLocaleString()}`
                              : "N/A"}
                          </td>
                          <td 
                            className="px-4 py-3 text-sm text-gray-800 cursor-pointer"
                            onClick={() => handleRowClick(row)}
                          >
                            {row.latest_repayment_date_disbursed
                              ? new Date(row.latest_repayment_date_disbursed).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                })
                              : "N/A"}
                          </td>
                          <td 
                            className="px-4 py-3 text-sm text-gray-800 cursor-pointer"
                            onClick={() => handleRowClick(row)}
                          >
                            {row.allocated_to_first_non_null || "N/A"}
                          </td>
                          <td 
                            className="px-4 py-3 text-sm cursor-pointer"
                            onClick={() => handleRowClick(row)}
                          >
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                row.recovery_status === "Recovered"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {row.recovery_status || "N/A"}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-6 flex gap-2 sticky right-0 z-10 border-l border-gray-200 transition-colors ${
                              expandedRow === rowId
                                ? "bg-gray-50"
                                : "bg-white group-hover:bg-gray-50"
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => handleSingleAssign(row, e)}
                              className={`px-4 py-1.5 text-sm bg-brand text-white rounded transition-colors cursor-pointer w-24 flex items-center justify-center`}
                              disabled={loadingStates[rowId]}
                            >
                              {loadingStates[rowId] ? (
                                <SvgLoader />
                              ) : (
                                "Assign"
                              )}
                            </button>
                            {/* <button
                              onClick={() => handleRowClick(row)}
                              className="px-4 py-2 text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-lg transition-all duration-300 hover:scale-105 font-medium cursor-pointer"
                            >
                              {expandedRow === rowId ? "Hide" : "Details"}
                            </button> */}
                          </td>
                        </tr>
                        {/* {expandedRow === rowId && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={null}
                            isNCandNRNeeded={true}
                            loadingState={loadingStates}
                            mutateRejectLead={null}
                            isRejectionNeeded={false}
                            role=""
                            showReject={false}
                            isUploadAddtionalDocumentNeeded={true}
                          />
                        )} */}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState tableName={"Today Recovery Leads"} />
          )}

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

      <ActionModal
        showModal={showAssignModal}
        handleModalOutsideClick={handleModalOutsideClick}
        selectedLead={selectedLead}
        selectedRows={selectedRows}
        setShowModal={setShowAssignModal}
        setSelectedLead={setSelectedLead}
        confirmAction={confirmAssign}
        actionButtonText="Assigning..."
        modalTitle={`Assign Lead ${selectedLead?.lead_no || selectedLead?.id || ''}`}
        modalDescription={`Are you sure you want to assign these leads?`}
        modalButtonText="Assign"
      />
    </div>
  );
};

export default TodayRecoveryLeadsWithErrorBoundary;
