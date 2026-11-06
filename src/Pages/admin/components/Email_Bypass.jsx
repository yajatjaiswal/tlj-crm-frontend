import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import toast from "react-hot-toast";
import { Mail, AlertCircle, Sparkles, X } from "lucide-react";
import { emailBypassUpdate as emailBypassUpdateService } from "../../../services/functions/admin";

// PAN validation helpers
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const validatePAN = (pan) => {
  if (!pan) return "";
  if (!PAN_REGEX.test(pan)) {
    return "PAN must be in format: ABCDE1234F (5 letters + 4 digits + 1 letter)";
  }
  return "";
};

const formatPAN = (value) => {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length > 10) return cleaned.slice(0, 10);
  return cleaned;
};

// Extract PAN, emails from message
const extractDataFromMessage = (message) => {
  const extracted = {
    panNumber: "",
    official_email: "",
    personal_email: "",
  };

  if (!message) return extracted;

  // Extract PAN number (10 alphanumeric characters, typically in format ABCDE1234F)
  // Try multiple patterns to handle different formats and separators
  const panPatterns = [
    // Standard format with word boundaries: ABCDE1234F (10 chars)
    /\b([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})\b/,
    // PAN adjacent to tabs, spaces, or other characters (10 chars)
    /[^A-Za-z0-9]([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})(?![A-Za-z0-9])/,
    // PAN at start of line or string (10 chars)
    /^([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})(?![A-Za-z0-9])/m,
    // PAN with optional spaces/dashes in between (10 chars)
    /([A-Za-z]{5}[\s-]?[0-9]{4}[\s-]?[A-Za-z]{1})(?![A-Za-z0-9])/,
    // Fallback: 9-character PAN (5 letters + 4 digits) - might be missing last letter
    /\b([A-Za-z]{5}[0-9]{4})\b(?![A-Za-z])/,
    // 9-character PAN with separators
    /[^A-Za-z0-9]([A-Za-z]{5}[0-9]{4})(?![A-Za-z0-9])/
  ];

  for (const pattern of panPatterns) {
    const panMatch = message.match(pattern);
    if (panMatch) {
      // Extract the PAN from the match (could be in group 1 or the full match)
      const pan = panMatch[1] || panMatch[0];
      // Clean up any spaces or dashes
      const cleanedPan = pan.replace(/[\s-]/g, '').toUpperCase();
      // Accept if it's 9 or 10 characters (validation will catch if it's not 10)
      if (cleanedPan.length >= 9 && cleanedPan.length <= 10) {
        extracted.panNumber = formatPAN(cleanedPan);
        break;
      }
    }
  }

  // Personal email domains list
  const personalEmailDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 
    'aol.com', 'protonmail.com', 'yandex.com', 'mail.com', 'zoho.com', 
    'icloud.com', 'rocketmail.com', 'gmx.com', 'tutanota.com', 
    'rediffmail.com', 'rediff.com',
    'gmail.net', 'yahoo.net', 'hotmail.net', 'outlook.net',
    'gmail.co.in', 'yahoo.co.in', 'hotmail.co.in', 'outlook.co.in',
    'gmail.in', 'yahoo.in', 'hotmail.in', 'outlook.in',
    'gmail.org', 'yahoo.org', 'hotmail.org', 'outlook.org'
  ];

  // Personal email regex for matching
  const personal_email_regex =
    /@(?:gmail|yahoo|hotmail|outlook|live|aol|protonmail|yandex|mail|zoho|icloud|rocketmail|gmx|tutanota|rediffmail|rediff)\.(?:com|net|org|co\.in|in|uk|de|fr|es|biz|info)/i;

  // Extract all email addresses from message
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
  const allEmails = message.match(emailRegex) || [];

  // Helper function to check if email is personal
  const isPersonalEmail = (email) => {
    const emailLower = email.toLowerCase();
    // Check against regex
    if (personal_email_regex.test(emailLower)) {
      return true;
    }
    // Also check against domain list for exact matches
    const domain = emailLower.split('@')[1];
    return personalEmailDomains.includes(domain);
  };

  // Classify emails as official or personal
  for (const email of allEmails) {
    const emailLower = email.toLowerCase().trim();
    
    // Skip if empty
    if (!emailLower) continue;
    
    // Check if it's a personal email
    if (isPersonalEmail(emailLower)) {
      if (!extracted.personal_email) {
        extracted.personal_email = emailLower;
      }
    } else {
      // If not personal, it's an official email
      if (!extracted.official_email) {
        extracted.official_email = emailLower;
      }
    }
  }

  // If official email not found but we have emails, use first non-personal email
  if (!extracted.official_email && allEmails.length > 0) {
    for (const email of allEmails) {
      const emailLower = email.toLowerCase().trim();
      if (!isPersonalEmail(emailLower)) {
        extracted.official_email = emailLower;
        break;
      }
    }
  }

  return extracted;
};

