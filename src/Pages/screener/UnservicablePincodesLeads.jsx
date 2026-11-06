import React, { useState, useMemo, useEffect } from "react";
import {
  Check,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  allocatMultipleLead,
  getUnserviceablePinCodeLeads,
} from "../../services/functions/screener";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import LeadsLoading from "../../Components/Loading/LeadsLoading";
import { EmptyState, ErrorState } from "../../Components/ErrorStates/ErrorAndEmptyStates";
import TableHeading from "../../Components/Table/TableHeading";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal";
import SvgLoader from "../../ui/SvgLoader";
import { usePaginationState } from "../../hooks/usePaginationState";

// Error boundary wrapper component
const UnservicablePincodesLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <UnservicablePincodesLeads />
    </ErrorBoundary>
  );
};

const UnservicablePincodesLeads = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
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
    isError: isLeadError,
    error: leadError,
  } = useQuery({
    queryKey: ["unserviceable-pin-code-leads", currentPage, itemsPerPage, searchQuery],
    queryFn: () => getUnserviceablePinCodeLeads(currentPage, itemsPerPage, searchQuery),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching unserviceable pin code leads:", error);
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

  const data = useMemo(() => leadData?.data || [], [leadData]);

  const { mutate: mutateAssignLead } = useMutation({
    mutationFn: allocatMultipleLead,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["unserviceable-pin-code-leads"], exact: true });
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

  const handleRowClick = (user) => {
    try {
      setExpandedRow(expandedRow === user.id ? null : user.id);
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

  if (isLoadingLeads) return <LeadsLoading />;

  if (isLeadError || leadError || error) {
    return <ErrorState error={error || leadError} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-0 sm:px-6 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <TableHeading heading="Unserviceable Pin Code Leads" />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* <div className="p-4 border-b border-gray-200">
            <SearchField
              onSearch={(value) => {
                setSearchQuery(value);
              }}
              defaultValue={searchQuery}
            />
          </div> */}

          {data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <TableHeader 
                    showStatus={false} 
                    showEmail={false} 
                    data={data[0]} 
                    showSource={true}
                    showPincode={true}
                    showSalary={true}
                    showCreatedAt={true}
                    showActions={false}
                    hideSelectColumn={true}
                  />
                </thead>
                <tbody>
                  {data.map((row) => (
                    <React.Fragment key={row.id}>
                      <LeadRow
                        row={row}
                        expandedRow={expandedRow}
                        selectedRows={selectedRows}
                        loadingStates={loadingStates}
                        handleRowClick={handleRowClick}
                        isActionButtonNeeded={false}
                        isSelectButtonNeeded={false}
                        toggleSelection={toggleSelection}
                        handleSingleAction={handleSingleAssign}
                        showStatus={false}
                        showEmail={false}
                        isDetailedViewNeeded={false}
                        actionButtonText="Assigning..."
                        modalButtonText="Assign"
                        showSource={true}
                        showPincode={true}
                        showSalary={true}
                        showCreatedAt={true}
                        showActions={false}
                      />
                      {expandedRow === row.id && (
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
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState tableName={"Unserviceable Pin Code Leads"} />
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

export default UnservicablePincodesLeadsWithErrorBoundary;
