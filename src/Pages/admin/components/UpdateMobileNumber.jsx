import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import toast from "react-hot-toast";
import { Phone, AlertCircle, Sparkles, X } from "lucide-react";
import { updateMobileNumber as updateMobileNumberService, getMobileNumberByPan } from "../../../services/functions/admin";

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

// Extract PAN and mobile number from message
const extractDataFromMessage = (message) => {
  const extracted = {
    panNumber: "",
    mobile_number: "",
  };

  if (!message) return extracted;

  // Extract PAN number (10 alphanumeric characters, typically in format ABCDE1234F)
  // Also handle cases where PAN might be separated by tabs or spaces
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

  // Extract all 10-digit mobile numbers from message
  // Handle various formats: tab-separated, space-separated, with dashes, etc.
  const mobilePatterns = [
    /\b(\d{10})\b/g,  // Exactly 10 digits
    /\b(\d{3}[\s-]?\d{3}[\s-]?\d{4})\b/g,  // Formatted: 123-456-7890 or 123 456 7890
    /\b(\d{5}[\s-]?\d{5})\b/g,  // Formatted: 12345-67890
  ];

  const allNumbers = [];
  
  for (const pattern of mobilePatterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      // Clean the number (remove spaces, dashes, etc.)
      const cleanedNumber = match[1].replace(/[\s-]/g, '');
      // Check if it's exactly 10 digits and doesn't start with 0 (usually not a valid mobile)
      if (/^\d{10}$/.test(cleanedNumber) && !cleanedNumber.startsWith('0')) {
        allNumbers.push(cleanedNumber);
      }
    }
  }

  // Remove duplicates
  const uniqueNumbers = [...new Set(allNumbers)];

  if (uniqueNumbers.length === 0) {
    // No mobile number found
    return extracted;
  } else if (uniqueNumbers.length === 1) {
    // Only one number found - use it
    extracted.mobile_number = uniqueNumbers[0];
  } else {
    // Multiple numbers found - try to identify the "new" number
    const messageLower = message.toLowerCase();
    
    // Keywords that indicate a new/update number
    const newNumberKeywords = [
      'change mob no',
      'change mobile no',
      'change mobile number',
      'change the mob no',
      'change tha mob no',
      'change the mobile no',
      'change the mobile number',
      'update mob no',
      'update mobile number',
      'update mobile no',
      'update number',
      'change the registered number',
      'change to',
      'update to',
      'new number',
      'new mobile',
      'to this',
      'pls update',
      'pls change',
      'please update',
      'please change',
    ];
    
    // Keywords that indicate old/existing number
    const oldNumberKeywords = [
      'old number',
      'old mobile',
      'previous number',
      'current number',
      'existing number',
      'registered number',
    ];

    // Find the position of each number in the message
    const numberPositions = uniqueNumbers.map(num => {
      // Find all occurrences of this number
      const indices = [];
      let searchIndex = 0;
      while ((searchIndex = messageLower.indexOf(num, searchIndex)) !== -1) {
        indices.push(searchIndex);
        searchIndex += num.length;
      }
      return { number: num, indices };
    }).filter(item => item.indices.length > 0);

    // Strategy 1: Look for number immediately after "new number" keywords
    let newNumber = null;
    for (const keyword of newNumberKeywords) {
      const keywordIndex = messageLower.indexOf(keyword);
      if (keywordIndex !== -1) {
        // Find the number that appears after this keyword (within reasonable distance)
        // First, try to find number immediately after keyword (within 50 chars)
        const immediateNumber = numberPositions.find(item => {
          return item.indices.some(index => {
            const distance = index - keywordIndex;
            return distance > 0 && distance < 50;
          });
        });
        
        if (immediateNumber) {
          newNumber = immediateNumber.number;
          break;
        }
        
        // If not found immediately, look within 200 chars
        const numberAfterKeyword = numberPositions.find(item => {
          return item.indices.some(index => index > keywordIndex && index < keywordIndex + 200);
        });
        if (numberAfterKeyword) {
          newNumber = numberAfterKeyword.number;
          break;
        }
      }
    }

    // Strategy 2: Look for pattern like "change mob no. 7795032740" or "change mob no 7795032740"
    if (!newNumber) {
      const changeMobPatterns = [
        /change\s+(?:the\s+)?(?:mob|mobile)\s+no\.?\s*[:\-]?\s*(\d{10})/i,
        /change\s+(?:the\s+)?(?:mob|mobile)\s+number\.?\s*[:\-]?\s*(\d{10})/i,
        /pls\s+change\s+(?:the\s+)?(?:mob|mobile)\s+no\.?\s*[:\-]?\s*(\d{10})/i,
        /please\s+change\s+(?:the\s+)?(?:mob|mobile)\s+no\.?\s*[:\-]?\s*(\d{10})/i,
        /update\s+(?:the\s+)?(?:mob|mobile)\s+no\.?\s*[:\-]?\s*(\d{10})/i,
        /to\s+this\s*[:\-]?\s*(\d{10})/i,
        /(?:to|update to|change to)\s*[:\-]?\s*(\d{10})/i,
      ];
      
      for (const pattern of changeMobPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          newNumber = match[1];
          break;
        }
      }
    }

    // Strategy 3: Exclude numbers that appear near "old" keywords
    const filteredNumbers = uniqueNumbers.filter(num => {
      const numIndex = messageLower.indexOf(num);
      if (numIndex === -1) return true;
      
      // Check if number is near an "old" keyword
      const contextBefore = messageLower.substring(Math.max(0, numIndex - 50), numIndex);
      const contextAfter = messageLower.substring(numIndex + num.length, Math.min(messageLower.length, numIndex + num.length + 50));
      const context = contextBefore + ' ' + contextAfter;
      
      return !oldNumberKeywords.some(keyword => context.includes(keyword));
    });

    // Strategy 4: Use the last number in the message (often the new one)
    if (!newNumber && filteredNumbers.length > 0) {
      // Find which number appears last in the message
      let lastIndex = -1;
      let lastNumber = null;
      for (const num of filteredNumbers) {
        const numIndex = messageLower.lastIndexOf(num);
        if (numIndex > lastIndex) {
          lastIndex = numIndex;
          lastNumber = num;
        }
      }
      newNumber = lastNumber || filteredNumbers[filteredNumbers.length - 1];
    }

    // Fallback: use the last number from all unique numbers
    extracted.mobile_number = newNumber || uniqueNumbers[uniqueNumbers.length - 1];
  }

  return extracted;
};

