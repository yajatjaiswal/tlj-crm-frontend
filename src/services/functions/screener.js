import { axiosInstance } from "../api";
import { searchWithQueryParams } from "../../utils/search";

export const getLeadByCategory = async (
  category,
  page = 1,
  limit = 3,
  search_text = null,
  employee_id = null,
  source = null,
  status = null,
  caseType = null,
  startDate = null,
  endDate = null,
  time = null,
  order_by = null,
  commentSortBy = null,
  commentSortOrder = null
) => {
  try {
    const params = { page, limit };
    if (search_text && search_text.trim() !== "") {
      params.search_text = search_text.trim();
    }
    if (employee_id) {
      params.employee_id = employee_id;
    }
    if (source) {
      params.source = source;
    }
    if (status) {
      params.lead_stage = status;
    }
    if (caseType) {
      params.caseType = caseType;
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
    if (commentSortBy) {
      params.commentSortBy = commentSortBy;
    }
    if (commentSortOrder) {
      params.commentSortOrder = commentSortOrder;
    }

    // return await searchWithQueryParams(`/lead/new-lead/${category}`, params);
    return await searchWithQueryParams(`/lead/new-lead/`, params);
  } catch (err) {
    console.log("error from getLeadByCategory----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch leads by category");
  }
};

export const getAllocatedLeadByCategory = async (
  category,
  page = 1,
  limit = 3,
  search_text = null,
  employee_id = null,
  source = null,
  loan_amount = null,
  status = null,
  caseType = null,
  startDate = null,
  endDate = null,
  time = null,
  order_by = null,
  commentSortBy = null,
  commentSortOrder = null
) => {
  try {
    console.log("status----->>>", status);
    const params = { page, limit };
    if (search_text && search_text.trim() !== "") {
      params.search_text = search_text.trim();
    }
    if (employee_id) {
      params.employee_id = employee_id;
    }
    if (source) {
      params.source = source;
    }
    if (loan_amount) {
      params.loan_amount = loan_amount;
    }
    if (status) {
      params.lead_stage = status;
    }
    if (caseType) {
      params.caseType = caseType;
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
    if (commentSortBy) {
      params.commentSortBy = commentSortBy;
    }
    if (commentSortOrder) {
      params.commentSortOrder = commentSortOrder;
    }
    return await searchWithQueryParams(`/lead/allocated-leads/${category}`, params);
  } catch (err) {
    console.log("error from getAllocatedLeadByCategory----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch allocated leads by category");
  }
};

export const getAllRejectedLeads = async (page = 1, limit = 10, search_text = null) => {
  try {
    const params = { page, limit };
    if (search_text && search_text.trim() !== "") {
      params.search_text = search_text.trim();
    }
    return await searchWithQueryParams("/lead/my-rejected-leads", params);
  } catch (err) {
    console.log("error from getAllRejectedLeads----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch rejected leads");
  }
};

export const rejectLeadById = async (id, remarks) => {
  try {
    const res = await axiosInstance.post(`/lead/reject-new-lead/${id}`, {
      remarks,
    });

    if (res.status === 200) {
      return res.data;
    }

    return null;
  } catch (err) {
    console.log("error from rejectLeadById----->>>", err);
    throw new Error(err.response.message);
  }
};

export const validateDocs = async ({ lead_id, docs_id, is_validated }) => {
  try {
    const res = await axiosInstance.post("/lead/validate-docs", {
      lead_id,
      docs_id,
      is_validated,
    });

    if (res.status === 200) {
      return res.data;
    }

    return null;
  } catch (err) {
    console.log("error from validateDocs----->>>", err);
    throw new Error(
      err.response?.data?.message || err.response?.message || "Failed to validate document"
    );
  }
};

export const allocateLeadById = async ({ id }) => {
  try {
    const res = await axiosInstance.post(`/lead/allocate-new-lead`, {
      leadIds: id,
    });

    if (res.status === 200) {
      return res.data;
    }

    return null;
  } catch (err) {
    console.log("error from allocateLeadById----->>>", err);
    throw new Error(err.response.message);
  }
};

export const allocatMultipleLead = async (lead) => {
  const leadArray = [...lead];
  try {
    const res = await axiosInstance.post(`/lead/allocate-new-lead`, {
      leadIds: leadArray,
    });

    if (res.status === 200) {
      return res.data;
    }

    return null;
  } catch (err) {
    console.log("error from allocatMultipleLead----->>>", err);
    throw new Error(err.response.message);
  }
};

export const getAllCompletedLeads = async (currentPage = 1, itemsPerPage = 10) => {
  try {
    const res = await axiosInstance.get(`/lead/my-disbursed-lead?page=${currentPage}&limit=${itemsPerPage}`);
    // Transform response to match component expectations
    return {
      leads: res.data.data || [],
      pagination: res.data.pagination || {}
    };
  } catch (err) {
    console.log("error from getAllCompletedLeads----->>>", err);
    throw new Error(err.response?.message || "Some error occured.");
  }
};

export const approveManualKyc = async (id, remarks) => {
  try {
    const res = await axiosInstance.post(`/lead/kyc-approve/manual-approve/${id}`, {
      remarks,
    });

    if (res.status === 200) {
      return res.data;
    }

    return null;
  } catch (err) {
    console.log("error from approveManualKyc----->>>", err);
    throw new Error(err.response?.message || "Failed to approve KYC");
  }
};

export const toggleDisposeLead = async ({ id, reason, is_disposed }) => {
  try {
    const res = await axiosInstance.post(`/lead/toggle-dispose-lead/${id}`, {
      reason,
      is_disposed,
    });

    if (res.status === 200) {
      return res.data;
    }

    return null;
  } catch (err) {
    console.log("error from toggleDisposeLead----->>>", err);
    throw new Error(err.response?.data?.message || "Failed to toggle dispose lead");
  }
};

export const getDisposedLeads = async (page = 1, limit = 10, search_text = null) => {
  try {
    const params = { page, limit };
    if (search_text && search_text.trim() !== "") {
      params.search_text = search_text.trim();
    }
    return await searchWithQueryParams("/lead/get-disposed-leads", params);
  } catch (err) {
    console.log("error from getDisposedLeads----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch disposed leads");
  }
};

export const getUnserviceablePinCodeLeads = async (
  page = 1,
  limit = 10,
  search_text = null,
  employee_id = null,
  source = null,
  status = null,
  caseType = null,
  startDate = null,
  endDate = null,
  time = null,
  order_by = null
) => {
  try {
    const params = { page, limit };
    if (search_text && search_text.trim() !== "") {
      params.search_text = search_text.trim();
    }
    if (employee_id) {
      params.employee_id = employee_id;
    }
    if (source) {
      params.source = source;
    }
    if (status) {
      params.lead_stage = status;
    }
    if (caseType) {
      params.caseType = caseType;
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

    return await searchWithQueryParams(`/lead/unserviceable-pin-code-leads`, params);
  } catch (err) {
    console.log("error from getUnserviceablePinCodeLeads----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch unserviceable pin code leads");
  }
};

const isRepaymentLeadRow = (item) =>
  item && typeof item === "object" && ("pan" in item || "repayment_amount" in item);

const extractRepaymentLeads = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload) && payload.every(isRepaymentLeadRow)) return payload;
  if (Array.isArray(payload.leads)) return payload.leads;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data) && payload.data.every(isRepaymentLeadRow)) {
    return payload.data;
  }
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  if (payload.data && Array.isArray(payload.data.leads)) return payload.data.leads;
  return [];
};

