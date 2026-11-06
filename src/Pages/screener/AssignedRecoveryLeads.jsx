import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { getSelfAssignedReloanLeads } from "../../services/functions/screener";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import LeadsLoading from "../../Components/Loading/LeadsLoading";
import { EmptyState, ErrorState } from "../../Components/ErrorStates/ErrorAndEmptyStates";
import TableHeading from "../../Components/Table/TableHeading";
import SearchField from "../../Components/Table/SearchField";
import Pagination from "../../Components/Pagination/Pagination";
import { usePaginationState } from "../../hooks/usePaginationState";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import CommentModal from "../../Components/Table/CommentModal";

const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Error boundary wrapper component
const AssignedRecoveryLeadsWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AssignedRecoveryLeads />
    </ErrorBoundary>
  );
};

const AssignedRecoveryLeads = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [commentModals, setCommentModals] = useState({});
  const [comments, setComments] = useState({});

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
    queryKey: ["self-assigned-reloan-leads", currentPage, itemsPerPage, searchQuery],
    queryFn: () => getSelfAssignedReloanLeads(currentPage, itemsPerPage, searchQuery),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching self-assigned reloan leads:", error);
      setError("Failed to load leads. Please try again later.");
      toast.error("Failed to load leads");
    }
  });

  const data = useMemo(() => {
    // Handle different possible response structures
    if (leadData?.leads) return leadData.leads;
    if (leadData?.data) return leadData.data;
    if (Array.isArray(leadData)) return leadData;
    return [];
  }, [leadData]);

  // Sync with API pagination when available
  useEffect(() => {
    if (leadData?.pagination?.currentPage) {
      syncWithApiResponse(leadData.pagination.currentPage);
    }
  }, [leadData?.pagination?.currentPage, syncWithApiResponse]);

  // Initialize comments from row data
  useEffect(() => {
    if (data.length > 0) {
      const initialComments = {};
      data.forEach((row) => {
        const rowId = row.id || row.lead_no || row.pan;
        if (row.lead_comments && row.lead_comments.length > 0) {
          initialComments[rowId] = row.lead_comments;
        }
      });
      setComments((prev) => ({ ...prev, ...initialComments }));
    }
  }, [data]);

  const handleRowClick = (user) => {
    try {
      const rowId = user.id || user.lead_no || user.pan;
      setExpandedRow(expandedRow === rowId ? null : rowId);
    } catch (err) {
      console.error("Error expanding row:", err);
      setError("Error occurred while expanding lead details. Please try again.");
    }
  };

  const handleCommentModalOpen = (rowId, e, mode = "history") => {
    e?.stopPropagation?.();
    setCommentModals((prev) => ({
      ...prev,
      [rowId]: { isOpen: true, mode },
    }));
  };

  const handleCommentModalClose = (rowId) => {
    setCommentModals((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], isOpen: false },
    }));
  };

  const handleCommentAdded = (rowId, newComment) => {
    setComments((prev) => ({
      ...prev,
      [rowId]: [newComment, ...(prev[rowId] || [])],
    }));
  };

  const truncateText = (text, maxLength = 40) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  if (isLoadingLeads) return <LeadsLoading />;

  if (isLeadError || leadError || error) {
    return <ErrorState error={error || leadError} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-0 sm:px-6 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <TableHeading heading="Assigned Recovery Leads" />
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">LEAD NO</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">PAN</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">FULL NAME</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">REPAYMENT AMOUNT</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">RECEIVED AMOUNT</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">RECOVERY STATUS</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">COMMENT</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 sticky right-0 bg-white border-l border-gray-200">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    const rowId = row.id || row.lead_no || row.pan;
                    const rowComments = comments[rowId] || row?.lead_comments || [];
                    const sortedComments = [...rowComments].sort((a, b) => {
                      const aDate = new Date(a?.comment_date || a?.created_at || 0);
                      const bDate = new Date(b?.comment_date || b?.created_at || 0);
                      return bDate - aDate;
                    });
                    const latestComment = sortedComments[0];
                    const latestCommentTimestamp = latestComment
                      ? formatDateTime(latestComment.comment_date || latestComment.created_at)
                      : "";
                    const commentModal = commentModals[rowId] || { isOpen: false, mode: "history" };

                    return (
                      <React.Fragment key={rowId}>
                        <tr
                          className={`group border-b border-gray-100 hover:bg-gray-50 ${
                            expandedRow === rowId ? "bg-gray-50" : ""
                          }`}
                        >
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
                            {row.pan || "N/A"}
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
                            {row.received_amount
                              ? `₹${parseInt(row.received_amount).toLocaleString()}`
                              : "N/A"}
                          </td>
                          <td 
                            className="px-4 py-3 text-sm cursor-pointer"
                            onClick={() => handleRowClick(row)}
                          >
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                row.collection_active === false
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {row.collection_active === false ? "Recovered" : "Not Recovered"}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-800 cursor-pointer"
                            onClick={(e) => handleCommentModalOpen(rowId, e)}
                          >
                            {latestComment ? (
                              <div>
                                <div className="text-gray-800">
                                  {truncateText(latestComment.comment, 40)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {latestCommentTimestamp}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">No comments</span>
                            )}
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
                              onClick={(e) => handleCommentModalOpen(rowId, e, "add")}
                              className="p-2 rounded-full border border-gray-200 text-brand-link hover:bg-gray-50 transition-colors cursor-pointer"
                              title="View/Add comments"
                            >
                              <MessageSquarePlus size={18} />
                            </button>
                            <button
                              onClick={() => handleRowClick(row)}
                              className="px-4 py-2 text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-lg transition-all duration-300 hover:scale-105 font-medium cursor-pointer"
                            >
                              {expandedRow === rowId ? "Hide" : "Details"}
                            </button>
                          </td>
                        </tr>
                        {expandedRow === rowId && (
                          <LeadExpandedRow
                            row={row}
                            isDarkMode={false}
                            handleReject={null}
                            isRejectionNeeded={false}
                            showReject={false}
                            isUploadAddtionalDocumentNeeded={true}
                            isNCandNRNeeded={true}
                            role=""
                            mutateRejectLead={null}
                          />
                        )}
                        <CommentModal
                          isOpen={commentModal.isOpen}
                          onClose={() => handleCommentModalClose(rowId)}
                          leadId={row?.lead_id || rowId}
                          comments={sortedComments}
                          onCommentAdded={(newComment) => handleCommentAdded(rowId, newComment)}
                          mode={commentModal.mode}
                          commentCount={rowComments.length}
                        />
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState tableName={"Assigned Recovery Leads"} />
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
    </div>
  );
};

export default AssignedRecoveryLeadsWithErrorBoundary;
