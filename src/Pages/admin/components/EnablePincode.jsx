import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import toast from "react-hot-toast";
import { MapPin, AlertCircle, Sparkles, X, Edit } from "lucide-react";
import { enablePincode as enablePincodeService } from "../../../services/functions/admin";

// Fetch state and district from pincode API
const fetchPincodeDetails = async (pincode) => {
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return { state: '', district: '' };
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();
    
    if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
      const postOffice = data[0].PostOffice[0];
      return {
        state: postOffice.State || '',
        district: postOffice.District || ''
      };
    }
    return { state: '', district: '' };
  } catch (error) {
    console.error('Error fetching pincode details:', error);
    return { state: '', district: '' };
  }
};

// Parse message and extract pincode, state, and district
const parseMessage = (message) => {
  const extracted = {
    pincode: '',
    state: '',
    district: ''
  };

  if (!message || !message.trim()) {
    return extracted;
  }

  // Extract Pincode - handle various formats
  const pincodePatterns = [
    // Explicit format: "Pincode 110086", "pincode: 400076", "Pincode: 530018"
    /(?:pincode|pin\s*code)[\s:]*(\d{6})\b/i,
    // 6-digit number at end of address line (after city/state names)
    /(?:,\s*|^|\n)([A-Za-z\s]+?)\s+(\d{6})\s*$/m,
    // 6-digit number on its own line
    /^(\d{6})\s*$/m,
    // 6-digit number after common address patterns
    /(?:mumbai|delhi|visakhapatnam|itarsi|ajmer|powai|nagar|colony|road|street|area|marg|sadan|building|floor|flat|house|address)[\s,]*(\d{6})\b/i
  ];

  for (const pattern of pincodePatterns) {
    const match = message.match(pattern);
    if (match) {
      // For explicit pincode mentions
      if (pattern.source.includes('pincode|pin')) {
        extracted.pincode = match[1];
        break;
      } 
      // For patterns with city/district before pincode
      else if (match.length >= 3 && match[2]) {
        extracted.pincode = match[2];
        break;
      }
      // For standalone pincode on its own line
      else if (match[1] && /^\d{6}$/.test(match[1])) {
        extracted.pincode = match[1];
        break;
      }
      // For address patterns
      else if (match[1] && /^\d{6}$/.test(match[1])) {
        extracted.pincode = match[1];
        break;
      }
    }
  }
  
  // Fallback: Find 6-digit numbers that are likely pincodes (not phone numbers)
  if (!extracted.pincode) {
    const allSixDigits = message.match(/\b(\d{6})\b/g);
    if (allSixDigits) {
      // Filter out phone numbers (10 digits) and prefer ones at end of lines or after addresses
      for (let i = allSixDigits.length - 1; i >= 0; i--) {
        const pincode = allSixDigits[i];
        const pincodeIndex = message.lastIndexOf(pincode);
        const before = message.substring(Math.max(0, pincodeIndex - 30), pincodeIndex);
        const after = message.substring(pincodeIndex + 6, pincodeIndex + 20);
        
        // Skip if it's part of a phone number
        if (/\d{4}\s*\d{6}/.test(before + pincode) || /\d{6}\s*\d{4}/.test(pincode + after)) {
          continue;
        }
        
        // Prefer pincodes after address keywords or at end of address lines
        if (/[A-Za-z]\s*$/.test(before.trim()) || /[\n\r]/.test(before) || pincodeIndex + 6 === message.length) {
          extracted.pincode = pincode;
          break;
        }
      }
    }
  }

  // Extract State - handle various formats
  const statePatterns = [
    // Explicit format: "States Delhi", "State: Maharashtra", "State Maharashtra"
    /(?:states?|state)[\s:]+([A-Za-z\s]+?)(?:\s+District|\s+Pincode|$|\n)/i,
    // Common state names in address context (before pincode or at end)
    /(?:,\s*|^|\n)(Maharashtra|Delhi|Andhra Pradesh|Tamil Nadu|Karnataka|Gujarat|Rajasthan|Uttar Pradesh|West Bengal|Bihar|Odisha|Madhya Pradesh|Punjab|Haryana|Jharkhand|Assam|Kerala|Chhattisgarh|Himachal Pradesh|Uttarakhand|Goa|Manipur|Meghalaya|Mizoram|Nagaland|Sikkim|Tripura|Arunachal Pradesh|Telangana)\s*(?:,\s*\d{6}|\s+\d{6}|$)/i
  ];

  for (const pattern of statePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      extracted.state = match[1].trim();
      // Clean up if it captured extra words
      if (extracted.state.toLowerCase().includes('district') || extracted.state.toLowerCase().includes('pincode')) {
        extracted.state = extracted.state.replace(/\s+(?:district|pincode).*$/i, '').trim();
      }
      if (extracted.state) break;
    }
  }

  // Extract District - handle various formats
  const districtPatterns = [
    // Explicit format: "District Northwest", "District: Indore", "District Indore"
    /(?:district|dist)[\s:]+([A-Za-z\s]+?)(?:\s+Pincode|$|\n)/i,
    // Common district/city names in address context (before pincode)
    /(?:,\s*|^|\n)(Mumbai|Delhi|Visakhapatnam|Itarsi|Ajmer|Powai|Indore|Northwest|Northeast|Southeast|Southwest|Central|New Delhi|East|West|North|South)\s*(?:,\s*[A-Za-z\s]+)?\s*(\d{6})/i,
    // City/district names directly before pincode (most common pattern)
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d{6})\b/
  ];

  for (const pattern of districtPatterns) {
    const match = message.match(pattern);
    if (match) {
      // For explicit district mentions
      if (pattern.source.includes('district|dist')) {
        extracted.district = match[1].trim();
        // Clean up if it captured extra words
        if (extracted.district.toLowerCase().includes('pincode')) {
          extracted.district = extracted.district.replace(/\s+pincode.*$/i, '').trim();
        }
      } else {
        // For city/district names before pincode
        extracted.district = match[1] ? match[1].trim() : '';
      }
      if (extracted.district) break;
    }
  }

  // Fallback: Try to extract district from address lines (common city names before pincode)
  if (!extracted.district && extracted.pincode) {
    // Find text before the pincode
    const pincodeIndex = message.indexOf(extracted.pincode);
    if (pincodeIndex > 0) {
      const beforePincode = message.substring(Math.max(0, pincodeIndex - 50), pincodeIndex).trim();
      // Extract city/district name (capitalized words before pincode)
      const cityMatch = beforePincode.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/);
      if (cityMatch && cityMatch[1]) {
        const potentialDistrict = cityMatch[1].trim();
        // Exclude common words that aren't district names
        if (!/^(near|at|in|of|the|and|or|building|floor|flat|house|no|address|colony|nagar|road|street|area|marg|sadan)$/i.test(potentialDistrict) && potentialDistrict.length > 2) {
          extracted.district = potentialDistrict;
        }
      }
    }
  }
  
  // Additional fallback: Extract from address patterns
  if (!extracted.district) {
    const cityPatterns = [
      /(?:near|at|in|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s+\d{6}|\s*$)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:road|nagar|colony|area|marg|sadan|nagar)/i
    ];
    
    for (const pattern of cityPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const potentialDistrict = match[1].trim();
        // Exclude common words that aren't district names
        if (!/^(near|at|in|of|the|and|or|building|floor|flat|house|no)$/i.test(potentialDistrict) && potentialDistrict.length > 2) {
          extracted.district = potentialDistrict;
          break;
        }
      }
    }
  }

  return extracted;
};

