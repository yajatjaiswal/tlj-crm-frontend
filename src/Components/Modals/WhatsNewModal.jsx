import { Sparkles, X } from "lucide-react";
import { formatWhatsNewDate } from "../../utils/whatsNew";

const TAG_STYLES = {
  New: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Improved: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  Fix: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
};

const WhatsNewModal = ({
  isOpen,
  onClose,
  items = [],
  unreadCount = 0,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="What's new"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                What&apos;s new
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Simple notes on recent CRM updates
                {unreadCount > 0
                  ? ` · ${unreadCount} new for you`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close what's new"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                No updates yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                New features will show up here when they ship.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const tagClass =
                  TAG_STYLES[item.tag] ||
                  "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {item.tag ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tagClass}`}
                        >
                          {item.tag}
                        </span>
                      ) : null}
                      {item.date ? (
                        <span className="text-xs text-slate-500">
                          {formatWhatsNewDate(item.date)}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {item.summary}
                    </p>
                    {Array.isArray(item.points) && item.points.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {item.points.map((point) => (
                          <li
                            key={point}
                            className="flex gap-2 text-sm text-slate-600"
                          >
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
