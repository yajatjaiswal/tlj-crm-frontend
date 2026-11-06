export const CREDIT_HEAD_SALES_OPS_AUDIT_STAGES = new Set([
  "AUDIT_PENDING",
  "AUDIT_ASSIGN",
  "AUDIT_ASSIGNED",
  "AUDIT_HOLD_SALES_OPS",
  "AUDIT_COMPANY_VERIFIED",
]);

const normalizeRole = (role) => String(role || "").trim().toUpperCase();

export const getProfileRoles = (profile) => {
  const roles = profile?.data?.roles ?? profile?.roles ?? [];
  if (!Array.isArray(roles)) return [];
  return roles.map(normalizeRole);
};

export const getProfileRole = (profile) => {
  const role = profile?.data?.role ?? profile?.role;
  return role ? normalizeRole(role) : null;
};

export const isAdminOrCreditHeadUser = (profile) => {
  const roles = getProfileRoles(profile);
  const role = getProfileRole(profile);

  return (
    roles.includes("ADMIN") ||
    roles.includes("CREDIT-HEAD") ||
    role === "ADMIN" ||
    role === "CREDIT-HEAD"
  );
};

export const getLeadAuditStatus = (lead) => {
  const status = lead?.audit_status ?? lead?.status;
  const numericStatus = Number(status);
  return Number.isNaN(numericStatus) ? null : numericStatus;
};

export const shouldHideCreditHeadAuditActions = (lead, profile) => {
  if (!lead || !isAdminOrCreditHeadUser(profile)) return false;

  const stage = lead?.lead_stage;
  if (CREDIT_HEAD_SALES_OPS_AUDIT_STAGES.has(stage)) return true;

  const auditStatus = getLeadAuditStatus(lead);
  return auditStatus != null && auditStatus <= 5;
};

export const shouldShowCreditHeadAuditApprove = (lead) => {
  if (!lead) return false;

  if (lead.lead_stage === "AUDIT_ASSIGNED_CREDIT_HEAD") return true;

  const auditStatus = getLeadAuditStatus(lead);
  if (auditStatus != null && auditStatus > 5) return true;

  const kycStatus = Number(lead?.kyc_status);
  if (!Number.isNaN(kycStatus) && kycStatus > 5) return true;

  return false;
};

export const isLeadAssignedToCreditHead = (profile, lead) => {
  const employeeId = profile?.data?.id ?? profile?.id ?? null;
  if (employeeId == null || !lead) return false;

  const creditHeadAssignee =
    lead.credit_head_assignee ?? lead.creditHeadAssignee ?? null;
  if (creditHeadAssignee == null) return false;

  return String(creditHeadAssignee) === String(employeeId);
};

export const shouldShowSearchResultCreditHeadAuditApprove = (lead, profile) => {
  if (!lead || !isLeadAssignedToCreditHead(profile, lead)) return false;

  if (lead.lead_stage === "AUDIT_APPROVED_CREDIT_HEAD") return false;

  if (lead.lead_stage === "AUDIT_ASSIGNED_CREDIT_HEAD") return true;

  const kycStatus = Number(lead?.kyc_status);
  if (!Number.isNaN(kycStatus) && kycStatus > 5) return true;

  return false;
};
