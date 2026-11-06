import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import toast from "react-hot-toast";
import { Building2, AlertCircle, Sparkles, X } from "lucide-react";
import { moveToBanking as moveToBankingService } from "../../../services/functions/admin";

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

// Extract PAN and reason from message
const extractDataFromMessage = (message) => {
  const extracted = {
    panNumber: "",
    reason: "Manually Moved",
  };

  if (!message) return extracted;

  // Extract PAN number (10 alphanumeric characters, typically in format ABCDE1234F)
  const panPatterns = [
    /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/i,  // Standard PAN format
    /[A-Z]{5}\s*[0-9]{4}\s*[A-Z]{1}/i,  // PAN with spaces
  ];
  
  for (const pattern of panPatterns) {
    const panMatch = message.match(pattern);
    if (panMatch) {
      extracted.panNumber = formatPAN(panMatch[0]);
      break;
    }
  }

  // Extract reason - look for text after "move to banking" or use default
  const moveToBankingPattern = /move\s+to\s+banking/i;
  const moveIndex = message.toLowerCase().indexOf("move to banking");
  
  if (moveIndex !== -1) {
    // Get text after "move to banking"
    const textAfter = message.substring(moveIndex + "move to banking".length).trim();
    // Remove @ mentions and extra whitespace
    const cleanedReason = textAfter
      .replace(/@[^\s]+/g, '') // Remove @ mentions
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    if (cleanedReason) {
      extracted.reason = cleanedReason;
    }
  }

  return extracted;
};

