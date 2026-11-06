import React, { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle, Search, Shield, X } from "lucide-react";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import { ErrorState } from "../../Components/ErrorStates/ErrorAndEmptyStates";
import LeadsLoading from "../../Components/Loading/LeadsLoading";
import TableHeading from "../../Components/Table/TableHeading";
import {
  getDevTabErrorMessage,
  getDevTabRecords,
  getMyDevTabTables,
  patchDevTabRecord,
} from "../../services/functions/devTab";
import { formatPan, validatePan } from "../../utils/devTabFields";
import DevTabAccessManager from "./components/DevTabAccessManager";
import DevTabAuditLog from "./components/DevTabAuditLog";
import DevTabReasonPrompt from "./components/DevTabReasonPrompt";
import DevTabRecordTable from "./components/DevTabRecordTable";

function patchMainRecordsCache(old, tableKey, pkColumn, recordId, record) {
  if (!old?.tables) return old;
  return {
    ...old,
    tables: old.tables.map((table) => {
      if (table.table_key !== tableKey) return table;
      return {
        ...table,
        records: (table.records || []).map((row) =>
          String(row[pkColumn]) === String(recordId) ? record : row
        ),
      };
    }),
  };
}

function patchPagedRecordsCache(old, pkColumn, recordId, record) {
  if (!old?.data?.records) return old;
  return {
    ...old,
    data: {
      ...old.data,
      records: old.data.records.map((row) =>
        String(row[pkColumn]) === String(recordId) ? record : row
      ),
    },
  };
}

