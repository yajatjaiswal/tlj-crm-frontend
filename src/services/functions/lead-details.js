import { axiosInstance } from "../api";


export const getCustomerDetailsById = async (id) => {
  try {
    const response = await axiosInstance.get(`/lead/customer-detail/${id}`);
    if (response.status === 200) {
      return response.data;
    }
  } catch (err) {
    console.log("error from getCustomerDetailsById----->>>", err);
    throw new Error(err.response.message || "Error fetching lead data");
  }
};

// Hold/Unhold a new lead with a specific remark
export const holdNewLeadWithRemark = async ({ id, remarks, category }) => {
  try {
    const response = await axiosInstance.post(`/lead/hold-unhold-new-lead/${id}?category=${category}`, {
      id,
      remarks,
    });
    if (response.status === 200) {
      return response.data;
    }
  } catch (err) {
    console.log("error from holdNewLeadWithRemark----->>>", err);
    throw new Error(err.response?.message || "Error holding lead");
  }
};

export const updateBankDetails = async (id, data) => {
  try {
    const response = await axiosInstance.put(`/lead/bank-details/${id}`, data);
    return response.data;
  } catch (err) {
    console.log("error from updateBankDetails----->>>", err);
    throw new Error(err.response.message || "Error updating bank details");
  }
};
export const getLoanDetailsById = async (id) => {
  try {
    const response = await axiosInstance.get(`/lead/loan-details/${id}`);
    if (response.status === 200) {
      return response.data.data;
    }
  } catch (err) {
    console.log("error from getLoanDetailsById----->>>", err);
    throw new Error(err.response.message || "Error fetching loan data");
  }
};

export const getBankDetailsById = async (id) => {
  try {
    const response = await axiosInstance.get(`/lead/bank-details/${id}`);
    if (response.status === 200) {
      // Return full array of bank details instead of only the first element
      return response.data?.data || [];
    }
  } catch (err) {
    console.log("error from getBankDetailsById----->>>", err);
    throw new Error(err.response.message || "Error fetching bank data");
  }
};



export const getThirdPartyApiData = async (id, api_type) => {
  try {
    const response = await axiosInstance.get(
      `/lead/third-party-api-data/${id}?api_type=${api_type}`
    );

    if (response.status === 200) {
      return response.data;
    }
  } catch (err) {
    console.log("error from getThirdPartyApiData----->>>", err);
    throw new Error(err.response.message || "Error fetching data");
  }
};

export const getLeadLogsById = async (id) => {
  try {
    const response = await axiosInstance.get(`/lead/lead-logs/${id}`);

    if (response.status === 200) {
      return response.data.data;
    }
  } catch (err) {
    console.log("error from getLeadLogsById----->>>", err);
    throw new Error(err.response.message || "Error fetching log data");
  }
};

export const getDocumentById = async (id) => {
  try {
    const response = await axiosInstance.get(`/lead/documents/${id}`);
    if (response.status === 200) {
      return response.data.data;
    }
  } catch (err) {
    console.log("error from getDocumentById----->>>", err);
    throw new Error(err.response.message || "Error fetching document data");
  }
};

export const getDocumentByLink = async (document_url) => {
  try {
    const response = await axiosInstance.get(`/lead/generate-presigned-url?document_url=${document_url}`);
    return response.data;
  } catch (err) { 
    console.log("error from getDocumentByLink----->>>", err);
    throw new Error(err.response.message || "Error fetching document link data");
  }
};


export const getAddressById = async (id) => {
  try {
    const response = await axiosInstance.get(`/lead/address/${id}`);
    return response.data.data;
  } catch (err) {
    console.log("error from getAddressById----->>>", err);
    throw new Error(err.response.message || "Error fetching address data");
  }
};

export const getMobileNumberByPan = async (pan) => {
  try {
    const response = await axiosInstance.get(`/lead/getMobileNumber/${pan}`);
    if (response.status === 200) {
      return response.data;
    }
  } catch (err) {
    console.log("error from getMobileNumberByPan----->>>", err);
    throw new Error(err.response?.message || "Error fetching mobile number data");
  }
};

export const getReferenceById = async (id) => {
  try {
    const response = await axiosInstance.get(`/lead/getReference/${id}`);
    console.log("response from getReferenceById----->>>", response);
    if (response.status === 200) {
      return response?.data?.referenceDetails;
    }
  } catch (err) {
    console.log("error from getReferenceById----->>>", err);
    throw new Error(err.response?.message || "Error fetching reference data");
  }
};

// Fetch KYC Audit Details by lead id
export const getKycAuditDetailsById = async (id) => {
  try {
    const response = await axiosInstance.get(`/lead/get-audit-details/${id}`);
    if (response.status === 200) {
      return response.data?.data;
    }
  } catch (err) {
    console.log("error from getKycAuditDetailsById----->>>", err);
    throw new Error(err.response?.message || "Error fetching KYC audit details");
  }
};

export const getRepaymentDates = async (id) => {
  try {
    const response = await axiosInstance.get(`/lead/repayment-dates/${id}`);
    if (response.status === 200) {
      return response.data;
    }
  } catch (err) {
    console.log("error from getRepaymentDates----->>>", err);
    throw new Error(err.response?.message || "Error fetching repayment dates");
  }
};

export const updateRepaymentDate = async ({ id, repaymentDate }) => {
  try {
    const response = await axiosInstance.post(`/lead/update-repayment-date/${id}`, { repaymentDate });
    if (response.status === 200) {
      return response.data;
    }
  } catch (err) {
    console.log("error from updateRepaymentDate----->>>", err);
    throw new Error(err.response?.message || "Error updating repayment date");
  }
};

