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

export const WHATS_NEW_ITEMS = [
  {
    id: "dashboard-collection-drilldown-2026-11",
    title: "Smarter recovered amount insights",
    summary:
      "Drill into collection breakups and sort day-wise overdue recoveries right from the admin dashboard.",
    points: [
      "Click PP, DD, or OD on Recovered Amount Breakup to see the matching collection list.",
      "Sort that list by repayment date, received date, amounts, % collected, or overdue days.",
      "Day-wise Recovered Overdues now supports the same column sorting.",
    ],
    date: "2026-11-04",
    tag: "New",
    roles: ["ADMIN"],
  },
  {
    id: "pagination-page-size-2026-11",
    title: "Choose rows per page",
    summary:
      "You can now change how many rows show on each page from the pagination bar.",
    points: [
      "Use Show per page next to the entries count.",
      "Pick 10, 25, 50, or 100 rows.",
      "Available on lead lists across the CRM.",
    ],
    date: "2026-11-02",
    tag: "Improved",
  },
  {
    id: "location-suspicious-qc-2026-10",
    title: "Location Suspicious checks",
    summary:
      "Quality Checkers can review leads where a check or address was farther than allowed, then approve the location or reject the lead.",
    points: [
      "Open Location Suspicious Leads and tap Check on a row.",
      "See the map, step distances, and customer addresses in one place.",
      "Write a reason, then Approve location or Reject lead.",
      "Rejected leads appear under Rejected Leads.",
    ],
    date: "2026-10-14",
    tag: "New",
    roles: ["QUALITY-CHECKER", "ADMIN", "CREDIT-ANALYST", "CREDIT-HEAD"],
  },
];

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
