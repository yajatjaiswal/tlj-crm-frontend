import { axiosInstance } from "../api";

export function getDevTabErrorMessage(err) {
  const errors = err?.response?.data?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      return first.message || first.msg || JSON.stringify(first);
    }
  }
  return err?.response?.data?.message || err?.message || "Request failed";
}

export async function getMyDevTabTables() {
  const res = await axiosInstance.get("/devTab/my-tables");
  return res.data.data;
}

export async function getDevTabRecords(pan, tables) {
  const params = { pan };
  if (Array.isArray(tables) && tables.length) {
    params.tables = tables.join(",");
  }
  const res = await axiosInstance.get("/devTab/records", { params });
  return res.data.data;
}

export async function getDevTabTableRecords(tableKey, { pan, page, limit } = {}) {
  const res = await axiosInstance.get(`/devTab/records/${tableKey}`, {
    params: { pan, page, limit },
  });
  return res.data;
}

export async function patchDevTabRecord(tableKey, id, body) {
  return axiosInstance.patch(`/devTab/records/${tableKey}/${id}`, body);
}

export async function getDevTabAuditLog(params = {}) {
  const res = await axiosInstance.get("/devTab/audit-log", { params });
  return res.data;
}

export async function getDevTabRegistry() {
  const res = await axiosInstance.get("/devTab/registry");
  return res.data.data;
}

export async function getDevTabGrants({ page, limit = 100 } = {}) {
  const res = await axiosInstance.get("/devTab/grants", {
    params: { page, limit },
  });
  return res.data;
}

export async function postDevTabGrants(body) {
  return axiosInstance.post("/devTab/grants", body);
}

export async function deleteDevTabGrant(body) {
  return axiosInstance.delete("/devTab/grants", { data: body });
}

export async function deleteDevTabGrantsById(id) {
  return axiosInstance.delete(`/devTab/grants/${id}`);
}
