import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Compass, X } from "lucide-react";
import {
  LEAD_TAB_EVENT,
  LEAD_TOUR_DISMISS_EVENT,
  LEAD_TOUR_START_EVENT,
  SUMMARY_TOUR_START_EVENT,
  TOUR_END_EVENT,
  TOUR_PREPARE_EVENT,
  TOUR_START_EVENT,
  LEAD_TOUR_SEEN_ID,
  getLeadTour,
  getProductTour,
  getSummaryTour,
  isProductTourSeen,
  markProductTourSeen,
  requestProductTour,
} from "../../utils/productTour";

const SPOTLIGHT_PAD = 8;

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function readRect(target) {
  const element = document.querySelector(target);
  if (!element) return null;
  const box = element.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return null;
  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    bottom: box.bottom,
    right: box.right,
  };
}

function placeCard(targetRect, card, placement) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12;
  const gap = 16;
  const centered = {
    top: clamp((viewportHeight - card.height) / 2, margin, viewportHeight - card.height - margin),
    left: clamp((viewportWidth - card.width) / 2, margin, viewportWidth - card.width - margin),
    placement: "center",
  };

  if (!targetRect || placement === "center") return centered;

  const room = {
    bottom: viewportHeight - targetRect.bottom,
    top: targetRect.top,
    right: viewportWidth - targetRect.right,
    left: targetRect.left,
  };
  const order = [
    placement,
    ...["bottom", "top", "right", "left"].filter((side) => side !== placement),
  ];
  const fits = (side) => {
    if (side === "bottom" || side === "top") {
      return room[side] >= card.height + gap + margin;
    }
    return room[side] >= card.width + gap + margin;
  };
  const chosen = order.find(fits);
  if (!chosen) return centered;

  let top = targetRect.top;
  let left = targetRect.left;
  if (chosen === "bottom") {
    top = targetRect.bottom + gap;
    left = targetRect.left + targetRect.width / 2 - card.width / 2;
  } else if (chosen === "top") {
    top = targetRect.top - gap - card.height;
    left = targetRect.left + targetRect.width / 2 - card.width / 2;
  } else if (chosen === "right") {
    left = targetRect.right + gap;
    top = targetRect.top + Math.min(targetRect.height / 2, 72) - 28;
  } else {
    left = targetRect.left - gap - card.width;
    top = targetRect.top + Math.min(targetRect.height / 2, 72) - 28;
  }

  return {
    top: clamp(top, margin, viewportHeight - card.height - margin),
    left: clamp(left, margin, viewportWidth - card.width - margin),
    placement: chosen,
  };
}

function caretClass(placement) {
  if (placement === "bottom") return "left-8 -top-1.5";
  if (placement === "top") return "left-8 -bottom-1.5";
  if (placement === "right") return "-left-1.5 top-8";
  if (placement === "left") return "-right-1.5 top-8";
  return "hidden";
}

