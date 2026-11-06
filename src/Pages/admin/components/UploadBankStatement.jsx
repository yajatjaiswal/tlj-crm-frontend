import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import toast from "react-hot-toast";
import { Upload, File, Lock, X, AlertCircle, CheckCircle, Eye } from "lucide-react";
import { uploadBankStatement } from "../../../services/functions/admin";

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

// Fraud indicators we care about
const FRAUD_INDICATORS_TO_CHECK = [
  "More and frequent Cash Deposit than Salary ",
  "Immediate big transactions after Salary Credits ",
  "Bulk debit swipes post salary (90% credit) ",
  "Bulk debit swipes post salary (80% credit) ",
  "Bulk debit swipes post salary (70% credit) ",
];

const UploadBankStatement = forwardRef(({ isSelected }, ref) => {
  const [panNumber, setPanNumber] = useState("");
  const [panError, setPanError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [proceedWithFraudConsent, setProceedWithFraudConsent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrorResponse, setShowErrorResponse] = useState(false);
  const [errorResponseData, setErrorResponseData] = useState(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    submit: async () => {
      return handleSubmit();
    },
    clearForm: () => {
      setPanNumber("");
      setPanError("");
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setSelectedFile(null);
      setPassword("");
      setRemarks("");
      setProceedWithFraudConsent(false);
      setErrorMessage("");
      setMessageInput("");
      setShowPreview(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  }));

  const handlePANChange = (e) => {
    const value = e.target.value;
    const formattedValue = formatPAN(value);
    const error = validatePAN(formattedValue);
    setPanNumber(formattedValue);
    setPanError(error);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL for the file
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Check if file type can be previewed
  const canPreviewFile = (file) => {
    if (!file) return false;
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // PDF files can be previewed
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      return true;
    }
    
    // Image files can be previewed
    if (fileType.startsWith("image/")) {
      return true;
    }
    
    // Excel and CSV files - we can try to show them but might need special handling
    if (
      fileType.includes("spreadsheet") ||
      fileType.includes("excel") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".csv")
    ) {
      return false; // Excel/CSV preview is complex, skip for now
    }
    
    return false;
  };

  const formatRemarksFromFraudIndicators = (fraudIndicatorsArray) => {
    const matchedIndicators = [];
    
    // fraudIndicatorsArray is an array of objects with name, transactions, etc.
    if (!Array.isArray(fraudIndicatorsArray)) {
      return "";
    }
    
    fraudIndicatorsArray.forEach((indicator) => {
      const indicatorName = indicator.name;
      // Check if this indicator is one we care about
      if (FRAUD_INDICATORS_TO_CHECK.includes(indicatorName)) {
        // Check if transactions array exists and has length > 0
        if (indicator.transactions && Array.isArray(indicator.transactions) && indicator.transactions.length > 0) {
          matchedIndicators.push(indicatorName);
        }
      }
    });

    if (matchedIndicators.length === 0) {
      return "";
    }

    // Format as numbered list
    return matchedIndicators.map((name, index) => `${index + 1}. ${name.trim()}`).join("\n");
  };

  /** All fraud indicator `name` values from the API (for remarks / consent payload). */
  const formatRemarksFromAllFraudIndicatorNames = (fraudIndicatorsArray) => {
    if (!Array.isArray(fraudIndicatorsArray)) {
      return "";
    }
    const names = fraudIndicatorsArray
      .map((indicator) =>
        indicator && typeof indicator.name === "string" ? indicator.name.trim() : ""
      )
      .filter(Boolean);
    if (names.length === 0) {
      return "";
    }
    return names.map((name, index) => `${index + 1}. ${name}`).join("\n");
  };

  // Helper function to format error message from API response
  const formatErrorMessage = (responseData) => {
    const parts = [];
    if (responseData?.message) {
      parts.push(responseData.message);
    }
    if (responseData?.error) {
      parts.push(responseData.error);
    }
    return parts.length > 0 ? parts.join(" - ") : "Failed to upload bank statement";
  };

  // Parse message to extract PAN and password
  const parseMessage = (message) => {
    const extracted = {
      pan: "",
      password: "",
    };

    if (!message || !message.trim()) {
      return extracted;
    }

    // Extract PAN (format: 5 letters + 4 digits + 1 letter) - case insensitive
    const panPatterns = [
      // Standard format with word boundaries: ABCDE1234F
      /\b([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})\b/,
      // PAN adjacent to tabs, spaces, or other characters
      /[^A-Za-z0-9]([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})(?![A-Za-z0-9])/,
      // PAN at start of line or string
      /^([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})(?![A-Za-z0-9])/m,
    ];

    for (const pattern of panPatterns) {
      const panMatch = message.match(pattern);
      if (panMatch) {
        const pan = panMatch[1] || panMatch[0];
        extracted.pan = pan.toUpperCase();
        break;
      }
    }

    // Extract password - handle various formats
    const passwordPatterns = [
      // "Password 9008284584" or "password 9008284584"
      /(?:^|\s)(?:Password|password)[\s:]*[-]?\s*([A-Za-z0-9]+)\b/i,
      // "password- 337415180" or "Password - PRATY17011999"
      /(?:Password|password)[\s:]*[-]\s*([A-Za-z0-9]+)\b/i,
      // "53510824336 password" (password before the word)
      /\b([A-Za-z0-9]{6,})\s+(?:password|Password)\b/i,
      // "PEEYO20011995" on its own line (standalone password)
      /^([A-Za-z0-9]{6,})\s*$/m,
      // Password after colon or dash
      /(?:password|Password)[\s:]*[-]?\s*([A-Za-z0-9]+)/i,
    ];

    for (const pattern of passwordPatterns) {
      const passwordMatch = message.match(pattern);
      if (passwordMatch && passwordMatch[1]) {
        const extractedPassword = passwordMatch[1].trim();
        // Validate password is reasonable length (at least 4 characters, not too long)
        if (extractedPassword.length >= 4 && extractedPassword.length <= 50) {
          // Make sure it's not a PAN number
          if (!PAN_REGEX.test(extractedPassword)) {
            extracted.password = extractedPassword;
            break;
          }
        }
      }
    }

    // Fallback: Look for standalone alphanumeric strings that might be passwords
    // (on their own line or after "password" keyword)
    if (!extracted.password) {
      const lines = message.split(/\n/);
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Check if line is just a password-like string (6+ alphanumeric chars, not a PAN)
        if (/^[A-Za-z0-9]{6,}$/.test(trimmedLine) && !PAN_REGEX.test(trimmedLine)) {
          // Check if it's not a phone number (10 digits)
          if (!/^\d{10}$/.test(trimmedLine)) {
            extracted.password = trimmedLine;
            break;
          }
        }
      }
    }

    return extracted;
  };

  // Handle message parsing and auto-fill form
  const handleParseMessage = () => {
    if (!messageInput.trim()) {
      toast.error("Please paste a message to parse");
      return;
    }

    const extracted = parseMessage(messageInput);

    if (!extracted.pan && !extracted.password) {
      toast.error("Could not extract PAN or password from the message");
      return;
    }

    // Update form data with extracted values
    if (extracted.pan) {
      const formattedPAN = formatPAN(extracted.pan);
      const error = validatePAN(formattedPAN);
      setPanNumber(formattedPAN);
      setPanError(error);
      if (error) {
        toast.error(error);
      }
    }

    if (extracted.password) {
      setPassword(extracted.password);
    }

    // Show success message
    const extractedFields = [];
    if (extracted.pan) extractedFields.push("PAN");
    if (extracted.password) extractedFields.push("Password");

    if (extractedFields.length > 0) {
      toast.success(`Extracted: ${extractedFields.join(", ")}`);
    } else {
      toast.error("Could not extract any information from the message");
    }
  };

  const handleSubmit = async () => {
    // Validate PAN
    if (!panNumber.trim()) {
      toast.error("Please enter PAN number");
      setPanError("PAN number is required");
      return { success: false, error: "PAN number is required" };
    }

    const panValidationError = validatePAN(panNumber);
    if (panValidationError) {
      toast.error(panValidationError);
      setPanError(panValidationError);
      return { success: false, error: panValidationError };
    }

    // Validate file
    if (!selectedFile) {
      toast.error("Please select a bank statement file");
      return { success: false, error: "Please select a bank statement file" };
    }

    setIsLoading(true);
    setErrorMessage(""); // Clear previous error

    try {
      // First submission
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (password.trim()) {
        formData.append("password", password.trim());
      }
      // Include remarks and fraud consent if provided
      if (remarks.trim()) {
        formData.append("remarks", remarks.trim());
      }
      if (proceedWithFraudConsent) {
        formData.append("proceed_with_fraud_consent", "true");
      }

      const response = await uploadBankStatement(panNumber.trim(), formData);
      
      // If status is 200, success
      if (response.status === 200) {
        toast.success("Bank statement uploaded successfully!");
        return { success: true, message: "Bank statement uploaded successfully!" };
      }

      // If status is 400, check for fraud indicators
      if (response.status === 400) {
        const responseData = response.data;
        
        // Check if fraud_indicators array exists
        if (
          responseData?.fraud_indicators &&
          Array.isArray(responseData.fraud_indicators) &&
          responseData.fraud_indicators.length > 0
        ) {
          const fraudIndicators = responseData.fraud_indicators;
          const allFraudRemarks = formatRemarksFromAllFraudIndicatorNames(fraudIndicators);
          if (allFraudRemarks) {
            setRemarks(allFraudRemarks);
          }
          const formattedRemarks = formatRemarksFromFraudIndicators(fraudIndicators);
          const remarksForConsent = allFraudRemarks || formattedRemarks;

          // If we have matched fraud indicators, re-submit with consent
          if (formattedRemarks) {
            // Re-submit with fraud consent
            const resubmitFormData = new FormData();
            resubmitFormData.append("file", selectedFile);
            if (password.trim()) {
              resubmitFormData.append("password", password.trim());
            }
            resubmitFormData.append("remarks", remarksForConsent);
            resubmitFormData.append("proceed_with_fraud_consent", "true");

            try {
              const resubmitResponse = await uploadBankStatement(panNumber.trim(), resubmitFormData);
              
              if (resubmitResponse.status === 200) {
                toast.success("Bank statement uploaded successfully with fraud consent!");
                return {
                  success: true,
                  message: "Bank statement uploaded successfully with fraud consent!",
                };
              } else {
                const errorMsg = "Failed to upload bank statement after fraud consent";
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
                return {
                  success: false,
                  error: errorMsg,
                };
              }
            } catch (resubmitError) {
              console.error("Error re-submitting with fraud consent:", resubmitError);
              const errorMsg = resubmitError.response?.data 
                ? formatErrorMessage(resubmitError.response.data)
                : (resubmitError.message || "Failed to upload bank statement");
              setErrorMessage(errorMsg);
              toast.error(errorMsg);
              return {
                success: false,
                error: errorMsg,
              };
            }
          } else {
            // No matching fraud indicators, show full response in modal
            setErrorResponseData(responseData);
            setShowErrorResponse(true);
            const errorMsg = formatErrorMessage(responseData);
            setErrorMessage(errorMsg);
            toast.error(errorMsg);
            return {
              success: false,
              error: errorMsg,
            };
          }
        } else {
          // No fraud indicators structure, return error (e.g., password error)
          const errorMsg = formatErrorMessage(responseData);
          setErrorMessage(errorMsg);
          toast.error(errorMsg);
          return {
            success: false,
            error: errorMsg,
          };
        }
      }

      // Other status codes
      const errorMsg = response.data ? formatErrorMessage(response.data) : "Failed to upload bank statement";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } catch (error) {
      console.error("Error uploading bank statement:", error);
      
      // Handle 400 status with fraud indicators in catch block
      if (error.response?.status === 400) {
        const responseData = error.response.data;
        
        // Check if fraud_indicators array exists
        if (
          responseData?.fraud_indicators &&
          Array.isArray(responseData.fraud_indicators) &&
          responseData.fraud_indicators.length > 0
        ) {
          const fraudIndicators = responseData.fraud_indicators;
          const allFraudRemarks = formatRemarksFromAllFraudIndicatorNames(fraudIndicators);
          if (allFraudRemarks) {
            setRemarks(allFraudRemarks);
          }
          const formattedRemarks = formatRemarksFromFraudIndicators(fraudIndicators);
          const remarksForConsent = allFraudRemarks || formattedRemarks;

          if (formattedRemarks) {
            // Re-submit with fraud consent
            const resubmitFormData = new FormData();
            resubmitFormData.append("file", selectedFile);
            if (password.trim()) {
              resubmitFormData.append("password", password.trim());
            }
            resubmitFormData.append("remarks", remarksForConsent);
            resubmitFormData.append("proceed_with_fraud_consent", "true");

            try {
              const resubmitResponse = await uploadBankStatement(panNumber.trim(), resubmitFormData);
              
              if (resubmitResponse.status === 200) {
                toast.success("Bank statement uploaded successfully with fraud consent!");
                return {
                  success: true,
                  message: "Bank statement uploaded successfully with fraud consent!",
                };
              } else {
                const errorMsg = "Failed to upload bank statement after fraud consent";
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
                return {
                  success: false,
                  error: errorMsg,
                };
              }
            } catch (resubmitError) {
              console.error("Error re-submitting with fraud consent:", resubmitError);
              const errorMsg = resubmitError.response?.data 
                ? formatErrorMessage(resubmitError.response.data)
                : (resubmitError.message || "Failed to upload bank statement");
              setErrorMessage(errorMsg);
              toast.error(errorMsg);
              return {
                success: false,
                error: errorMsg,
              };
            }
          } else {
            // No matching fraud indicators in catch block, show full response in modal
            setErrorResponseData(responseData);
            setShowErrorResponse(true);
            const errorMsg = formatErrorMessage(responseData);
            setErrorMessage(errorMsg);
            toast.error(errorMsg);
            return {
              success: false,
              error: errorMsg,
            };
          }
        } else {
          // No fraud indicators in catch block, show error
          const errorMsg = error.response?.data 
            ? formatErrorMessage(error.response.data)
            : (error.message || "Failed to upload bank statement");
          setErrorMessage(errorMsg);
          toast.error(errorMsg);
          return {
            success: false,
            error: errorMsg,
          };
        }
      } else {
        // Other errors
        const errorMsg = error.response?.data 
          ? formatErrorMessage(error.response.data)
          : (error.message || "Failed to upload bank statement");
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSelected) return null;

  return (
    <div className="bg-gradient-to-r from-brand-extra-light to-brand-light rounded-lg md:rounded-xl p-4 md:p-6 border border-brand/40">
      <div className="flex items-center space-x-2 mb-4">
        <Upload className="w-5 h-5 text-brand-link" />
        <h3 className="text-lg font-bold text-gray-800">Upload Bank Statement</h3>
      </div>

      <div className="space-y-4">
        {/* Message Parser */}
        <div className="bg-gradient-to-r from-brand-extra-light to-brand-light rounded-lg md:rounded-xl p-4 md:p-6 border border-brand/40">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Upload className="w-4 h-4 inline mr-2 text-brand-link" />
            Paste Message to Auto-Fill
          </label>
          <div className="space-y-3">
            <textarea
              ref={messageInputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Paste message here (e.g., @Uvesh Office Blinkr @prem mishra Naman Finlease Nayaz Ahmed 9008284584 AQHPA9203C PLEASE RUN THE BANKING FROM BACKEND Password 9008284584)"
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-brand/50 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/90 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base resize-vertical"
              autoFocus
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleParseMessage}
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-lg md:rounded-xl hover:from-brand-hover hover:to-brand-hover transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Extract & Auto-Fill</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessageInput("");
                  // Auto-focus on textarea after clearing
                  setTimeout(() => {
                    messageInputRef.current?.focus();
                  }, 0);
                }}
                className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg md:rounded-xl hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 The parser will extract PAN and Password from your message
            </p>
          </div>
        </div>

        {/* PAN Number */}
        <div className="space-y-2">
          <label htmlFor="panNumber" className="block text-sm font-semibold text-gray-700">
            PAN Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="panNumber"
              value={panNumber}
              onChange={handlePANChange}
              placeholder="Enter PAN number (e.g., ABCDE1234F)"
              maxLength={10}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base font-mono ${
                panError ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
              }`}
            />
          </div>
          {panError && (
            <div className="text-red-500 text-xs sm:text-sm flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{panError}</span>
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Bank Statement File <span className="text-red-500">*</span>
          </label>
          {!selectedFile ? (
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="bank-statement-file"
              />
              <label
                htmlFor="bank-statement-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, XLSX, XLS, CSV (Max 10MB)
                </p>
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg">
                <div className="flex items-center space-x-3">
                  <File className="w-5 h-5 text-brand-link" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {canPreviewFile(selectedFile) && (
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="p-1.5 text-brand-link hover:text-brand-link hover:bg-brand-light rounded transition-colors"
                      title="Preview document"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Password (Optional) */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
            Password <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password if file is password protected"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 pl-10 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
            />
            {/* <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" /> */}
          </div>
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <label htmlFor="remarks" className="block text-sm font-semibold text-gray-700">
            Remarks <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter remarks (e.g., fraud indicators or notes)"
            rows={3}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base resize-vertical"
          />
        </div>

        {/* Proceed with Fraud Consent */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="proceedWithFraudConsent"
              checked={proceedWithFraudConsent}
              onChange={(e) => setProceedWithFraudConsent(e.target.checked)}
              className="w-4 h-4 text-brand-link border-gray-300 rounded focus:ring-brand focus:ring-2"
            />
            <label htmlFor="proceedWithFraudConsent" className="block text-sm font-semibold text-gray-700 cursor-pointer">
              Proceed with Fraud Consent <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-7">
            Check this box if you want to proceed with fraud consent when uploading the bank statement
          </p>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg md:rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 mb-1">Error</h4>
                <p className="text-sm text-red-700 whitespace-pre-wrap">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setErrorResponseData(null);
                  setShowErrorResponse(false);
                }}
                className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                title="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error Response Details - Display below form */}
        {errorResponseData && (
          <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg md:rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-800">Error Response Details</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorResponseData(null);
                  setShowErrorResponse(false);
                  setErrorMessage("");
                }}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Close error details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-96 overflow-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words font-mono overflow-x-auto">
                {JSON.stringify(errorResponseData, null, 2)}
              </pre>
            </div>
            {errorResponseData?.fraud_indicators && errorResponseData.fraud_indicators.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Please review the fraud indicators above. You can fill in the Remarks field and check "Proceed with Fraud Consent" to proceed with the upload.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center space-x-2 p-4 bg-brand-light rounded-lg border border-brand/40">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-brand-link">Uploading bank statement...</span>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewUrl && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <File className="w-5 h-5 text-brand-link" />
                <h3 className="text-lg font-semibold text-gray-800">{selectedFile.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4">
              {selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[600px] border border-gray-300 rounded"
                  title="Document Preview"
                />
              ) : selectedFile.type.startsWith("image/") ? (
                <div className="flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Document Preview"
                    className="max-w-full max-h-[70vh] object-contain rounded"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
                  <File className="w-16 h-16 mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Preview not available for this file type</p>
                  <p className="text-sm mt-2">File: {selectedFile.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

UploadBankStatement.displayName = "UploadBankStatement";

export default UploadBankStatement;
