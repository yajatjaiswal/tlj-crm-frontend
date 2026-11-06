import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Filter,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Pagination from "../../../Components/Pagination/Pagination";
import { getDevTabTableRecords } from "../../../services/functions/devTab";
import {
  collectChanges,
  formatCellValue,
  humanizeFieldName,
  toInputValue,
} from "../../../utils/devTabFields";
import DevTabEditableCell from "./DevTabEditableCell";

const CARDINALITY_LABEL = {
  one: "one row per PAN",
  latest: "latest of many",
  many: "all rows",
};

const DEFAULT_PAGE_SIZE = 50;

function DevTabRecordTable({
  table,
  pan,
  reason,
  promptOpenRef,
  cellStatus,
  immutableFields = [],
  onNeedReason,
  onSave,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [columnFilter, setColumnFilter] = useState("");
  const [editableOnly, setEditableOnly] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);

  const pk = table?.pk_column || "id";
  const isMany = table?.cardinality === "many";
  const specByName = useMemo(() => {
    const map = {};
    for (const spec of table?.editable_fields || []) {
      if (spec?.name) map[spec.name] = spec;
    }
    return map;
  }, [table?.editable_fields]);

  const immutableSet = useMemo(
    () => new Set(immutableFields || []),
    [immutableFields]
  );

  const {
    data: pagedRes,
    isFetching: isPaging,
  } = useQuery({
    queryKey: ["devTab", "records", pan, table?.table_key, currentPage, itemsPerPage],
    queryFn: () =>
      getDevTabTableRecords(table.table_key, {
        pan,
        page: currentPage,
        limit: itemsPerPage,
      }),
    enabled: Boolean(pan) && Boolean(table?.table_key) && isMany,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setCurrentPage(1);
    setEditing(null);
  }, [pan, table?.table_key]);

  const records = useMemo(() => {
    if (isMany) return pagedRes?.data?.records ?? table?.records ?? [];
    return table?.records ?? [];
  }, [isMany, pagedRes?.data?.records, table?.records]);

  const pagination = isMany
    ? pagedRes?.pagination || {
        currentPage,
        perPage: itemsPerPage,
        totalItems: table?.total_count ?? table?.record_count ?? records.length,
        totalPages: Math.max(
          1,
          Math.ceil(
            (table?.total_count ?? table?.record_count ?? records.length) /
              itemsPerPage
          )
        ),
      }
    : null;

  const allColumns = useMemo(() => {
    if (!records[0] || typeof records[0] !== "object") return [];
    const keys = Object.keys(records[0]);
    return [pk, ...keys.filter((key) => key !== pk)];
  }, [records, pk]);

  const isColumnEditable = useCallback(
    (col) => col !== pk && Boolean(specByName[col]) && !immutableSet.has(col),
    [pk, specByName, immutableSet]
  );

  const visibleColumns = useMemo(() => {
    const query = columnFilter.trim().toLowerCase();
    return allColumns.filter((col) => {
      if (col !== pk && editableOnly && !isColumnEditable(col)) return false;
      if (!query) return true;
      if (col === pk) return true;
      const label = specByName[col]?.label || "";
      return (
        col.toLowerCase().includes(query) ||
        label.toLowerCase().includes(query)
      );
    });
  }, [allColumns, columnFilter, editableOnly, pk, specByName, isColumnEditable]);

  const editableVisibleColumns = useMemo(
    () => visibleColumns.filter((col) => isColumnEditable(col)),
    [visibleColumns, isColumnEditable]
  );

  const hiddenCount = Math.max(0, allColumns.length - visibleColumns.length);
  const rowCount =
    table?.record_count ??
    pagination?.totalItems ??
    records.length;

  const startEdit = (recordId, field) => {
    if (promptOpenRef?.current) return;
    setEditing({ recordId, field });
  };

  const handleCommit = (record, field, draft, nextAction) => {
    const spec = specByName[field];
    const recordId = record[pk];
    const initial = toInputValue(record[field], spec);

    const move = () => {
      if (nextAction === "next" || nextAction === "prev") {
        const dir = nextAction === "next" ? 1 : -1;
        const idx = editableVisibleColumns.indexOf(field);
        const nextField = editableVisibleColumns[idx + dir];
        if (nextField) {
          setEditing({ recordId, field: nextField });
          return;
        }
      }
      setEditing(null);
    };

    if (!spec || String(draft) === String(initial)) {
      move();
      return;
    }

    const changes = collectChanges(
      { [field]: initial },
      { [field]: draft },
      [spec]
    );
    if (!Object.keys(changes).length) {
      move();
      return;
    }

    const payload = {
      tableKey: table.table_key,
      recordId,
      pkColumn: pk,
      field,
      spec,
      draft,
      initial,
      changes,
      displayOld: formatCellValue(record[field]),
      displayNew: draft === "" ? "null" : draft,
    };

    if (!reason || reason.trim().length < 5) {
      if (promptOpenRef) promptOpenRef.current = true;
      setEditing(null);
      onNeedReason(payload);
      return;
    }

    onSave(payload, reason.trim());
    move();
  };

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-gray-900"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {table?.label || table?.table_key}
        </button>
        <span className="font-mono text-[11px] text-gray-500">
          {table?.table_key}
        </span>
        <span className="rounded-full bg-[#eeedf6] px-2 py-0.5 text-[10px] font-medium text-[#382c8e]">
          {CARDINALITY_LABEL[table?.cardinality] || table?.cardinality}
        </span>
        <span className="text-[11px] text-gray-500">
          {rowCount} row{rowCount === 1 ? "" : "s"}
        </span>
        {table?.truncated && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            showing {records.length}
          </span>
        )}
        {isPaging && (
          <span className="text-[10px] text-gray-400">Refreshing…</span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="relative">
            <Filter
              size={11}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={columnFilter}
              onChange={(event) => setColumnFilter(event.target.value)}
              placeholder="Filter columns"
              className="w-36 rounded-md border border-gray-300 bg-white py-1 pl-6 pr-2 text-[11px] text-gray-900 outline-none focus:border-[#382c8e]"
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-gray-700">
            <input
              type="checkbox"
              checked={editableOnly}
              onChange={(event) => setEditableOnly(event.target.checked)}
              className="cursor-pointer"
            />
            Editable only
          </label>
          <span className="text-[11px] text-gray-500">
            {visibleColumns.length} of {allColumns.length} columns
            {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}
          </span>
        </div>
      </header>

      {table?.warning && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          {table.warning}
        </div>
      )}
      {table?.note && (
        <p className="px-3 py-1 text-[11px] text-gray-500">{table.note}</p>
      )}

      {!collapsed && records.length === 0 && (
        <p className="px-3 py-6 text-center text-xs text-gray-500">
          {table?.note || "No rows for this PAN."}
        </p>
      )}

      {!collapsed && records.length > 0 && (
        <div className="devtab-scroll max-h-[65vh] min-h-[8rem] overflow-auto">
          <table className="w-max min-w-full border-collapse text-left">
            <thead className="sticky top-0">
              <tr>
                {visibleColumns.map((col) => {
                  const editable = isColumnEditable(col);
                  const spec = specByName[col];
                  const isPk = col === pk;
                  return (
                    <th
                      key={col}
                      title={
                        editable
                          ? `${col} · ${spec?.type || "unknown"} — editable`
                          : `${col} — read only`
                      }
                      className={`sticky top-0 whitespace-nowrap border-r border-white/20 px-2 py-1.5 text-[11px] font-semibold ${
                        isPk ? "left-0 z-30" : "z-20"
                      } ${
                        editable
                          ? "bg-[#382c8e] text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {spec?.label || humanizeFieldName(col)}
                        {editable && <Pencil size={9} />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {records.map((record, rowIndex) => {
                const recordId = record[pk];
                return (
                  <tr
                    key={recordId ?? rowIndex}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    {visibleColumns.map((col) => {
                      const editable = isColumnEditable(col);
                      const isPk = col === pk;
                      const spec = specByName[col];
                      const isCellEditing =
                        editing &&
                        String(editing.recordId) === String(recordId) &&
                        editing.field === col;
                      const status = cellStatus?.[`${table.table_key}:${recordId}:${col}`];
                      return (
                        <td
                          key={col}
                          className={`whitespace-nowrap border-r border-gray-100 p-0 ${
                            isPk ? "sticky left-0 z-10 bg-white" : ""
                          } ${editable ? "bg-white" : "bg-gray-50"} ${
                            status?.type === "error" ? "bg-red-50" : ""
                          } ${status?.type === "saved" ? "bg-green-50" : ""}`}
                        >
                          <DevTabEditableCell
                            value={record[col]}
                            displayValue={formatCellValue(record[col])}
                            spec={spec}
                            isEditable={editable}
                            isEditing={Boolean(isCellEditing)}
                            status={status}
                            onStartEdit={() => startEdit(recordId, col)}
                            onCommit={(draft, nextAction) =>
                              handleCommit(record, col, draft, nextAction)
                            }
                            onCancel={() => setEditing(null)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!collapsed && isMany && pagination && (pagination.totalPages || 1) > 1 && (
        <Pagination
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isLoading={isPaging}
          pagination={pagination}
          itemsPerPage={pagination.perPage || itemsPerPage}
          setItemsPerPage={setItemsPerPage}
        />
      )}
    </section>
  );
}

export default DevTabRecordTable;
