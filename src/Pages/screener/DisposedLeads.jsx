import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDisposedLeads, toggleDisposeLead } from "../../services/functions/screener";
import LeadsLoading from "../../Components/Loading/LeadsLoading";
import { EmptyState, ErrorState } from "../../Components/ErrorStates/ErrorAndEmptyStates";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import TableHeading from "../../Components/Table/TableHeading";
import SearchField from "../../Components/Table/SearchField";
import TableHeader from "../../Components/Table/TableHeader";
import LeadRow from "../../Components/Table/LeadRow";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import Pagination from "../../Components/Pagination/Pagination";
import { usePaginationState } from "../../hooks/usePaginationState";
import toast from "react-hot-toast";

// Error boundary wrapper component
const DisposedLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <DisposedLeads />
    </ErrorBoundary>
  );
};

function DisposedLeads() {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Stable pagination hook
  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(1, searchQuery);

  const { data: leadData, isPending: isLoadingLeads, isError } = useQuery({
    queryKey: ["screener-disposed-leads", currentPage, itemsPerPage, searchQuery],
    queryFn: () => getDisposedLeads(currentPage, itemsPerPage, searchQuery),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const undisposeLeadMutation = useMutation({
    mutationFn: toggleDisposeLead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["screener-disposed-leads"],
      });
      toast.success("Lead undisposed successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to undispose lead");
    },
  });

  // Sync pagination with API response
  useEffect(() => {
    if (leadData?.pagination?.currentPage) {
      syncWithApiResponse(leadData.pagination.currentPage);
    }
  }, [leadData?.pagination?.currentPage, syncWithApiResponse]);

  const data = useMemo(() => leadData?.data || [], [leadData]);
  const pagination = useMemo(
    () =>
      leadData?.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 },
    [leadData]
  );

  const handleRowClick = (user) => {
    setExpandedRow(expandedRow === user.id ? null : user.id);
  };

  if (isLoadingLeads) return <LeadsLoading />;

  if (isError) return <ErrorState error={isError} />;

  if (!data || data.length === 0) {
    return <EmptyState tableName={"Disposed Leads"} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 animate-gradient rounded-xl">
      <div className="max-w-6xl mx-auto p-6">
        {/* Table Heading */}
        <TableHeading heading="Disposed Leads" />

        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg shadow-gray-200 overflow-hidden">
          {/* Search Field */}
          <SearchField
            onSearch={(value) => {
              setSearchQuery(value);
            }}
            defaultValue={searchQuery}
          />

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <TableHeader showStatus={true} />
              </thead>
              <tbody>
                {data.map((row) => (
                  <React.Fragment key={row.id}>
                    <LeadRow
                      row={row}
                      expandedRow={expandedRow}
                      selectedRows={new Set()}
                      loadingStates={{}}
                      handleRowClick={handleRowClick}
                      isActionButtonNeeded={false}
                      isSelectButtonNeeded={false}
                      showStatus={true}
                    />
                    {expandedRow === row.id && (
                      <LeadExpandedRow
                        row={row}
                        handleReject={null}
                        loadingState={{}}
                        mutateRejectLead={null}
                        isRejectionNeeded={false}
                        role=""
                        showReject={false}
                        isLeadRejected={true}
                        isUploadAddtionalDocumentNeeded={true}
                        isUndisposeNeeded={true}
                        undisposeLeadMutation={undisposeLeadMutation}
                      />
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isLoading={isLoadingLeads}
            pagination={pagination}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
        </div>
      </div>
    </div>
  );
}

export default DisposedLeadsWithErrorBoundary;
