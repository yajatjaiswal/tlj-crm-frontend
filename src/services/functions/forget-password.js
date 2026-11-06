import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "../../services/api";

// API functions
export const sendOtp = async ({ email }) => {
    try {
        const response = await axiosInstance.post("/employee/send-otp", {
            email,
        });
        return response.data;
    } catch (error) {
        console.log("error from sendOtp----->>>", error);
        throw new Error(error.response?.data?.message || "Failed to send OTP");
    }
};

export const verifyOtp = async ({ email, otp, request_id }) => {
    try {
        const response = await axiosInstance.post("/employee/verify-otp", {
            email,
            otp,
            request_id,
        });
        return response.data;
    } catch (error) {
        console.log("error from verifyOtp----->>>", error);
        throw new Error(error.response?.data?.message || "Invalid OTP");
    }
};

export const resetPassword = async ({ email, newPassword }) => {
    try {
        const response = await axiosInstance.put("/employee/change-password", {
            email,
            newpassword: newPassword,
        });
        return response.data;
    } catch (error) {
        console.log("error from resetPassword----->>>", error);
        throw new Error(error.response?.data?.message || "Failed to reset password");
    }
};

// React Query hooks
export const useSendOtp = () => {
    return useMutation({
        mutationFn: sendOtp,
    });
};

export const useVerifyOtp = () => {
    return useMutation({
        mutationFn: verifyOtp,
    });
};

export const useResetPassword = () => {
    return useMutation({
        mutationFn: resetPassword,
    });
}; 