const normalizeRepaymentListResponse = (payload, page, limit) => {
  const leads = extractRepaymentLeads(payload);

  const rawPagination =
    payload?.pagination ?? payload?.data?.pagination ?? payload?.meta ?? {};

  const currentPage = Number(
    rawPagination.currentPage ?? rawPagination.page ?? page
  );
  const perPage = Number(
    rawPagination.perPage ??
      rawPagination.limit ??
      rawPagination.itemsPerPage ??
      limit
  );
  const hasMore = leads.length >= limit;
  const totalItems = Number(
    rawPagination.totalItems ??
      rawPagination.total ??
      rawPagination.totalCount ??
      rawPagination.count ??
      0
  ) || (hasMore ? page * limit + 1 : (page - 1) * limit + leads.length);
  const totalPages = Number(
    rawPagination.totalPages ??
      rawPagination.total_pages ??
      (totalItems > 0 ? Math.ceil(totalItems / perPage) : hasMore ? page + 1 : 1)
  );

  return {
    leads,
    pagination: {
      currentPage,
      totalPages: Math.max(totalPages, 1),
      totalItems,
    },
  };
};

export const getLeadRepaymentSummary = async ({
  page = 1,
  limit = 10,
  search_text = null,
  body = {},
} = {}) => {
  try {
    const skip = (page - 1) * limit;
    const params = { page, limit, skip };
    if (search_text && search_text.trim() !== "") {
      params.search_text = search_text.trim();
    }

    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    );
    const queryString = new URLSearchParams(filteredParams).toString();
    const url = queryString
      ? `/lead/lead-repayment-list?${queryString}`
      : "/lead/lead-repayment-list";

    const res = await axiosInstance.post(url, body);
    if (res.status === 200) {
      return normalizeRepaymentListResponse(res.data, page, limit);
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from getLeadRepaymentlist----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch repayment leads"
    );
  }
};

export const getTodayRecoveryLeads = async (page = 1, limit = 10, search_text = null) => {
  try {
    // Calculate skip based on page and limit
    const skip = (page - 1) * limit;
    
    // Build query parameters
    const params = { page, limit, skip };
    if (search_text && search_text.trim() !== "") {
      params.search_text = search_text.trim();
    }
    
    // Remove undefined or empty params and build query string
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    );
    const queryString = new URLSearchParams(filteredParams).toString();
    const url = queryString ? `/lead/today-lead-recovery-summary?${queryString}` : "/lead/today-lead-recovery-summary";
    
    const res = await axiosInstance.post(url, {});
    if (res.status === 200) {
      return res.data;
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from getTodayRecoveryLeads----->>>", err);
    throw new Error(err.response?.data?.message || err.response?.message || "Failed to fetch today recovery leads");
  }
};

