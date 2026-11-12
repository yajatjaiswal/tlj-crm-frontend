const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const ACTION_PAN_PERMISSION_EMAILS = [
  "admin@theloanjunction.com",
  "anuragg@blinkrloan.com",
  "harshit.g@creditbridgetechnologies.com", 
  "gunjan.k@creditbridgetechnologies.com",
  "preapproved@theloanjunction.com",
  "kuldeep@theloanjunction.com",
  "pradeep@theloanjunction.com",
  "harish@theloanjunction.com",
  "finance@theloanjunction.com",
  "harshit.g@theloanjunction.com",
];

export const GET_OTP_PERMISSION_EMAILS = [
  "admin@theloanjunction.com",
  "gunjan.k@creditbridgetechnologies.com"
];

export const EDIT_SANCTION_PERMISSION_EMAILS = [
  "anuragg@blinkrloan.com",
  "admin@theloanjunction.com",
  "harshit.g@creditbridgetechnologies.com",
  "gunjan.k@creditbridgetechnologies.com", 
  "preapproved@theloanjunction.com",
  "kuldeep@theloanjunction.com",
  "pradeep@theloanjunction.com",
  "harish@theloanjunction.com",
  "finance@theloanjunction.com",
  "harshit.g@theloanjunction.com",
];

/** Frontend-only allowlist for Geofence Whitelist admin page */
export const GEOFENCE_WHITELIST_PERMISSION_EMAILS = [
  "admin@theloanjunction.com",
  "anuragg@blinkrloan.com",
  "harshit.g@creditbridgetechnologies.com",
  "gunjan.k@creditbridgetechnologies.com",
  "preapproved@theloanjunction.com",
  "kuldeep@theloanjunction.com",
  "pradeep@theloanjunction.com",
  "harish@theloanjunction.com",
  "finance@theloanjunction.com",
  "harshit.g@theloanjunction.com",
];

export const isActionPanPermissionEmail = (email) =>
  ACTION_PAN_PERMISSION_EMAILS.includes(normalizeEmail(email));

export const isGetOtpPermissionEmail = (email) =>
  GET_OTP_PERMISSION_EMAILS.includes(normalizeEmail(email));

export const isEditSanctionPermissionEmail = (email) =>
  EDIT_SANCTION_PERMISSION_EMAILS.includes(normalizeEmail(email));

export const isGeofenceWhitelistPermissionEmail = (email) =>
  GEOFENCE_WHITELIST_PERMISSION_EMAILS.includes(normalizeEmail(email));