const UpdateMobileNumber = forwardRef(({ isSelected }, ref) => {
  const [updateMobileForm, setUpdateMobileForm] = useState({
    panNumber: "",
    mobile_number: "",
    remarks: "Mobile number updated as per request",
  });
  const [isLoadingUpdateMobile, setIsLoadingUpdateMobile] = useState(false);
  const [mobilePanError, setMobilePanError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [oldMobileNumber, setOldMobileNumber] = useState("");
  const [isLoadingOldNumber, setIsLoadingOldNumber] = useState(false);
  const messageInputRef = useRef(null);

  const handleUpdateMobileInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "panNumber") {
      const formattedValue = formatPAN(value);
      const error = validatePAN(formattedValue);
      setUpdateMobileForm((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
      setMobilePanError(error);
    } else {
      setUpdateMobileForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleUpdateMobileSubmit = async () => {
    const panValidationError = validatePAN(updateMobileForm.panNumber);
    if (panValidationError) {
      toast.error(panValidationError);
      return { success: false, error: panValidationError };
    }

    if (!updateMobileForm.panNumber.trim()) {
      toast.error("Please enter PAN number");
      return { success: false, error: "Please enter PAN number" };
    }
    if (!updateMobileForm.mobile_number.trim()) {
      toast.error("Please enter mobile number");
      return { success: false, error: "Please enter mobile number" };
    }
    if (!/^[0-9]{10}$/.test(updateMobileForm.mobile_number.trim())) {
      toast.error("Mobile number must be 10 digits");
      return { success: false, error: "Mobile number must be 10 digits" };
    }
    if (!updateMobileForm.remarks.trim()) {
      toast.error("Please enter remarks");
      return { success: false, error: "Please enter remarks" };
    }

    setIsLoadingUpdateMobile(true);

    try {
      const response = await updateMobileNumberService(
        updateMobileForm.panNumber.trim(),
        updateMobileForm.mobile_number.trim(),
        updateMobileForm.remarks.trim()
      );

      if (response && response.success) {
        setUpdateMobileForm({
          panNumber: "",
          mobile_number: "",
          remarks: "Mobile number updated as per request",
        });
        setMobilePanError("");
        setOldMobileNumber("");
        setIsLoadingUpdateMobile(false);
        return { success: true, message: response.message || "Mobile number updated successfully!" };
      } else {
        setIsLoadingUpdateMobile(false);
        return { success: false, error: response?.message || "Failed to update mobile number" };
      }
    } catch (error) {
      console.error("Update Mobile Number Error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update mobile number";
      setIsLoadingUpdateMobile(false);
      return { success: false, error: errorMessage };
    }
  };

  // Expose form data and submit handler to parent
  useImperativeHandle(ref, () => ({
    getFormData: () => updateMobileForm,
    submit: handleUpdateMobileSubmit,
    isLoading: isLoadingUpdateMobile,
    clearForm: handleClearForm
  }));

  const handleExtractAndAutoFill = async () => {
    if (!messageText.trim()) {
      toast.error("Please paste a message first");
      return;
    }

    const extracted = extractDataFromMessage(messageText);

    if (!extracted.panNumber && !extracted.mobile_number) {
      toast.error("Could not extract PAN or mobile number from the message");
      return;
    }

    // Update form with extracted data
    const updatedForm = { ...updateMobileForm };
    
    if (extracted.panNumber) {
      updatedForm.panNumber = extracted.panNumber;
      const error = validatePAN(extracted.panNumber);
      setMobilePanError(error);

      // Fetch old mobile number from API using PAN
      if (!error) {
        setIsLoadingOldNumber(true);
        try {
          const response = await getMobileNumberByPan(extracted.panNumber);
          if (response && response.data) {
            // Extract mobile number from response (adjust field name based on API response)
            const mobileNumber = response.data.mobile_number || response.data.mobileNumber || response.data.phone_number || response.data.phoneNumber || response.data.mobile || "";
            if (mobileNumber) {
              setOldMobileNumber(mobileNumber);
            } else {
              setOldMobileNumber("");
              toast.info("Old mobile number not found in records");
            }
          }
        } catch (error) {
          console.error("Error fetching old mobile number:", error);
          setOldMobileNumber("");
          // Don't show error toast, just silently fail - old number is optional
        } finally {
          setIsLoadingOldNumber(false);
        }
      }
    }

    if (extracted.mobile_number) {
      updatedForm.mobile_number = extracted.mobile_number;
    }

    setUpdateMobileForm(updatedForm);

    // Show success message
    const extractedItems = [];
    if (extracted.panNumber) extractedItems.push("PAN");
    if (extracted.mobile_number) extractedItems.push("New Mobile Number");
    
    toast.success(`Extracted: ${extractedItems.join(", ")}`);
  };

  const handleClearMessage = () => {
    setMessageText("");
  };

  const handleClearForm = () => {
    setUpdateMobileForm({
      panNumber: "",
      mobile_number: "",
      remarks: "Mobile number updated as per request",
    });
    setMobilePanError("");
    setMessageText("");
    setOldMobileNumber("");
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
          <Phone className="h-5 w-5 text-brand-link" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Update Mobile Number
          </h2>
          <p className="text-sm text-gray-600">
            Update customer mobile number
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
          placeholder="Paste message here (e.g., Customer PAN: ABCDE1234F, Old Number: 9876543210, New Number: 9876543211 or PAN: ABCDE1234F Mobile: 9876543210)"
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
          💡 The parser will extract PAN and Mobile Number from your message. If both old and new numbers are present, it will extract the new number.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* PAN Number */}
        <div className="space-y-2">
          <label
            htmlFor="mobilePanNumber"
            className="block text-sm font-semibold text-gray-700"
          >
            PAN Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="mobilePanNumber"
            name="panNumber"
            value={updateMobileForm.panNumber}
            onChange={handleUpdateMobileInputChange}
            placeholder="Enter PAN number (e.g., ABCDE1234F)"
            className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base font-mono ${
              mobilePanError
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300"
            }`}
            required
            maxLength={10}
          />
          {mobilePanError && (
            <div className="text-red-500 text-xs sm:text-sm flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{mobilePanError}</span>
            </div>
          )}
        </div>

        {/* Old Mobile Number (Read-only) */}
        {oldMobileNumber && (
          <div className="space-y-2">
            <label
              htmlFor="oldMobileNumber"
              className="block text-sm font-semibold text-gray-700"
            >
              Current Mobile Number (Read-only)
            </label>
            <div className="relative">
              <input
                type="tel"
                id="oldMobileNumber"
                value={oldMobileNumber}
                readOnly
                disabled
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm bg-gray-100 text-gray-600 cursor-not-allowed text-sm sm:text-base"
              />
              {isLoadingOldNumber && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              This is the current mobile number in the system
            </p>
          </div>
        )}

        {/* New Mobile Number */}
        <div className="space-y-2">
          <label
            htmlFor="mobile_number"
            className="block text-sm font-semibold text-gray-700"
          >
            New Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="mobile_number"
            name="mobile_number"
            value={updateMobileForm.mobile_number}
            onChange={handleUpdateMobileInputChange}
            placeholder="Enter 10-digit mobile number to update"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
            required
            maxLength={10}
            pattern="[0-9]{10}"
          />
          <p className="text-xs text-gray-500">
            10 digits only (e.g., 6295684398)
          </p>
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <label
            htmlFor="mobileRemarks"
            className="block text-sm font-semibold text-gray-700"
          >
            Remarks <span className="text-red-500">*</span>
          </label>
          <textarea
            id="mobileRemarks"
            name="remarks"
            value={updateMobileForm.remarks}
            onChange={handleUpdateMobileInputChange}
            placeholder="Enter remarks for this update"
            rows={3}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-vertical text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
            required
          />
        </div>

      </div>
    </div>
  );
});

UpdateMobileNumber.displayName = 'UpdateMobileNumber';

export default UpdateMobileNumber;