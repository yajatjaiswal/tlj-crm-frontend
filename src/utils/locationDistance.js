const EARTH_RADIUS_METERS = 6371000;

export function distanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value)) return "—";
  if (value > 1000) {
    return `${(value / 1000).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} km`;
  }
  return `${Math.round(value).toLocaleString("en-IN")} m`;
}

export function humanizeLabel(value) {
  if (!value) return "Unknown";
  return String(value)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatGap(fromValue, toValue) {
  if (!fromValue || !toValue) return "";
  const ms = new Date(toValue).getTime() - new Date(fromValue).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  return formatDurationSeconds(Math.round(ms / 1000));
}

export function formatDurationSeconds(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return "";
  const whole = Math.round(value);
  if (whole < 60) return `${whole} sec`;
  const minutes = Math.floor(whole / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (hours < 24) return restMinutes ? `${hours} hr ${restMinutes} min` : `${hours} hr`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} d ${restHours} hr` : `${days} d`;
}

export function formatSpeed(kmph) {
  const value = Number(kmph);
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("en-IN")} km/h`;
}

function coordKey(lat, lng) {
  return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

function clusterKey(lat, lng) {
  return `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
}

function candidatesForLabel(points, label) {
  const matches = points.filter((point) => point.label === label);
  const events = matches.filter((point) => point.type === "EVENT");
  return events.length ? events : matches;
}

function closestEventPair(row, points) {
  const fromCandidates = candidatesForLabel(points, row.from);
  const toCandidates = candidatesForLabel(points, row.to);
  const target = Number(row.distance_meter);
  let best = null;

  fromCandidates.forEach((fromPoint) => {
    toCandidates.forEach((toPoint) => {
      if (fromPoint.id != null && fromPoint.id === toPoint.id) return;
      const from = {
        lat: Number(fromPoint.latitude),
        lng: Number(fromPoint.longitude),
      };
      const to = {
        lat: Number(toPoint.latitude),
        lng: Number(toPoint.longitude),
      };
      if (!Number.isFinite(from.lat) || !Number.isFinite(from.lng)) return;
      if (!Number.isFinite(to.lat) || !Number.isFinite(to.lng)) return;

      const error = Math.abs(distanceMeters(from, to) - target);
      if (!best || error < best.error) {
        best = { fromPoint, toPoint, from, to, error };
      }
    });
  });

  if (!best) return null;
  const tolerance = Math.max(50, target * 0.02);
  if (best.error > tolerance) return null;
  return best;
}

function linesFromSegments(segments, kind) {
  const lineMap = new Map();
  segments
    .filter((segment) => !segment.samePlace && segment.meters > 0)
    .forEach((segment) => {
      const fromKey = clusterKey(segment.from.lat, segment.from.lng);
      const toKey = clusterKey(segment.to.lat, segment.to.lng);
      if (fromKey === toKey) return;
      const key = [fromKey, toKey].sort().join("|");
      if (!lineMap.has(key)) {
        lineMap.set(key, {
          key,
          kind,
          from: segment.from,
          to: segment.to,
          meters: segment.meters,
          suspicious: segment.suspicious,
          pairs: [],
        });
      }
      const line = lineMap.get(key);
      line.suspicious = line.suspicious || segment.suspicious;
      if (segment.meters > line.meters) {
        line.meters = segment.meters;
        line.from = segment.from;
        line.to = segment.to;
      }
      const pairKey = `${segment.fromLabel}->${segment.toLabel}`;
      if (!line.pairs.some((pair) => `${pair.fromLabel}->${pair.toLabel}` === pairKey)) {
        line.pairs.push({
          fromLabel: segment.fromLabel,
          toLabel: segment.toLabel,
          meters: segment.meters,
          suspicious: segment.suspicious,
        });
      }
    });
  return [...lineMap.values()].sort((a, b) => b.meters - a.meters);
}

function segmentFromRow(row, usable) {
  let fromPoint = row.fromPoint;
  let toPoint = row.toPoint;
  let from = row.fromCoord;
  let to = row.toCoord;
  if (!fromPoint || !toPoint || !from || !to) {
    const match = closestEventPair(row, usable);
    if (!match) return null;
    fromPoint = match.fromPoint;
    toPoint = match.toPoint;
    from = match.from;
    to = match.to;
  }
  return {
    fromLabel: row.from,
    toLabel: row.to,
    from,
    to,
    fromPoint,
    toPoint,
    meters: Number(row.distance_meter),
    suspicious: row.suspicious === true,
    samePlace: coordKey(from.lat, from.lng) === coordKey(to.lat, to.lng),
  };
}

function rememberPoint(byStep, step, event, api, lat, lng, timestamp, id) {
  if (step == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
  const existing = byStep.get(step);
  if (!existing) {
    byStep.set(step, {
      id: id ?? step,
      step,
      label: event,
      type: "EVENT",
      api,
      latitude: Number(lat),
      longitude: Number(lng),
      at: timestamp || null,
    });
    return;
  }
  if (!existing.at && timestamp) existing.at = timestamp;
  if (!existing.label && event) existing.label = event;
  if (existing.id == null && id != null) existing.id = id;
}

function isAddressEvent(event) {
  return String(event?.type || "").toUpperCase() === "ADDRESS";
}

function pointsFromEvents(events = []) {
  return events
    .filter((event) => !isAddressEvent(event))
    .map((event, index) => ({
      id: event.id,
      step: index + 1,
      sourceStep: event.step,
      label: event.event,
      type: event.type || "EVENT",
      api: event.api,
      latitude: event.latitude,
      longitude: event.longitude,
      at: event.timestamp,
    }));
}

function addressPointsFromEvents(events = []) {
  return events
    .filter((event) => isAddressEvent(event))
    .map((event) => ({
      id: event.id,
      step: event.step,
      label: event.event,
      type: "ADDRESS",
      api: event.api,
      latitude: event.latitude,
      longitude: event.longitude,
      at: event.timestamp,
    }));
}

function pointsFromDistances(raw) {
  const byStep = new Map();
  (raw.step_by_step_distance || []).forEach((row) => {
    rememberPoint(
      byStep,
      row.from_step,
      row.from_event,
      row.from_api,
      row.from_latitude,
      row.from_longitude,
      row.from_timestamp
    );
    rememberPoint(
      byStep,
      row.to_step,
      row.to_event,
      row.to_api,
      row.to_latitude,
      row.to_longitude,
      row.to_timestamp
    );
  });
  (raw.one_to_many_distance || []).forEach((group) => {
    (group.to || []).forEach((item) => {
      rememberPoint(
        byStep,
        group.from_step,
        group.from_event,
        group.from_api,
        item.from_latitude,
        item.from_longitude,
        item.from_timestamp || group.from_timestamp
      );
      rememberPoint(
        byStep,
        item.to_step,
        item.to_event,
        item.to_api,
        item.to_latitude,
        item.to_longitude,
        item.to_timestamp
      );
    });
  });
  const breach = raw.summary?.event_breach;
  if (breach?.from) {
    rememberPoint(
      byStep,
      breach.from.step,
      breach.from.event,
      breach.from.api,
      breach.from.latitude,
      breach.from.longitude,
      breach.from.timestamp,
      breach.from.id
    );
  }
  if (breach?.to) {
    rememberPoint(
      byStep,
      breach.to.step,
      breach.to.event,
      breach.to.api,
      breach.to.latitude,
      breach.to.longitude,
      breach.to.timestamp,
      breach.to.id
    );
  }
  return [...byStep.values()].sort((a, b) => Number(a.step) - Number(b.step));
}

export function normalizeLocationAnalysis(raw) {
  if (!raw) return raw;
  const hasDistances =
    Array.isArray(raw.step_by_step_distance) ||
    Array.isArray(raw.one_to_many_distance) ||
    Array.isArray(raw.customer_address_distance);
  const hasEvents = Array.isArray(raw.events);
  if (!hasDistances && !hasEvents) return raw;

  // Distance rows renumber EVENT-only steps; skip ADDRESS rows from events so
  // step indexes stay aligned with step_by_step / one_to_many.
  const eventPoints = hasEvents ? pointsFromEvents(raw.events) : [];
  const points =
    eventPoints.length > 0
      ? eventPoints
      : hasDistances
        ? pointsFromDistances(raw)
        : (raw.events || []).map((event) => ({
            id: event.id,
            step: event.step,
            label: event.event,
            type: event.type,
            api: event.api,
            latitude: event.latitude,
            longitude: event.longitude,
            at: event.timestamp,
          }));
  const addressPoints = hasEvents ? addressPointsFromEvents(raw.events) : [];
  const byStep = new Map(points.map((point) => [Number(point.step), point]));
  const toSegmentRow = (row, fromStep, toStep, fromEvent, toEvent, fromAt, toAt) => ({
    from: fromEvent,
    to: toEvent,
    fromStep,
    toStep,
    fromAt: fromAt || byStep.get(Number(fromStep))?.at || null,
    toAt: toAt || byStep.get(Number(toStep))?.at || null,
    distance_meter: row.distance_meter,
    threshold_meter: row.threshold_meter,
    duration_second: row.duration_second,
    speed_kmph: row.speed_kmph,
    speed_limit_kmph: row.speed_limit_kmph,
    suspicious: row.suspicious === true,
    fromPoint: byStep.get(Number(fromStep)),
    toPoint: byStep.get(Number(toStep)),
    fromCoord: {
      lat: Number(row.from_latitude),
      lng: Number(row.from_longitude),
    },
    toCoord: {
      lat: Number(row.to_latitude),
      lng: Number(row.to_longitude),
    },
  });
  const eventDistances = (raw.step_by_step_distance || []).map((row) =>
    toSegmentRow(
      row,
      row.from_step,
      row.to_step,
      row.from_event,
      row.to_event,
      row.from_timestamp,
      row.to_timestamp
    )
  );
  const comparisonDistances = (raw.one_to_many_distance || []).flatMap((group) =>
    (group.to || []).map((item) =>
      toSegmentRow(
        item,
        group.from_step,
        item.to_step,
        group.from_event,
        item.to_event,
        item.from_timestamp || group.from_timestamp,
        item.to_timestamp
      )
    )
  );
  const threshold = Number(raw.summary?.threshold_meter ?? 2000);
  const seenAddresses = new Set();
  const addressDistances = (raw.customer_address_distance || [])
    .filter((row) => {
      const key = [row.from_address, row.to_address].sort().join("|");
      const unique = `${key}|${row.distance_meter}`;
      if (seenAddresses.has(unique)) return false;
      seenAddresses.add(unique);
      return true;
    })
    .map((row) => ({
      from: row.from_address,
      to: row.to_address,
      distance_meter: row.distance_meter,
      suspicious: Number(row.distance_meter) > threshold,
    }));
  const breach = raw.summary?.event_breach;
  const summary = {
    ...raw.summary,
    location_suspicious:
      raw.summary?.location_suspicious ?? raw.lead?.location_suspicious,
    breach: breach
      ? {
          suspicious: breach.suspicious === true,
          from: breach.from?.event || breach.from_event,
          to: breach.to?.event || breach.to_event,
          distance_meter: breach.distance_meter,
          threshold_used: breach.threshold_meter,
          exceeded_by_meter: breach.exceeded_by_meter,
          duration_second: breach.duration_second,
          speed_kmph: breach.speed_kmph,
          speed_limit_kmph: breach.speed_limit_kmph,
        }
      : raw.summary?.breach,
  };

  return {
    ...raw,
    points,
    address_points: addressPoints,
    event_distances: eventDistances,
    comparison_distances: comparisonDistances,
    address_distances: addressDistances,
    summary,
  };
}

function addressRowsFromCleared(raw) {
  const block = raw?.customer_address_distance;
  const rows = Array.isArray(block)
    ? block
    : Array.isArray(block?.rows)
      ? block.rows
      : [];
  const seen = new Set();
  return rows
    .filter((row) => {
      const from = row.from_address || row.from;
      const to = row.to_address || row.to;
      const key = [from, to].sort().join("|");
      const unique = `${key}|${row.distance_meter}`;
      if (seen.has(unique)) return false;
      seen.add(unique);
      return true;
    })
    .map((row) => ({
      from: row.from_address || row.from,
      to: row.to_address || row.to,
      distance_meter: row.distance_meter,
      suspicious: false,
    }));
}

export function normalizeLocationCleared(raw) {
  if (!raw) return raw;
  const decision = raw.decision || {};
  const detail = raw.detail || {};
  const after = raw.after || null;
  const addressBlock = raw.customer_address_distance;
  const analysisLike = {
    ...raw,
    events: Array.isArray(detail.events) ? detail.events : raw.events,
    step_by_step_distance:
      detail.step_by_step_distance || raw.step_by_step_distance || [],
    one_to_many_distance:
      detail.one_to_many_distance || raw.one_to_many_distance || [],
    customer_address_distance: [],
    summary: {
      location_suspicious: false,
      threshold_meter:
        decision.threshold_meter ??
        detail.threshold_meter ??
        raw.summary?.threshold_meter,
      speed_limit_kmph:
        decision.speed_limit_kmph ??
        detail.speed_limit_kmph ??
        raw.summary?.speed_limit_kmph,
      event_breach: {
        suspicious: false,
        from_event: decision.from_event,
        to_event: decision.to_event,
        distance_meter: decision.distance_meter,
        threshold_meter: decision.threshold_meter,
        exceeded_by_meter: decision.exceeded_by_meter,
        duration_second: decision.duration_second,
        speed_kmph: decision.speed_kmph,
        speed_limit_kmph: decision.speed_limit_kmph,
      },
    },
  };
  const normalized = normalizeLocationAnalysis(analysisLike);
  return {
    ...(normalized && typeof normalized === "object" ? normalized : analysisLike),
    lead: raw.lead,
    decision,
    detail,
    after,
    address_note:
      addressBlock && !Array.isArray(addressBlock) ? addressBlock.note : null,
    address_max_distance_meter:
      addressBlock && !Array.isArray(addressBlock)
        ? addressBlock.max_distance_meter
        : null,
    address_distances: addressRowsFromCleared(raw),
    summary: {
      ...(normalized?.summary || analysisLike.summary),
      location_suspicious: false,
      breach: {
        suspicious: false,
        from: decision.from_event,
        to: decision.to_event,
        distance_meter: decision.distance_meter,
        threshold_used: decision.threshold_meter,
        exceeded_by_meter: decision.exceeded_by_meter,
        duration_second: decision.duration_second,
        speed_kmph: decision.speed_kmph,
        speed_limit_kmph: decision.speed_limit_kmph,
      },
    },
  };
}

export function buildEventDistanceMap(
  points = [],
  eventDistances = [],
  comparisonDistances,
  addressDistances = []
) {
  const usable = points.filter((point) => {
    const lat = Number(point.latitude);
    const lng = Number(point.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng);
  });

  const segments = eventDistances
    .map((row) => segmentFromRow(row, usable))
    .filter(Boolean);
  const lines = linesFromSegments(segments, "step");
  const comparisonLines = linesFromSegments(
    (comparisonDistances || [])
      .map((row) => segmentFromRow(row, usable))
      .filter(Boolean),
    "many"
  );

  const labels = new Set();
  eventDistances.forEach((row) => {
    labels.add(row.from);
    labels.add(row.to);
  });

  const grouped = new Map();
  usable
    .filter((point) => labels.size === 0 || labels.has(point.label))
    .filter((point) => labels.size === 0 || point.type !== "ADDRESS")
    .forEach((point) => {
      const key = clusterKey(point.latitude, point.longitude);
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          lat: Number(point.latitude),
          lng: Number(point.longitude),
          points: [],
        });
      }
      grouped.get(key).points.push(point);
    });

  const markers = [...grouped.values()];
  const mainKey = markers.reduce(
    (best, marker) => (marker.points.length > (best?.points.length || 0) ? marker : best),
    null
  )?.key;

  markers.forEach((marker) => {
    marker.suspicious = marker.key !== mainKey && lines.some(
      (line) =>
        line.suspicious &&
        (clusterKey(line.from.lat, line.from.lng) === marker.key ||
          clusterKey(line.to.lat, line.to.lng) === marker.key)
    );
    marker.points.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  });
  markers.sort((a, b) => Number(b.key === mainKey) - Number(a.key === mainKey) || b.points.length - a.points.length);

  const pointDistance = new Map();
  const pointComparedWith = new Map();
  const rememberDistance = (point, meters, otherLabel) => {
    if (!point || !Number.isFinite(meters)) return;
    const current = pointDistance.get(point.id) ?? -1;
    if (meters >= current) {
      pointDistance.set(point.id, meters);
      pointComparedWith.set(point.id, otherLabel);
    }
  };
  const comparisonSegments = (comparisonDistances || eventDistances)
    .map((row) => segmentFromRow(row, usable))
    .filter(Boolean);
  comparisonSegments.forEach((segment) => {
    rememberDistance(segment.fromPoint, segment.meters, segment.toLabel);
    rememberDistance(segment.toPoint, segment.meters, segment.fromLabel);
  });
  addressDistances.forEach((row) => {
    const meters = Number(row.distance_meter);
    usable.forEach((point) => {
      if (point.label !== row.from && point.label !== row.to) return;
      const otherLabel = point.label === row.from ? row.to : row.from;
      rememberDistance(point, meters, otherLabel);
    });
  });

  return { lines, comparisonLines, markers, segments, pointDistance, pointComparedWith };
}
