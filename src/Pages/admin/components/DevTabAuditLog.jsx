import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import Pagination from "../../../Components/Pagination/Pagination";
import { usePaginationState } from "../../../hooks/usePaginationState";
import { getDevTabAuditLog } from "../../../services/functions/devTab";
import { formatCellValue, formatPan, validatePan } from "../../../utils/devTabFields";

const DEFAULT_LIMIT = 20;

function formatWhen(value) {
  const formatted = formatCellValue(value);
  if (formatted === "—") return formatted;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(formatted)) return `${formatted} 00:00`;
  return formatted;
}

function DevTabAuditLog({ tables = [], searchedPan = "", panPattern }) {
  const [panInput, setPanInput] = useState(searchedPan || "");
  const [tableKey, setTableKey] = useState("");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (searchedPan) setPanInput(searchedPan);
  }, [searchedPan]);

  const validPan = validatePan(panInput, panPattern) === "" && panInput.length === 10
    ? panInput
    : undefined;

  const filterKey = `${validPan || ""}|${tableKey}`;
  const { currentPage, setCurrentPage, syncWithApiResponse } =
    usePaginationState(1, filterKey);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_LIMIT);

  const { data, isPending, isFetching, isError, error } = useQuery({
    queryKey: ["devTab", "audit-log", validPan, tableKey, currentPage],
    queryFn: () =>
      getDevTabAuditLog({
        pan: validPan,
        table_key: tableKey || undefined,
        page: currentPage,
        limit: itemsPerPage,
      }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.pagination?.currentPage) {
      syncWithApiResponse(data.pagination.currentPage);
    }
  }, [data?.pagination?.currentPage, syncWithApiResponse]);

  const rows = useMemo(() => data?.data || [], [data]);
  const pagination = data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: itemsPerPage,
  };
  const scope = data?.applied_filters?.scope;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <label className="text-xs font-medium text-gray-700">
          PAN
          <input
            value={panInput}
            onChange={(event) => setPanInput(formatPan(event.target.value))}
            placeholder="ABCDE1234F"
            className="mt-1 block w-40 rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-xs uppercase text-gray-900 outline-none focus:border-[#382c8e]"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          Table
          <select
            value={tableKey}
            onChange={(event) => setTableKey(event.target.value)}
            className="mt-1 block min-w-[10rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-[#382c8e]"
          >
            <option value="">All granted tables</option>
            {tables.map((table) => (
              <option key={table.table_key} value={table.table_key}>
                {table.label || table.table_key}
              </option>
            ))}
          </select>
        </label>
        {panInput && !validPan && (
          <p className="text-[11px] text-amber-700">
            A complete valid PAN is required to filter. Partial values are not sent.
          </p>
        )}
      </div>

      {scope === "own" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Showing only your own edits. A Dev Tab super admin can see everyone.
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error?.response?.data?.message || error?.message || "Failed to load audit log."}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="devtab-scroll overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#382c8e] text-white">
              <tr>
                {["When", "Who", "Table", "Record", "PAN", "Changed", ""].map(
                  (label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-3 py-2 font-semibold"
                    >
                      {label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {isPending && !rows.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    Loading audit log…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    No audit rows for these filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const open = Boolean(expanded[row.id]);
                  const changed = row.changed_fields || Object.keys(row.after || {});
                  return (
                    <React.Fragment key={row.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                          {formatWhen(row.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-800">
                          {row.actor_name || "—"}{" "}
                          <span className="text-gray-400">
                            #{row.actor_employee_id}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-gray-700">
                          {row.table_key}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-gray-700">
                          #{row.record_id}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-gray-700">
                          {row.pan}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {changed.map((field) => (
                              <span
                                key={field}
                                className="rounded-full bg-[#eeedf6] px-2 py-0.5 text-[10px] text-[#382c8e]"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [row.id]: !prev[row.id],
                              }))
                            }
                            className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-[#382c8e] hover:text-[#220e83]"
                          >
                            {open ? <EyeOff size={12} /> : <Eye size={12} />}
                            {open ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td colSpan={7} className="px-4 py-3">
                            <p className="text-xs text-gray-800">
                              <span className="font-medium">Reason:</span>{" "}
                              {row.reason || "—"}
                            </p>
                            <div className="mt-2 space-y-1">
                              {changed.map((field) => (
                                <div
                                  key={field}
                                  className="font-mono text-[11px]"
                                >
                                  <span className="text-[#382c8e]">{field}</span>
                                  <span className="mx-2 text-gray-400">:</span>
                                  <span className="text-red-600 line-through">
                                    {formatCellValue(row.before?.[field])}
                                  </span>
                                  <span className="mx-2 text-gray-400">→</span>
                                  <span className="text-green-700">
                                    {formatCellValue(row.after?.[field])}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 text-[11px] text-gray-500">
                              {row.actor_email || "—"}
                              {Array.isArray(row.actor_roles) &&
                                row.actor_roles.length > 0 && (
                                  <> · {row.actor_roles.join(", ")}</>
                                )}
                              {row.request_ip ? ` · ${row.request_ip}` : ""}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isLoading={isFetching}
          pagination={pagination}
          itemsPerPage={pagination.perPage || itemsPerPage}
          setItemsPerPage={setItemsPerPage}
        />
      </div>
    </div>
  );
}

export default DevTabAuditLog;
