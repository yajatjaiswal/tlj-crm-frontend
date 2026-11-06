import React, { useMemo } from "react";

const MONTHLY_TARGET_TIME_PERIODS = new Set([
  "Today",
  "Yesterday",
  "Weekly",
  "Monthly",
]);

const TONE_STYLES = {
  red: {
    text: "text-red-600",
    soft: "bg-red-50 text-red-700 ring-1 ring-red-200",
    track: "bg-red-100",
    fill: "bg-gradient-to-r from-red-500 to-rose-500",
  },
  amber: {
    text: "text-amber-600",
    soft: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    track: "bg-amber-100",
    fill: "bg-gradient-to-r from-amber-400 to-orange-500",
  },
  green: {
    text: "text-emerald-600",
    soft: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    track: "bg-emerald-100",
    fill: "bg-gradient-to-r from-emerald-500 to-teal-500",
  },
};

function formatSanctionDateOnly(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return s;
  const t = new Date(s);
  if (!Number.isFinite(t.getTime())) return s;
  const istOffsetMin = 5.5 * 60;
  const utcMs = t.getTime() + t.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + istOffsetMin * 60000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset * 60000);
}

function isDateRangeInCurrentMonth(range) {
  if (!range?.startDate || !range?.endDate) return false;

  const start = formatSanctionDateOnly(range.startDate);
  const end = formatSanctionDateOnly(range.endDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return false;
  }

  const ist = getCurrentISTDate();
  const currentYm = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}`;
  return start.slice(0, 7) === currentYm && end.slice(0, 7) === currentYm;
}

function getTargetTone(percent) {
  return percent >= 95 ? "green" : percent >= 85 ? "amber" : "red";
}

function formatCurrencyCompact(value, decimals = 0) {
  const num = Number(value || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(decimals)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(decimals)}L`;
  return `₹${num.toLocaleString()}`;
}

function buildProgress(additionalMetrics = {}, amountSanctioned = {}) {
  const target = Number(additionalMetrics?.target_amount || 0);
  const freshTarget = Number(additionalMetrics?.fresh_target_amount || 0);
  const reloanTarget = Number(additionalMetrics?.reloan_target_amount || 0);

  // Always use month-to-date from additionalMetrics so Today/Monthly stay in sync
  const current = Number(
    additionalMetrics?.currentMonthSanctionAmount ??
      amountSanctioned?.total ??
      0
  );
  const freshCurrent = Number(
    additionalMetrics?.currentMonthFreshSanctionAmount ??
      amountSanctioned?.fresh ??
      0
  );
  const reloanCurrent = Number(
    additionalMetrics?.currentMonthReloanSanctionAmount ??
      amountSanctioned?.reloan ??
      0
  );

  const percent = target > 0 ? (current / target) * 100 : 0;
  const freshPercent =
  freshTarget > 0 ? (freshCurrent / freshTarget) * 100 : 0;
  const reloanPercent =
    reloanTarget > 0 ? (reloanCurrent / reloanTarget) * 100 : 0;

  return {
    target,
    current,
    percent,
    tone: getTargetTone(percent),
    fresh: {
      target: freshTarget,
      current: freshCurrent,
      percent: freshPercent,
      tone: getTargetTone(freshPercent),
    },
    reloan: {
      target: reloanTarget,
      current: reloanCurrent,
      percent: reloanPercent,
      tone: getTargetTone(reloanPercent),
    },
  };
}

function MetricCell({ item, compact = false }) {
  const tone = TONE_STYLES[item.tone];

  return (
    <div className={`relative min-w-0 ${compact ? "px-3 py-2" : "px-3 py-2"}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {item.label}
        </p>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${tone.soft}`}
        >
          {item.percent.toFixed(0)}%
        </span>
      </div>
      <p className="truncate text-xs font-semibold tabular-nums tracking-tight text-slate-900 sm:text-[13px]">
        {formatCurrencyCompact(item.current, 2)}
        <span className="mx-1 font-medium text-slate-400">/</span>
        <span className="text-slate-600">
          {formatCurrencyCompact(item.target)}
        </span>
      </p>
      <div
        className={`mt-1.5 h-1 w-full overflow-hidden rounded-full ${tone.track}`}
        role="progressbar"
        aria-valuenow={Math.round(item.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${item.label} monthly sanction target progress`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${tone.fill}`}
          style={{ width: `${item.percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Monthly sanction target strip.
 * @param {"inline"|"mobile"|"full"} variant
 */
export default function MonthlyTargetBar({
  timePeriod,
  additionalMetrics,
  amountSanctioned,
  variant = "inline",
  className = "",
}) {
  const progress = useMemo(
    () => buildProgress(additionalMetrics, amountSanctioned),
    [additionalMetrics, amountSanctioned]
  );

  const items = useMemo(
    () => [
      {
        key: "overall",
        label: "Overall",
        current: progress.current,
        target: progress.target,
        percent: progress.percent,
        tone: progress.tone,
      },
      {
        key: "fresh",
        label: "Fresh",
        current: progress.fresh.current,
        target: progress.fresh.target,
        percent: progress.fresh.percent,
        tone: progress.fresh.tone,
      },
      {
        key: "reloan",
        label: "Reloan",
        current: progress.reloan.current,
        target: progress.reloan.target,
        percent: progress.reloan.percent,
        tone: progress.reloan.tone,
      },
    ],
    [progress]
  );

  const visible =
    Number(additionalMetrics?.target_amount || 0) > 0 &&
    MONTHLY_TARGET_TIME_PERIODS.has(timePeriod) &&
    isDateRangeInCurrentMonth(additionalMetrics?.currentMonthSanctionDateRange);

  if (!visible) return null;

  if (variant === "mobile" || variant === "full") {
    return (
      <div
        className={`flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:flex-row sm:items-stretch ${className}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:w-[140px] sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r sm:py-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Monthly Target
            </p>
            <p className="text-xs font-semibold text-slate-900">
              Sanction
            </p>
          </div>
          {/* <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${TONE_STYLES[progress.tone].soft}`}
          >
            {progress.percent.toFixed(0)}%
          </span> */}
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {items.map((item) => (
            <MetricCell key={item.key} item={item} compact />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="grid min-w-0 grid-cols-3 divide-x divide-slate-100">
        {items.map((item) => (
          <MetricCell key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}
