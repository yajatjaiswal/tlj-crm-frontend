import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import LeadRow from "../Components/Table/LeadRow";
import LeadExpandedRow from "../Components/Table/LeadExpandedRow";
import TableHeader from "../Components/Table/TableHeader";
import Pagination from "../Components/Pagination/Pagination";
import { ArrowLeft } from "lucide-react";
import { openDetailModal } from "../redux/slices/detailModal";
import { globalSearch } from "../services/functions/admin";
import DomainAnalyticsSummary from "../Components/Search/DomainAnalyticsSummary";
import { buildSummaryDataSearchParams } from "../utils/auditLead";
import toast from "react-hot-toast";

const SEARCH_QUERY_STORAGE_KEY = "global-lead-search-query";

const SearchResult = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedRows] = useState(new Set());
  const [loadingStates] = useState({});
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const leadFromState = location.state?.lead;
  const resultsFromNav = location.state?.results;
  const queryFromNav = location.state?.query;
  const domainAnalyticsFromNav = location.state?.domainAnalytics ?? null;

  const [listResults, setListResults] = useState(() =>
    Array.isArray(resultsFromNav) ? resultsFromNav : null
  );
  const [listQuery, setListQuery] = useState(() => queryFromNav ?? "");
  const [domainAnalytics, setDomainAnalytics] = useState(
    () => domainAnalyticsFromNav
  );
  const [listPagination, setListPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  // Single-lead view: /search-result/:id with lead in navigation state
  const isSingleLeadView = Boolean(id && leadFromState);

  // Apply navigation state when user opens /search-result again with a new search
  useEffect(() => {
    if (id) return;
    if (Array.isArray(location.state?.results)) {
      setListResults(location.state.results);
      setListQuery(location.state?.query ?? "");
      setDomainAnalytics(location.state?.domainAnalytics ?? null);
      setListPagination(null);
      setCurrentPage(1);
      setListError(null);
      setListLoading(false);
    }
  }, [
    id,
    location.key,
    location.state?.results,
    location.state?.query,
    location.state?.domainAnalytics,
  ]);

  // Restore list on refresh when URL is /search-result (no state)
  useEffect(() => {
    if (id) return;

    const q = (sessionStorage.getItem(SEARCH_QUERY_STORAGE_KEY) || "").trim();
    if (q.length < 3) {
      setListResults([]);
      setListQuery("");
      return;
    }
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    setListQuery(q);
    globalSearch(q, currentPage, itemsPerPage, { includePagination: true })
      .then((response) => {
        if (cancelled) return;
        setListResults(Array.isArray(response?.results) ? response.results : []);
        setListPagination(response?.pagination || null);
        setDomainAnalytics(response?.domainAnalytics ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setListError("Failed to load search results");
        setListResults([]);
        setListPagination(null);
        setDomainAnalytics(null);
        toast.error("Search failed. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPage, itemsPerPage, id, location.key, location.state?.results]);

  const handleRowClick = (row) => {
    setExpandedRow(expandedRow === row.id ? null : row.id);
  };

  const handleDetailsClick = (row) => {
    if (Number(row?.version) === 2 && row?.pan) {
      const params = buildSummaryDataSearchParams(row);
      navigate(`/search-result/summary-data/${row.pan}?${params.toString()}`);
      return;
    }

    dispatch(
      openDetailModal({
        row,
        showReject: false,
        showApprove: false,
      })
    );
  };

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    >
      <ArrowLeft size={18} />
      Back
    </button>
  );

  if (isSingleLeadView) {
    const lead = leadFromState;
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1600px] space-y-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {backButton}
            <div className="text-sm text-slate-500">
              Search Result for{" "}
              <span className="font-semibold text-slate-700">
                {lead.lead_no || "Lead"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
            <h1 className="text-lg font-semibold text-slate-900">Lead Details</h1>
            <p className="mt-1 text-sm text-slate-500">
              Expand the row to view complete information and timeline.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <TableHeader
                    showStatus={true}
                    showAssignee={true}
                    hideSelectColumn={true}
                    showSource={true}
                    showCommentColumn={false}
                  />
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  <LeadRow
                    row={lead}
                    expandedRow={expandedRow}
                    selectedRows={selectedRows}
                    loadingStates={loadingStates}
                    handleRowClick={handleRowClick}
                    enableRowExpandOnClick={true}
                    isActionButtonNeeded={false}
                    isSelectButtonNeeded={false}
                    showStatus={true}
                    isDetailedViewNeeded={true}
                    showAssignee={true}
                    showSource={true}
                    showCommentColumn={false}
                    searchResultLayout={true}
                    onDetailsClick={handleDetailsClick}
                  />
                  {expandedRow === lead.id && (
                    <LeadExpandedRow
                      row={lead}
                      isDarkMode={false}
                      isRejectionNeeded={false}
                      showReject={false}
                      isUploadAddtionalDocumentNeeded={true}
                      isNCandNRNeeded={true}
                    />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multi-result list: /search-result
  if (!id) {
    if (listLoading && listResults === null) {
      return (
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="mb-6 flex items-center gap-4">{backButton}</div>
            <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            </div>
          </div>
        </div>
      );
    }

    if (listError && (listResults === null || listResults.length === 0)) {
      return (
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="mb-6 flex items-center gap-4">{backButton}</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-red-600 shadow-sm">
              {listError}
            </div>
          </div>
        </div>
      );
    }

    const rows = listResults ?? [];
    const hasQuery = Boolean((listQuery || "").trim());
    const totalPagesFromApi = Number(listPagination?.totalPages || 0);
    const hasNextPage =
      totalPagesFromApi > 0
        ? currentPage < totalPagesFromApi
        : rows.length === itemsPerPage;
    const paginationData = {
      currentPage: Number(listPagination?.page || currentPage),
      totalPages: totalPagesFromApi > 0 ? totalPagesFromApi : hasNextPage ? currentPage + 1 : currentPage,
      totalItems: Number(listPagination?.total || 0) || (currentPage - 1) * itemsPerPage + rows.length,
    };

    if (!hasQuery && rows.length === 0) {
      return (
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="mb-6 flex items-center gap-4">{backButton}</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              No search query. Use the header search and press Enter or the search
              icon to see all matching leads.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1600px] space-y-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {backButton}
            <div className="text-right text-sm text-slate-500">
              <span className="font-semibold text-slate-700">
                {rows.length} result{rows.length === 1 ? "" : "s"}
              </span>
              {listQuery ? (
                <>
                  {" "}
                  for{" "}
                  <span className="font-semibold text-slate-700">
                    &quot;{listQuery}&quot;
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
            <h1 className="text-lg font-semibold text-slate-900">
              Search results
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Expand a row for full details, or open the lead modal from the row
              actions.
            </p>
          </div>

          {domainAnalytics ? (
            <DomainAnalyticsSummary
              analytics={domainAnalytics}
              variant="page"
            />
          ) : null}

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              No matching records found.
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <TableHeader
                      showStatus={true}
                      showAssignee={true}
                      hideSelectColumn={true}
                      showSource={true}
                      showCommentColumn={false}
                    />
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {rows.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={expandedRow}
                          selectedRows={selectedRows}
                          loadingStates={loadingStates}
                          handleRowClick={handleRowClick}
                          enableRowExpandOnClick={true}
                          isActionButtonNeeded={false}
                          isSelectButtonNeeded={false}
                          showStatus={true}
                          isDetailedViewNeeded={true}
                          showAssignee={true}
                          showSource={true}
                          showCommentColumn={false}
                          searchResultLayout={true}
                          onDetailsClick={handleDetailsClick}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            isDarkMode={false}
                            isRejectionNeeded={false}
                            showReject={false}
                            isUploadAddtionalDocumentNeeded={true}
                            isNCandNRNeeded={true}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          )}
          {hasQuery ? (
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isLoading={listLoading}
              pagination={paginationData}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          ) : null}
        </div>
      </div>
    );
  }

  // /search-result/:id but missing state (e.g. hard refresh)
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 flex items-center gap-4">{backButton}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No lead data found. Please try searching again.
        </div>
      </div>
    </div>
  );
};

export default SearchResult;
