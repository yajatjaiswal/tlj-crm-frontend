import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { leadStageMapping, leadStageMeaning } from "../utils/leadStageMapping";

const STAGE_TIPS = Object.entries(leadStageMeaning).map(([stage, meaning]) => ({
  stage,
  label: leadStageMapping[stage] || stage,
  meaning,
}));

const LeadStageTips = ({
  currentStage = null,
  className = "",
  align = "left",
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const panelAlignClass = align === "right" ? "right-0" : "left-0";

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 hover:text-amber-700"
        aria-expanded={open}
        aria-label="Lead stage tips"
        title="Lead stage tips"
      >
        <Lightbulb className="h-3 w-3" />
      </button>

      {open ? (
        <div
          className={`absolute ${panelAlignClass} top-full z-[60] mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl`}
          role="dialog"
          aria-label="Lead stage meanings"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold text-slate-800">Lead Stage Tips</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Stage label → meaning / next step
            </p>
          </div>
          <ul className="max-h-80 overflow-y-auto p-2">
            {STAGE_TIPS.map(({ stage, label, meaning }) => {
              const isCurrent = currentStage === stage;
              return (
                <li
                  key={stage}
                  className={`rounded-lg px-2.5 py-2 ${
                    isCurrent ? "bg-brand-light ring-1 ring-brand/40" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <p
                      className={`text-[11px] font-semibold ${
                        isCurrent ? "text-brand-link" : "text-slate-800"
                      }`}
                    >
                      {label}
                    </p>
                    {isCurrent ? (
                      <span className="text-[10px] font-medium text-brand-link">(current)</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{meaning}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default LeadStageTips;
