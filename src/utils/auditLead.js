export const resolveAuditId = (lead) => {
  if (!lead) return null;

  const explicitCandidates = [
    lead.audit_id,
    lead.auditId,
    lead.kyc_id,
    lead.kycId,
    lead.audit?.id,
    lead.audit_data?.id,
    lead.audit_data?.audit_id,
  ];

  for (const value of explicitCandidates) {
    if (value != null && value !== "") {
      return value;
    }
  }

  const leadId = lead.lead_id;
  const rowId = lead.id;
  const stage = String(lead.lead_stage || lead.lead_stage_mapped || "");
  if (
    leadId != null &&
    rowId != null &&
    String(leadId) !== String(rowId) &&
    stage.startsWith("AUDIT_")
  ) {
    return rowId;
  }

  return null;
};

export const buildSummaryDataSearchParams = (lead) => {
  const leadId = lead?.lead_id || lead?.id;
  const params = new URLSearchParams();

  if (leadId != null && leadId !== "") {
    params.set("leadId", String(leadId));
  }

  const auditId = resolveAuditId(lead);
  if (auditId != null) {
    params.set("auditId", String(auditId));
  }

  return params;
};