export const selfAssignReloanLead = async (leadId) => {
  console.log("leadId----->>>", leadId);
  console.log("leadId type----->>>", typeof leadId);
  try {
    const res = await axiosInstance.post(`/lead/self-assign-reloan-lead/${leadId}`);

    if (res.status === 200) {
      return res.data;
    }

    return null;
  } catch (err) {
    console.log("error from selfAssignReloanLead----->>>", err);
    throw new Error(err.response?.data?.message || err.response?.message || "Failed to assign reloan lead");
  }
};

export const getSelfAssignedReloanLeads = async (page = 1, limit = 10, search_text = null) => {
  try {
    // Calculate skip based on page and limit
    const skip = (page - 1) * limit;
    
    // Build query parameters
    const params = { page, limit, skip };
    if (search_text && search_text.trim() !== "") {
      params.search_text = search_text.trim();
    }
    
    // Remove undefined or empty params and build query string
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    );
    const queryString = new URLSearchParams(filteredParams).toString();
    const url = queryString ? `/lead/get-self-assigned-reloan-leads?${queryString}` : "/lead/get-self-assigned-reloan-leads";
    
    const res = await axiosInstance.get(url, {});
    if (res.status === 200) {
      return res.data;
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from getSelfAssignedReloanLeads----->>>", err);
    throw new Error(err.response?.data?.message || err.response?.message || "Failed to fetch self-assigned reloan leads");
  }
};

export const getPriorityReloanLeads = async (
  page = 1,
  limit = 10,
  search_text = null
) => {
  try {
    const params = { page, limit };
    if (search_text && search_text.trim() !== "") {
      params.search_text = search_text.trim();
    }
    return await searchWithQueryParams("/lead/priority-reloan", params);
  } catch (err) {
    console.log("error from getPriorityReloanLeads----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch priority reloan leads"
    );
  }
};

export const assignNotTakenReloanLead = async (leadId) => {
  try {
    const res = await axiosInstance.post(
      `/lead/assign-not-taken-reloan/${leadId}`
    );

    if (res.status === 200) {
      return res.data;
    }

    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from assignNotTakenReloanLead----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to assign not taken reloan lead"
    );
  }
};

export const getNotTakenReloanLeads = async () => {
  try {
    const res = await axiosInstance.get("/lead/not-taken-reloan");
    if (res.status === 200) {
      return res.data;
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from getNotTakenReloanLeads----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch not taken reloan leads"
    );
  }
};

export const getMyNotTakenReloanLeads = async () => {
  try {
    const res = await axiosInstance.get("/lead/my-not-taken-reloan");
    if (res.status === 200) {
      return res.data;
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from getMyNotTakenReloanLeads----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch assigned not taken reloan leads"
    );
  }
};

export const getLeadSummaryData = async (leadId) => {
  try {
    const res = await axiosInstance.get(`/lead/get-summary-data/${leadId}`);
    if (res.status === 200) {
      const payload = res.data;

      if (payload?.success === false) {
        throw new Error(payload?.message || "Failed to fetch lead summary data");
      }

      if (payload?.data && typeof payload.data === "object") {
        return payload.data;
      }

      return payload;
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from getLeadSummaryData----->>>", err);
    const error = new Error(
      err.response?.data?.message ||
        err.response?.message ||
        err.message ||
        "Failed to fetch lead summary data"
    );
    error.status = err.response?.status;
    throw error;
  }
};

export const generateBankingUrl = async ({ lead_id, bank_opt }) => {
  try {
    const res = await axiosInstance.post("/lead/generate-banking-url", {
      lead_id,
      bank_opt,
    });

    if (res.status === 200) {
      return res.data;
    }

    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from generateBankingUrl----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to send banking link"
    );
  }
};

export const submitWarnIndicatorAction = async (id, action) => {
  try {
    const res = await axiosInstance.post(`/lead/warn-indicator/action/${id}`, {
      action,
    });

    if (res.status === 200) {
      return res.data;
    }

    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from submitWarnIndicatorAction----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to update warning indicator"
    );
  }
};

const normalizeDocumentOptions = (payload) => {
  const raw =
    payload?.data ??
    payload?.options ??
    payload?.documents ??
    payload?.document_options ??
    payload;

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";
      return String(
        item.document_name ||
          item.name ||
          item.label ||
          item.value ||
          item.document_type ||
          ""
      ).trim();
    })
    .filter(Boolean);
};

export const getAdditionalDocumentOptions = async () => {
  try {
    const res = await axiosInstance.get("/lead/additional-documents-options");
    if (res.status === 200) {
      return normalizeDocumentOptions(res.data);
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from getAdditionalDocumentOptions----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch document options"
    );
  }
};

export const requestAdditionalDocuments = async (
  leadId,
  { documents, force_reopen = false }
) => {
  try {
    const res = await axiosInstance.post(
      `/lead/additional-documents/${leadId}`,
      { documents, force_reopen }
    );
    if (res.status === 200 || res.status === 201) {
      return res.data;
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from requestAdditionalDocuments----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to request documents from customer"
    );
  }
};
