import { axiosInstance } from "../api";

export const signIn = async ({ email, password, latitude, longitude, location }) => {
  try {
    const res = await axiosInstance.post("/employee/login", {
      email,
      password,
      latitude,
      longitude,
      location,
    });

    return res.data;
  } catch (err) {
    console.log("error from signIn----->>>", err);
    throw new Error(err.res.message);
  }
};

export const getProfile = async () => {
  try {
    const res = await axiosInstance.get("/employee/profile");
    if (res.status === 200) {
      return res.data;
    }
  } catch (err) {
    console.log("error from getProfile----->>>", err);
    if (err.response && err.response.stats === 401) {
      throw new Error("Not authorized");
    }
    throw new Error(err.response?.data?.message || "An error occurred");
  }
};

export const logout = async () => {
  try {
    const res = await axiosInstance.post("/employee/logout");
    return res.data;
  } catch (err) {
    console.log("error from logout----->>>", err);
    throw new Error(err.message);
  }
};

export const changePassword = async ({ email, newPassword }) => {
  try {
    const res = await axiosInstance.put("/employee/change-password", {
      email,
      newpassword: newPassword,
    });
    return res.data;
  } catch (err) {
    console.log("error from changePassword----->>>", err);
    throw new Error(err.response?.data?.message || "Failed to change password");
  }
};

export const applyLeave = async (leaveData) => {
  try {
    const res = await axiosInstance.post("/employee/apply-leave", leaveData);
    return res.data;
  } catch (err) {
    console.log("error from applyLeave----->>>", err);
    throw new Error(err.response?.data?.message || "Failed to apply leave");
  }
};

export const getEmployeeTeamWis = async () => {
  try {
    const res = await axiosInstance.get("/employee/get-employee-team-wise");
    return res.data;
  } catch (err) {
    console.log("error from getEmployeeTeamWise----->>>", err);
    throw new Error(
      err.response?.data?.message || "Failed to fetch employee team data"
    );
  }
};
