import { leadStageMapping } from "./leadStageMapping";

// Generate status options for different page types
export const getStatusOptions = (pageType) => {
  const allStatuses = Object.keys(leadStageMapping);

  switch (pageType) {
    case "partial-leads":
      return [
        { value: "PENDING_LEAD", label: "Pending Lead" },
        { value: "COMPLETE_REGISTRATION", label: "Add Employment" },
        { value: "ADD_EMPLOYEMENT", label: "Adding Email" },
        // {
        //   value: "PENDING_EMPLOYEMENT_WITH_SELF_EMPLOYEED",
        //   label: "Self Employed",
        // },
        { value: "SEND_EMAIL_OTP", label: "Email OTP Sent" },
        { value: "VRIFY_EMAIL_OTP", label: "Bank Statement Analysis" },
        { value: "BRE_APPROVED", label: "Request Loan amount" },
        { value: "MISSING_ACCOUNT_DETAILS", label: "Missing Account Details" },
        { value: "LOAN_REQUESTED", label: "Aadhaar OTP Pending" },
        { value: "SEND_AADHAAR_OTP", label: "Aadhaar OTP Sent" },
        { value: "REJECT_AADHAR_KYC", label: "KYC Rejected" },
        { value: "VERIFY_AADHAAR_KYC", label: "KYC Verified" },
        {
          value: "AUDIT_APPROVED_CREDIT_HEAD",
          label: "Audit Approved Credit Head",
        },
        { value: "SANCTION_COMPLETED", label: "E-Sign Completed" },
        { value: "SANCTION_PENDING", label: "Sanction letter" },
        { value: "ADD_REFERENCE", label: "Add Reference" },
      ];

    case "pending-sanction-amount":
    case "pending-disbursal-amount":
      return [
        { value: "LOAN_REQUESTED", label: "Aadhaar OTP Pending" },
        { value: "SEND_AADHAAR_OTP", label: "Aadhaar OTP Sent" },
        { value: "VERIFY_AADHAAR_KYC", label: "KYC Verified" },
        { value: "ADD_REFERENCE", label: "Add Reference" },
        { value: "AUDIT_PENDING", label: "Audit Pending" },
        { value: "AUDIT_ASSIGN", label: "Audit Assign" },
        { value: "AUDIT_ASSIGNED", label: "Audit Assigned" },
        { value: "AUDIT_HOLD_SALES_OPS", label: "Audit Hold Sales Ops" },
        { value: "AUDIT_COMPANY_VERIFIED", label: "Audit Company Verified" },
        { value: "AUDIT_APPROVED_SALES", label: "Audit Approved Sales" },
        {
          value: "AUDIT_PENDING_CREDIT_HEAD",
          label: "Audit Pending Credit Head",
        },
        {
          value: "AUDIT_ASSIGNED_CREDIT_HEAD",
          label: "Audit Assigned Credit Head",
        },
        { value: "AUDIT_HOLD_CREDIT_HEAD", label: "Audit Hold Credit Head" },
        {
          value: "AUDIT_APPROVED_CREDIT_HEAD",
          label: "Audit Approved Credit Head",
        },
        { value: "SANCTION_COMPLETED", label: "E-Sign Completed" },
        { value: "SANCTION_PENDING", label: "Sanction letter" },
      ];

    case "pending-applications":
      return [
        { value: "PENDING_LEAD", label: "Pending Lead" },
        { value: "COMPLETE_REGISTRATION", label: "Add Employment" },
        { value: "ADD_EMPLOYMENT", label: "Add Email" },
        {
          value: "PENDING_EMPLOYEMENT_WITH_SELF_EMPLOYEED",
          label: "Self Employed",
        },
        { value: "SEND_EMAIL_OTP", label: "Email OTP Sent" },
        { value: "VRIFY_EMAIL_OTP", label: "Bank Statement Analysis" },
        { value: "BRE_APPROVED", label: "Request Loan amount" },
        { value: "MISSING_ACCOUNT_DETAILS", label: "Missing Account Details" },
        { value: "LOAN_REQUESTED", label: "Aadhaar OTP Pending" },
        { value: "SEND_AADHAAR_OTP", label: "Aadhaar OTP Sent" },
        { value: "VERIFY_AADHAAR_KYC", label: "KYC Verified" },
        { value: "ADD_REFERENCE", label: "Add Reference" },
        { value: "AUDIT_PENDING", label: "Audit Pending" },
        { value: "AUDIT_ASSIGN", label: "Audit Assign" },
        { value: "AUDIT_ASSIGNED", label: "Audit Assigned" },
        { value: "AUDIT_HOLD_SALES_OPS", label: "Audit Hold Sales Ops" },
        { value: "AUDIT_COMPANY_VERIFIED", label: "Audit Company Verified" },
        { value: "AUDIT_APPROVED_SALES", label: "Audit Approved Sales" },
        {
          value: "AUDIT_PENDING_CREDIT_HEAD",
          label: "Audit Pending Credit Head",
        },
        {
          value: "AUDIT_ASSIGNED_CREDIT_HEAD",
          label: "Audit Assigned Credit Head",
        },
        { value: "AUDIT_HOLD_CREDIT_HEAD", label: "Audit Hold Credit Head" },
        {
          value: "AUDIT_APPROVED_CREDIT_HEAD",
          label: "Audit Approved Credit Head",
        },
        { value: "SANCTION_COMPLETED", label: "E-Sign Completed" },
        { value: "SANCTION_PENDING", label: "Sanction letter" },
      ];

    case "rejected":
      return [
        { value: "BRE_REJECT", label: "BRE Rejected" },
        { value: "REJECT_AADHAR_KYC", label: "KYC Rejected" },
        { value: "MANUALLY_REJECT", label: "Manually Rejected" },
        { value: "AUDIT_REJECTED_SALES", label: "Audit Rejected Sales" },
      ];

    case "total-leads":
      return [
        { value: "PENDING_LEAD", label: "Pending Lead" },
        { value: "COMPLETE_REGISTRATION", label: "Add Employment" },
        { value: "ADD_EMPLOYMENT", label: "Add Email" },
        {
          value: "PENDING_EMPLOYEMENT_WITH_SELF_EMPLOYEED",
          label: "Self Employed",
        },
        { value: "SEND_EMAIL_OTP", label: "Email OTP Sent" },
        { value: "VRIFY_EMAIL_OTP", label: "Bank Statement Analysis" },
        { value: "BRE_APPROVED", label: "Request Loan amount" },
        { value: "BRE_REJECT", label: "BRE Rejected" },
        { value: "MISSING_ACCOUNT_DETAILS", label: "Missing Account Details" },
        { value: "LOAN_REQUESTED", label: "Aadhaar OTP Pending" },
        { value: "SEND_AADHAAR_OTP", label: "Aadhaar OTP Sent" },
        { value: "VERIFY_AADHAAR_KYC", label: "KYC Verified" },
        { value: "REJECT_AADHAR_KYC", label: "KYC Rejected" },
        { value: "ADD_REFERENCE", label: "Add Reference" },
        { value: "AUDIT_PENDING", label: "Audit Pending" },
        { value: "AUDIT_ASSIGN", label: "Audit Assign" },
        { value: "AUDIT_ASSIGNED", label: "Audit Assigned" },
        { value: "AUDIT_HOLD_SALES_OPS", label: "Audit Hold Sales Ops" },
        { value: "AUDIT_COMPANY_VERIFIED", label: "Audit Company Verified" },
        { value: "AUDIT_APPROVED_SALES", label: "Audit Approved Sales" },
        { value: "AUDIT_REJECTED_SALES", label: "Audit Rejected Sales" },
        {
          value: "AUDIT_PENDING_CREDIT_HEAD",
          label: "Audit Pending Credit Head",
        },
        {
          value: "AUDIT_ASSIGNED_CREDIT_HEAD",
          label: "Audit Assigned Credit Head",
        },
        { value: "AUDIT_HOLD_CREDIT_HEAD", label: "Audit Hold Credit Head" },
        {
          value: "AUDIT_APPROVED_CREDIT_HEAD",
          label: "Audit Approved Credit Head",
        },
        { value: "SANCTION_COMPLETED", label: "E-Sign Completed" },
        { value: "SANCTION_PENDING", label: "Sanction letter" },
        { value: "APPLY_RELOAN", label: "Applied Reloan" },
        { value: "DISBURSED", label: "Loan Disbursed" },
        { value: "DISBURSAL_FAILED", label: "Disbursal Failed" },
      ];

    case "bre-approved":
      return [
        { value: "MISSING_ACCOUNT_DETAILS", label: "Missing Account Details" },
        { value: "LOAN_REQUESTED", label: "Aadhaar OTP Pending" },
        { value: "SEND_AADHAAR_OTP", label: "Aadhaar OTP Sent" },
        { value: "VERIFY_AADHAAR_KYC", label: "KYC Verified" },
        { value: "REJECT_AADHAR_KYC", label: "KYC Rejected" },
        { value: "ADD_REFERENCE", label: "Add Reference" },
        { value: "AUDIT_PENDING", label: "Audit Pending" },
        { value: "AUDIT_ASSIGN", label: "Audit Assign" },
        { value: "AUDIT_ASSIGNED", label: "Audit Assigned" },
        { value: "AUDIT_HOLD_SALES_OPS", label: "Audit Hold Sales Ops" },
        { value: "AUDIT_COMPANY_VERIFIED", label: "Audit Company Verified" },
        { value: "AUDIT_APPROVED_SALES", label: "Audit Approved Sales" },
        { value: "AUDIT_REJECTED_SALES", label: "Audit Rejected Sales" },
        {
          value: "AUDIT_PENDING_CREDIT_HEAD",
          label: "Audit Pending Credit Head",
        },
        {
          value: "AUDIT_ASSIGNED_CREDIT_HEAD",
          label: "Audit Assigned Credit Head",
        },
        { value: "AUDIT_HOLD_CREDIT_HEAD", label: "Audit Hold Credit Head" },
        {
          value: "AUDIT_APPROVED_CREDIT_HEAD",
          label: "Audit Approved Credit Head",
        },
        { value: "SANCTION_COMPLETED", label: "E-Sign Completed" },
        { value: "SANCTION_PENDING", label: "Sanction letter" },
        { value: "APPLY_RELOAN", label: "Applied Reloan" },
        { value: "DISBURSED", label: "Loan Disbursed" },
        { value: "DISBURSAL_FAILED", label: "Disbursal Failed" },
      ];

    default:
      return [
        { value: "PENDING_LEAD", label: "Pending Lead" },
        { value: "COMPLETE_REGISTRATION", label: "Add Employment" },
        { value: "ADD_EMPLOYMENT", label: "Add Email" },
        {
          value: "PENDING_EMPLOYEMENT_WITH_SELF_EMPLOYEED",
          label: "Self Employed",
        },
        { value: "SEND_EMAIL_OTP", label: "Email OTP Sent" },
        { value: "VRIFY_EMAIL_OTP", label: "Bank Statement Analysis" },
        { value: "BRE_APPROVED", label: "Request Loan amount" },
        { value: "BRE_REJECT", label: "BRE Rejected" },
        { value: "MISSING_ACCOUNT_DETAILS", label: "Missing Account Details" },
        { value: "LOAN_REQUESTED", label: "Aadhaar OTP Pending" },
        { value: "SEND_AADHAAR_OTP", label: "Aadhaar OTP Sent" },
        { value: "VERIFY_AADHAAR_KYC", label: "KYC Verified" },
        { value: "REJECT_AADHAR_KYC", label: "KYC Rejected" },
        { value: "ADD_REFERENCE", label: "Add Reference" },
        { value: "AUDIT_PENDING", label: "Audit Pending" },
        { value: "AUDIT_ASSIGN", label: "Audit Assign" },
        { value: "AUDIT_ASSIGNED", label: "Audit Assigned" },
        { value: "AUDIT_HOLD_SALES_OPS", label: "Audit Hold Sales Ops" },
        { value: "AUDIT_COMPANY_VERIFIED", label: "Audit Company Verified" },
        { value: "AUDIT_APPROVED_SALES", label: "Audit Approved Sales" },
        { value: "AUDIT_REJECTED_SALES", label: "Audit Rejected Sales" },
        {
          value: "AUDIT_PENDING_CREDIT_HEAD",
          label: "Audit Pending Credit Head",
        },
        {
          value: "AUDIT_ASSIGNED_CREDIT_HEAD",
          label: "Audit Assigned Credit Head",
        },
        { value: "AUDIT_HOLD_CREDIT_HEAD", label: "Audit Hold Credit Head" },
        {
          value: "AUDIT_APPROVED_CREDIT_HEAD",
          label: "Audit Approved Credit Head",
        },
        { value: "SANCTION_COMPLETED", label: "E-Sign Completed" },
        { value: "SANCTION_PENDING", label: "Sanction letter" },
        { value: "APPLY_RELOAN", label: "Applied Reloan" },
        { value: "DISBURSED", label: "Loan Disbursed" },
        { value: "DISBURSAL_FAILED", label: "Disbursal Failed" },
      ];
  }
};
