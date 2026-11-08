/**
 * What's New catalog.
 *
 * To announce a release, add an entry at the top of WHATS_NEW_ITEMS.
 * Users see unread items once (auto-open) and can reopen anytime from the header.
 *
 * Fields:
 * - id: stable unique key (never reuse after shipping)
 * - title: short headline
 * - summary: one plain sentence of what changed
 * - points: optional short bullets (keep them simple)
 * - date: YYYY-MM-DD
 * - tag: "New" | "Improved" | "Fix"
 * - roles: optional role list (uppercase). Omit to show for everyone.
 */

export const WHATS_NEW_STORAGE_KEY = "sfl-crm:whats-new:seen-ids";

export const WHATS_NEW_ITEMS = [];

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/_/g, "-");
}

export function getWhatsNewItemsForRoles(userRoles = []) {
  const roleSet = new Set(
    (Array.isArray(userRoles) ? userRoles : []).map(normalizeRole)
  );
  return WHATS_NEW_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.some((role) => roleSet.has(normalizeRole(role)));
  });
}

export function readSeenWhatsNewIds() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(WHATS_NEW_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set();
  }
}

export function writeSeenWhatsNewIds(ids) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      WHATS_NEW_STORAGE_KEY,
      JSON.stringify([...ids])
    );
  } catch {
    // ignore quota / private mode
  }
}

export function getUnreadWhatsNewItems(userRoles = []) {
  const seen = readSeenWhatsNewIds();
  return getWhatsNewItemsForRoles(userRoles).filter((item) => !seen.has(item.id));
}

export function markWhatsNewItemsSeen(items = []) {
  if (!items.length) return;
  const seen = readSeenWhatsNewIds();
  items.forEach((item) => {
    if (item?.id) seen.add(String(item.id));
  });
  writeSeenWhatsNewIds(seen);
}

export function formatWhatsNewDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