const EmailBypass = forwardRef(({ isSelected = false }, ref) => {
  const [emailBypassForm, setEmailBypassForm] = useState({
    panNumber: "",
    official_email: "",
    personal_email: "",
    externalRemarks: "Email ID bypassed as per request",
    is_update_only: false,
  });
  const [isLoadingEmailBypass, setIsLoadingEmailBypass] = useState(false);
  const [panError, setPanError] = useState("");
  const [messageText, setMessageText] = useState("");
  const messageInputRef = useRef(null);

  const handleEmailBypassInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "panNumber") {
      const formattedValue = formatPAN(value);
      const error = validatePAN(formattedValue);
      setEmailBypassForm((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
      setPanError(error);
    } else {
      setEmailBypassForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleEmailBypassSubmit = async () => {
    const panValidationError = validatePAN(emailBypassForm.panNumber);
    if (panValidationError) {
      toast.error(panValidationError);
      return { success: false, error: panValidationError };
    }

    if (!emailBypassForm.panNumber.trim()) {
      toast.error("Please enter PAN number");
      return { success: false, error: "Please enter PAN number" };
    }
    if (!emailBypassForm.official_email.trim()) {
      toast.error("Please enter official email");
      return { success: false, error: "Please enter official email" };
    }
    if (!emailBypassForm.externalRemarks.trim()) {
      toast.error("Please enter external remarks");
      return { success: false, error: "Please enter external remarks" };
    }

    setIsLoadingEmailBypass(true);

    const formData = new FormData();
    formData.append("official_email", emailBypassForm.official_email.trim());
    formData.append("externalRemarks", emailBypassForm.externalRemarks.trim());
    if (emailBypassForm.personal_email.trim()) {
      formData.append("personal_email", emailBypassForm.personal_email.trim());
    }

    try {
      const response = await emailBypassUpdateService(
        emailBypassForm.panNumber.trim(),
        formData,
        emailBypassForm.is_update_only
      );

      if (response) {
        if (response.success || response.status === 'success' || (response.data && response.data.success)) {
          const message = response.message || response.data?.message || "Email bypassed successfully!";
          setEmailBypassForm({
            panNumber: "",
            official_email: "",
            personal_email: "",
            externalRemarks: "Email ID bypassed as per request",
            is_update_only: false,
          });
          setPanError("");
          setMessageText("");
          setIsLoadingEmailBypass(false);
          return { success: true, message };
        } else {
          const errorMsg = response.message || response.data?.message || response.error || "Failed to bypass email";
          setIsLoadingEmailBypass(false);
          return { success: false, error: errorMsg };
        }
      } else {
        setIsLoadingEmailBypass(false);
        return { success: false, error: "No response from server" };
      }
    } catch (error) {
      console.error("Email Bypass Error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to bypass email";
      setIsLoadingEmailBypass(false);
      return { success: false, error: errorMessage };
    }
  };

  // Expose form data and submit handler to parent
  useImperativeHandle(ref, () => ({
    getFormData: () => emailBypassForm,
    submit: handleEmailBypassSubmit,
    isLoading: isLoadingEmailBypass,
    clearForm: handleClearForm
  }));

  const handleClearForm = () => {
    setEmailBypassForm({
      panNumber: "",
      official_email: "",
      personal_email: "",
      externalRemarks: "Email ID bypassed as per request",
      is_update_only: false,
    });
    setPanError("");
    setMessageText("");
  };

  // Auto-focus message input textarea when component is selected
  useEffect(() => {
    if (isSelected) {
      // Small delay to ensure the textarea is rendered
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 150);
    }
  }, [isSelected]);

  // Only show form when selected
  if (!isSelected) {
    return null;
  }

  return (
    <>
      {/* Message Extract Section */}
      <div className="bg-gradient-to-r from-brand-extra-light to-brand-light rounded-lg md:rounded-xl p-4 md:p-6 border border-brand/40 mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Mail className="w-4 h-4 inline mr-2 text-brand-link" />
          Paste Message to Auto-Fill
        </label>
        <div className="space-y-3">
          <textarea
            ref={messageInputRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Paste message here (e.g., BLLEAD00034258 Maulik Navin Kakka 9699555748 BHFPK0144J official mail id Maulik.Kakka@jll.com Personal mail id maulik.kakka@gmail.com)"
            rows={3}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-brand/50 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/90 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base resize-vertical"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                const extracted = extractDataFromMessage(messageText);
                if (extracted.panNumber) {
                  const formattedPan = formatPAN(extracted.panNumber);
                  const error = validatePAN(formattedPan);
                  setEmailBypassForm((prev) => ({
                    ...prev,
                    panNumber: formattedPan,
                    official_email: extracted.official_email || prev.official_email,
                    personal_email: extracted.personal_email || prev.personal_email,
                  }));
                  setPanError(error);
                  if (extracted.panNumber && extracted.official_email) {
                    toast.success("Data extracted and filled successfully!");
                  } else {
                    toast.success("Partial data extracted. Please check and fill remaining fields.");
                  }
                } else {
                  toast.error("Could not extract PAN number from message. Please check the format.");
                }
              }}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-lg md:rounded-xl hover:from-brand-hover hover:to-brand-hover transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Extract & Auto-Fill</span>
            </button>
            <button
              type="button"
              onClick={() => setMessageText("")}
              className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg md:rounded-xl hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            💡 The parser will extract PAN, Official Email, and Personal Email from your message
          </p>
        </div>
      </div>

      {/* Email Bypass Form */}
      <div className="space-y-4 md:space-y-6">
        {/* Row 1: PAN Number (Left) and Official Email (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* PAN Number */}
          <div className="space-y-2">
            <label htmlFor="emailBypassPanNumber" className="block text-sm font-semibold text-gray-700">
              PAN Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="emailBypassPanNumber"
                name="panNumber"
                value={emailBypassForm.panNumber}
                onChange={handleEmailBypassInputChange}
                placeholder="Enter PAN number (e.g., ABCDE1234F)"
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base font-mono ${panError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                required
                maxLength={10}
              />
            </div>
            {panError && (
              <div className="text-red-500 text-xs sm:text-sm flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{panError}</span>
              </div>
            )}
          </div>

          {/* Official Email */}
          <div className="space-y-2">
            <label htmlFor="official_email" className="block text-sm font-semibold text-gray-700">
              Official Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="official_email"
              name="official_email"
              value={emailBypassForm.official_email}
              onChange={handleEmailBypassInputChange}
              placeholder="Enter official email address"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
              required
            />
          </div>
        </div>

        {/* Row 2: Personal Email (Left) and External Remarks (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Personal Email (Optional) */}
          <div className="space-y-2">
            <label htmlFor="personal_email" className="block text-sm font-semibold text-gray-700">
              Personal Email <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="email"
              id="personal_email"
              name="personal_email"
              value={emailBypassForm.personal_email}
              onChange={handleEmailBypassInputChange}
              placeholder="Enter personal email address (optional)"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
            />
          </div>

          {/* External Remarks */}
          <div className="space-y-2">
            <label htmlFor="externalRemarks" className="block text-sm font-semibold text-gray-700">
              External Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              id="externalRemarks"
              name="externalRemarks"
              value={emailBypassForm.externalRemarks}
              onChange={handleEmailBypassInputChange}
              placeholder="Enter remarks for this bypass action"
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-vertical text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
              required
            />
          </div>
        </div> 

        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="is_update_only"
              checked={emailBypassForm.is_update_only}
              onChange={(e) =>
                setEmailBypassForm((prev) => ({
                  ...prev,
                  is_update_only: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-brand-link focus:ring-brand"
            />
            <span className="text-sm font-semibold text-gray-700">
              Update Only
            </span>
          </label>
        </div>

      </div>
    </>
  );
});

EmailBypass.displayName = 'EmailBypass';

export default EmailBypass;