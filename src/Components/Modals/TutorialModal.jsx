import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CirclePlay, X } from "lucide-react";

export const CRM_TUTORIALS = [
  {
    id: "en",
    label: "English",
    src: "https://tlj-public-s3.s3.ap-south-2.amazonaws.com/tutorial/Loan-CRM-Tutorial-draft.mp4",
  },
  {
    id: "hi",
    label: "Hindi",
    src: "https://tlj-public-s3.s3.ap-south-2.amazonaws.com/tutorial/Loan-CRM-Tutorial-Hindi-draft.mp4",
  },
];

const SCROLL_KEYS = new Set([
  " ",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

function canScroll(element, deltaY) {
  if (!element || deltaY === 0) return false;
  const atTop = element.scrollTop <= 0;
  const atBottom =
    element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
  if (deltaY < 0) return !atTop;
  return !atBottom;
}

const TutorialModal = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState(CRM_TUTORIALS[0].id);

  useEffect(() => {
    if (!isOpen) return undefined;

    const locked = [
      document.documentElement,
      document.body,
      ...document.querySelectorAll("main"),
    ];
    const previousOverflow = locked.map((element) => element.style.overflow);
    locked.forEach((element) => {
      element.style.overflow = "hidden";
    });

    const blockBackgroundScroll = (event) => {
      const scroller = event.target?.closest?.("[data-tutorial-scroll]");
      if (event.type === "touchmove") {
        if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) return;
        event.preventDefault();
        return;
      }
      if (canScroll(scroller, event.deltaY || 0)) return;
      event.preventDefault();
    };

    const blockScrollKeys = (event) => {
      if (!SCROLL_KEYS.has(event.key)) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("video, input, textarea, select, button, [contenteditable='true']")
      ) {
        return;
      }
      event.preventDefault();
    };

    document.addEventListener("wheel", blockBackgroundScroll, {
      passive: false,
      capture: true,
    });
    document.addEventListener("touchmove", blockBackgroundScroll, {
      passive: false,
      capture: true,
    });
    document.addEventListener("keydown", blockScrollKeys, true);

    return () => {
      locked.forEach((element, index) => {
        element.style.overflow = previousOverflow[index];
      });
      document.removeEventListener("wheel", blockBackgroundScroll, true);
      document.removeEventListener("touchmove", blockBackgroundScroll, true);
      document.removeEventListener("keydown", blockScrollKeys, true);
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const active =
    CRM_TUTORIALS.find((item) => item.id === language) || CRM_TUTORIALS[0];

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center overflow-hidden overscroll-none bg-slate-900/45 p-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="CRM tutorial"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <CirclePlay size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                CRM tutorial
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Full walkthrough of the Loan CRM. Pick a language to watch.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close tutorial"
          >
            <X size={18} />
          </button>
        </div>

        <div
          data-tutorial-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-5 py-4"
        >
          <div
            className="mb-3 inline-flex rounded-full border border-slate-200 bg-white p-1"
            role="tablist"
            aria-label="Tutorial language"
          >
            {CRM_TUTORIALS.map((item) => {
              const selected = item.id === active.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setLanguage(item.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    selected
                      ? "bg-brand text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-xl bg-black shadow-sm">
            <video
              key={active.id}
              className="aspect-video w-full bg-black"
              controls
              controlsList="nodownload"
              playsInline
              preload="metadata"
              src={active.src}
              onContextMenu={(event) => event.preventDefault()}
            >
              Your browser cannot play this video.
            </video>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Watching the {active.label} tutorial.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TutorialModal;
