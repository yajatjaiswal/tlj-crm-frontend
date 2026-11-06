import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Shield,
  X,
} from "lucide-react";
import {
  addGeofenceWhitelist,
  getAllEmployees,
  getGeofenceWhitelist,
  updateGeofenceWhitelistStatus,
} from "../../services/functions/admin";
import { isGeofenceWhitelistPermissionEmail } from "../../constants/permissionEmails";
import LeadsLoading from "../../Components/Loading/LeadsLoading";

/** 1: Paytracker, 2: Loansphere, 3: Both */
const PLATFORM_OPTIONS = [
  {
    value: 1,
    label: "Paytracker",
    tone: "bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100",
  },
  {
    value: 2,
    label: "Loansphere",
    tone: "bg-orange-50 text-orange-800 ring-orange-200 hover:bg-orange-100",
  },
  {
    value: 3,
    label: "Both",
    tone: "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100",
  },
];

const PLATFORM_EMPTY_TONE =
  "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100";

const getPlatformTone = (value) =>
  PLATFORM_OPTIONS.find((opt) => opt.value === Number(value))?.tone ||
  PLATFORM_EMPTY_TONE;

const getPlatformLabel = (value) =>
  PLATFORM_OPTIONS.find((opt) => opt.value === Number(value))?.label || "";

const SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "emp_id", label: "Emp ID" },
  { key: "platform", label: "Platform" },
  { key: "active", label: "Active" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
];

const getSortValue = (row, key) => {
  switch (key) {
    case "name":
      return (row.name || "").toLowerCase();
    case "emp_id":
      return Number(row.emp_id) || 0;
    case "platform":
      return Number(row.allowed_platform) || 0;
    case "active":
      return row.is_active ? 1 : 0;
    case "created_at":
      return row.created_at ? new Date(row.created_at).getTime() : 0;
    case "updated_at":
      return row.updated_at ? new Date(row.updated_at).getTime() : 0;
    default:
      return "";
  }
};

const compareRows = (a, b, key, direction) => {
  const av = getSortValue(a, key);
  const bv = getSortValue(b, key);
  let result = 0;
  if (typeof av === "string" || typeof bv === "string") {
    result = String(av).localeCompare(String(bv), undefined, {
      sensitivity: "base",
      numeric: true,
    });
  } else {
    result = av === bv ? 0 : av < bv ? -1 : 1;
  }
  if (result === 0) {
    result = (Number(a.id) || 0) - (Number(b.id) || 0);
  }
  return direction === "desc" ? -result : result;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
};

function PlatformSelect({ row, disabled, onChange }) {
  return (
    <div className="relative w-full min-w-0 max-w-[11rem]">
      <select
        value={row.allowed_platform ?? ""}
        onChange={(e) => onChange(row, e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none rounded-full py-1.5 pl-3 pr-8 text-xs font-semibold ring-1 outline-none transition-colors focus:ring-2 focus:ring-[#1A1A1A]/40 disabled:cursor-not-allowed disabled:opacity-60 ${getPlatformTone(
          row.allowed_platform
        )}`}
        aria-label={`Platform for ${row.name || row.emp_id}`}
      >
        {!row.allowed_platform ? (
          <option value="">Select platform</option>
        ) : null}
        {PLATFORM_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-70"
        aria-hidden
      />
    </div>
  );
}

function ActiveToggle({ row, disabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(row)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
        row.is_active ? "bg-emerald-500" : "bg-slate-300"
      }`}
      aria-label={`Set ${row.name || row.emp_id} ${
        row.is_active ? "inactive" : "active"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          row.is_active ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SortableHeader({ label, columnKey, sortKey, sortDir, onSort }) {
  const active = sortKey === columnKey;
  return (
    <th className="bg-slate-50 px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-slate-100 hover:text-slate-900 ${
          active ? "text-slate-900" : "text-slate-600"
        }`}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
        )}
      </button>
    </th>
  );
}