const MoveToBanking = forwardRef(({ isSelected }, ref) => {
  const [moveToBankingForm, setMoveToBankingForm] = useState({
    panNumber: "",
    reason: "Manually Moved",
  });
  const [isLoadingMoveToBanking, setIsLoadingMoveToBanking] = useState(false);
  const [panError, setPanError] = useState("");
  const [messageText, setMessageText] = useState("");
  const messageInputRef = useRef(null);

  const handleMoveToBankingInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "panNumber") {
      const formattedValue = formatPAN(value);
      const error = validatePAN(formattedValue);
      setMoveToBankingForm((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
      setPanError(error);
    } else {
      setMoveToBankingForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleMoveToBankingSubmit = async () => {
    const panValidationError = validatePAN(moveToBankingForm.panNumber);
    if (panValidationError) {
      toast.error(panValidationError);
      return { success: false, error: panValidationError };
    }

    if (!moveToBankingForm.panNumber.trim()) {
      toast.error("Please enter PAN number");
      return { success: false, error: "Please enter PAN number" };
    }
    if (!moveToBankingForm.reason.trim()) {
      toast.error("Please enter reason");
      return { success: false, error: "Please enter reason" };
    }

    setIsLoadingMoveToBanking(true);

    try {
      const data = {
        reason: "Manually Moved"
      };

      const response = await moveToBankingService(moveToBankingForm.panNumber.trim(), data);

      if (response && response.success) {
        setMoveToBankingForm({
          panNumber: "",
          reason: "Manually Moved",
        });
        setPanError("");
        setIsLoadingMoveToBanking(false);
        return { success: true, message: response.message || "Lead moved to banking successfully!" };
      } else {
        setIsLoadingMoveToBanking(false);
        return { success: false, error: response?.message || "Failed to move lead to banking" };
      }
    } catch (error) {
      console.error("Move to Banking Error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to move lead to banking";
      setIsLoadingMoveToBanking(false);
      return { success: false, error: errorMessage };
    }
  };

  // Expose form data and submit handler to parent
  useImperativeHandle(ref, () => ({
    getFormData: () => moveToBankingForm,
    submit: handleMoveToBankingSubmit,
    isLoading: isLoadingMoveToBanking,
    clearForm: handleClearForm
  }));

  const handleExtractAndAutoFill = () => {
    if (!messageText.trim()) {
      toast.error("Please paste a message first");
      return;
    }

    const extracted = extractDataFromMessage(messageText);

    if (!extracted.panNumber) {
      toast.error("Could not extract PAN number from the message");
      return;
    }

    // Update form with extracted data
    const updatedForm = { ...moveToBankingForm };
    
    if (extracted.panNumber) {
      updatedForm.panNumber = extracted.panNumber;
      const error = validatePAN(extracted.panNumber);
      setPanError(error);
    }

    // Update reason if extracted
    if (extracted.reason) {
      updatedForm.reason = extracted.reason;
    }

    setMoveToBankingForm(updatedForm);

    // Show success message
    const extractedItems = [];
    if (extracted.panNumber) extractedItems.push(`PAN: ${extracted.panNumber}`);
    if (extracted.reason && extracted.reason !== "Manually Moved") extractedItems.push(`Reason: ${extracted.reason}`);
    
    if (extractedItems.length > 0) {
      toast.success(`Extracted: ${extractedItems.join(", ")}`);
    } else {
      toast.error("Could not extract any data from the message");
    }
  };

  const handleClearMessage = () => {
    setMessageText("");
  };

  const handleClearForm = () => {
    setMoveToBankingForm({
      panNumber: "",
      reason: "Manually Moved",
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

  if (!isSelected) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg md:rounded-xl shadow-lg border border-gray-200 p-4 md:p-6">
      <div className="flex items-center space-x-3 mb-4 md:mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light">
          <Building2 className="h-5 w-5 text-brand-link" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Move to Banking
          </h2>
          <p className="text-sm text-gray-600">
            Move lead to banking stage
          </p>
        </div>
      </div>

      {/* Paste Message to Auto-Fill */}
      <div className="mb-4 md:mb-6 bg-gradient-to-r from-brand-extra-light to-brand-light rounded-lg md:rounded-xl p-4 md:p-6 border border-brand/40">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-5 h-5 text-brand-link" />
          <h3 className="text-sm md:text-base font-semibold text-gray-800">
            Paste Message to Auto-Fill
          </h3>
        </div>
        <textarea
          ref={messageInputRef}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Paste message here (e.g., Meenakshisundaram Pavithra	9840278831	CFDPP9114E	Bank Statement Analysis @⁨Yajat Bhai⁩ move to banking)"
          rows={4}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-brand/50 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white transition-all duration-300 text-sm sm:text-base resize-vertical"
        />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-3">
          <button
            type="button"
            onClick={handleExtractAndAutoFill}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover transition-all duration-300 text-xs sm:text-sm flex items-center justify-center space-x-1.5"
          >
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Extract & Auto-Fill</span>
          </button>
          <button
            type="button"
            onClick={handleClearMessage}
            className="px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 text-xs sm:text-sm flex items-center justify-center space-x-1.5"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Clear</span>
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          💡 The parser will extract PAN and reason from your message.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* PAN Number */}
        <div className="space-y-2">
          <label
            htmlFor="moveToBankingPanNumber"
            className="block text-sm font-semibold text-gray-700"
          >
            PAN Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="moveToBankingPanNumber"
            name="panNumber"
            value={moveToBankingForm.panNumber}
            onChange={handleMoveToBankingInputChange}
            placeholder="Enter PAN number (e.g., ABCDE1234F)"
            className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base font-mono ${
              panError
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300"
            }`}
            required
            maxLength={10}
          />
          {panError && (
            <div className="text-red-500 text-xs sm:text-sm flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{panError}</span>
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label
            htmlFor="moveToBankingReason"
            className="block text-sm font-semibold text-gray-700"
          >
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="moveToBankingReason"
            name="reason"
            // value={moveToBankingForm.reason}
            // onChange={handleMoveToBankingInputChange}
            value="Manually Moved"
            placeholder="Enter reason for moving to banking"
            rows={3}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-vertical text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
            required
          />
        </div>

      </div>
    </div>
  );
});

MoveToBanking.displayName = 'MoveToBanking';

export default MoveToBanking;