const EnablePincode = forwardRef(({ isSelected }, ref) => {
  const [enablePincodeForm, setEnablePincodeForm] = useState({
    pincode: "",
    state: "",
    district: "",
  });
  const [isLoadingEnablePincode, setIsLoadingEnablePincode] = useState(false);
  const [messageText, setMessageText] = useState("");
  const messageInputRef = useRef(null);
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);

  const handleEnablePincodeInputChange = (e) => {
    const { name, value } = e.target;
    setEnablePincodeForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Auto-fetch state and district when pincode is manually entered
  useEffect(() => {
    const autoFetchPincodeDetails = async () => {
      if (enablePincodeForm.pincode && /^\d{6}$/.test(enablePincodeForm.pincode)) {
        // Only fetch if state or district is missing (don't overwrite user input)
        if (!enablePincodeForm.state || !enablePincodeForm.district) {
          setIsFetchingPincode(true);
          try {
            const pincodeDetails = await fetchPincodeDetails(enablePincodeForm.pincode);
            if (pincodeDetails.state || pincodeDetails.district) {
              setEnablePincodeForm(prev => ({
                ...prev,
                // Only update if field is empty (don't overwrite existing values)
                state: prev.state || pincodeDetails.state || '',
                district: prev.district || pincodeDetails.district || ''
              }));
              // Show toast only if we actually filled something
              if ((!enablePincodeForm.state && pincodeDetails.state) || (!enablePincodeForm.district && pincodeDetails.district)) {
                const filledFields = [];
                if (!enablePincodeForm.state && pincodeDetails.state) filledFields.push('State');
                if (!enablePincodeForm.district && pincodeDetails.district) filledFields.push('District');
                toast.success(`${filledFields.join(' and ')} auto-filled from pincode`);
              }
            }
          } catch (error) {
            console.error('Error fetching pincode details:', error);
          } finally {
            setIsFetchingPincode(false);
          }
        }
      }
    };

    // Debounce the API call to avoid too many requests
    const timeoutId = setTimeout(() => {
      autoFetchPincodeDetails();
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [enablePincodeForm.pincode, enablePincodeForm.state, enablePincodeForm.district]);

  const handleEnablePincodeSubmit = async () => {
    if (!enablePincodeForm.pincode || !enablePincodeForm.pincode.trim()) {
      toast.error("Please enter pincode");
      return { success: false, error: "Please enter pincode" };
    }
    if (!/^\d{6}$/.test(enablePincodeForm.pincode.trim())) {
      toast.error("Pincode must be 6 digits");
      return { success: false, error: "Pincode must be 6 digits" };
    }
    if (!enablePincodeForm.state || !enablePincodeForm.state.trim()) {
      toast.error("Please enter state");
      return { success: false, error: "Please enter state" };
    }
    if (!enablePincodeForm.district || !enablePincodeForm.district.trim()) {
      toast.error("Please enter district");
      return { success: false, error: "Please enter district" };
    }

    setIsLoadingEnablePincode(true);

    try {
      const response = await enablePincodeService(
        enablePincodeForm.pincode.trim(),
        enablePincodeForm.state.trim(),
        enablePincodeForm.district.trim()
      );

      if (response && response.success) {
        setEnablePincodeForm({
          pincode: "",
          state: "",
          district: "",
        });
        setIsLoadingEnablePincode(false);
        return { success: true, message: response.message || "Pincode enabled successfully!" };
      } else {
        setIsLoadingEnablePincode(false);
        return { success: false, error: response?.message || "Failed to enable pincode" };
      }
    } catch (error) {
      console.error("Enable Pincode Error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to enable pincode";
      setIsLoadingEnablePincode(false);
      return { success: false, error: errorMessage };
    }
  };

  // Expose form data and submit handler to parent
  useImperativeHandle(ref, () => ({
    getFormData: () => enablePincodeForm,
    submit: handleEnablePincodeSubmit,
    isLoading: isLoadingEnablePincode,
    clearForm: handleClearForm
  }));

  const handleExtractAndAutoFill = async () => {
    if (!messageText.trim()) {
      toast.error("Please paste a message first");
      return;
    }

    // First, extract pincode from message
    const extracted = parseMessage(messageText);

    if (!extracted.pincode && !extracted.state && !extracted.district) {
      toast.error("Could not extract any information from the message");
      return;
    }

    // If pincode is extracted, call API first
    if (extracted.pincode) {
      try {
        const pincodeDetails = await fetchPincodeDetails(extracted.pincode);
        // If API returns valid data, use it
        if (pincodeDetails.state || pincodeDetails.district) {
          extracted.state = pincodeDetails.state || '';
          extracted.district = pincodeDetails.district || '';
        } else {
          // API didn't return results, now extract state/district from message as fallback
          const messageExtracted = parseMessage(messageText);
          extracted.state = messageExtracted.state || extracted.state || '';
          extracted.district = messageExtracted.district || extracted.district || '';
        }
      } catch (error) {
        // API call failed, fallback to extracting state/district from message
        console.error('Error fetching pincode details from API, extracting from message:', error);
        const messageExtracted = parseMessage(messageText);
        extracted.state = messageExtracted.state || extracted.state || '';
        extracted.district = messageExtracted.district || extracted.district || '';
      }
    }

    // Update form with extracted data
    setEnablePincodeForm(prev => ({
      ...prev,
      pincode: extracted.pincode || prev.pincode,
      state: extracted.state || prev.state,
      district: extracted.district || prev.district
    }));

    // Show success message
    const extractedItems = [];
    if (extracted.pincode) extractedItems.push(`Pincode: ${extracted.pincode}`);
    if (extracted.state) extractedItems.push(`State: ${extracted.state}`);
    if (extracted.district) extractedItems.push(`District: ${extracted.district}`);
    
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
    setEnablePincodeForm({
      pincode: "",
      state: "",
      district: "",
    });
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
          <MapPin className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Enable Pincode
          </h2>
          <p className="text-sm text-gray-600">
            Enable pincode for leads
          </p>
        </div>
      </div>

      {/* Paste Message to Auto-Fill */}
      <div className="mb-4 md:mb-6 bg-gradient-to-r from-orange-50 to-orange-50 rounded-lg md:rounded-xl p-4 md:p-6 border border-orange-200">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-5 h-5 text-orange-600" />
          <h3 className="text-sm md:text-base font-semibold text-gray-800">
            Paste Message to Auto-Fill
          </h3>
        </div>
        <textarea
          ref={messageInputRef}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Paste message here (e.g., plz enable pincode @127178595377265 Mumbai, Maharashtra 400076 or States Delhi District Northwest Pincode 110086)"
          rows={4}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-orange-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700 bg-white transition-all duration-300 text-sm sm:text-base resize-vertical"
        />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-3">
          <button
            type="button"
            onClick={handleExtractAndAutoFill}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-all duration-300 text-xs sm:text-sm flex items-center justify-center space-x-1.5"
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
          💡 The parser will extract Pincode, State, and District from your message. API will be called first, then message extraction as fallback.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Pincode */}
        <div className="space-y-2">
          <label
            htmlFor="enablePincodePincode"
            className="block text-sm font-semibold text-gray-700"
          >
            Pincode <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="enablePincodePincode"
              name="pincode"
              value={enablePincodeForm.pincode}
              onChange={handleEnablePincodeInputChange}
              placeholder="Enter pincode"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700 bg-white transition-all duration-300 text-sm sm:text-base"
              required
              maxLength={6}
            />
            {isFetchingPincode && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* State */}
        <div className="space-y-2">
          <label
            htmlFor="enablePincodeState"
            className="block text-sm font-semibold text-gray-700"
          >
            State <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="enablePincodeState"
            name="state"
            value={enablePincodeForm.state}
            onChange={handleEnablePincodeInputChange}
            placeholder="Enter state"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700 bg-white transition-all duration-300 text-sm sm:text-base"
            required
          />
        </div>

        {/* District */}
        <div className="space-y-2">
          <label
            htmlFor="enablePincodeDistrict"
            className="block text-sm font-semibold text-gray-700"
          >
            District <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="enablePincodeDistrict"
            name="district"
            value={enablePincodeForm.district}
            onChange={handleEnablePincodeInputChange}
            placeholder="Enter district"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700 bg-white transition-all duration-300 text-sm sm:text-base"
            required
          />
        </div>
      </div>
    </div>
  );
});

EnablePincode.displayName = 'EnablePincode';

export default EnablePincode;