function GeofenceWhitelist() {
  const queryClient = useQueryClient();
  const userEmail = useSelector((state) => state.user.email);
  const isAuthorized = isGeofenceWhitelistPermissionEmail(userEmail);

  const [showAddModal, setShowAddModal] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [reason, setReason] = useState("");
  const [allowedPlatform, setAllowedPlatform] = useState("3");

  const {
    data: whitelist = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["geofence-whitelist"],
    queryFn: getGeofenceWhitelist,
    enabled: isAuthorized,
    staleTime: 30_000,
  });

  const {
    data: employees = [],
    isPending: employeesLoading,
    isFetching: employeesFetching,
  } = useQuery({
    queryKey: ["all-employees", { excludeGeofenceWhitelist: true }],
    queryFn: () => getAllEmployees({ excludeGeofenceWhitelist: true }),
    enabled: isAuthorized && showAddModal,
    staleTime: 5 * 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: updateGeofenceWhitelistStatus,
    onSuccess: (res) => {
      toast.success(res?.message || "Status updated");
      queryClient.invalidateQueries({ queryKey: ["geofence-whitelist"] });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to update status"
      );
    },
  });

  const addMutation = useMutation({
    mutationFn: addGeofenceWhitelist,
    onSuccess: (res) => {
      toast.success(res?.message || "Employee added to whitelist");
      queryClient.invalidateQueries({ queryKey: ["geofence-whitelist"] });
      queryClient.invalidateQueries({
        queryKey: ["all-employees", { excludeGeofenceWhitelist: true }],
      });
      setShowAddModal(false);
      setSelectedEmpId("");
      setReason("");
      setEmployeeSearch("");
      setAllowedPlatform("3");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to add employee"
      );
    },
  });

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees || [];
    return (employees || []).filter((emp) => {
      const haystack = `${emp.full_name || ""} ${emp.emp_id || ""} ${emp.id}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, employeeSearch]);

  const filteredWhitelist = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    const filtered = !q
      ? [...(whitelist || [])]
      : (whitelist || []).filter((row) => {
          const platform =
            row.allowed_platform_label || getPlatformLabel(row.allowed_platform);
          const haystack = [
            row.name,
            row.email,
            row.emp_id,
            row.employee_code,
            row.reason,
            platform,
            row.is_active ? "active" : "inactive",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });

    filtered.sort((a, b) => compareRows(a, b, sortKey, sortDir));
    return filtered;
  }, [whitelist, listSearch, sortKey, sortDir]);

  const handleSort = (columnKey) => {
    if (sortKey === columnKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(columnKey);
    setSortDir(columnKey === "name" || columnKey === "platform" ? "asc" : "desc");
  };

  const handleToggle = (row) => {
    const next = !row.is_active;
    statusMutation.mutate({ id: row.id, is_active: next });
  };

  const handlePlatformChange = (row, nextPlatform) => {
    const platform = Number(nextPlatform);
    if (!platform || platform === Number(row.allowed_platform)) return;
    statusMutation.mutate({ id: row.id, allowed_platform: platform });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      toast.error("Please select an employee");
      return;
    }
    if (!allowedPlatform) {
      toast.error("Please select an allowed platform");
      return;
    }
    addMutation.mutate({
      emp_id: Number(selectedEmpId),
      reason: reason.trim() || undefined,
      allowed_platform: Number(allowedPlatform),
    });
  };

  const resetAddModal = () => {
    setShowAddModal(false);
    setSelectedEmpId("");
    setReason("");
    setEmployeeSearch("");
    setAllowedPlatform("3");
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <Shield className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="text-xl font-semibold text-slate-800">Access denied</h1>
          <p className="text-sm text-slate-500">
            Geofence whitelist is only available to authorised Admin emails.
          </p>
        </div>
      </div>
    );
  }

  const hasListQuery = Boolean(listSearch.trim());
  const emptyState = (
    <div className="px-4 py-10 text-center text-sm text-slate-500">
      {hasListQuery
        ? `No whitelist matches for “${listSearch.trim()}”.`
        : "No whitelisted employees yet. Click Add Employee to start."}
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-4.75rem)] max-h-[calc(100dvh-4.75rem)] flex-col gap-3 overflow-hidden p-3 sm:h-[calc(100dvh-4rem)] sm:max-h-[calc(100dvh-4rem)] sm:gap-4 sm:p-4 md:p-6">
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 shrink-0 items-start gap-2.5 sm:gap-3 lg:max-w-xs xl:max-w-sm">
          <div className="shrink-0 rounded-xl bg-[#1A1A1A] p-2 text-white sm:p-2.5">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Geofence Whitelist
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              <span className="sm:hidden">Exempt from login radius checks.</span>
              <span className="hidden sm:inline">
                Employees exempt from login radius checks (coordinates still
                required).
              </span>
            </p>
          </div>
        </div>

        <div className="relative min-w-0 w-full flex-1 lg:mx-2 lg:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Search name, email, emp ID, platform…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#1A1A1A] focus:ring-2 focus:ring-[#1A1A1A]/15 sm:py-2"
            aria-label="Search geofence whitelist"
          />
          {listSearch ? (
            <button
              type="button"
              onClick={() => setListSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:py-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1A1A1A] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#262626] sm:py-2"
          >
            <Plus className="h-4 w-4" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Employee</span>
          </button>
        </div>
      </div>

      {!isPending && !isError ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {hasListQuery ? (
            <p className="text-xs text-slate-500">
              Showing {filteredWhitelist.length} of {whitelist.length} employee
              {filteredWhitelist.length === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="text-xs text-slate-500 md:hidden">
              {whitelist.length} employee{whitelist.length === 1 ? "" : "s"}
            </p>
          )}
          <div className="flex items-center gap-2 md:hidden">
            <label className="sr-only" htmlFor="geofence-sort">
              Sort by
            </label>
            <select
              id="geofence-sort"
              value={sortKey}
              onChange={(e) => handleSort(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1A1A1A]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
              aria-label={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
            >
              {sortDir === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )}
              {sortDir === "asc" ? "Asc" : "Desc"}
            </button>
          </div>
        </div>
      ) : null}

      {isPending ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <LeadsLoading />
        </div>
      ) : isError ? (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error?.response?.data?.message ||
            error?.message ||
            "Failed to load geofence whitelist"}
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:hidden">
            <div className="space-y-2.5 pb-[max(5rem,calc(env(safe-area-inset-bottom)+3rem))]">
            {filteredWhitelist.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                {emptyState}
              </div>
            ) : (
              filteredWhitelist.map((row) => (
                <article
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-slate-900">
                        {row.name || "—"}
                      </h2>
                      {row.email ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {row.email}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        Emp ID{" "}
                        <span className="font-medium text-slate-700">
                          {row.emp_id}
                        </span>
                      </p>
                      {row.reason ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                          {row.reason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[11px] font-medium text-slate-500">
                        Active
                      </span>
                      <ActiveToggle
                        row={row}
                        disabled={statusMutation.isPending}
                        onToggle={handleToggle}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">
                      Platform
                    </span>
                    <PlatformSelect
                      row={row}
                      disabled={statusMutation.isPending}
                      onChange={handlePlatformChange}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    <div>
                      <div className="font-medium text-slate-400">Created</div>
                      <div className="mt-0.5 text-slate-600">
                        {formatDateTime(row.created_at)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-400">Updated</div>
                      <div className="mt-0.5 text-slate-600">
                        {formatDateTime(row.updated_at)}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[10%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                <tr>
                  <SortableHeader
                    label="Name"
                    columnKey="name"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Emp ID"
                    columnKey="emp_id"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Platform"
                    columnKey="platform"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Active"
                    columnKey="active"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Created"
                    columnKey="created_at"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Updated"
                    columnKey="updated_at"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {filteredWhitelist.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{emptyState}</td>
                  </tr>
                ) : (
                  filteredWhitelist.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="truncate font-medium text-slate-900">
                          {row.name || "—"}
                        </div>
                        {row.email ? (
                          <div className="truncate text-xs text-slate-500">
                            {row.email}
                          </div>
                        ) : null}
                        {row.reason ? (
                          <div className="mt-0.5 truncate text-xs text-slate-400">
                            {row.reason}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-middle text-slate-700">
                        {row.emp_id}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <PlatformSelect
                          row={row}
                          disabled={statusMutation.isPending}
                          onChange={handlePlatformChange}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <ActiveToggle
                          row={row}
                          disabled={statusMutation.isPending}
                          onToggle={handleToggle}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-600">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-600">
                        {formatDateTime(row.updated_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <h2 className="pr-2 text-base font-semibold text-slate-900 sm:text-lg">
                Add Employee to Whitelist
              </h2>
              <button
                type="button"
                onClick={resetAddModal}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleAdd}
              className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Search employee
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Name or employee code"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1A1A1A] sm:py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Employee
                </label>
                {employeesLoading || employeesFetching ? (
                  <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-500">
                    Loading employees…
                  </div>
                ) : (
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A] sm:py-2"
                    required
                  >
                    <option value="">Select employee</option>
                    {filteredEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name || "Unnamed"} ({emp.emp_id}) — #{emp.id}
                      </option>
                    ))}
                  </select>
                )}
                {!employeesLoading && filteredEmployees.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    No matching employees available to add.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Allowed platform
                </label>
                <select
                  value={allowedPlatform}
                  onChange={(e) => setAllowedPlatform(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A] sm:py-2"
                  required
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  1 Paytracker · 2 Loansphere · 3 Both
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Admin break-glass access"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A] sm:py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:justify-end">
                <button
                  type="button"
                  onClick={resetAddModal}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 sm:py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    addMutation.isPending || !selectedEmpId || !allowedPlatform
                  }
                  className="rounded-lg bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#262626] disabled:opacity-60 sm:py-2"
                >
                  {addMutation.isPending ? "Adding…" : "Add to whitelist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GeofenceWhitelist;
