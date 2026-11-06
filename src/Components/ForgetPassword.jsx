import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useSendOtp, useVerifyOtp, useResetPassword } from "../services/functions/forget-password";

const ForgetPassword = () => {
    const navigate = useNavigate();

    const [stage, setStage] = useState("email"); // email -> otp -> password
    const [formData, setFormData] = useState({
        email: "",
        otp: ["", "", "", "", "", ""],
        newPassword: "",
        confirmPassword: "",
        request_id: "",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [resendTimer, setResendTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    // Password validation regex
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

    // React Query hooks
    const sendOtpMutation = useSendOtp();
    const verifyOtpMutation = useVerifyOtp();
    const resetPasswordMutation = useResetPassword();

    useEffect(() => {
        let timer;
        if (stage === "otp" && resendTimer > 0) {
            timer = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        } else if (resendTimer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(timer);
    }, [stage, resendTimer]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            const response = await sendOtpMutation.mutateAsync({
                email: formData.email,
            });

            setFormData(prev => ({
                ...prev,
                request_id: response.request_id
            }));
            setSuccess("OTP sent successfully!");
            setStage("otp");
        } catch (err) {
            setError(err.message || "Failed to send OTP. Please try again.");
        }
    };

    const handleOtpChange = (e, index) => {
        const value = e.target.value;
        if (value.length <= 1 && /^\d*$/.test(value)) {
            const newOtp = [...formData.otp];
            newOtp[index] = value;
            setFormData({ ...formData, otp: newOtp });

            // Move to next input if current input is filled
            if (value && index < 5) {
                document.getElementById(`otp-${index + 1}`).focus();
            }
        }
    };

    const handleOtpKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`).focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d*$/.test(pastedData)) {
            const newOtp = [...formData.otp];
            pastedData.split('').forEach((digit, index) => {
                if (index < 6) {
                    newOtp[index] = digit;
                }
            });
            setFormData({ ...formData, otp: newOtp });
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            // Convert OTP array to number
            const otpNumber = parseInt(formData.otp.join(''), 10);

            await verifyOtpMutation.mutateAsync({
                email: formData.email,
                otp: otpNumber,
                request_id: formData.request_id
            });

            setSuccess("OTP verified successfully!");
            setStage("password");
        } catch (err) {
            setError(err.message || "Invalid OTP. Please try again.");
        }
    };

    const handleResendOtp = async () => {
        if (!canResend) return;

        setError("");
        setSuccess("");
        setCanResend(false);
        setResendTimer(30);

        try {
            const response = await sendOtpMutation.mutateAsync({
                email: formData.email,
            });

            setFormData(prev => ({
                ...prev,
                request_id: response.request_id,
                otp: ["", "", "", "", "", ""] // Clear OTP fields
            }));
            setSuccess("OTP resent successfully!");
        } catch (err) {
            setError(err.message || "Failed to resend OTP. Please try again.");
            setCanResend(true);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setPasswordError("");

        // Validate password
        if (!passwordRegex.test(formData.newPassword)) {
            setPasswordError("Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character");
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        try {
            await resetPasswordMutation.mutateAsync({
                email: formData.email,
                newPassword: formData.newPassword,
            });

            setSuccess("Password updated successfully!");
            navigate("/login");
        } catch (err) {
            setError(err.message || "Failed to update password. Please try again.");
        }
    };

    const renderEmailForm = () => (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email<span className="text-red-500">*</span>
                </label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 transition-all duration-200"
                    required
                />
            </div>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            {success && <p className="text-sm text-green-500 mt-2">{success}</p>}
            <button
                type="submit"
                className="w-full py-3 px-4 bg-brand text-white font-semibold rounded-xl hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={sendOtpMutation.isPending}
            >
                {sendOtpMutation.isPending ? "Sending OTP..." : "Send OTP"}
            </button>
        </form>
    );

    const renderOtpForm = () => (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                </label>
                <div className="flex justify-center space-x-3">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                            key={index}
                            type="text"
                            id={`otp-${index}`}
                            value={formData.otp[index]}
                            onChange={(e) => handleOtpChange(e, index)}
                            onKeyDown={(e) => handleOtpKeyDown(e, index)}
                            onPaste={handleOtpPaste}
                            maxLength={1}
                            className="w-12 h-12 text-center text-xl border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 transition-all duration-200"
                            required
                        />
                    ))}
                </div>
                <div className="mt-6 text-center">
                    {!canResend ? (
                        <p className="text-sm text-gray-600">
                            Resend OTP in {resendTimer} seconds
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            className="text-sm text-brand-link hover:text-brand-hover font-medium transition-colors duration-200 cursor-pointer"
                            disabled={sendOtpMutation.isPending}
                        >
                            {sendOtpMutation.isPending ? "Resending..." : "Resend OTP"}
                        </button>
                    )}
                </div>
            </div>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            {success && <p className="text-sm text-green-500 mt-2">{success}</p>}
            <button
                type="submit"
                className="w-full py-3 px-4 bg-brand text-white font-semibold rounded-xl hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={verifyOtpMutation.isPending}
            >
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify OTP"}
            </button>
        </form>
    );

    const renderPasswordForm = () => (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        id="newPassword"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        placeholder="Enter new password"
                        className={`w-full mt-1 px-4 py-3 border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded-lg bg-white focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 transition-all duration-200`}
                        required
                    />
                    <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            <EyeOff className="w-5 h-5" /> 
                        ) : (
                            <Eye className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {passwordError && (
                    <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                )}
            </div>
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                </label>
                <div className="relative">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm new password"
                        className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 transition-all duration-200"
                        required
                    />
                    <button
                        type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200 cursor-pointer"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                        {showConfirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                        ) : (
                            <Eye className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            {success && <p className="text-sm text-green-500 mt-2">{success}</p>}
            <button
                type="submit"
                className="w-full py-3 px-4 bg-brand text-white font-semibold rounded-xl hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={resetPasswordMutation.isPending}
            >
                {resetPasswordMutation.isPending ? "Updating..." : "Update Password"}
            </button>
        </form>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-dark via-[#1A1A1A] to-brand-muted">
            <div className="w-full max-w-md p-8 bg-white shadow-[0_8px_30px_rgba(26,26,26,0.18)] rounded-2xl backdrop-blur-sm border border-gray-100">
                <div className="flex items-center justify-center mb-8">
                    <img src="/images/product-logo.png" alt="The Loan Junction" className="h-16 rounded-xl object-contain" />
                </div>
                <h2 className="text-2xl font-bold text-center text-brand-dark mb-8">
                    {stage === "email" && "Forgot Password"}
                    {stage === "otp" && "Verify OTP"}
                    {stage === "password" && "Reset Password"}
                </h2>
                {stage === "email" && renderEmailForm()}
                {stage === "otp" && renderOtpForm()}
                {stage === "password" && renderPasswordForm()}
            {/* <StatusPage status={status} /> */}
            <button onClick={() => navigate("/login")} className="flex items-center gap-2 mt-5 text-sm text-brand-link hover:text-brand-hover font-medium transition-colors duration-200 cursor-pointer" >
                <ArrowLeft className="w-5 h-5" />
                Back to Login</button>
            </div>
        </div>
    );
};

export default ForgetPassword;