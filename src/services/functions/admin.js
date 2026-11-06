import { axiosInstance } from "../api";
import { searchWithQueryParams } from "../../utils/search";
import axios from "axios";
import { BASE_URL, VITE_BASE_MANUAL_BANKING_URL } from "../../utils/constants";
import { asyncHandler } from "../../utils/helper";

export const getAdminDashboardDetails = async (
  time,
  startDate = null,
  endDate = null,
  caseType = null,
  category = null,
  employee_id = null
) => {
  try {
    let url = `/adminDashboard?time=${time}`;

    // If time is customDate, add startDate and endDate as query parameters
    if (time === "customDate" && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    // If caseType provided (fresh|reloan), append as query param
    if (caseType !== null && caseType !== undefined && caseType !== "") {
      url += `&caseType=${caseType}`;
    }
    if (category) {
      url += `&category=${category}`;
    }
    if (employee_id) {
      url += `&employee_id=${employee_id}`;
      // url += `&employee_id=17`;
    }

    const res = await axiosInstance.get(url);
    return res.data.data;
  } catch (error) {
    return error;
  }
};

export const getDayWiseDisbursalData = async (
  time,
  startDate = null,
  endDate = null
) => {
  try {
    let url = `/adminDashboard/get-day-wise-disbursal-data?time=${encodeURIComponent(
      time
    )}`;
    if (time === "customDate" && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await axiosInstance.get(url);
    const body = res.data;
    return {
      success: body?.success !== false,
      timeFilter: body?.timeFilter,
      data: Array.isArray(body?.data) ? body.data : [],
    };
  } catch {
    return { success: false, timeFilter: null, data: [] };
  }
};

export const getDayWiseOverdueData = async (
  time,
  selectedMonth = null,
  fromDate = null,
  toDate = null
) => {
  try {
    let url = `/adminDashboard/get-day-wise-overdue-data?time=${encodeURIComponent(
      time
    )}`;
    if (selectedMonth) {
      url += `&selectedMonth=${encodeURIComponent(selectedMonth)}`;
    }
    if (fromDate && toDate) {
      url += `&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
    }
    const res = await axiosInstance.get(url);
    const body = res.data;
    return {
      success: body?.success !== false,
      timeFilter: body?.timeFilter,
      data: Array.isArray(body?.data) ? body.data : [],
    };
  } catch {
    return { success: false, timeFilter: null, data: [] };
  }
};

export const getPaymentStatusCollectionList = async (
  paymentStatus,
  fromDate,
  toDate
) => {
  try {
    const params = new URLSearchParams({
      paymentStatus: String(paymentStatus || ""),
      fromDate: String(fromDate || ""),
      toDate: String(toDate || ""),
    });
    const res = await axiosInstance.get(
      `/adminDashboard/get-payment-status-collection-list?${params.toString()}`
    );
    const body = res.data;
    return {
      success: body?.success !== false,
      paymentStatus: body?.paymentStatus,
      data: Array.isArray(body?.data) ? body.data : [],
    };
  } catch {
    return { success: false, paymentStatus: null, data: [] };
  }
};

// Fetch collection performance from insights API (external base URL)
export const getCollectionPerformance = async (startDate, endDate) => {
  try {
    const url = `${BASE_URL}/insights/v1/collection-performance?startDate=${startDate}&&endDate=${endDate}`;
    const res = await axios.get(url, {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
    return res.data?.collectionPerformance || [];
  } catch (error) {
    throw error;
  }
};

export const addNewEmployee = async (data) => {
  try {
    const res = await axiosInstance.post("/employee/create", data);
    return res.data;
  } catch (error) {
    return error;
  }
};

export const getDashboardLeads = async (
  status,
  page,
  limit,
  time,
  startDate = null,
  endDate = null,
  caseType = null,
  search_text = null,
  employee_id = null,
  source = null,
  loan_amount = null,
  lead_status = null
) => {
  try {
    const params = {
      page,
      limit,
      time,
    };

    // If time is customDate, add startDate and endDate as query parameters
    if (time === "customDate" && startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    // Optional filters
    if (caseType) {
      params.caseType = caseType;
    }
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
      params.loanAmount = loan_amount;
    }
    if (lead_status) {
      params.lead_stage = lead_status;
    }

    const url = `/adminDashboard/dashboard-leads/${status}`;
    return await searchWithQueryParams(url, params);
  } catch (error) {
    throw error; // We throw the error here to handle it in the component
  }
};

const parseGlobalSearchPayload = (res) => {
  const payload = res?.data?.data;
  const envelope = res?.data;

  const results = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.results)
        ? payload.results
        : [];

  const pagination =
    payload?.pagination || envelope?.pagination || null;

  const domainAnalytics =
    payload?.domainAnalytics ?? envelope?.domainAnalytics ?? null;

  return { results, pagination, domainAnalytics };
};

export const globalSearch = async (
  query,
  page = 1,
  limit = 10,
  options = {}
) => {
  const { includePagination = false } = options;
  try {
    const searchParams = new URLSearchParams({
      query: String(query || ""),
      page: String(page),
      limit: String(limit),
    });
    const res = await axiosInstance.get(
      `/adminDashboard/global-search?${searchParams.toString()}`
    );
    const { results, pagination, domainAnalytics } =
      parseGlobalSearchPayload(res);

    if (includePagination) {
      return { results, pagination, domainAnalytics };
    }

    return { results, domainAnalytics };
  } catch (error) {
    throw error;
  }
};

export const actionPan = async (panNumber, action, reason) => {
  try {
    const res = await axiosInstance.post(`/lead/action-pan/${panNumber}`, {
      action,
      reason,
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const getAllEmployees = async (options = {}) => {
  try {
    const params = {};
    if (options.excludeGeofenceWhitelist) {
      params.exclude_geofence_whitelist = true;
    }
    const res = await axiosInstance.get("/employee/get-all-employees", {
      params,
    });
    return res.data || [];
  } catch (error) {
    throw error;
  }
};

export const updateSanctionAmount = async (panNumber, data) => {
  try {
    // const res = await axiosInstance.post(`/lead/updateSanction/${panNumber}`, data);
    const res = await axiosInstance.post(`/lead/updateSanctionV3/${panNumber}`, data);
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const emailBypassUpdate = async (panNumber, data, isUpdateOnly = false) => {
  try {
    if (data instanceof FormData) {
      data.append("is_update_only", String(Boolean(isUpdateOnly)));
    }
    const res = await axiosInstance.post(
      `/lead/emailBypass/${panNumber}`,
      data instanceof FormData
        ? data
        : {
            ...data,
            is_update_only: Boolean(isUpdateOnly),
          }
    );
    return res.data;
  } catch (error) {
    throw error;
  }
};

// --------------------------Update Mobile Number---------------------------------------------------
export const updateMobileNumber = asyncHandler(
  async (panNumber, mobileNumber, remarks) => {
    const res = await axiosInstance.post(
      `/lead/update-mobile-number/${panNumber}`,
      {
        mobile_number: mobileNumber,
        remarks: remarks,
      }
    );
    return res.data;
  }
);

// --------------------------Get Mobile Number by PAN---------------------------------------------------
export const getMobileNumberByPan = async (pan) => {
  try {
    const response = await axiosInstance.get(`/lead/getMobileNumber/${pan}`);
    if (response.status === 200) {
      return response.data;
    }
  } catch (err) {
    console.log("error from getMobileNumberByPan----->>>", err);
    throw new Error(
      err.response?.message || "Error fetching mobile number data"
    );
  }
};

// --------------------------Get OTP by Mobile---------------------------------------------------
export const getOtpByMobile = async (mobile) => {
  try {
    const response = await axiosInstance.get(`/lead/get-otp/${mobile}`);
    return response.data;
  } catch (err) {
    console.log("error from getOtpByMobile----->>>", err);
    throw new Error(
      err.response?.data?.message || err.message || "Error fetching OTP"
    );
  }
};

// --------------------------Undispose Lead by PAN---------------------------------------------------
export const undisposeLead = async (pan) => {
  try {
    const response = await axiosInstance.post(`/lead/undispose-lead/${pan}`);
    return response.data;
  } catch (err) {
    console.log("error from undisposeLead----->>>", err);
    throw new Error(
      err.response?.data?.message || err.message || "Error undisposing lead"
    );
  }
};

// --------------------------Bypass Alternate Number by PAN---------------------------------------------------
export const bypassAlternateNumber = async (pan, mobileNumber) => {
  try {
    const payload = {};
    if (mobileNumber) {
      payload.mobile_number = mobileNumber;
    }
    const response = await axiosInstance.post(`/lead/bypass-alternate-number/${pan}`, payload);
    return response.data;
  } catch (err) {
    console.log("error from bypassAlternateNumber----->>>", err);
    throw new Error(
      err.response?.data?.message || err.message || "Error bypassing alternate number"
    );
  }
};



// --------------------------Get Token by PAN---------------------------------------------------
export const getTokenByPan = async (pan) => {
  try {
    const response = await axiosInstance.get(`/lead/get-token/${pan}`);
    return response.data;
  } catch (err) {
    console.log("error from getTokenByPan----->>>", err);
    throw new Error(
      err.response?.data?.message || err.message || "Error fetching token"
    );
  }
};

// --------------------------Update Bank Details (Masked Account)---------------------------------------------------
export const updateBankDetails = asyncHandler(async (panNumber, data) => {
  const res = await axiosInstance.post(
    `/lead/update-bank-details/${panNumber}`,
    data
  );
  return res.data;
});

// --------------------------Move to Banking---------------------------------------------------
export const moveToBanking = asyncHandler(async (panNumber, data) => {
  const res = await axiosInstance.post(
    `/lead/movedToBanking/${panNumber}`,
    data
  );
  return res.data;
});

// --------------------------Assign Lead to Employee---------------------------------------------------
export const assignLeadToEmployee = asyncHandler(
  async (panNumber, assignedTo) => {
    const res = await axiosInstance.post(
      `/lead/assigned-lead-to-employee/${panNumber}`,
      {
        assigned_to: assignedTo,
      }
    );
    return res.data;
  }
);

// --------------------------Get Performance Data---------------------------------------------------
export const getPerformanceData = async (startDate, endDate) => {
  try {
    const res = await axiosInstance.get(
      `/lead/get-performance-data/${startDate}/${endDate}`
    );
    return res.data;
  } catch (error) {
    throw error;
  }
};

// --------------------------Get Assigned Leads Data---------------------------------------------------
export const getAssignedFreshLeadsData = async (startDate, endDate) => {
  try {
    const res = await axiosInstance.get(
      `/lead/get-assigned-fresh-leads-data/${startDate}/${endDate}`
    );
    return res.data;
  } catch (error) {
    throw error;
  }
};

// --------------------------Get Assigned Leads Data---------------------------------------------------
export const getAssignedReloanLeadsData = async (startDate, endDate) => {
  try {
    const res = await axiosInstance.get(
      `/lead/get-assigned-reloan-leads-data/${startDate}/${endDate}`
    );
    return res.data;
  } catch (error) {
    throw error;
  }
};

// --------------------------Enable Pincode---------------------------------------------------
export const enablePincode = asyncHandler(async (pincode, state, district) => {
  const res = await axiosInstance.post(`/lead/enablePIN/${pincode}`, {
    state,
    district,
  });
  return res.data;
});

// --------------------------Get All Assigned Leads---------------------------------------------------
export const getAllAssignedLeads = async () => {
  try {
    const res = await axiosInstance.get(`/lead/get-all-assigned-leads`);
    return res.data;
  } catch (error) {
    throw error;
  }
};

// --------------------------Upload Bank Statement---------------------------------------------------
export const uploadBankStatement = async (pan, formData) => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.post(
      `${VITE_BASE_MANUAL_BANKING_URL}/${pan}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        withCredentials: true,
      }
    );
    return res;
  } catch (error) {
    throw error;
  }
};

export const updateNarration = async (data) => {
  try {
    const res = await axiosInstance.post("/admin/update-narration", data);
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const updateIncomeSalaryDate = asyncHandler(async (panNumber, data) => {
  const res = await axiosInstance.post(
    `/lead/update-income-salary-date/${panNumber}`,
    data
  );
  const payload = res.data || {};
  return {
    ...payload,
    success: payload.success !== false,
  };
});

export const getGeofenceWhitelist = async () => {
  const res = await axiosInstance.get("/admin/geofence-whitelist");
  return res.data?.data || [];
};

export const updateGeofenceWhitelistStatus = async ({
  id,
  emp_id,
  is_active,
  allowed_platform,
}) => {
  const res = await axiosInstance.post("/admin/geofence-whitelist/status", {
    id,
    emp_id,
    is_active,
    allowed_platform,
  });
  return res.data;
};

export const addGeofenceWhitelist = async ({
  emp_id,
  reason,
  allowed_platform,
}) => {
  const res = await axiosInstance.post("/admin/geofence-whitelist", {
    emp_id,
    reason,
    allowed_platform,
  });
  return res.data;
};