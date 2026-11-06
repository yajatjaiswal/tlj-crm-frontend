import React, { useState, useMemo } from "react";
import {
  Check,
} from "lucide-react";
import { getBreRejectedLeads, selfAssignMultipleBreRejectedLead } from "../../services/functions/credit-analyst";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import LeadsLoading from "../../Components/Loading/LeadsLoading";
import ErrorFallback from "../../Components/ErrorFallback";
import { EmptyState, ErrorState } from "../../Components/ErrorStates/ErrorAndEmptyStates";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal"
import TableHeading from "../../Components/Table/TableHeading";
import SvgLoader from "../../ui/SvgLoader";

// Error boundary wrapper component
const NonContactableBreReLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <NonContactableBreReLeads />
  </ErrorBoundary>
);



const NonContactableBreReLeads = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingStates, setLoadingStates] = useState({});
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isLoadingMultipleAssign, setIsLoadingMultipleAssign] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState(null);

  const queryClient = useQueryClient();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modified API call to fetch data with pagination and error handling
  const { data: breRejectedLeads, isPending: isLoading, error: fetchError } = useQuery({
    queryKey: ["bre-rejected-leads", currentPage, itemsPerPage],
    queryFn: () => getBreRejectedLeads({ page: currentPage, limit: itemsPerPage }),
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching leads:", error);
      setError("Failed to load leads. Please try again later.");
      toast.error("Failed to load leads");
    }
  });

  // Assign Leads with error handling
  const { mutate: mutateAssignBreRejectedLead } = useMutation({
    mutationFn: selfAssignMultipleBreRejectedLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["bre-rejected-leads"]);
      toast.success("Leads Assigned Successfully");
      setSelectedRows(new Set());
      setIsLoadingMultipleAssign(false);
      setError(null);
    },
    onError: (error) => {
      console.error("Error assigning leads:", error);
      setError("Failed to assign leads. Please try again.");
      toast.error("Failed to Assign Leads");
      setIsLoadingMultipleAssign(false);
    }
  });

  const filteredData = useMemo(() => {
    try {
      if (!breRejectedLeads?.leads) return [];
      if (!searchQuery) return breRejectedLeads.leads;

      const searchLower = searchQuery.toLowerCase();
      return breRejectedLeads.leads.filter((row) => {
        try {
          return Object.entries(row).some(([key, value]) => {
            if (key === "selected" || key === "id") return false;
            return String(value).toLowerCase().includes(searchLower);
          });
        } catch (err) {
          console.error("Error filtering row:", err);
          return false;
        }
      });
    } catch (err) {
      console.error("Error in data filtering:", err);
      setError("Error occurred while filtering data. Please try again.");
      return breRejectedLeads?.leads || [];
    }
  }, [breRejectedLeads?.leads, searchQuery]);

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
        mutateAssignBreRejectedLead({ id: [selectedLead.id] });
      } else {
        setIsLoadingMultipleAssign(true);
        const selectedLeads = breRejectedLeads.leads.filter(row => selectedRows.has(row.id)) || [];
        if (selectedLeads.length === 0) {
          setError("No leads selected for assignment");
          return;
        }
        mutateAssignBreRejectedLead({ id: selectedLeads.map(lead => lead.id) });
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

  if (isLoading) return (
    <LeadsLoading/>
  );

  if (fetchError || error) {
    return (
      <ErrorState error={error}/>
    );
  }

  if (!breRejectedLeads?.leads || breRejectedLeads.leads.length === 0) {
    return (
      <EmptyState tableName={"Non Contactable BRE Rejected Leads"}/>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-0 sm:px-6 py-6">
      <div className=" mx-auto">
        <div className=" flex justify-between items-center">
          <TableHeading  heading="Non Contactable BRE Rejected Leads"/>
          <div className="flex gap-4">
            <span className="text-sm text-gray-600 self-center">
              {selectedRows.size} leads selected
            </span>
            <button
              onClick={handleAssign}
              className="px-4 py-2 bg-brand text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check size={16} />
              {isLoadingMultipleAssign?
                <div className="flex items-center gap-2">
                  <SvgLoader/> 
                  <span>Assigning...</span>
                </div>
               : "Assign Selected"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Search Field */}
          <SearchField
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setCurrentPage={setCurrentPage} 
          />

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <TableHeader showSelectColumn />
              </thead>
              <tbody>
                {filteredData.map((row) => (
                  <React.Fragment key={row.id}>
                    <LeadRow
                      row={row}
                      expandedRow={expandedRow}
                      selectedRows={selectedRows}
                      loadingStates={loadingStates}
                      handleRowClick={handleRowClick}
                      isActionButtonNeeded={true}
                      isSelectButtonNeeded={true}
                      toggleSelection={toggleSelection}
                      handleSingleAction={handleSingleAssign}
                      isDetailedViewNeeded={false}
                      actionButtonText="Assigning..."
                      modalButtonText="Assign"
                    />
                    {expandedRow === row.id && (
                      <LeadExpandedRow
                        row={row} 
                        handleReject={null}
                        loadingState={loadingStates}
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

          {/* Updated Pagination */}
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isLoading={isLoading}
            pagination={breRejectedLeads?.pagination}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
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
        modalTitle={`Assign Lead ${selectedLead?.lead_no}`}
        modalDescription= {`Are you sure you want to assign these leads?`}
        modalButtonText="Assign"
      />
    </div>
  );
}

export default NonContactableBreReLeadsWithErrorBoundary;