import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Check, Trash2 } from "lucide-react";
import {
  deleteDevTabGrant,
  deleteDevTabGrantsById,
  getDevTabErrorMessage,
  getDevTabGrants,
  getDevTabRegistry,
  postDevTabGrants,
} from "../../../services/functions/devTab";

function employeeName(grant) {
  const emp = grant.employee;
  if (emp?.f_name || emp?.l_name) {
    return `${emp.f_name || ""} ${emp.l_name || ""}`.trim();
  }
  return grant.employee_email || `Employee #${grant.employee_id}`;
}

function hasTable(grant, tableKey) {
  if (Array.isArray(grant.table_keys) && grant.table_keys.includes(tableKey)) {
    return true;
  }
  return (grant.tables || []).some((table) => table.table_key === tableKey);
}

function DevTabAccessManager() {
  const queryClient = useQueryClient();
  const [employeeIdInput, setEmployeeIdInput] = useState("");

  const {
    data: registry,
    isPending: registryLoading,
    isError: registryError,
    error: registryErr,
  } = useQuery({
    queryKey: ["devTab", "registry"],
    queryFn: getDevTabRegistry,
    refetchOnWindowFocus: false,
  });

  const {
    data: grantsRes,
    isPending: grantsLoading,
    isError: grantsError,
    error: grantsErr,
  } = useQuery({
    queryKey: ["devTab", "grants"],
    queryFn: () => getDevTabGrants({ limit: 100 }),
    refetchOnWindowFocus: false,
  });

  const activeTables = useMemo(
    () => (registry?.tables || []).filter((table) => table.is_active !== false),
    [registry]
  );

  const grants = grantsRes?.data || [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["devTab"] });

  const grantMutation = useMutation({
    mutationFn: postDevTabGrants,
    onSuccess: (res) => {
      const payload = res.data?.data;
      (payload?.warnings || []).forEach((warning) => toast(warning));
      if (payload?.created === 0) {
        toast("Already granted");
      } else {
        toast.success("Access granted");
      }
      invalidate();
    },
    onError: (err) => toast.error(getDevTabErrorMessage(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: deleteDevTabGrant,
    onSuccess: () => {
      toast.success("Access revoked");
      invalidate();
    },
    onError: (err) => toast.error(getDevTabErrorMessage(err)),
  });

  const revokeAllMutation = useMutation({
    mutationFn: deleteDevTabGrantsById,
    onSuccess: () => {
      toast.success("All table access removed");
      invalidate();
    },
    onError: (err) => toast.error(getDevTabErrorMessage(err)),
  });

  const busy =
    grantMutation.isPending ||
    revokeMutation.isPending ||
    revokeAllMutation.isPending;

  const handleCellClick = (grant, table) => {
    if (busy) return;
    if (hasTable(grant, table.table_key)) {
      revokeMutation.mutate({
        employee_id: grant.employee_id,
        table_key: table.table_key,
      });
    } else {
      grantMutation.mutate({
        employee_id: grant.employee_id,
        table_keys: [table.table_key],
      });
    }
  };

  const handleAddEmployee = (event) => {
    event.preventDefault();
    const employeeId = Number(employeeIdInput);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      toast.error("Enter the numeric Employee.id");
      return;
    }
    const firstTable = activeTables[0];
    if (!firstTable) {
      toast.error("No active registry tables to grant");
      return;
    }
    grantMutation.mutate(
      { employee_id: employeeId, table_keys: [firstTable.table_key] },
      { onSuccess: () => setEmployeeIdInput("") }
    );
  };

  if (registryLoading || grantsLoading) {
    return (
      <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
        Loading access matrix…
      </p>
    );
  }

  if (registryError || grantsError) {
    const err = registryErr || grantsErr;
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {getDevTabErrorMessage(err)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(registry?.problems || []).length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <p className="font-semibold">Registry problems</p>
          <ul className="mt-1 list-disc pl-4">
            {registry.problems.map((problem, index) => (
              <li key={`${problem.table_key}-${index}`}>
                <span className="font-mono">{problem.table_key}</span>
                {problem.code_status ? ` (${problem.code_status})` : ""}:{" "}
                {problem.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(registry?.unregistered_code_tables || []).length > 0 && (
        <p className="text-xs text-gray-500">
          Code tables not in the registry:{" "}
          <span className="font-mono">
            {registry.unregistered_code_tables.join(", ")}
          </span>
        </p>
      )}

      <form
        onSubmit={handleAddEmployee}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-3"
      >
        <label className="text-xs font-medium text-gray-700">
          Add employee (numeric Employee.id)
          <input
            value={employeeIdInput}
            onChange={(event) =>
              setEmployeeIdInput(event.target.value.replace(/[^\d]/g, ""))
            }
            placeholder="33"
            className="mt-1 block w-40 rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-xs text-gray-900 outline-none focus:border-[#382c8e]"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !employeeIdInput}
          className="cursor-pointer rounded-md bg-[#382c8e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#220e83] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Grant first table
        </button>
        <p className="text-[11px] text-gray-500">
          Adds the first registry table only. Widen access by clicking cells.
        </p>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="devtab-scroll max-h-[70vh] overflow-auto">
          <table className="w-max min-w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 min-w-[14rem] bg-[#382c8e] px-3 py-2 font-semibold text-white">
                  Employee
                </th>
                {activeTables.map((table) => (
                  <th
                    key={table.table_key}
                    className="sticky top-0 z-20 min-w-[7rem] bg-[#382c8e] px-2 py-2 text-center font-semibold text-white"
                  >
                    <div className="font-mono text-[11px]">{table.table_key}</div>
                    <div className="text-[10px] font-normal text-white/70">
                      #{table.id}
                    </div>
                  </th>
                ))}
                <th className="sticky top-0 z-20 bg-[#382c8e] px-3 py-2 font-semibold text-white">
                  IDs
                </th>
                <th className="sticky top-0 z-20 bg-[#382c8e] px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {grants.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTables.length + 3}
                    className="px-3 py-8 text-center text-gray-500"
                  >
                    No grants yet. Add an employee to start.
                  </td>
                </tr>
              ) : (
                grants.map((grant) => (
                  <tr
                    key={grant.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="sticky left-0 z-10 bg-white px-3 py-2">
                      <div className="font-medium text-gray-900">
                        {employeeName(grant)}{" "}
                        <span className="font-mono text-[11px] text-gray-400">
                          #{grant.employee_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {grant.employee?.email || grant.employee_email || ""}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {grant.stale && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            stale
                          </span>
                        )}
                        {grant.employee && grant.employee.is_active === false && (
                          <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                            deactivated
                          </span>
                        )}
                        {(grant.orphaned_ids || []).length > 0 && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            orphaned {grant.orphaned_ids.join(",")}
                          </span>
                        )}
                      </div>
                    </td>
                    {activeTables.map((table) => {
                      const granted = hasTable(grant, table.table_key);
                      return (
                        <td key={table.table_key} className="px-1 py-1 text-center">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleCellClick(grant, table)}
                            title={
                              granted
                                ? `Revoke ${table.table_key}`
                                : `Grant ${table.table_key}`
                            }
                            className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border ${
                              granted
                                ? "border-[#382c8e] bg-[#382c8e] text-white hover:bg-[#220e83]"
                                : "border-gray-200 bg-white text-gray-300 hover:border-[#382c8e] hover:text-[#382c8e]"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {granted ? <Check size={14} /> : null}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-500">
                      {`{${(grant.master_table_access_ids || []).join(",")}}`}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => revokeAllMutation.mutate(grant.id)}
                        title="Remove all tables for this employee"
                        className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DevTabAccessManager;
