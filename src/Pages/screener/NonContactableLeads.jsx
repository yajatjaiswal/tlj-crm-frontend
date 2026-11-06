import React, { useState, useMemo } from "react";
import {
  Check,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  allocatMultipleLead,
  getLeadByCategory,
} from "../../services/functions/screener";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import LeadsLoading from "../../Components/Loading/LeadsLoading";
import { EmptyState, ErrorState } from "../../Components/ErrorStates/ErrorAndEmptyStates";
import TableHeading from "../../Components/Table/TableHeading";
import SearchField from "../../Components/Table/SearchField";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal";
import TableHeader from "../../Components/Table/TableHeader";
import SvgLoader from "../../ui/SvgLoader";

// Error boundary wrapper component
const NonContactableLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <NonContactableLeads />
    </ErrorBoundary>
  );
};

function NonContactableLeads() {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [loadingStates, setLoadingStates] = useState({});
  const [isLoadingMultipleAssign, setIsLoadingMultipleAssign] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState(null);

  const queryClient = useQueryClient();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const {
    data: leadData,
    isPending: isLoadingLeads,
    isError: isLeadError,
    error: leadError,
  } = useQuery({
    queryKey: ["screener-partial-leads", currentPage, itemsPerPage],
    queryFn: () => getLeadByCategory("blinker", currentPage, itemsPerPage),
    staleTime: 0,
    gcTime: 0,
  });

  const data = useMemo(() => leadData?.leads || [], [leadData]);

  const { mutate: mutateAssignLead } = useMutation({
    mutationFn: allocatMultipleLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["screener-partial-leads"]);
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

  const filteredData = useMemo(() => {
    try {
      if (!data) return [];
      if (!searchQuery) return data;

      const searchLower = searchQuery.toLowerCase();
      return data.filter((row) => {
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
      return data || [];
    }
  }, [data, searchQuery]);

  if (isLoadingLeads) return <LeadsLoading />;

  if (isLeadError || leadError || error) {
    return <ErrorState error={error || leadError} />;
  }

  if (data.length === 0) {
    return <EmptyState tableName={"Non Contactable Leads"} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-0 sm:px-6 py-6">
      <div className="mx-auto">
        <div className="flex justify-between items-center">
          <TableHeading heading="Non Contactable Leads" />
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
          <SearchField
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setCurrentPage={setCurrentPage}
          />

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <TableHeader showStatus={true} showEmail={false} data={filteredData[0]} showSelectColumn />
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
                      showStatus={true}
                      showEmail={false}
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
                        role=""
                        showReject={false}
                      />
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

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
        modalTitle={`Assign Lead ${selectedLead?.lead_no}`}
        modalDescription={`Are you sure you want to assign these leads?`}
        modalButtonText="Assign"
      />
    </div>
  );
}

export default NonContactableLeadsWithErrorBoundary;