export default function ProductTour() {
  const location = useLocation();
  const user = useSelector((state) => state.user);
  const role = (location.pathname.split("/")[1] || "").toLowerCase();
  const canSwitchRole =
    user?.allRoles?.includes("ADMIN") || (user?.allRoles?.length || 0) > 1;
  const hasSearch = role !== "quality-checker";
  const roleTour = useMemo(
    () => getProductTour(role, { canSwitchRole, hasSearch }),
    [role, canSwitchRole, hasSearch]
  );
  const leadTour = useMemo(() => getLeadTour(), []);
  const summaryTour = useMemo(() => getSummaryTour(), []);
  const [mode, setMode] = useState("role");
  const tour =
    mode === "lead" ? leadTour : mode === "summary" ? summaryTour : roleTour;
  const steps = tour.steps;
  const roleRef = useRef(role);
  const modeRef = useRef("role");
  const openRef = useRef(false);
  roleRef.current = role;

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  const directionRef = useRef(1);
  const indexRef = useRef(0);

  const step = steps[index] || steps[0];
  const isLast = index === steps.length - 1;

  const close = useCallback((status) => {
    const seenId =
      modeRef.current === "lead"
        ? LEAD_TOUR_SEEN_ID
        : modeRef.current === "summary"
          ? "summary"
          : roleRef.current;
    markProductTourSeen(seenId, status);
    openRef.current = false;
    setOpen(false);
    setRect(null);
    setPos(null);
    window.dispatchEvent(
      new CustomEvent(TOUR_END_EVENT, {
        detail: { status, tour: modeRef.current },
      })
    );
  }, []);

  const goTo = useCallback(
    (nextIndex) => {
      const bounded = clamp(nextIndex, 0, steps.length - 1);
      directionRef.current = bounded >= indexRef.current ? 1 : -1;
      indexRef.current = bounded;
      setIndex(bounded);
    },
    [steps.length]
  );

  const goNext = useCallback(() => {
    if (indexRef.current >= steps.length - 1) {
      close("completed");
      return;
    }
    goTo(indexRef.current + 1);
  }, [close, goTo, steps.length]);

  const goBack = useCallback(() => {
    if (indexRef.current <= 0) return;
    goTo(indexRef.current - 1);
  }, [goTo]);

  const begin = useCallback((nextMode) => {
    modeRef.current = nextMode;
    openRef.current = true;
    directionRef.current = 1;
    indexRef.current = 0;
    setMode(nextMode);
    setIndex(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const openRoleTour = () => begin("role");
    const openLeadTour = () => begin("lead");
    const openSummaryTour = () => {
      if (modeRef.current === "lead" && openRef.current) return;
      begin("summary");
    };
    const dismissPageTour = () => {
      if (
        (modeRef.current !== "lead" && modeRef.current !== "summary") ||
        !openRef.current
      ) {
        return;
      }
      openRef.current = false;
      setOpen(false);
      setRect(null);
      setPos(null);
    };
    window.addEventListener(TOUR_START_EVENT, openRoleTour);
    window.addEventListener(LEAD_TOUR_START_EVENT, openLeadTour);
    window.addEventListener(SUMMARY_TOUR_START_EVENT, openSummaryTour);
    window.addEventListener(LEAD_TOUR_DISMISS_EVENT, dismissPageTour);
    return () => {
      window.removeEventListener(TOUR_START_EVENT, openRoleTour);
      window.removeEventListener(LEAD_TOUR_START_EVENT, openLeadTour);
      window.removeEventListener(SUMMARY_TOUR_START_EVENT, openSummaryTour);
      window.removeEventListener(LEAD_TOUR_DISMISS_EVENT, dismissPageTour);
    };
  }, [begin]);

  useEffect(() => {
    if (modeRef.current === "lead" || modeRef.current === "summary") return;
    directionRef.current = 1;
    indexRef.current = 0;
    setIndex(0);
  }, [role]);

  useEffect(() => {
    if (isProductTourSeen(role)) return undefined;
    const timer = window.setTimeout(() => {
      if (document.querySelector("[data-tour='lead-tabs'], [data-tour='summary-profile']")) return;
      requestProductTour();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [role]);

  useEffect(() => {
    if (indexRef.current <= steps.length - 1) return;
    goTo(steps.length - 1);
  }, [steps.length, goTo]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !step) return undefined;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      if (!step.target) {
        setRect(null);
        setLayoutTick((tick) => tick + 1);
        return;
      }
      const nextRect = readRect(step.target);
      if (!nextRect) {
        const delta = directionRef.current || 1;
        const fallback = indexRef.current + delta;
        if (fallback >= 0 && fallback < steps.length) {
          goTo(fallback);
        } else {
          close("completed");
        }
        return;
      }
      setRect((current) => {
        if (
          current &&
          current.top === nextRect.top &&
          current.left === nextRect.left &&
          current.width === nextRect.width &&
          current.height === nextRect.height
        ) {
          return current;
        }
        return nextRect;
      });
      setLayoutTick((tick) => tick + 1);
    };

    const prepare = async () => {
      if (step.leadTab) {
        window.dispatchEvent(
          new CustomEvent(LEAD_TAB_EVENT, { detail: { tab: step.leadTab } })
        );
        await new Promise((resolve) => {
          window.setTimeout(resolve, 180);
        });
      }
      if (cancelled) return;
      if (step.expandSidebar) {
        const sidebar = readRect("[data-tour='sidebar']");
        const collapsed = !sidebar || sidebar.left < 0 || sidebar.width < 120;
        if (collapsed) {
          window.dispatchEvent(
            new CustomEvent(TOUR_PREPARE_EVENT, {
              detail: { id: step.id, expandSidebar: true },
            })
          );
          await new Promise((resolve) => {
            window.setTimeout(resolve, 340);
          });
        }
        if (!cancelled && step.target) {
          document.querySelector(step.target)?.scrollIntoView({
            block: "nearest",
            inline: "nearest",
          });
          await new Promise((resolve) => {
            window.setTimeout(resolve, 60);
          });
        }
      } else if (step.target) {
        document.querySelector(step.target)?.scrollIntoView({
          block: "nearest",
          inline: "center",
        });
        await new Promise((resolve) => {
          window.setTimeout(resolve, 60);
        });
      }
      measure();
    };

    prepare();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, steps.length, goTo, close]);

  useLayoutEffect(() => {
    if (!open || !cardRef.current || !step) return;
    const card = cardRef.current.getBoundingClientRect();
    const nextPos = placeCard(rect, card, step.placement || "bottom");
    setPos((current) => {
      if (
        current &&
        current.top === nextPos.top &&
        current.left === nextPos.left &&
        current.placement === nextPos.placement
      ) {
        return current;
      }
      return nextPos;
    });
  }, [open, rect, step, layoutTick]);

  useEffect(() => {
    if (!open) return undefined;
    nextRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close("skipped");
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
        return;
      }
      if (event.key !== "Tab" || !cardRef.current) return;
      const focusable = [
        ...cardRef.current.querySelectorAll("button:not(:disabled)"),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, index, close, goNext, goBack]);

  if (!open || !step) return null;

  const showHole = Boolean(rect) && step.highlight !== "outline" && step.placement !== "center";
  const showOutline = Boolean(rect) && !showHole;

  return createPortal(
    <div className="fixed inset-0 z-[1100] overflow-hidden" data-tour-active={mode}>
      <div className="absolute inset-0" aria-hidden="true" />
      {showHole ? (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-brand-soft transition-[top,left,width,height] duration-200 ease-out motion-reduce:transition-none"
          style={{
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
            boxShadow: "0 0 0 9999px rgba(26, 26, 26, 0.68)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-brand-dark/70" />
      )}
      {showOutline ? (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-brand-soft shadow-[0_0_0_6px_rgba(197,221,210,0.25)]"
          style={{
            top: rect.top + 8,
            left: rect.left + 8,
            width: Math.max(rect.width - 16, 0),
            height: Math.max(rect.height - 16, 0),
          }}
        />
      ) : null}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-tour-title"
        aria-describedby="product-tour-body"
        className="absolute flex max-h-[calc(100vh-1.5rem)] w-[min(22.5rem,calc(100vw-1.5rem))] flex-col rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(26,26,26,0.55)]"
        style={{
          top: pos?.top ?? 24,
          left: pos?.left ?? 24,
          opacity: pos ? 1 : 0,
        }}
      >
        {pos?.placement && pos.placement !== "center" ? (
          <span
            className={`absolute h-3 w-3 rotate-45 border border-transparent bg-white ${caretClass(pos.placement)}`}
            aria-hidden="true"
          />
        ) : null}

        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Compass size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                {tour.kicker}
              </p>
              <p className="text-xs text-slate-500">
                Step {index + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => close("skipped")}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Skip tour"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-1 pt-3">
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>
          <h2 id="product-tour-title" className="text-base font-semibold text-slate-900">
            {step.title}
          </h2>
          <p id="product-tour-body" className="mt-1.5 text-sm leading-relaxed text-slate-600">
            {step.body}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Tour steps">
            {steps.map((item, stepIndex) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={stepIndex === index}
                aria-label={`Go to step ${stepIndex + 1}: ${item.title}`}
                onClick={() => goTo(stepIndex)}
                className={`h-1.5 rounded-full transition-all ${
                  stepIndex === index ? "w-4 bg-brand" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
          <p className="hidden text-[11px] text-slate-400 sm:block">← → · Esc</p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={() => close("skipped")}
            className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={index === 0}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              ref={nextRef}
              type="button"
              onClick={goNext}
              className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
