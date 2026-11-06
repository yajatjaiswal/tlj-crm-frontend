import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CalendarDays,
  Download,
  RefreshCcw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  getAssignedFreshLeadsData,
  getAssignedReloanLeadsData,
} from "../../../services/functions/admin";
import toast from "react-hot-toast";

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const extractRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

function DashboardAssignedLeads() {
  const location = useLocation();
  const initialView = location.state?.view === "reloan" ? "reloan" : "fresh";

  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [activeView, setActiveView] = useState(initialView);
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);
  const [isLoadingReloan, setIsLoadingReloan] = useState(false);
  const [freshRows, setFreshRows] = useState([]);
  const [reloanRows, setReloanRows] = useState([]);

  const fetchFresh = useCallback(async (from, to) => {
    setIsLoadingFresh(true);
    try {
      const response = await getAssignedFreshLeadsData(from, to);
      setFreshRows(extractRows(response));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load assigned fresh leads data"
      );
    } finally {
      setIsLoadingFresh(false);
    }
  }, []);

  const fetchReloan = useCallback(async (from, to) => {
    setIsLoadingReloan(true);
    try {
      const response = await getAssignedReloanLeadsData(from, to);
      setReloanRows(extractRows(response));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load assigned reloan leads data"
      );
    } finally {
      setIsLoadingReloan(false);
    }
  }, []);

  const fetchBoth = useCallback(async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    await Promise.all([fetchFresh(startDate, endDate), fetchReloan(startDate, endDate)]);
  }, [endDate, fetchFresh, fetchReloan, startDate]);

  const handleFreshClick = async () => {
    setActiveView("fresh");
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    await fetchFresh(startDate, endDate);
  };

  const handleReloanClick = async () => {
    setActiveView("reloan");
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    await fetchReloan(startDate, endDate);
  };

  useEffect(() => {
    fetchBoth();
  }, [fetchBoth]);

  const totalFresh = useMemo(
    () => freshRows.reduce((sum, row) => sum + Number(row?.total_leads || 0), 0),
    [freshRows]
  );
  const totalReloan = useMemo(
    () => reloanRows.reduce((sum, row) => sum + Number(row?.total_leads || 0), 0),
    [reloanRows]
  );

  const isLoading = isLoadingFresh || isLoadingReloan;
  const rowsToRender = activeView === "fresh" ? freshRows : reloanRows;
  const activeTotal = activeView === "fresh" ? totalFresh : totalReloan;
  const activeCount = rowsToRender.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-brand-extra-light to-cyan-50 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-xl backdrop-blur-sm sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-56 w-56 rounded-full bg-cyan-200/50 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-light px-3 py-1 text-xs font-semibold text-brand-link">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Assigned Leads Monitor
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Assigned Leads Analytics
                </h1>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                  Track fresh and reloan assignment volume employee-wise in a single live view.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchBoth}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh Both APIs
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-light"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-light"
                />
              </div>

              <button
                type="button"
                onClick={handleFreshClick}
                disabled={isLoadingFresh}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  activeView === "fresh"
                    ? "bg-gradient-to-r from-emerald-600 to-green-500"
                    : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                }`}
              >
                Fresh Leads
                <div className="mt-1 text-base font-bold">{totalFresh.toLocaleString()}</div>
              </button>

              <button
                type="button"
                onClick={handleReloanClick}
                disabled={isLoadingReloan}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  activeView === "reloan"
                    ? "bg-gradient-to-r from-brand-dark to-brand-hover"
                    : "bg-gradient-to-r from-brand-dark to-brand-muted hover:from-brand-dark hover:to-brand-hover"
                }`}
              >
                Reloan Leads
                <div className="mt-1 text-base font-bold">{totalReloan.toLocaleString()}</div>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active View
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {activeView === "fresh" ? "Fresh" : "Reloan"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active Total
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {activeTotal.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Employees Listed
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {activeCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 sm:text-xl">
              <UserCheck className="h-5 w-5 text-brand-link" />
              {activeView === "fresh" ? "Assigned Fresh Leads" : "Assigned Reloan Leads"}
            </h2>
            {/* <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              <Users className="h-3.5 w-3.5" />
              Employee wise allocation
              <Download className="h-3.5 w-3.5 text-slate-400" />
            </div> */}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    employee_id
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    employee_name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    total_leads
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowsToRender.length > 0 ? (
                  rowsToRender.map((row, index) => (
                    <tr
                      key={`${row?.employee_id ?? "null"}-${index}`}
                      className={`border-t border-slate-100 transition hover:bg-brand-light/50 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700 sm:text-sm">
                        {row?.employee_id ?? "NULL"}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-700">
                        {row?.employee_name || "EMPTY"}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-link sm:text-sm">
                          {row?.total_leads ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-slate-500">
                      {isLoading ? "Loading data..." : "No data available"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardAssignedLeads;
