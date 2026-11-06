import { axiosInstance } from "../api";

export const getAllDisbursal = async ({ page, limit, search_text } = {}) => {
  try {
    const params = { page, limit };
    if (search_text) {
      params.search_text = search_text;
    }
    const res = await axiosInstance.get("/lead/disbursed", { params });
    if (res.status === 200) {
      return res.data;
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from getAllDisbursal----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch disbursal data"
    );
  }
};

export const getPendingManualDisbursal = async ({ page = 1, limit = 10, search_text } = {}) => {
  try {
    const params = { page, limit };
    if (search_text) {
      params.search_text = search_text;
    }
    const res = await axiosInstance.get("/lead/pending-manual-disbursal", { params });
    if (res.status === 200) {
      return res.data;
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from getPendingManualDisbursal----->>>", err);
    throw new Error(
      err.response?.data?.message ||
        err.response?.message ||
        "Failed to fetch pending disbursal data"
    );
  }
};


export const confirmDisbursal = async ({ loan_no, utr }) => {
  try {
    const res = await axiosInstance.post("/lead/disburse-sanctioned-loan", {
      loan_no,
      utr,
    });
    if (res.status === 200 || res.status === 201) {
      return res.data;
    }
    throw new Error(res.statusText || "Failed to confirm disbursal");
  } catch (error) {
    console.log("error from confirmDisbursal----->>>", error);
    throw new Error(
      error.response?.data?.message ||
        error.response?.message ||
        error.message ||
        "Failed to confirm disbursal"
    );
  }
};

export const exportPendingManualDisbursal = async (loanNos = []) => {
  try {
    const loan_nos = Array.isArray(loanNos)
      ? loanNos.filter(Boolean).join(",")
      : String(loanNos || "");

    if (!loan_nos) {
      throw new Error("At least one loan number is required to export");
    }

    const res = await axiosInstance.get("/lead/pending-manual-disbursal/export", {
      params: { loan_nos },
      responseType: "blob",
    });

    const contentType = res.headers?.["content-type"] || "";
    if (contentType.includes("application/json")) {
      const text = await res.data.text();
      const parsed = JSON.parse(text);
      throw new Error(parsed?.message || "Failed to export pending disbursal");
    }

    const disposition = res.headers?.["content-disposition"] || "";
    const matched = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    const filename = matched?.[1]
      ? decodeURIComponent(matched[1].replace(/"/g, ""))
      : `pending-manual-disbursal-${new Date().toISOString().slice(0, 10)}.xlsx`;

    const blob = new Blob([res.data], {
      type:
        contentType ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (err) {
    console.log("error from exportPendingManualDisbursal----->>>", err);
    if (err?.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed?.message || "Failed to export pending disbursal");
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== "Failed to export pending disbursal") {
          throw parseErr;
        }
      }
    }
    throw new Error(
      err.response?.data?.message ||
        err.message ||
        "Failed to export pending disbursal"
    );
  }
};

/** @deprecated Use confirmDisbursal */
export const manualDisbursal = confirmDisbursal;