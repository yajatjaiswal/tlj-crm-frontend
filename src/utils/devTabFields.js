const IST_TZ = "Asia/Kolkata";

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function formatPan(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);
}

export function validatePan(value, pattern = PAN_REGEX) {
  if (!value) return "";
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  if (!re.test(value)) return "Enter a valid PAN (ABCDE1234F)";
  return "";
}

export function humanizeFieldName(name) {
  if (!name) return "";
  return String(name)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getIstParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  if (map.hour === "24") map.hour = "00";
  return map;
}

function isIsoTimestamp(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function toInputValue(value, spec) {
  if (value === null || value === undefined) return "";
  const type = spec?.type;

  if (type === "boolean") {
    if (value === true || value === "true") return "true";
    if (value === false || value === "false") return "false";
    return "";
  }

  if (type === "date") {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const ist = getIstParts(value);
    if (!ist) return "";
    return `${ist.year}-${ist.month}-${ist.day}`;
  }

  if (type === "datetime") {
    const ist = getIstParts(value);
    if (!ist) return "";
    return `${ist.year}-${ist.month}-${ist.day}T${ist.hour}:${ist.minute}`;
  }

  if (type === "decimal") {
    return String(value);
  }

  if (type === "json") {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export function toPayloadValue(inputValue, spec) {
  if (inputValue === "" || inputValue === null || inputValue === undefined) {
    return null;
  }

  const type = spec?.type;

  if (type === "boolean") {
    if (inputValue === "true") return true;
    if (inputValue === "false") return false;
    return null;
  }

  if (type === "datetime") {
    let value = String(inputValue);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      value = `${value}:00`;
    }
    if (!/[+-]\d{2}:\d{2}$/.test(value) && !value.endsWith("Z")) {
      value = `${value}+05:30`;
    }
    return value;
  }

  if (type === "date" || type === "decimal") {
    return String(inputValue);
  }

  return String(inputValue);
}

export function formatCellValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  const str = String(value);

  if (isIsoTimestamp(str)) {
    const ist = getIstParts(str);
    if (ist) {
      const datePart = `${ist.day}/${ist.month}/${ist.year}`;
      if (ist.hour === "00" && ist.minute === "00") return datePart;
      return `${datePart} ${ist.hour}:${ist.minute}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split("-");
    return `${day}/${month}/${year}`;
  }

  return str;
}

export function collectChanges(initialInputs, currentInputs, fieldSpecs = []) {
  const specByName = {};
  for (const spec of fieldSpecs) {
    if (spec?.name) specByName[spec.name] = spec;
  }

  const changes = {};
  for (const name of Object.keys(currentInputs || {})) {
    const current = currentInputs[name] ?? "";
    const initial = initialInputs?.[name] ?? "";
    if (String(current) !== String(initial)) {
      changes[name] = toPayloadValue(current, specByName[name] || { name });
    }
  }
  return changes;
}

export function fieldHint(spec) {
  if (!spec) return "";
  const parts = [];
  if (spec.type) parts.push(spec.type);
  if (spec.max_length) parts.push(`max ${spec.max_length}`);
  if (spec.precision != null && spec.scale != null) {
    parts.push(`${spec.precision},${spec.scale}`);
  } else if (spec.scale != null) {
    parts.push(`${spec.scale} dp`);
  }
  if (spec.nullable === false) parts.push("required");
  if (Array.isArray(spec.options) && spec.options.length) {
    parts.push(spec.options.join(" | "));
  }
  return parts.join(" · ");
}
