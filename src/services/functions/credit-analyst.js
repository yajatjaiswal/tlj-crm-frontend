import { axiosInstance } from "../api";
import { BASE_URL, BreRejectedLeadsURL } from "../../utils/constants";
import { searchWithQueryParams } from "../../utils/search";

export const getBreRejectedLeads = async ({
  page,
  limit,
  search_text,
  lead_stage,
  case_type,
  startDate,
  endDate,
  time,
  order_by,
}) => {
  try {
    const params = { page, limit };
    if (search_text) {
      params.search_text = search_text;
    }
    if (lead_stage) {
      params.lead_stage = lead_stage;
    }
    if (case_type) {
      params.caseType = case_type;
    }
    if (startDate) {
      params.startDate = startDate;
    }
    if (endDate) {
      params.endDate = endDate;
    }
    if (time) {
      params.time = time;
    }
    if (order_by) {
      params.order_by = order_by;
    }
    return await searchWithQueryParams(BreRejectedLeadsURL, params);
  } catch (err) {
    throw new Error(err.response?.message || "Failed to fetch BRE rejected leads");
  }
};

export const getBreRejectedAssignedLeads = async ({
  page,
  limit,
  search_text,
  employee_id,
  source,
  loan_amount,
  lead_stage,
  case_type,
  startDate,
  endDate,
  time,
  order_by,
}) => {
  try {
    const params = { page, limit };
    if (search_text) {
      params.search_text = search_text;
    }
    if (employee_id) {
      params.employee_id = employee_id;
    }
    if (source) {
      params.source = source;
    }
    if (loan_amount) {
      params.loanAmount = loan_amount;
    }
    if (lead_stage) {
      params.lead_stage = lead_stage;
    }
    if (case_type) {
      params.caseType = case_type;
    }
    if (startDate) {
      params.startDate = startDate;
    }
    if (endDate) {
      params.endDate = endDate;
    }
    if (time) {
      params.time = time;
    }
    if (order_by) {
      params.order_by = order_by;
    }
    return await searchWithQueryParams(`${BreRejectedLeadsURL}/employee`, params);
  } catch (err) {
    throw new Error(err.response?.message || "Failed to fetch assigned BRE rejected leads");
  }
};

export const uploadAddtionalDocument = async ({
  lead_id,
  file_type,
  file,
  remarks,
  document_name,
  category,
  documentType,
}) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    if (file_type) {
      formData.append("file_type", file_type);
    }
    if (documentType) {
      formData.append("documentType", documentType);
    }
    if (category) {
      formData.append("category", category);
    }
    if (remarks) {
      formData.append("remarks", remarks);
    }
    if (document_name) {
      formData.append("document_name", document_name);
    }
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/document-upload/${lead_id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from uploadAddtionalDocument----->>>", err);
    throw new Error(err.res.message);
  }
};

export const getBreRejectedApprovedLeads = async ({ page, limit, search_text, employee_id, source, loan_amount, lead_stage }) => {
  try {
    const params = { page, limit };
    if (search_text) {
      params.search_text = search_text;
    }
    if (employee_id) {
      params.employee_id = employee_id;
    }
    if (source) {
      params.source = source;
    }
    if (loan_amount) {
      params.loanAmount = loan_amount;
    }
    if (lead_stage) {
      params.lead_stage = lead_stage;
    }
    return await searchWithQueryParams(`${BreRejectedLeadsURL}/manual-approved`, params);
  } catch (err) {
    console.log("error from getBreRejectedApprovedLeads----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch approved BRE rejected leads");
  }
};

export const getBreRejectedCArejectedLeads = async ({ page, limit, search_text, employee_id, source, loan_amount, lead_stage }) => {
  try {
    const params = { page, limit };
    if (search_text) {
      params.search_text = search_text;
    }
    if (employee_id) {
      params.employee_id = employee_id;
    }
    if (source) {
      params.source = source;
    }
    if (loan_amount) {
      params.loanAmount = loan_amount;
    }
    if (lead_stage) {
      params.lead_stage = lead_stage;
    }
    return await searchWithQueryParams(`${BreRejectedLeadsURL}/manual-rejected`, params);
  } catch (err) {
    console.log("error from getBreRejectedCArejectedLeads----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch CA rejected BRE leads");
  }
};