function DevTab() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("records");
  const [panInput, setPanInput] = useState("");
  const [searchedPan, setSearchedPan] = useState("");
  const [reason, setReason] = useState("");
  const [pendingChange, setPendingChange] = useState(null);
  const [cellStatus, setCellStatus] = useState({});
  const [sideEffectWarnings, setSideEffectWarnings] = useState([]);
  const promptOpenRef = useRef(false);

  const {
    data: access,
    isPending: accessPending,
    isError: accessError,
    error: accessErr,
  } = useQuery({
    queryKey: ["devTab", "my-tables"],
    queryFn: getMyDevTabTables,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (count, err) => err?.response?.status !== 403 && count < 2,
  });

  const {
    data: recordsData,
    isFetching: recordsFetching,
    isError: recordsError,
    error: recordsErr,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: ["devTab", "records", searchedPan],
    queryFn: () => getDevTabRecords(searchedPan),
    enabled: Boolean(searchedPan),
    refetchOnWindowFocus: false,
    retry: (count, err) => {
      const status = err?.response?.status;
      if (status === 400 || status === 403) return false;
      return count < 2;
    },
  });

  const panPattern = access?.pan_pattern;
  const panMessage = validatePan(panInput, panPattern);
  const panValid = panInput.length === 10 && !panMessage;
  const grantedTables = access?.tables || [];
  const isSuperAdmin = Boolean(access?.is_dev_tab_super_admin);

  const tabs = useMemo(() => {
    const list = [
      { id: "records", label: "Records" },
      { id: "audit", label: "Audit Log" },
    ];
    if (isSuperAdmin) list.push({ id: "access", label: "Access" });
    return list;
  }, [isSuperAdmin]);

  const addWarnings = useCallback((list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    setSideEffectWarnings((prev) => {
      const next = [...prev];
      for (const text of [...list].reverse()) {
        if (!text || next.some((item) => item.text === text)) continue;
        next.unshift({ id: `${Date.now()}-${text}`, text });
      }
      return next;
    });
  }, []);

  const executeSave = useCallback(
    async (payload, reasonText) => {
      const key = `${payload.tableKey}:${payload.recordId}:${payload.field}`;
      setCellStatus((prev) => ({ ...prev, [key]: { type: "saving" } }));
      try {
        const res = await patchDevTabRecord(
          payload.tableKey,
          payload.recordId,
          {
            pan: searchedPan,
            reason: reasonText,
            changes: payload.changes,
          }
        );
        const data = res.data?.data;
        if (!data?.changed) {
          toast("No change written");
          setCellStatus((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          return;
        }

        if (data.record) {
          queryClient.setQueryData(["devTab", "records", searchedPan], (old) =>
            patchMainRecordsCache(
              old,
              payload.tableKey,
              payload.pkColumn,
              payload.recordId,
              data.record
            )
          );
          queryClient.setQueriesData(
            { queryKey: ["devTab", "records", searchedPan, payload.tableKey] },
            (old) =>
              patchPagedRecordsCache(
                old,
                payload.pkColumn,
                payload.recordId,
                data.record
              )
          );
        }
        queryClient.invalidateQueries({ queryKey: ["devTab", "audit-log"] });

        if (data.side_effect_warnings?.length) {
          addWarnings(data.side_effect_warnings);
        }

        setCellStatus((prev) => ({ ...prev, [key]: { type: "saved" } }));
        window.setTimeout(() => {
          setCellStatus((prev) => {
            if (prev[key]?.type !== "saved") return prev;
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 1600);
      } catch (err) {
        const message = getDevTabErrorMessage(err);
        setCellStatus((prev) => ({
          ...prev,
          [key]: { type: "error", message },
        }));
        toast.error(message);
      }
    },
    [addWarnings, queryClient, searchedPan]
  );

  const handleSearch = (event) => {
    event?.preventDefault?.();
    if (!panValid || recordsFetching) return;
    if (searchedPan === panInput) {
      refetchRecords();
      return;
    }
    setSearchedPan(panInput);
    setSideEffectWarnings([]);
    setCellStatus({});
  };

  const handleNeedReason = (payload) => {
    promptOpenRef.current = true;
    setPendingChange(payload);
  };

  const handleReasonConfirm = (nextReason) => {
    setReason(nextReason);
    promptOpenRef.current = false;
    const payload = pendingChange;
    setPendingChange(null);
    if (payload) executeSave(payload, nextReason);
  };

  const handleReasonDiscard = () => {
    promptOpenRef.current = false;
    setPendingChange(null);
  };

  if (accessPending) return <LeadsLoading />;

  if (accessError && accessErr?.response?.status === 403) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <TableHeading heading="Dev Tab" />
        <div className="mt-4 max-w-xl rounded-xl border border-amber-300 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Shield size={18} className="text-amber-800" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-amber-950">
                No Dev Tab access
              </h2>
              <p className="mt-1 text-sm text-amber-900">
                You don&apos;t have any tables granted yet. Ask a Dev Tab super
                admin for the tables you need — they can grant access per table.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <ErrorState
        error={getDevTabErrorMessage(accessErr)}
      />
    );
  }

  const customer = recordsData?.customer;
  const customerExists = Boolean(customer?.exists);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TableHeading heading="Dev Tab" />
        {isSuperAdmin && (
          <span className="rounded-full bg-[#382c8e] px-2.5 py-0.5 text-[11px] font-medium text-white">
            Super admin
          </span>
        )}
        <span className="rounded-full border border-[#382c8e]/20 bg-[#eeedf6] px-2.5 py-0.5 text-[11px] font-medium text-[#382c8e]">
          {grantedTables.length} table{grantedTables.length === 1 ? "" : "s"}{" "}
          granted
        </span>
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`cursor-pointer border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? "border-[#382c8e] text-[#382c8e]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "records" && (
        <div className="space-y-3">
          <form
            onSubmit={handleSearch}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <label className="text-xs font-medium text-gray-700">
              PAN
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={panInput}
                  onChange={(event) => setPanInput(formatPan(event.target.value))}
                  placeholder="ABCDE1234F"
                  className="w-48 rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm uppercase text-gray-900 outline-none focus:border-[#382c8e] focus:ring-1 focus:ring-[#382c8e]"
                />
                <button
                  type="submit"
                  disabled={!panValid || recordsFetching}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#382c8e] px-3 py-2 text-xs font-medium text-white hover:bg-[#220e83] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search size={12} />
                  Search
                </button>
              </div>
            </label>
            {panMessage && panInput && (
              <p className="mt-1 text-[11px] text-red-600">{panMessage}</p>
            )}
            <p className="mt-2 text-[11px] text-gray-500">
              This lookup covers:{" "}
              {grantedTables.length
                ? grantedTables.map((table) => table.table_key).join(", ")
                : "no tables granted"}
            </p>
          </form>

          {(access?.problems || []).length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {(access.problems || []).map((problem, index) => (
                <p key={`${problem.table_key}-${index}`}>
                  <span className="font-mono">{problem.table_key}</span>:{" "}
                  {(problem.messages || [problem.message]).filter(Boolean).join(" ")}
                </p>
              ))}
            </div>
          )}

          {searchedPan && recordsError && (
            <ErrorState error={getDevTabErrorMessage(recordsErr)} />
          )}

          {searchedPan && !recordsError && recordsFetching && !recordsData && (
            <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              Loading records for {searchedPan}…
            </p>
          )}

          {recordsData && (
            <>
              <div
                className={`rounded-xl border px-4 py-3 ${
                  customerExists
                    ? "border-gray-200 bg-white"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    {recordsData.pan || searchedPan}
                  </span>
                  {customerExists ? (
                    <>
                      <span className="text-sm text-gray-800">
                        {customer.full_name || "—"}
                      </span>
                      <span className="text-xs text-gray-500">
                        Customer #{customer.id} · {customer.loan_count ?? 0} loan
                        {customer.loan_count === 1 ? "" : "s"}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-amber-900">
                      No Customer row for this PAN
                    </span>
                  )}
                </div>
              </div>

              {reason !== "" && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#382c8e]/20 bg-[#eeedf6] px-3 py-2">
                  <span className="text-xs text-gray-700">
                    Saving edits with reason:
                  </span>
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="min-w-[16rem] flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-[#382c8e]"
                  />
                  <button
                    type="button"
                    onClick={() => setReason("")}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                  >
                    <X size={11} />
                    Clear
                  </button>
                  {reason.trim().length < 5 && (
                    <span className="text-[11px] text-red-600">
                      Next save will ask again (min 5 characters).
                    </span>
                  )}
                </div>
              )}

              {sideEffectWarnings.length > 0 && (
                <div className="space-y-1">
                  {sideEffectWarnings.map((warning) => (
                    <div
                      key={warning.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                    >
                      <span className="inline-flex items-start gap-1.5">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        {warning.text}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSideEffectWarnings((prev) =>
                            prev.filter((item) => item.id !== warning.id)
                          )
                        }
                        className="cursor-pointer text-[11px] font-medium text-amber-800 hover:underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(recordsData.errors || []).length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {recordsData.errors.map((item) => (
                    <p key={item.table_key}>
                      <span className="font-mono">{item.table_key}</span>:{" "}
                      {item.message}
                    </p>
                  ))}
                </div>
              )}

              {(recordsData.hints || []).length > 0 && (
                <p className="text-xs text-gray-500">
                  {recordsData.hints.join(" · ")}
                </p>
              )}

              <div className="space-y-3">
                {(recordsData.tables || []).map((table) => (
                  <DevTabRecordTable
                    key={`${searchedPan}-${table.table_key}`}
                    table={table}
                    pan={searchedPan}
                    reason={reason}
                    promptOpenRef={promptOpenRef}
                    cellStatus={cellStatus}
                    immutableFields={access?.immutable_fields}
                    onNeedReason={handleNeedReason}
                    onSave={executeSave}
                  />
                ))}
              </div>

              {(recordsData.locked_tables || []).length > 0 && (
                <p className="text-xs text-gray-500">
                  Tables not granted to you:{" "}
                  {(recordsData.locked_tables || [])
                    .map((item) => item.label || item.table_key)
                    .join(", ")}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <DevTabAuditLog
          tables={grantedTables}
          searchedPan={searchedPan}
          panPattern={panPattern}
        />
      )}

      {activeTab === "access" && isSuperAdmin && <DevTabAccessManager />}

      <DevTabReasonPrompt
        pendingChange={pendingChange}
        onConfirm={handleReasonConfirm}
        onDiscard={handleReasonDiscard}
      />
    </div>
  );
}

const DevTabWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <DevTab />
  </ErrorBoundary>
);

export default DevTabWithErrorBoundary;
