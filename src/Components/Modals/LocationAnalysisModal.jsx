import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  MapPin,
  X,
  XCircle,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";
import {
  clearLocationSuspicious,
  getLeadLocationAnalysis,
  getLeadLocationCleared,
  rejectLocationSuspicious,
} from "../../services/functions/credit-analyst";
import {
  buildEventDistanceMap,
  distanceMeters,
  formatDistance,
  formatDurationSeconds,
  formatGap,
  formatSpeed,
  formatWhen,
  humanizeLabel,
  normalizeLocationAnalysis,
  normalizeLocationCleared,
} from "../../utils/locationDistance";

const BRAND = "#066039";
const DANGER = "#ed5b36";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markerIcon(number, suspicious, count) {
  const background = suspicious ? DANGER : BRAND;
  const countBadge =
    count > 1
      ? `<span style="position:absolute;top:-7px;right:-8px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#1A1A1A;color:#fff;font-size:10px;line-height:16px;text-align:center">${count}</span>`
      : "";

  return L.divIcon({
    className: "location-pin-icon",
    html: `<div style="position:relative;width:30px;height:30px;border-radius:999px;background:${background};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${number}${countBadge}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function lineCaption(line) {
  const primary = [...line.pairs].sort((a, b) => b.meters - a.meters)[0];
  const extra = line.pairs.length > 1 ? ` +${line.pairs.length - 1}` : "";
  const kind = line.kind === "many" ? "Later step" : "Next step";
  return `${kind} · ${formatDistance(primary.meters)}${extra}`;
}

function mentionsCibil(value) {
  return String(value || "").toLowerCase().includes("cibil");
}

function markerTitle(marker) {
  const labels = [...new Set(marker.points.map((point) => humanizeLabel(point.label)))];
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

function popupHtml(marker, index) {
  const rows = marker.points
    .map(
      (point) => `
        <div style="margin-top:8px">
          <div style="font-weight:600;color:#0f172a">${escapeHtml(humanizeLabel(point.label))}</div>
          <div style="color:#64748b;font-size:12px">Step ${escapeHtml(point.step)}${point.at ? ` · ${escapeHtml(formatWhen(point.at))}` : ""}</div>
        </div>`
    )
    .join("");

  return `
    <div style="min-width:200px;font-family:Inter,sans-serif">
      <div style="font-weight:700;color:#0f172a">Pin ${index + 1}</div>
      <div style="font-size:12px;color:#475569">${marker.lat}, ${marker.lng}</div>
      ${rows}
    </div>`;
}

function drawDistanceLines(map, segments, style) {
  segments.forEach((segment) => {
    const line = L.polyline(
      [
        [segment.from.lat, segment.from.lng],
        [segment.to.lat, segment.to.lng],
      ],
      style(segment)
    ).addTo(map);
    line.bindTooltip(lineCaption(segment), {
      sticky: true,
      direction: "center",
      className: segment.suspicious
        ? "location-distance-tip location-distance-tip-bad"
        : "location-distance-tip",
    });
  });
}

function LocationMap({ markers, lines, comparisonLines = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || markers.length === 0) return undefined;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });
    const keepWheelOnMap = (event) => {
      event.stopPropagation();
    };
    map.getContainer().addEventListener("wheel", keepWheelOnMap);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    drawDistanceLines(map, comparisonLines, (segment) => ({
      color: segment.suspicious ? DANGER : "#64748b",
      weight: 2,
      opacity: 0.55,
      dashArray: "6 6",
    }));
    drawDistanceLines(map, lines, (segment) => ({
      color: segment.suspicious ? DANGER : BRAND,
      weight: segment.suspicious ? 4 : 3,
      opacity: 0.95,
    }));

    const bounds = [];
    markers.forEach((marker, index) => {
      const pin = L.marker([marker.lat, marker.lng], {
        icon: markerIcon(index + 1, marker.suspicious, marker.points.length),
      }).addTo(map);
      pin.bindPopup(popupHtml(marker, index));
      pin.bindTooltip(`${index + 1}. ${markerTitle(marker)}`, {
        direction: "top",
        offset: [0, -14],
      });
      bounds.push([marker.lat, marker.lng]);
    });

    const fit = () => {
      map.invalidateSize();
      if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      } else {
        map.fitBounds(bounds, { padding: [36, 36] });
      }
    };

    fit();
    const frame = requestAnimationFrame(fit);
    const timer = window.setTimeout(fit, 200);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      map.getContainer()?.removeEventListener("wheel", keepWheelOnMap);
      map.remove();
    };
  }, [markers, lines, comparisonLines]);

  return (
    <div className="location-analysis-map relative h-[300px] overflow-hidden rounded-xl sm:h-[380px] lg:h-[440px]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#066039]" />
          Next step
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-[#ed5b36]" />
          Later steps
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ed5b36]" />
          Too far
        </span>
      </div>
    </div>
  );
}

const LocationAnalysisModal = ({ leadId, onClose, mode = "review" }) => {
  const queryClient = useQueryClient();
  const isClearedView = mode === "cleared";
  const [showAllLaterDistances, setShowAllLaterDistances] = useState(true);
  const [showCibilAddress, setShowCibilAddress] = useState(false);
  const [remarks, setRemarks] = useState("");
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      isClearedView ? "lead-location-cleared" : "lead-location-analysis",
      leadId,
    ],
    queryFn: () =>
      isClearedView
        ? getLeadLocationCleared(leadId)
        : getLeadLocationAnalysis(leadId),
    enabled: Boolean(leadId),
    retry: false,
  });

  const analysis = useMemo(() => {
    if (!data) return data;
    if (isClearedView) return normalizeLocationCleared(data);
    const payload =
      data?.analysis && typeof data.analysis === "object"
        ? { ...data, ...data.analysis }
        : data;
    return normalizeLocationAnalysis(payload);
  }, [data, isClearedView]);

  const threshold = analysis?.summary?.threshold_meter ?? 2000;
  const model = useMemo(
    () =>
      buildEventDistanceMap(
        analysis?.points || [],
        analysis?.event_distances || [],
        analysis?.comparison_distances,
        analysis?.address_distances || []
      ),
    [
      analysis?.points,
      analysis?.event_distances,
      analysis?.comparison_distances,
      analysis?.address_distances,
    ]
  );
  const eventDistances = [...(analysis?.event_distances || [])].sort(
    (a, b) => Number(a.fromStep) - Number(b.fromStep)
  );
  const laterGroups = [...(analysis?.comparison_distances || [])]
    .reduce((groups, row) => {
      const key = Number(row.fromStep);
      const group = groups.get(key) || {
        fromStep: row.fromStep,
        from: row.from,
        rows: [],
      };
      group.rows.push(row);
      groups.set(key, group);
      return groups;
    }, new Map());
  const visibleLaterGroups = [...laterGroups.values()]
    .sort((a, b) => Number(a.fromStep) - Number(b.fromStep))
    .map((group) => {
      const rows = [...group.rows].sort(
        (a, b) => Number(a.toStep) - Number(b.toStep)
      );
      const tooFar = rows.filter((row) => row.suspicious);
      const farthest = rows.reduce(
        (best, row) =>
          Number(row.distance_meter) > Number(best?.distance_meter ?? -1) ? row : best,
        null
      );
      return {
        ...group,
        tooFarCount: tooFar.length,
        farthest,
        rows: showAllLaterDistances ? rows : tooFar,
      };
    })
    .filter((group) => group.rows.length > 0);
  const addressDistances = [...(analysis?.address_distances || [])]
    .filter(
      (row) =>
        showCibilAddress || (!mentionsCibil(row.from) && !mentionsCibil(row.to))
    )
    .sort((a, b) => Number(b.distance_meter) - Number(a.distance_meter));
  const hasCibilAddress = (analysis?.address_distances || []).some(
    (row) => mentionsCibil(row.from) || mentionsCibil(row.to)
  );
  const lead = analysis?.lead;
  const summary = analysis?.summary;
  const clearLeadId = lead?.id || leadId;

  const { mutate: approveLocation, isPending: isApproving } = useMutation({
    mutationFn: clearLocationSuspicious,
    onSuccess: () => {
      toast.success("Location approved. The lead is no longer flagged.");
      queryClient.invalidateQueries({
        queryKey: ["lead-rejection-reason", leadId],
      });
      queryClient.invalidateQueries({
        queryKey: ["lead-rejection-reason", clearLeadId],
      });
      queryClient.invalidateQueries({
        queryKey: ["location-suspicious-leads"],
      });
      queryClient.invalidateQueries({
        queryKey: ["location-suspicious-cleared"],
      });
      onClose();
    },
    onError: (approveError) => {
      toast.error(approveError.message || "Could not approve the location. Please try again.");
    },
  });

  const { mutate: rejectLocation, isPending: isRejecting } = useMutation({
    mutationFn: rejectLocationSuspicious,
    onSuccess: () => {
      toast.success("Lead rejected");
      queryClient.invalidateQueries({
        queryKey: ["lead-rejection-reason", leadId],
      });
      queryClient.invalidateQueries({
        queryKey: ["lead-rejection-reason", clearLeadId],
      });
      queryClient.invalidateQueries({
        queryKey: ["location-suspicious-leads"],
      });
      queryClient.invalidateQueries({
        queryKey: ["location-suspicious-rejected"],
      });
      onClose();
    },
    onError: (rejectError) => {
      toast.error(rejectError.message || "Could not reject the lead. Please try again.");
    },
  });

  const locationPayload = () => {
    const trimmedRemarks = remarks.trim();
    if (!clearLeadId) {
      toast.error("Lead ID is missing. Please reopen this lead.");
      return null;
    }
    if (!trimmedRemarks) {
      toast.error("Please write a reason first");
      return null;
    }
    return {
      lead_id: Number(clearLeadId),
      remarks: trimmedRemarks,
    };
  };

  const handleApprove = () => {
    const payload = locationPayload();
    if (!payload) return;
    approveLocation(payload);
  };

  const handleReject = () => {
    const payload = locationPayload();
    if (!payload) return;
    rejectLocation(payload);
  };

  const isSubmitting = isApproving || isRejecting;
  const flagged = Boolean(
    summary?.location_suspicious ??
      summary?.breach?.suspicious ??
      lead?.location_suspicious
  );
  const breachMeters = Number(summary?.breach?.distance_meter);
  const allowedMeters = Number(summary?.breach?.threshold_used ?? threshold);
  const overBy =
    Number(summary?.breach?.exceeded_by_meter) ||
    Number(summary?.event_breach?.exceeded_by_meter) ||
    (Number.isFinite(breachMeters) ? Math.max(0, breachMeters - allowedMeters) : NaN);
  const speedLimit =
    Number(summary?.breach?.speed_limit_kmph) ||
    Number(summary?.speed_limit_kmph) ||
    null;

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, isSubmitting]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <style>{`
        .location-distance-tip {
          background: #fff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          font-weight: 600;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
        }
        .location-distance-tip::before { display: none; }
        .location-distance-tip-bad {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #b91c1c;
        }
        .location-pin-icon {
          background: transparent;
          border: none;
        }
        .location-analysis-map .leaflet-container {
          touch-action: none;
        }
      `}</style>
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <MapPin size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-slate-900">
                  {lead?.full_name || "Location check"}
                </h3>
                {data && !isError ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isClearedView
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : flagged
                          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    }`}
                  >
                    {isClearedView
                      ? analysis?.decision?.outcome_label ||
                        humanizeLabel(analysis?.decision?.outcome || "Approved")
                      : flagged
                        ? "Needs review"
                        : "No issue"}
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                {lead?.lead_no ? <span>#{lead.lead_no}</span> : null}
                {lead?.lead_no && lead?.pan ? <span className="text-slate-300">•</span> : null}
                {lead?.pan ? (
                  <span className="font-medium tracking-wide text-slate-600">{lead.pan}</span>
                ) : null}
                {lead?.mobile ? (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{lead.mobile}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close location analysis"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          {isLoading || (isFetching && !data) ? (
            <div className="space-y-4 px-5 py-4">
              <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
              <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
                <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
              </div>
            </div>
          ) : isError ? (
            <div className="px-5 py-16 text-center">
              <AlertCircle size={28} className="mx-auto text-red-400" />
              <p className="mt-2 text-sm font-medium text-slate-800">
                Could not load this location check
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {error?.message || "Please try again in a moment."}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                Try again
              </button>
            </div>
          ) : isClearedView ? (
            <ClearedDecisionBody
              analysis={analysis}
              addressDistances={addressDistances}
              hasCibilAddress={hasCibilAddress}
              showCibilAddress={showCibilAddress}
              setShowCibilAddress={setShowCibilAddress}
              eventDistances={eventDistances}
              visibleLaterGroups={visibleLaterGroups}
              showAllLaterDistances={showAllLaterDistances}
              setShowAllLaterDistances={setShowAllLaterDistances}
              model={model}
              threshold={
                Number(analysis?.decision?.threshold_meter) ||
                Number(analysis?.detail?.threshold_meter) ||
                threshold
              }
            />
          ) : (
            <div className="space-y-4 px-5 py-4">
              <VerdictCard
                flagged={flagged}
                breach={summary?.breach}
                eventBreach={summary?.event_breach}
                breachMeters={breachMeters}
                allowedMeters={allowedMeters}
                overBy={overBy}
                threshold={threshold}
                speedLimit={speedLimit}
                maxEventDistance={summary?.max_event_distance_meter}
                maxAddressDistance={summary?.max_address_distance_meter}
              />

              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Card
                  className="lg:sticky lg:top-0"
                  title="Map"
                  meta="Where the customer was at each step"
                  bodyClassName="p-2"
                >
                  {model.markers.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-500">
                      No locations were found for this lead.
                    </p>
                  ) : (
                    <LocationMap
                      markers={model.markers}
                      lines={model.lines}
                      comparisonLines={model.comparisonLines}
                    />
                  )}
                </Card>
                <StepJourney
                  steps={analysis?.points || []}
                  links={eventDistances}
                  threshold={threshold}
                />
              </div>
              <LaterChecks
                groups={visibleLaterGroups}
                steps={analysis?.points || []}
                links={eventDistances}
                showAll={showAllLaterDistances}
                onToggle={setShowAllLaterDistances}
                threshold={threshold}
              />
              <DistanceTable
                title="Customer addresses"
                hint={`How far apart the customer's addresses are (${addressDistances.length})`}
                collapsible
                defaultOpen={false}
                rows={addressDistances}
                emptyLabel="No addresses to compare."
                threshold={threshold}
                action={
                  hasCibilAddress ? (
                    <button
                      type="button"
                      onClick={() => setShowCibilAddress((value) => !value)}
                      className="text-xs font-semibold text-brand"
                    >
                      {showCibilAddress ? "Hide CIBIL address" : "Show CIBIL address"}
                    </button>
                  ) : null
                }
              />
            </div>
          )}
        </div>

        {data && !isError && isClearedView && (
          <div className="border-t border-slate-200 bg-white px-5 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm text-slate-600">
                <p className="font-medium text-slate-800">
                  {analysis?.decision?.outcome_label ||
                    humanizeLabel(analysis?.decision?.outcome || "Location approved")}
                </p>
                {analysis?.decision?.remark ? (
                  <p className="mt-0.5 text-slate-500">{analysis.decision.remark}</p>
                ) : analysis?.decision?.automatic ? (
                  <p className="mt-0.5 text-slate-500">
                    Cleared automatically — no checker review was needed.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {data && !isError && !isClearedView && (
          <div className="border-t border-slate-200 bg-white px-5 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-800">
                  <span>
                    Reason for your decision<span className="text-red-600">*</span>
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    Write this before you approve or reject
                  </span>
                </span>
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={2}
                  placeholder="For example: customer was travelling for work, or the places do not match"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                />
              </label>
              <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting || !remarks.trim()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-red-200 disabled:hover:bg-white disabled:hover:text-red-600"
                >
                  <XCircle size={16} />
                  {isRejecting ? "Rejecting..." : "Reject lead"}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting || !remarks.trim()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  {isApproving ? "Approving..." : "Approve location"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function segmentGap(link) {
  if (!link) return "";
  const fromDuration = formatDurationSeconds(link.duration_second);
  if (fromDuration) return fromDuration;
  return formatGap(link.fromAt, link.toAt);
}

function StepJourney({ steps, links, threshold }) {
  const ordered = [...steps].sort((a, b) => Number(a.step) - Number(b.step));
  const linkByFrom = new Map(links.map((row) => [Number(row.fromStep), row]));
  const moves = links.filter(
    (row) => row.suspicious === true || Number(row.distance_meter) > Number(threshold)
  ).length;

  return (
    <Card
      title="Customer's steps"
      meta="Event locations only (addresses listed separately)"
      action={
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            moves > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {moves > 0
            ? `Moved ${moves} ${moves === 1 ? "time" : "times"}`
            : "Stayed in one area"}
        </span>
      }
      bodyClassName="px-4 py-3"
    >
      <div>
        {ordered.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No steps to show.
          </p>
        ) : (
          <ol>
            {ordered.map((step, index) => {
              const link = linkByFrom.get(Number(step.step));
              const isLast = index === ordered.length - 1;
              const moved =
                link &&
                (link.suspicious === true ||
                  Number(link.distance_meter) > Number(threshold));
              const gap = segmentGap(link);
              const speed =
                link && Number.isFinite(Number(link.speed_kmph))
                  ? formatSpeed(link.speed_kmph)
                  : "";
              return (
                <li key={step.id ?? step.step} className="flex gap-3">
                  <div className="flex w-7 shrink-0 flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        moved ? "bg-red-600" : "bg-brand"
                      }`}
                    >
                      {step.step}
                    </span>
                    {!isLast ? (
                      <span
                        className={`w-0 flex-1 ${
                          moved
                            ? "border-l-[3px] border-red-500"
                            : "border-l-2 border-dashed border-slate-300"
                        }`}
                      />
                    ) : null}
                  </div>
                  <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-4"}`}>
                    <p className="text-sm font-semibold leading-7 text-slate-900">
                      {humanizeLabel(step.label)}
                    </p>
                    {step.at ? (
                      <p className="text-xs text-slate-500">{formatWhen(step.at)}</p>
                    ) : null}
                    {!isLast && link ? (
                      <p
                        className={`mt-1.5 inline-flex flex-wrap items-center gap-x-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          moved
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span>
                          {moved
                            ? `Moved ${formatDistance(link.distance_meter)} after this step`
                            : `Next step was ${formatDistance(link.distance_meter)} away`}
                        </span>
                        {gap ? (
                          <span className="font-medium opacity-80">· {gap} later</span>
                        ) : null}
                        {moved && speed ? (
                          <span className="font-medium opacity-80">· {speed}</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}

function stepRange(steps) {
  const first = steps[0]?.step;
  const last = steps[steps.length - 1]?.step;
  if (first == null) return "";
  return first === last ? `Step ${first}` : `Steps ${first}–${last}`;
}

function placesFromJourney(steps, links, threshold) {
  const ordered = [...steps].sort((a, b) => Number(a.step) - Number(b.step));
  const linkByFrom = new Map(links.map((row) => [Number(row.fromStep), row]));
  const places = [];
  let bucket = [];
  ordered.forEach((step, index) => {
    bucket.push(step);
    const link = linkByFrom.get(Number(step.step));
    const moved =
      link &&
      (link.suspicious === true || Number(link.distance_meter) > Number(threshold));
    if (moved && index < ordered.length - 1) {
      places.push({ steps: bucket, jump: link });
      bucket = [];
    }
  });
  if (bucket.length) places.push({ steps: bucket, jump: null });
  return places;
}

const PLACE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function placeCenter(place) {
  const first = place.steps.find(
    (step) => Number.isFinite(Number(step.latitude)) && Number.isFinite(Number(step.longitude))
  );
  return first ? { lat: Number(first.latitude), lng: Number(first.longitude) } : null;
}

function PlacesStrip({ places, threshold }) {
  const labelled = [];
  places.forEach((place) => {
    const center = placeCenter(place);
    const earlier = center
      ? labelled.find(
          (item) => item.center && distanceMeters(item.center, center) <= Number(threshold)
        )
      : null;
    labelled.push({
      ...place,
      center,
      letter:
        earlier?.letter ||
        PLACE_LETTERS[labelled.filter((item) => !item.repeat).length] ||
        "?",
      repeat: Boolean(earlier),
    });
  });

  const uniquePlaces = new Set(labelled.map((place) => place.letter)).size;
  const moveCount = Math.max(0, places.length - 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">
          Where the customer was
          <span className="ml-1.5 font-normal text-slate-500">
            {`${uniquePlaces} ${uniquePlaces === 1 ? "place" : "places"}, ${moveCount} ${
              moveCount === 1 ? "move" : "moves"
            }`}
          </span>
        </p>
        {labelled.length > 3 ? (
          <p className="text-[11px] text-slate-400">Scroll sideways to see every place</p>
        ) : null}
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max items-stretch gap-3">
          {labelled.map((place, index) => {
            const names = [
              ...new Set(place.steps.map((step) => humanizeLabel(step.label))),
            ];
            return (
              <div
                key={`${place.steps[0]?.step}-${index}`}
                className="flex items-stretch gap-3"
              >
                <div className="flex w-44 shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:w-48">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        place.letter === "A" ? "bg-brand" : "bg-red-600"
                      }`}
                    >
                      {place.letter}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Place {place.letter}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                        {stepRange(place.steps)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {place.steps.length}{" "}
                        {place.steps.length === 1 ? "step" : "steps"}
                      </p>
                    </div>
                  </div>
                  {place.repeat ? (
                    <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium leading-snug text-amber-800">
                      Back in the same area as before
                    </p>
                  ) : null}
                  <div className="mt-2.5 flex flex-1 flex-col gap-1">
                    {names.map((name) => (
                      <span
                        key={name}
                        title={name}
                        className="block truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                {place.jump ? (
                  <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 self-center rounded-xl border border-red-100 bg-red-50/80 px-2 py-3 text-center">
                    <ArrowRight size={16} className="text-red-500" />
                    <p className="text-sm font-bold leading-tight text-red-600">
                      {formatDistance(place.jump.distance_meter)}
                    </p>
                    <p className="text-[10px] leading-tight text-red-500">
                      after step {place.jump.fromStep}
                    </p>
                    {segmentGap(place.jump) ? (
                      <p className="text-[10px] leading-tight text-slate-500">
                        in {segmentGap(place.jump)}
                      </p>
                    ) : null}
                    {Number.isFinite(Number(place.jump.speed_kmph)) ? (
                      <p className="text-[10px] font-semibold leading-tight text-red-600">
                        {formatSpeed(place.jump.speed_kmph)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LaterChecks({ groups, steps, links, showAll, onToggle, threshold }) {
  const places = placesFromJourney(steps, links, threshold);
  const columns = [];
  groups.forEach((group) => {
    group.rows.forEach((row) => {
      if (!columns.some((column) => Number(column.step) === Number(row.toStep))) {
        columns.push({ step: row.toStep, name: row.to, at: row.toAt });
      }
    });
  });
  columns.sort((a, b) => Number(a.step) - Number(b.step));
  return (
    <Card
      title="How far each step was from later steps"
      meta={`Distance from each step to every later step. Red means more than ${formatDistance(threshold)}.`}
      action={<DistanceToggle showAll={showAll} onChange={onToggle} />}
      bodyClassName="space-y-3 p-3"
    >
      {places.some((place) => place.jump) ? (
        <PlacesStrip places={places} threshold={threshold} />
      ) : null}
      {groups.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-slate-500">
          {showAll
            ? "There are no steps to compare."
            : "No step is too far. Choose Show all to see every distance."}
        </p>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-3 py-2 align-middle text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    From step ↓ / to step →
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.step}
                      className="border-b border-slate-200 bg-slate-50 px-1.5 py-2 align-top text-center"
                    >
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                        {column.step}
                      </span>
                      <span className="mx-auto mt-1 block w-[4.75rem] text-[10px] font-medium leading-tight text-slate-600">
                        {humanizeLabel(column.name)}
                      </span>
                      {column.at ? (
                        <span className="mx-auto mt-0.5 block w-[4.75rem] text-[9px] font-normal leading-tight text-slate-400">
                          {formatWhen(column.at)}
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.fromStep} className="group">
                    <th className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-slate-100 bg-white px-3 py-1.5 text-left font-normal group-hover:bg-slate-50">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-700">
                          {group.fromStep}
                        </span>
                        <span>
                          <span className="block text-sm text-slate-800">{humanizeLabel(group.from)}</span>
                          {group.rows[0]?.fromAt ? (
                            <span className="block text-[10px] text-slate-400">
                              {formatWhen(group.rows[0].fromAt)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </th>
                    {columns.map((column) => {
                      const cell = group.rows.find(
                        (row) => Number(row.toStep) === Number(column.step)
                      );
                      const suspicious =
                        cell &&
                        (cell.suspicious === true ||
                          Number(cell.distance_meter) > Number(threshold));
                      return (
                        <td
                          key={`${group.fromStep}-${column.step}`}
                          title={
                            cell
                              ? [
                                  `Step ${group.fromStep} ${humanizeLabel(group.from)} → step ${column.step} ${humanizeLabel(column.name)}: ${formatDistance(cell.distance_meter)}`,
                                  cell.fromAt || cell.toAt
                                    ? `${formatWhen(cell.fromAt)} → ${formatWhen(cell.toAt)}`
                                    : "",
                                  segmentGap(cell) ? `${segmentGap(cell)} apart` : "",
                                  Number.isFinite(Number(cell.speed_kmph))
                                    ? `${formatSpeed(cell.speed_kmph)}${
                                        Number.isFinite(Number(cell.speed_limit_kmph))
                                          ? ` (limit ${formatSpeed(cell.speed_limit_kmph)})`
                                          : ""
                                      }`
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join("\n")
                              : undefined
                          }
                          className={`whitespace-nowrap border-b border-slate-100 px-1.5 py-1.5 text-center ${
                            cell ? "group-hover:bg-slate-50" : "bg-slate-50/60"
                          }`}
                        >
                          {cell ? (
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                                suspicious
                                  ? "bg-red-100 text-red-700"
                                  : "text-slate-400"
                              }`}
                            >
                              {formatDistance(cell.distance_meter)}
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded bg-red-100 px-1 font-semibold text-red-700">7.4 km</span>
              More than {formatDistance(threshold)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">12 m</span>
              Close enough
            </span>
            <span>Hover a distance to see both steps and their times.</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function DistanceToggle({ showAll, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-md px-2.5 py-1 ${
          showAll ? "text-slate-500" : "bg-white text-slate-900 shadow-sm"
        }`}
      >
        Only too far
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-md px-2.5 py-1 ${
          showAll ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
        }`}
      >
        Show all
      </button>
    </div>
  );
}

function placeLabel(name, step) {
  const label = humanizeLabel(name);
  return step ? `${label} · step ${step}` : label;
}

function Card({
  title,
  meta,
  action,
  children,
  className = "",
  bodyClassName = "",
  collapsible = false,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = !collapsible || open;
  const heading = (
    <div className="min-w-0">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {meta ? <p className="mt-0.5 text-xs text-slate-500">{meta}</p> : null}
    </div>
  );
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${
          isOpen ? "border-b border-slate-100" : ""
        }`}
      >
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={isOpen}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <ChevronDown
              size={16}
              className={`shrink-0 text-slate-400 transition-transform ${
                isOpen ? "rotate-0" : "-rotate-90"
              }`}
            />
            {heading}
          </button>
        ) : (
          heading
        )}
        {isOpen ? action : null}
      </div>
      {isOpen ? <div className={bodyClassName}>{children}</div> : null}
    </section>
  );
}

function ClearedDecisionBody({
  analysis,
  addressDistances,
  hasCibilAddress,
  showCibilAddress,
  setShowCibilAddress,
  eventDistances,
  visibleLaterGroups,
  showAllLaterDistances,
  setShowAllLaterDistances,
  model,
  threshold,
}) {
  const decision = analysis?.decision || {};
  const after = analysis?.after || null;
  const hasJourney =
    (analysis?.points || []).length > 0 ||
    eventDistances.length > 0 ||
    model.markers.length > 0;
  const duration =
    formatDurationSeconds(decision.duration_second) ||
    formatGap(decision.breached_at, decision.resolved_at);
  const resolver =
    decision.resolved_by?.name ||
    decision.resolved_by?.full_name ||
    (typeof decision.resolved_by === "string" ? decision.resolved_by : null);

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle size={16} className="shrink-0 text-emerald-600" />
              <p className="text-sm font-semibold text-slate-900">
                {decision.outcome_label || humanizeLabel(decision.outcome || "Approved")}
              </p>
              {decision.automatic ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Automatic
                </span>
              ) : (
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  Checker reviewed
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <StepChip name={decision.from_event} />
              <ArrowRight size={13} className="text-emerald-600" />
              <StepChip name={decision.to_event} />
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            {decision.resolved_at ? (
              <p>Resolved {formatWhen(decision.resolved_at)}</p>
            ) : null}
            {decision.held_for ? <p>Held for {decision.held_for}</p> : null}
            {resolver ? <p>By {resolver}</p> : null}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ClearedStat
            label="Distance"
            value={formatDistance(decision.distance_meter)}
          />
          <ClearedStat
            label="Over by"
            value={formatDistance(decision.exceeded_by_meter)}
          />
          <ClearedStat
            label="Limit"
            value={formatDistance(decision.threshold_meter || threshold)}
          />
          <ClearedStat
            label="Speed"
            value={
              Number.isFinite(Number(decision.speed_kmph))
                ? `${formatSpeed(decision.speed_kmph)}${
                    Number.isFinite(Number(decision.speed_limit_kmph))
                      ? ` / ${formatSpeed(decision.speed_limit_kmph)}`
                      : ""
                  }`
                : "—"
            }
          />
        </div>
        {duration ? (
          <p className="mt-2 text-xs text-slate-600">
            Gap between events: <span className="font-semibold text-slate-800">{duration}</span>
            {decision.breached_at ? (
              <span className="text-slate-500">
                {" "}
                · breached {formatWhen(decision.breached_at)}
              </span>
            ) : null}
          </p>
        ) : null}
        {decision.remark ? (
          <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700">
            {decision.remark}
          </p>
        ) : null}
      </div>

      {after ? (
        <Card title="What happened after" meta="Lead progress after this location decision">
          <div className="grid gap-2 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
            <ClearedStat
              label="Lead stage"
              value={humanizeLabel(after.lead_stage) || "—"}
            />
            <ClearedStat
              label="Audit approved by"
              value={after.audit_approved_by?.name || "—"}
            />
            <ClearedStat
              label="Audit approved at"
              value={
                after.audit_approved_at ? formatWhen(after.audit_approved_at) : "—"
              }
            />
            <ClearedStat
              label="Status"
              value={[
                after.is_sanction ? "Sanctioned" : null,
                after.is_disbursed ? "Disbursed" : null,
                after.is_rejected ? "Rejected" : null,
                after.breached_again ? "Breached again" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Clear"}
            />
          </div>
        </Card>
      ) : null}

      {hasJourney ? (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card
              className="lg:sticky lg:top-0"
              title="Map"
              meta="Where the customer was at each step"
              bodyClassName="p-2"
            >
              {model.markers.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No locations were found for this lead.
                </p>
              ) : (
                <LocationMap
                  markers={model.markers}
                  lines={model.lines}
                  comparisonLines={model.comparisonLines}
                />
              )}
            </Card>
            <StepJourney
              steps={analysis?.points || []}
              links={eventDistances}
              threshold={threshold}
            />
          </div>
          <LaterChecks
            groups={visibleLaterGroups}
            steps={analysis?.points || []}
            links={eventDistances}
            showAll={showAllLaterDistances}
            onToggle={setShowAllLaterDistances}
            threshold={threshold}
          />
        </>
      ) : null}

      <DistanceTable
        title="Customer addresses"
        hint={
          analysis?.address_note ||
          `Reference only · farthest ${formatDistance(
            analysis?.address_max_distance_meter
          )} · ${addressDistances.length} pairs`
        }
        collapsible
        defaultOpen={addressDistances.length > 0}
        rows={addressDistances}
        emptyLabel="No addresses to compare."
        threshold={null}
        action={
          hasCibilAddress ? (
            <button
              type="button"
              onClick={() => setShowCibilAddress((value) => !value)}
              className="text-xs font-semibold text-brand"
            >
              {showCibilAddress ? "Hide CIBIL address" : "Show CIBIL address"}
            </button>
          ) : null
        }
      />
    </div>
  );
}

function ClearedStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function VerdictCard({
  flagged,
  breach,
  eventBreach,
  breachMeters,
  allowedMeters,
  overBy,
  threshold,
  speedLimit,
  maxEventDistance,
  maxAddressDistance,
}) {
  const breachSpeed = Number(breach?.speed_kmph ?? eventBreach?.speed_kmph);
  const breachSpeedLimit = Number(
    breach?.speed_limit_kmph ?? eventBreach?.speed_limit_kmph ?? speedLimit
  );
  const breachDuration =
    formatDurationSeconds(breach?.duration_second ?? eventBreach?.duration_second) ||
    formatGap(eventBreach?.from?.timestamp, eventBreach?.to?.timestamp);
  const speedTooFast =
    Number.isFinite(breachSpeed) &&
    Number.isFinite(breachSpeedLimit) &&
    breachSpeed > breachSpeedLimit;

  if (!flagged) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm">
          <CheckCircle size={16} className="shrink-0 text-emerald-600" />
          <span className="font-semibold text-slate-900">Customer stayed in one area</span>
          <span className="text-xs text-slate-500">
            every step within {formatDistance(threshold)}
            {Number.isFinite(breachSpeedLimit)
              ? ` · under ${formatSpeed(breachSpeedLimit)}`
              : ""}
          </span>
        </div>
        <ThresholdMeta
          threshold={threshold}
          speedLimit={breachSpeedLimit}
          maxEventDistance={maxEventDistance}
          maxAddressDistance={maxAddressDistance}
        />
      </div>
    );
  }

  const times =
    Number.isFinite(breachMeters) && allowedMeters > 0
      ? Math.round(breachMeters / allowedMeters)
      : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-red-200 bg-red-50/60 px-3 py-2">
        <AlertCircle size={16} className="shrink-0 text-red-600" />
        <p className="text-sm text-slate-700">
          Customer moved{" "}
          <span className="text-base font-bold text-red-600">
            {formatDistance(breachMeters)}
          </span>
          {breachDuration ? (
            <span className="text-xs text-slate-500"> in {breachDuration}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <StepChip step={eventBreach?.from?.step} name={breach?.from} />
          <ArrowRight size={13} className="text-red-500" />
          <StepChip step={eventBreach?.to?.step} name={breach?.to} />
        </div>
        <p className="ml-auto text-xs text-slate-600">
          Limit{" "}
          <span className="font-semibold text-slate-900">
            {formatDistance(allowedMeters)}
          </span>
          <span className="mx-1.5 text-slate-300">|</span>
          Over by{" "}
          <span className="font-semibold text-red-700">{formatDistance(overBy)}</span>
          {Number.isFinite(breachSpeed) ? (
            <>
              <span className="mx-1.5 text-slate-300">|</span>
              <span
                className={
                  speedTooFast ? "font-semibold text-red-700" : "font-semibold text-slate-900"
                }
              >
                {formatSpeed(breachSpeed)}
              </span>
              {Number.isFinite(breachSpeedLimit) ? (
                <span className="text-slate-500"> / {formatSpeed(breachSpeedLimit)}</span>
              ) : null}
            </>
          ) : null}
          {times && times > 1 ? (
            <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {times} times more than allowed
            </span>
          ) : null}
        </p>
      </div>
      <ThresholdMeta
        threshold={threshold}
        speedLimit={breachSpeedLimit}
        maxEventDistance={maxEventDistance}
        maxAddressDistance={maxAddressDistance}
      />
    </div>
  );
}

function ThresholdMeta({
  threshold,
  speedLimit,
  maxEventDistance,
  maxAddressDistance,
}) {
  const items = [
    threshold != null
      ? { label: "Distance limit", value: formatDistance(threshold) }
      : null,
    Number.isFinite(Number(speedLimit))
      ? { label: "Speed limit", value: formatSpeed(speedLimit) }
      : null,
    maxEventDistance != null
      ? { label: "Farthest event gap", value: formatDistance(maxEventDistance) }
      : null,
    maxAddressDistance != null
      ? { label: "Farthest address gap", value: formatDistance(maxAddressDistance) }
      : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600"
        >
          <span className="font-medium text-slate-500">{item.label}</span>
          <span className="font-semibold text-slate-800">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function StepChip({ step, name }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-2 font-medium text-slate-800">
      {step != null ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-bold text-slate-600">
          {step}
        </span>
      ) : null}
      {humanizeLabel(name)}
    </span>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`mt-0.5 text-lg font-semibold ${
          tone === "bad" ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function DistanceTable({
  title,
  hint,
  rows,
  emptyLabel,
  threshold,
  action,
  collapsible = false,
  defaultOpen = true,
}) {
  return (
    <Card
      title={title}
      meta={hint}
      action={action}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                From
              </th>
              <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                To
              </th>
              <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Distance
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="bg-white px-3 py-6 text-center text-sm text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const suspicious =
                  row.suspicious === true ||
                  (threshold != null && Number(row.distance_meter) > threshold);
                const rowBg = index % 2 !== 0 ? "bg-slate-100" : "bg-white";
                return (
                  <tr key={`${row.from}-${row.to}-${row.distance_meter}-${index}`}>
                    <td className={`border-b border-slate-100 px-3 py-2 text-slate-800 ${rowBg}`}>
                      {placeLabel(row.from, row.fromStep)}
                    </td>
                    <td className={`border-b border-slate-100 px-3 py-2 text-slate-800 ${rowBg}`}>
                      {placeLabel(row.to, row.toStep)}
                    </td>
                    <td
                      className={`border-b border-slate-100 px-3 py-2 text-right font-semibold ${rowBg} ${
                        suspicious ? "text-red-600" : "text-slate-700"
                      }`}
                    >
                      {formatDistance(row.distance_meter)}
                      {suspicious ? " · too far" : ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default LocationAnalysisModal;