export const selfAssignMultipleBreRejectedLead = async ({ id }) => {
  try {
    const res = await axiosInstance.post(`${BreRejectedLeadsURL}/assign`, {
      leadIds: id,
    });
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from selfAssignMultipleBreRejectedLead----->>>", err);
    throw new Error(err.response?.message || "Failed to assign leads");
  }
};

export const approveBreRejectedLead = async ({
  id,
  calculated_loan_amount,
  monthly_income,
  branch_name,
  bank_acc_no,
  ifsc_code,
  salary_date,
  remarks,
}) => {
  try {
    const res = await axiosInstance.post(
      `${BreRejectedLeadsURL}/manual-approve/${id}`,
      // `${BASE_URL}/lead/bre-rejected-2/manual-approve/${id}`,
      {
        calculated_loan_amount,
        monthly_income,
        branch_name,
        bank_acc_no,
        ifsc_code,
        salary_date,
        remarks,
      }
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from approveBreRejectedLead----->>>", err);

    const responseData = err.response?.data;
    const error = new Error(
      responseData?.message || err.message || "Failed to approve lead"
    );
    if (responseData?.sal_rejection_code != null) {
      error.sal_rejection_code = responseData.sal_rejection_code;
    }
    throw error;
  }
};

export const getSalaryManualApprove = async ({ lead_id, income }) => {
  try {
    const res = await axiosInstance.post(
      `/lead/get-transaction-by-amount-and-date`,
      { lead_id, income }
    );
    if (res.status === 200) {
      const data = res.data;
      const isEmptyResult =
        data?.success === true &&
        data?.count === 0 &&
        Array.isArray(data?.data) &&
        data.data.length === 0;

      if (isEmptyResult) {
        throw new Error(
          "No salary record found. Please check the amount and date."
        );
      }

      return data;
    }
  } catch (err) {
    console.log("error from getSalaryManualApprove----->>>", err);
    throw new Error(
      err.message ||
        err.response?.data?.message ||
        "Failed to get salary"
    );
  }
};

export const setSalaryTransactionById = async ({ lead_id, transactions }) => {
  try {
    const res = await axiosInstance.post(
      `/lead/set-salary-transaction-by-id`,
      { lead_id, transactions }
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from setSalaryTransactionById----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        "Failed to submit salary transactions"
    );
  }
};

export const rejectBreRejectedLead = async ({ id, remarks }) => {
  try {
    const res = await axiosInstance.post(
      `${BreRejectedLeadsURL}/manual-reject/${id}`,
      { remarks }
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from rejectBreRejectedLead----->>>", err);
    throw new Error(err.res.message);
  }
};

export const getLeadByNBFC = async ({
  company_name,
  page,
  limit,
  intervalDays
}) => {
  try {
    const res = await axiosInstance.get(
      `adminDashboard/getLeadByNBFC?companyName=${company_name}&page=${page}&limit=${limit}&intervalDays=${intervalDays}`
    );
    console.log("res >>>", res.data);
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from getLeadByNBFC----->>>", err);
    throw new Error(
      err.response?.message || "Failed to fetch leads by company"
    );
  }
};

export const getAuditLeads = async ({ page, limit, view, category, role, search_text, employee_id, source, loan_amount, lead_stage }) => {
  try {
    const params = { page, limit, view, category };
    if (role) {
      params.role = role;
    }
    if (search_text) {
      params.search_text = search_text;
    }
    if (employee_id) {
      params.employee_id = employee_id;
    }
    if (source) {
      params.source = source;
    }
    if (loan_amount) {
      params.loanAmount = loan_amount;
    }
    if (lead_stage) {
      params.lead_stage = lead_stage;
    }
    return await searchWithQueryParams(`${BASE_URL}/lead/get-audit-list`, params);
  } catch (err) {
    throw new Error(err.response?.message || "Failed to fetch audit leads");
  }
};

export const getAuditAssignedLeads = async ({ page, limit }) => {
  try {
    const res = await axiosInstance.get(
      `${BASE_URL}/lead/audit-leads/employee?page=${page}&limit=${limit}`
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    throw new Error(err.response?.message || "Failed to fetch assigned audit leads");
  }
};

export const getAuditApprovedLeads = async ({ page, limit }) => {
  try {
    const res = await axiosInstance.get(
      `${BASE_URL}/lead/audit-leads/approved?page=${page}&limit=${limit}`
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from getAuditApprovedLeads----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch approved audit leads");
  }
};

export const getAuditRejectedLeads = async ({ page, limit }) => {
  try {
    const res = await axiosInstance.get(
      `${BASE_URL}/lead/audit-leads/rejected?page=${page}&limit=${limit}`
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from getAuditRejectedLeads----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch rejected audit leads");
  }
};

export const selfAssignMultipleAuditLead = async ({ id }) => {
  try {
    const res = await axiosInstance.post(`${BASE_URL}/lead/audit-leads/assign`, {
      leadIds: id,
    });
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from selfAssignMultipleAuditLead----->>>", err);
    throw new Error(err.response?.message || "Failed to assign audit leads");
  }
};

export const approveAuditLead = async ({
  id,
  calculated_loan_amount,
  branch_name,
  bank_acc_no,
  ifsc_code,
  salary_date,
  remarks,
}) => {
  try {
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/audit-leads/approve/${id}`,
      {
        calculated_loan_amount,
        branch_name,
        bank_acc_no,
        ifsc_code,
        salary_date,
        remarks,
      }
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from approveAuditLead----->>>", err);
    throw new Error(err.response?.message || "Failed to approve audit lead");
  }
};

export const rejectAuditLead = async ({ id, remarks }) => {
  try {
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/audit-leads/reject/${id}`,
      { remarks }
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from rejectAuditLead----->>>", err);
    throw new Error(err.response?.message || "Failed to reject audit lead");
  }
};

export const assignKycAudit = async ({ audit_ids, assign_type }) => {
  try {
    const body = { audit_ids };
    if (assign_type) {
      body.assign_type = assign_type;
    }
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/assign/kyc-audit`,
      body
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from assignKycAudit----->>>", err);
    throw new Error(err.response?.message || "Failed to assign KYC audit leads");
  }
};

export const verifyCompany = async ({ company_name, audit_id, gstin }) => {
  try {
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/company-verification`,
      {
        company_name,
        audit_id,
        gstin
      }
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from verifyCompany----->>>", err);
    throw new Error(err.response?.message || "Failed to verify company");
  }
};

export const approveAuditLeadWithVerification = async ({
  audit_id,
  action,
  residenceProof,
  residenceProofType,
  remarks,
  linkedin_url,
  website_url,
  is_linkedin_verify,
  is_website_verify,
  action_type, // <-- now required
  repayment_date
}) => {
  try {
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/audit-action?action_type=${encodeURIComponent(action_type)}`,
      {
        audit_id,
        action,
        residenceProof,
        residenceProofType,
        remarks,
        linkedin_url,
        website_url,
        is_linkedin_verify,
        is_website_verify,
        repayment_date
      }
    );
    // debugger;
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from approveAuditLeadWithVerification----->>>", err);
    if (err.response?.status === 400 && err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to approve audit lead with verification"
    );
  }
};

export const getAuditSummary = async (audit_id) => {
  try {
    const res = await axiosInstance.get(
      `${BASE_URL}/lead/get-audit-details/${audit_id}`
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from getAuditSummary----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch audit summary");
  }
};

export const takeAuditAction = async (formData) => {
  try {
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/don?action_type=credit-head`,
      formData,
      { 
        headers: { 
          "Content-Type": "multipart/form-data" 
        } 
      }
    );
    // debugger;
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from takeAuditAction----->>>", err);
    if (err.response?.status === 400 && err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to take audit action"
    );
  }
};

export const moveToBanking = async ({ pan, reason }) => {
  try {
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/movedToBanking/${pan}`,
      { reason }
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from moveToBanking----->>>", err);
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    throw new Error(err.response?.message || "Failed to move lead to banking");
  }
};

export const getLocationSuspiciousLeads = async ({
  page,
  limit,
  search_text,
} = {}) => {
  try {
    const params = { page, limit };
    if (search_text) {
      params.search_text = search_text;
    }
    return await searchWithQueryParams(
      `${BASE_URL}/lead/location-suspicious-leads`,
      params
    );
  } catch (err) {
    console.log("error from getLocationSuspiciousLeads----->>>", err);
    throw new Error(
      err.message || "Failed to fetch location suspicious leads"
    );
  }
};

export const getLeadLocationAnalysis = async (leadId) => {
  try {
    const res = await axiosInstance.get(
      `${BASE_URL}/lead/location-analysis/${leadId}`
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from getLeadLocationAnalysis----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch location analysis"
    );
  }
};

export const clearLocationSuspicious = async ({ lead_id, remarks }) => {
  try {
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/location-suspicious/clear`,
      { lead_id, remarks }
    );
    if (res.status >= 200 && res.status < 300) {
      return res.data;
    }
  } catch (err) {
    console.log("error from clearLocationSuspicious----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to clear location suspicious flag"
    );
  }
};

export const getLocationSuspiciousRejectedLeads = async ({
  page,
  limit,
  search,
  outcome,
  time,
  order_by,
  source,
  lead_stage,
  caseType,
}) => {
  try {
    return await searchWithQueryParams(
      `${BASE_URL}/lead/location-suspicious/rejected`,
      {
        page,
        limit,
        search,
        outcome,
        time,
        order_by,
        source,
        lead_stage,
        caseType,
      }
    );
  } catch (err) {
    console.log("error from getLocationSuspiciousRejectedLeads----->>>", err);
    throw new Error(err.message || "Failed to fetch rejected location leads");
  }
};

export const getLocationSuspiciousClearedLeads = async ({
  page,
  limit,
  search_text,
  outcome,
  time,
  startDate,
  endDate,
} = {}) => {
  try {
    const params = { page, limit };
    if (search_text) params.search_text = search_text;
    if (outcome) params.outcome = outcome;
    if (time) params.time = time;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await searchWithQueryParams(
      `${BASE_URL}/lead/location-suspicious/cleared`,
      params
    );
  } catch (err) {
    console.log("error from getLocationSuspiciousClearedLeads----->>>", err);
    throw new Error(
      err.message || "Failed to fetch approved location suspicious leads"
    );
  }
};

export const getLeadLocationCleared = async (leadId) => {
  try {
    const res = await axiosInstance.get(
      `${BASE_URL}/lead/location-cleared/${leadId}`
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from getLeadLocationCleared----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch cleared location analysis"
    );
  }
};

const locationRejectMessage = (err, fallback) => {
  const data = err?.response?.data ?? err?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
  if (Array.isArray(data?.message) && data.message.length) {
    return data.message.filter(Boolean).join(", ");
  }
  if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();

  const ownMessage = typeof err?.message === "string" ? err.message.trim() : "";
  const isGenericRequestError =
    ownMessage.startsWith("Request failed with status code") ||
    ownMessage === "Network Error";
  if (ownMessage && !isGenericRequestError) return ownMessage;
  if (!err?.response && !err?.data) {
    return "Unable to reach the server. Please try again.";
  }
  return fallback;
};

export const rejectLocationSuspicious = async ({ lead_id, remarks }) => {
  const trimmedRemarks = typeof remarks === "string" ? remarks.trim() : "";
  if (!lead_id) {
    throw new Error("Lead id is not available");
  }
  if (!trimmedRemarks) {
    throw new Error("Please enter remarks");
  }

  try {
    const res = await axiosInstance.post(
      `${BASE_URL}/lead/location-suspicious/reject`,
      { lead_id, remarks: trimmedRemarks }
    );
    const data = res?.data;
    if (data?.success === false || data?.status === false) {
      throw new Error(locationRejectMessage({ data }, "Failed to reject location"));
    }
    if (res.status >= 200 && res.status < 300) {
      return data;
    }
    throw new Error(locationRejectMessage({ data, response: res }, "Failed to reject location"));
  } catch (err) {
    console.log("error from rejectLocationSuspicious----->>>", err);
    throw new Error(locationRejectMessage(err, "Failed to reject location"));
  }
};

export const getSalaryDateConflict = async (id) => {
  try {
    const res = await axiosInstance.get(
      `${BASE_URL}/lead/getSalaryDateConflict/${id}`
    );
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from getSalaryDateConflict----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch salary date conflict"
    );
  }
};
