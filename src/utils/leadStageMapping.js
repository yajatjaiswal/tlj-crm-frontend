export const leadStageMapping = {
  PENDING_LEAD: "Pending Lead",
  COMPLETE_REGISTRATION: "Add Employment",
  ADD_EMPLOYEMENT: "Adding Email",
  PENDING_EMPLOYEMENT_WITH_SELF_EMPLOYEED: "Self Employed",
  SEND_EMAIL_OTP: "Email OTP Sent",
  VRIFY_EMAIL_OTP: "Bank Statement Analysis",
  BRE_APPROVED: "Request Loan amount", // "Requesting Loan amount"
  BRE_REJECT: "BRE Rejected",
  MISSING_ACCOUNT_DETAILS: "Missing Account Details",
  LOAN_REQUESTED: "Aadhaar OTP Pending",
  SEND_AADHAAR_OTP: "Aadhaar OTP Sent",
  VERIFY_AADHAAR_KYC: "KYC Verified",
  REJECT_AADHAR_KYC: "KYC Rejected",
  ADD_REFERENCE: "Add Reference",
  AUDIT_PENDING: "Audit Pending",
  AUDIT_ASSIGN: "Audit Assign",
  AUDIT_ASSIGNED: "Audit Assigned",
  AUDIT_HOLD_SALES_OPS: "Audit Hold Sales Ops",
  AUDIT_COMPANY_VERIFIED: "Audit Company Verified",
  AUDIT_APPROVED_SALES: "Audit Approved Sales",
  AUDIT_REJECTED_SALES: "Audit Rejected Sales",
  AUDIT_PENDING_CREDIT_HEAD: "Audit Pending Credit Head",
  AUDIT_ASSIGNED_CREDIT_HEAD: "Audit Assigned Credit Head",
  AUDIT_HOLD_CREDIT_HEAD: "Audit Hold Credit Head",
  AUDIT_REJECTED_CREDIT_HEAD: "Audit Rejected Credit Head",
  AUDIT_APPROVED_CREDIT_HEAD: "Audit Approved Credit Head", // "At E-Sign"
  SANCTION_COMPLETED: "E-Sign Completed",
  SANCTION_PENDING: "Sanction letter",
  DISBURSED: "Loan Disbursed",
  DISBURSAL_FAILED: "Disbursal Failed",
  APPLY_RELOAN: "Applied Reloan",
  MANUALLY_REJECT: "Manually Rejected",
  MANUALLY_APPROVE: "Manually Approved",
};

/** Hover tooltip: what the stage means / next step for the customer journey */
export const leadStageMeaning = {
  COMPLETE_REGISTRATION:
    "PAN and mobile verified → Add employment and employer details",
  ADD_EMPLOYEMENT: "Employment details added → Complete personal details",
  VRIFY_EMAIL_OTP: "Personal details completed → Add banking using AA or net banking",
  MISSING_ACCOUNT_DETAILS: "Banking completed → Complete account details",
  BRE_APPROVED: "BRE approved → Select loan amount",
  BRE_REJECT: "BRE rejected → Pending review by Credit Executive",
  LOAN_REQUESTED: "Loan amount selected → Capture selfie → Complete Aadhaar KYC",
  REJECT_AADHAR_KYC: "Aadhaar KYC rejected → Pending review by Credit Executive",
  VERIFY_AADHAAR_KYC: "Aadhaar KYC verified → Add alternate number and references",
  ADD_REFERENCE: "References added → Add office and residential addresses",
  AUDIT_PENDING: "Address and documents added → Pending review by Credit Executive",
  AUDIT_PENDING_CREDIT_HEAD:
    "Approved by Credit Executive → Pending approval from Credit Head/TL",
  AUDIT_APPROVED_CREDIT_HEAD: "Approved by Credit Head → Proceed to eSign",
  SANCTION_PENDING: "Approved by Credit Head → Proceed to eSign",
  SANCTION_COMPLETED: "eSign completed → Ready for disbursement",
  DISBURSED: "Customer confirmed disbursement → Loan successfully disbursed",
  MANUALLY_REJECT: "Application manually rejected by the credit team",
};

export const getLeadStageMeaning = (stage) =>
  leadStageMeaning[stage] || leadStageMapping[stage] || stage || "";
