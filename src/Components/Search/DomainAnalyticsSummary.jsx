import { Building2 } from "lucide-react";

const formatPercentage = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return "--";
  return `${num % 1 === 0 ? num : num.toFixed(2)}%`;
};

const DomainAnalyticsSummary = ({ analytics, variant = "compact" }) => {
  if (!analytics) return null;

  const companyName = analytics.company_name || "Unknown domain";
  const freshCases = analytics.fresh_cases ?? "--";
  const collectionPct = formatPercentage(analytics.fresh_collection_percentage);
  const isPage = variant === "page";

  const labelClass = isPage ? "text-xs" : "text-[11px]";
  const valueClass = isPage ? "text-sm sm:text-base" : "text-sm";

  return (
    <div
      className={`shrink-0 border-brand/25 bg-gradient-to-r from-brand-extra-light/90 to-slate-50 ${
        isPage
          ? "rounded-2xl border border-brand/40/80 px-3 py-3 shadow-sm sm:px-5"
          : "border-b px-3 py-2.5 sm:px-4"
      }`}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:min-w-0 sm:flex-1">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand-link ${
              isPage ? "h-9 w-9" : "h-7 w-7"
            }`}
          >
            <Building2
              className={isPage ? "h-4 w-4" : "h-3.5 w-3.5"}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`font-semibold uppercase tracking-wide text-brand-link ${
                isPage ? "text-xs" : "text-[10px] sm:text-[11px]"
              }`}
            >
              Domain analytics
            </p>
            <p
              className={`break-all font-semibold text-slate-900 sm:truncate ${
                isPage ? "text-sm sm:text-base" : "text-sm"
              }`}
            >
              {companyName}
            </p>
          </div>
        </div>

        <div
          className="hidden h-8 w-px shrink-0 bg-slate-200/90 sm:block"
          aria-hidden
        />

        <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:gap-5">
          <div className="rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 sm:flex sm:items-baseline sm:gap-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <span className={`text-slate-500 ${labelClass}`}>Fresh cases</span>
            <span className={`mt-0.5 block font-semibold text-slate-900 sm:mt-0 ${valueClass}`}>
              {freshCases}
            </span>
          </div>
          <div className="rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 sm:flex sm:items-baseline sm:gap-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <span className={`text-slate-500 ${labelClass}`}>Fresh collection</span>
            <span
              className={`mt-0.5 block font-semibold text-emerald-700 sm:mt-0 ${valueClass}`}
            >
              {collectionPct}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainAnalyticsSummary;
