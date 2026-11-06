import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import toast from "react-hot-toast";
import { CreditCard, AlertCircle, Sparkles, X } from "lucide-react";
import { updateBankDetails as updateBankDetailsService } from "../../../services/functions/admin";

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

// Extract PAN and account number from message
const extractDataFromMessage = (message) => {
  const extracted = {
    panNumber: "",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    accountHolderName: "",
    beneficiaryName: "",
    accountType: "",
    branchName: "",
    isMaskedAccount: false, // Flag to detect if this is a masked account update
  };

  if (!message) return extracted;

  const messageLower = message.toLowerCase();

  const cleanBranchName = (value) => {
    if (!value) return "";
    let v = String(value).trim();
    // Remove trailing label like " - BRANCH NAME"
    v = v.replace(/\s*[-–—:,]*\s*branch\s+name\s*$/i, "").trim();
    // Remove leftover trailing separators
    v = v.replace(/\s*[-–—:,]+\s*$/i, "").trim();
    return v;
  };

  // Check if message contains "masked account" keywords
  const maskedKeywords = ['masked account', 'masked acc', 'masked', 'mask account'];
  extracted.isMaskedAccount = maskedKeywords.some(keyword => messageLower.includes(keyword));

  // Extract PAN number (10 alphanumeric characters, typically in format ABCDE1234F)
  const panPatterns = [
    /\bpan\s*(?:no|number|num)?\.?\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z]{1})\b/i,  // "PAN no: ABCDE1234F"
    /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/,  // Standard PAN format
    /([A-Z]{5}\s*[0-9]{4}\s*[A-Z]{1})/i,  // PAN with spaces
  ];
  
  for (const pattern of panPatterns) {
    const panMatch = message.match(pattern);
    if (panMatch) {
      extracted.panNumber = formatPAN(panMatch[1] || panMatch[0]);
      break;
    }
  }

  // Extract account number - various formats
  // Account numbers can be 9-18 digits, sometimes with spaces or dashes
  const accountNumberPatterns = [
    // "676401505962 - Acc number" (number before label)
    /\b(\d{9,18})\b\s*[-–—]*\s*(?:a\/c|acc(?:ount)?)(?:\s*(?:no|number|num))?\b/i,
    /\bbank\s+account\s+number\s*=\s*(\d{9,18})\b/i,  // "BANK ACCOUNT NUMBER= 342801502855"
    /\baccount\s+number\s*=\s*(\d{9,18})\b/i,  // "ACCOUNT NUMBER= 342801502855"
    /\baccount\s*(?:no|number|num)?\.?\s*,\s*:\s*-\s*(\d{9,18})\b/i,  // "Account No, : -630001532665" (handles comma, colon, dash format)
    /\ba\/c\s*[,:\-]+\s*(\d{9,18})\b/i,  // "A/c: 8947099729" or "A/c, - 8947099729" (highest priority for A/c format)
    /\ba\/c\s*[:\-]?\s*(\d{9,18})\b/i,  // "A/c: 8947099729" (fallback)
    /\bac\s+no\s*[:\-]+\s*(\d{9,18})\b/i,  // "Ac No- 923010035212958" (handles abbreviated "Ac No")
    /\bac\s+no\s*[,:\-]+\s*(\d{9,18})\b/i,  // "Ac No, - 923010035212958"
    /\baccount\s*(?:no|number|num)?\.?\s*,\s*-\s*(\d{9,18})\b/i,  // "Account No, - 51970100013137"
    /\baccount\s*(?:no|number|num)?\.?\s*[,:\-]+\s*(\d{9,18})\b/i,  // "Account No, - 51970100013137" or "account no: 1234567890"
    /\bacc\s*(?:no|number|num)?\.?\s*,\s*-\s*(\d{9,18})\b/i,  // "acc no, - 1234567890"
    /\bacc\s*(?:no|number|num)?\.?\s*[,:\-]+\s*(\d{9,18})\b/i,  // "acc no, - 1234567890" or "acc no: 1234567890"
    /\b(?:account|acc)\s*,\s*-\s*(\d{9,18})\b/i,  // "account, - 1234567890"
    /\b(?:account|acc)\s*[,:\-]+\s*(\d{9,18})\b/i,  // "account, - 1234567890" or "account: 1234567890"
    /\bmasked\s*(?:account|acc)?\s*(?:no|number|num)?\.?\s*,\s*-\s*(\d{9,18})\b/i,  // "masked account no, - 1234567890"
    /\bmasked\s*(?:account|acc)?\s*(?:no|number|num)?\.?\s*[,:\-]+\s*(\d{9,18})\b/i,  // "masked account no, - 1234567890" or "masked account no: 1234567890"
    /\baccount\s*(?:no|number|num)?\.?\s*[:\-]?\s*(\d{9,18})\b/i,  // "account no: 1234567890" (fallback)
    /\bacc\s*(?:no|number|num)?\.?\s*[:\-]?\s*(\d{9,18})\b/i,  // "acc no: 1234567890" (fallback)
  ];

  for (const pattern of accountNumberPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const cleanedNumber = match[1].replace(/[\s-]/g, '');
      if (/^\d{9,18}$/.test(cleanedNumber)) {
        extracted.accountNumber = cleanedNumber;
        break;
      }
    }
  }

  // If no account number found with patterns, try to find any 9-18 digit number
  // But exclude IFSC codes (11 characters starting with letters)
  if (!extracted.accountNumber) {
    // First try to find standalone numbers on their own line (more reliable)
    const lines = message.split(/\n|\r\n|\r/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip @mentions like "@104462244966527"
      if (trimmedLine.startsWith('@')) continue;
      const standaloneNumMatch = trimmedLine.match(/^(\d{9,18})$/);
      if (standaloneNumMatch) {
        extracted.accountNumber = standaloneNumMatch[1];
        break;
      }
    }
    
    // If still not found, try word boundaries
    if (!extracted.accountNumber) {
      const allNumbers = message.match(/\b(\d{9,18})\b/g);
      if (allNumbers && allNumbers.length > 0) {
        // Filter out numbers that are likely not account numbers
        const validAccountNumbers = allNumbers.filter(num => {
          const cleaned = num.replace(/[\s-]/g, '');
          // Exclude numbers that are exactly 11 digits (likely IFSC) or very short
          return /^\d{9,18}$/.test(cleaned) && cleaned.length >= 9;
        });
        if (validAccountNumbers.length > 0) {
          extracted.accountNumber = validAccountNumbers[0].replace(/[\s-]/g, '');
        }
      }
    }
  }

  // Safety fallback: if extracted account number looks like a phone number,
  // prefer a number from an explicit account-related line.
  // This keeps existing regex logic intact and only corrects mismatches.
  const looksLikePhoneNumber =
    extracted.accountNumber &&
    extracted.accountNumber.length === 10 &&
    message.includes(extracted.accountNumber);

  if (looksLikePhoneNumber) {
    const lines = message.split(/\n|\r\n|\r/);
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const isAccountLine =
        lowerLine.includes("a/c") ||
        lowerLine.includes("account") ||
        lowerLine.includes("acc no") ||
        lowerLine.includes("ac no");

      if (!isAccountLine) continue;

      // Extract long digit tokens from this line without changing regex-based logic.
      let current = "";
      const numericTokens = [];
      for (const ch of line) {
        if (ch >= "0" && ch <= "9") {
          current += ch;
        } else if (current.length > 0) {
          numericTokens.push(current);
          current = "";
        }
      }
      if (current.length > 0) {
        numericTokens.push(current);
      }

      const candidate = numericTokens.find((token) => token.length >= 9 && token.length <= 18);
      if (candidate) {
        extracted.accountNumber = candidate;
        break;
      }
    }
  }

  // Extract Bank Name - improved patterns
  const bankNamePatterns = [
    /(?:^|\n)\s*bank\s+name\s*=\s*([^\n\r]+?)(?:\s*$|\n|\r)/i,  // "BANK NAME = ICICI Bank" (at start of line)
    /\bbank\s+name\s*=\s*([^\n\r]+?)(?:\s*$|\n|\r|\s*account|\s*branch|\s*ifsc)/i,  // "BANK NAME = ICICI Bank"
    /\bbank\s+name\s*=\s*([^\n\r]+)/i,  // "BANK NAME = ICICI Bank" (more flexible)
    /\bbank\s*(?:name)?\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*branch|\s*ifsc|\s*account\s*no)/i,  // "Bank Name, - bank of baroda" or "Bank Name: bank of baroda"
    /\bbank\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*branch|\s*ifsc|\s*account\s*no)/i,  // "Bank, - bank of baroda" or "Bank: bank of baroda"
    /\bbank\s*(?:name)?\s*[:\-]?\s*([A-Z\s&]+(?:BANK|BANK\s+OF|BANK\s+LTD|BANK\s+LIMITED)?)/i,  // "Bank: BANK OF BARODA"
  ];
  for (const pattern of bankNamePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let bankName = match[1].trim();
      // Clean up common suffixes and trailing dashes
      bankName = bankName.replace(/\s*,\s*.*$/, '').trim();
      bankName = bankName.replace(/^-\s*/, '').trim();
      // Remove trailing equals signs or other separators
      bankName = bankName.replace(/[=\-]+\s*$/, '').trim();
      
      // Exclude if it contains metadata keywords
      const lowerBankName = bankName.toLowerCase();
      const excludeKeywords = ['details', 'mask', 'update', 'plz', 'please', 'reference', '@', 'account number', 'ifsc'];
      const hasExcludeKeyword = excludeKeywords.some(keyword => lowerBankName.includes(keyword));
      
      // Bank name should look like a proper bank name (not all lowercase metadata)
      const looksLikeBankName = /^[A-Z]/.test(bankName) || bankName === bankName.toUpperCase();
      
      if (bankName.length > 0 && !hasExcludeKeyword && looksLikeBankName && bankName.length < 100) {
        extracted.bankName = bankName;
        break;
      }
    }
  }

  // Extract IFSC Code - improved patterns (11 characters: 4 letters + 0 + 6 alphanumeric)
  const ifscPatterns = [
    /\bifsc\s*(?:code)?\s*-\s*([A-Z]{4}0[A-Z0-9]{6})\b/i,  // "IFSC - ICIC0003428"
    /\bifsc\s*(?:code)?\s*[,:\-]+\s*([A-Z]{4}0[A-Z0-9]{6})\b/i,  // "IFSC Code, -BARB0CHAPHE" or "IFSC: BARB0CHAPHE"
    /\bifsc\s*[,:\-]+\s*([A-Z]{4}0[A-Z0-9]{6})\b/i,  // "IFSC, -BARB0CHAPHE" or "IFSC BARB0CHAPHE"
    /\bifsc\s*(?:code)?\s*[:\-]?\s*([A-Z]{4}0[A-Z0-9]{6})\b/i,  // "IFSC: BARB0CHAPHE"
    /\b([A-Z]{4}0[A-Z0-9]{6})\b/,  // Standalone IFSC code
  ];
  for (const pattern of ifscPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      extracted.ifscCode = match[1].trim().toUpperCase();
      break;
    }
  }

  // Extract bank name from IFSC code if bank name not found
  if (!extracted.bankName && extracted.ifscCode) {
    const ifscPrefix = extracted.ifscCode.substring(0, 4).toUpperCase();
    const bankNameMap = {
      'HDFC': 'HDFC BANK',
      'ICIC': 'ICICI BANK',
      'SBIN': 'STATE BANK OF INDIA',
      'SBI': 'STATE BANK OF INDIA',
      'PUNB': 'PUNJAB NATIONAL BANK',
      'BARB': 'BANK OF BARODA',
      'BOB': 'BANK OF BARODA',
      'CNRB': 'CANARA BANK',
      'UBIN': 'UNION BANK OF INDIA',
      'IDFB': 'IDFC FIRST BANK',
      'IDFC': 'IDFC FIRST BANK',
      'KKBK': 'KOTAK MAHINDRA BANK',
      'KOTK': 'KOTAK MAHINDRA BANK',
      'AXIS': 'AXIS BANK',
      'UTIB': 'AXIS BANK',
      'YESB': 'YES BANK',
      'INDB': 'INDUSIND BANK',
      'FDRL': 'FEDERAL BANK',
      'IOBA': 'INDIAN OVERSEAS BANK',
      'BKID': 'BANK OF INDIA',
      'CBIN': 'CENTRAL BANK OF INDIA',
    };
    
    if (bankNameMap[ifscPrefix]) {
      extracted.bankName = bankNameMap[ifscPrefix];
    }
  }

  // Extract bank name from email domain (e.g., @hdfcbank, @icicibank)
  if (!extracted.bankName) {
    const emailPattern = /@([a-z]+bank)\.?/i;
    const emailMatch = message.match(emailPattern);
    if (emailMatch && emailMatch[1]) {
      const domainBank = emailMatch[1].toLowerCase();
      const domainBankMap = {
        'hdfcbank': 'HDFC BANK',
        'icicibank': 'ICICI BANK',
        'sbi': 'STATE BANK OF INDIA',
        'pnb': 'PUNJAB NATIONAL BANK',
        'bankofbaroda': 'BANK OF BARODA',
        'canarabank': 'CANARA BANK',
        'unionbank': 'UNION BANK OF INDIA',
        'idfcbank': 'IDFC FIRST BANK',
        'kotakbank': 'KOTAK MAHINDRA BANK',
        'axisbank': 'AXIS BANK',
        'yesbank': 'YES BANK',
        'indusindbank': 'INDUSIND BANK',
        'federalbank': 'FEDERAL BANK',
      };
      
      if (domainBankMap[domainBank]) {
        extracted.bankName = domainBankMap[domainBank];
      } else if (domainBank.includes('bank')) {
        // Generic extraction: capitalize and add BANK if not present
        const bankName = domainBank.replace('bank', '').toUpperCase();
        if (bankName.length > 0) {
          extracted.bankName = bankName + ' BANK';
        }
      }
    }
  }

  // Extract Beneficiary Name (preferred over account holder name)
  const beneficiaryPatterns = [
    /(?:^|\n)\s*([^\n\r]+?)\s*[-–—]+\s*beneficiary\s*(?:name)?\b/i, // "Jeevan Tanaji Sakunde - Beneficiary Name"
    /\bbeneficiary\s*(?:name)?\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*type|\s*bank|\s*branch)/i,  // "Beneficiary Name, - jeevan tanaji sakunde" or "Beneficiary Name: jeevan tanaji sakunde"
    /\bbeneficiary\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*type|\s*bank|\s*branch)/i,  // "Beneficiary, - jeevan tanaji sakunde" or "Beneficiary: jeevan tanaji sakunde"
  ];
  for (const pattern of beneficiaryPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let beneficiaryName = match[1].trim();
      // Clean up trailing dashes and commas
      beneficiaryName = beneficiaryName.replace(/^-\s*/, '').trim();
      beneficiaryName = beneficiaryName.replace(/\s*,\s*$/, '').trim();
      // Reject obviously-bad "names"
      if (beneficiaryName.includes('@') || /\d/.test(beneficiaryName)) {
        continue;
      }
      if (beneficiaryName.length > 0) {
        extracted.beneficiaryName = beneficiaryName;
        break;
      }
    }
  }

  // If Beneficiary Name is not present, try to extract "Name" and use it for beneficiary name
  if (!extracted.beneficiaryName) {
    const namePatterns = [
      /(?:^|\n)\s*([^\n\r]+?)\s*[-–—]+\s*name\b/i, // "DeenDayal Kalwadia - Name"
      /(?:^|\n)\s*name\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*type|\s*bank|\s*branch|\s*number)/i,  // "Name: Mr. Mohammed Waseem" (avoids matching "Branch name:")
      /(?:^|\n)\s*name\s*-\s*([^\n\r]+?)(?:\s*$|\n|\r)/i,  // "Name - ANJANA SAMANTA" (handles dash format on its own line)
      /(?:^|\n)\s*name\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*type|\s*bank|\s*branch|\s*number|\n|\r)/i,  // "Name: Mr. Mohammed Waseem" (avoids matching "Branch name:")
    ];
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let nameValue = match[1].trim();
        // Clean up trailing dashes and commas
        nameValue = nameValue.replace(/^-\s*/, '').trim();
        nameValue = nameValue.replace(/\s*,\s*$/, '').trim();
        // Remove common prefixes like "Mr.", "Mrs.", "Ms.", "Dr."
        nameValue = nameValue.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Master)\s+/i, '').trim();
        // Reject obviously-bad "names"
        if (nameValue.includes('@') || /\d/.test(nameValue)) {
          continue;
        }
        if (nameValue.length > 0) {
          extracted.beneficiaryName = nameValue;
          extracted.accountHolderName = nameValue;
          break;
        }
      }
    }
  }

  // Extract Account Holder Name (if not already set from Name field)
  if (!extracted.accountHolderName) {
    const accountHolderPatterns = [
      /\bbank\s+account\s+holder\s+name\s*=\s*([^\n\r]+?)(?:\s*$|\s*account|\s*type|\s*bank|\s*branch|\s*ifsc)/i,  // "BANK ACCOUNT HOLDER NAME= Hanuj Dua"
      /\baccount\s+holder\s+name\s*=\s*([^\n\r]+?)(?:\s*$|\s*account|\s*type|\s*bank|\s*branch|\s*ifsc)/i,  // "ACCOUNT HOLDER NAME= Hanuj Dua"
      /(?:^|\n)\s*name\s*-\s*([^\n\r]+?)(?:\s*$|\n|\r)/i,  // "Name - ANJANA SAMANTA" (handles dash format on its own line)
      /\ba\/c\s*holder\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*type|\s*bank|\s*branch|\s*ifsc)/i,  // "A/c holder: Sagnik Roy" or "A/c holder, - Sagnik Roy"
      /\baccount\s*holder\s*(?:name)?\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*type|\s*bank|\s*branch)/i,  // "Account Holder Name, - Ashwin Bhukebag" or "Account Holder Name: Ashwin Bhukebag"
      /\bholder\s*(?:name)?\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*type|\s*bank|\s*branch)/i,  // "Holder Name, - Ashwin Bhukebag" or "Holder Name: Ashwin Bhukebag"
    ];
    for (const pattern of accountHolderPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let accountHolderName = match[1].trim();
        // Clean up trailing dashes and commas
        accountHolderName = accountHolderName.replace(/^-\s*/, '').trim();
        accountHolderName = accountHolderName.replace(/\s*,\s*$/, '').trim();
        if (accountHolderName.length > 0) {
          extracted.accountHolderName = accountHolderName;
          break;
        }
      }
    }
  }

  // If beneficiary name found but account holder name not set, use beneficiary name
  if (extracted.beneficiaryName && !extracted.accountHolderName) {
    extracted.accountHolderName = extracted.beneficiaryName;
  }
  
  // If account holder name found but beneficiary name not set, use account holder name for beneficiary name
  if (extracted.accountHolderName && !extracted.beneficiaryName) {
    extracted.beneficiaryName = extracted.accountHolderName;
  }

  // Extract Account Type
  const accountTypePatterns = [
    /\baccount\s*type\s*,\s*-\s*(saving|savings|current|salary|fd|recurring|rd|nro|nre|fcnr)\b/i,  // "Account Type, - Saving" or "Account Type, - savings" (highest priority)
    /\baccount\s+type\s*-\s*(saving|savings|current|salary|fd|recurring|rd|nro|nre|fcnr)\b/i,  // "Account type- Savings"
    /\baccount\s*type\s*[,:\-]+\s*(saving|savings|current|salary|fd|recurring|rd|nro|nre|fcnr)\b/i,  // "Account Type, - savings" or "Account Type: savings"
    /\btype\s*,\s*-\s*(saving|savings|current|salary|fd|recurring|rd|nro|nre|fcnr)\b/i,  // "Type, - Saving" or "Type, - savings"
    /\btype\s*[,:\-]+\s*(saving|savings|current|salary|fd|recurring|rd|nro|nre|fcnr)\b/i,  // "Type, - savings" or "Type: savings"
    /\baccount\s*type\s*[:\-]?\s*(saving|savings|current|salary|fd|recurring|rd|nro|nre|fcnr)\b/i,  // "Account Type: savings" (fallback)
    /\btype\s*[:\-]?\s*(saving|savings|current|salary|fd|recurring|rd|nro|nre|fcnr)\b/i,  // "Type: savings" (fallback)
  ];
  for (const pattern of accountTypePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let accountType = match[1].trim().toLowerCase();
      // Clean up any leading dashes or spaces
      accountType = accountType.replace(/^[-\s]+/, '').trim();
      // Convert "savings" to "saving" (remove 's' at the end)
      if (accountType === 'savings') {
        accountType = 'saving';
      }
      // "saving" is already correct, no conversion needed
      if (accountType.length > 0) {
        extracted.accountType = accountType;
        break;
      }
    }
  }

  // Extract Branch Name - handle multi-line branch names
  // Also support "VALUE - BRANCH NAME"
  if (!extracted.branchName) {
    const reverseBranchMatch = message.match(/(?:^|\n)\s*([^\n\r]+?)\s*[-–—]+\s*branch\s+name\b/i);
    if (reverseBranchMatch && reverseBranchMatch[1]) {
      const cleaned = cleanBranchName(reverseBranchMatch[1]);
      if (cleaned) extracted.branchName = cleaned;
    }
  }

  // Search for "Branch Name" and extract text after it
  const branchNameIndex = message.search(/\bbranch\s+name\s*[:\-]/i);
  if (branchNameIndex !== -1) {
    // Find the start of the branch name value (after "Branch Name -" or "Branch Name:")
    const afterLabel = message.substring(branchNameIndex);
    const valueMatch = afterLabel.match(/\bbranch\s+name\s*[:\-]+\s*([^\n\r]+)/i);
    if (valueMatch && valueMatch[1]) {
      let branchName = valueMatch[1].trim();
      // Clean up leading dashes
      branchName = branchName.replace(/^-\s*/, '').trim();
      
      // Check for continuation on the next line
      const fullMatch = valueMatch[0];
      const matchEndIndex = branchNameIndex + fullMatch.length;
      const afterMatch = message.substring(matchEndIndex);
      // Look for the next non-empty line that might be a continuation
      const lines = afterMatch.split(/\n|\r\n|\r/);
      for (let i = 0; i < Math.min(lines.length, 2); i++) {
        const nextLine = lines[i].trim();
        // Skip empty lines
        if (!nextLine) continue;
        
        // If next line looks like a location/city name (not a label or metadata)
        if (nextLine.length > 0 && 
            !nextLine.toLowerCase().match(/^(branch|bank|account|ifsc|name|type|no|number|masked|update|details|ac\s+no|account\s+holder)/) &&
            !nextLine.match(/^\d+$/) && // Not just numbers
            !nextLine.match(/^[A-Z]{4}0[A-Z0-9]{6}$/i) && // Not an IFSC code
            nextLine.length < 100) {
          branchName = `${branchName} ${nextLine}`;
          break;
        }
      }
      
      branchName = cleanBranchName(branchName);
      if (branchName.length > 0) {
        extracted.branchName = branchName;
      }
    }
  }
  
  // Fallback to other patterns if not found above
  if (!extracted.branchName) {
    const branchPatterns = [
      /(?:your\s+)?bank\s+branch\s+name\s*=\s*([^\n\r]+?)(?:\s*$|\s*account|\s*no|\s*ifsc|\s*bank)/i,  // "YOUR BANK BRANCH NAME= Dwarka" or "BANK BRANCH NAME= Dwarka"
      /\bbranch\s*(?:name)?\s*(?:add)?\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*no|\s*ifsc)/i,  // "Branch Name Add, - BANK OF BARODA, CHAPHEKAR CHOWK" or "Branch Name Add: BANK OF BARODA, CHAPHEKAR CHOWK"
      /\bbranch\s*[,:\-]+\s*([^\n\r]+?)(?:\s*$|\s*account|\s*no|\s*ifsc)/i,  // "Branch, - BANK OF BARODA, CHAPHEKAR CHOWK" or "Branch: BANK OF BARODA, CHAPHEKAR CHOWK"
      /\n([^\n\r]+?\s+branch)\s*$/i,  // Standalone "Chittaranjan Park Branch" on its own line (after newline)
      /^([^\n\r]+?\s+branch)\s*$/im,  // Standalone "Chittaranjan Park Branch" on its own line (multiline mode)
    ];
    for (const pattern of branchPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let branchName = match[1].trim();
        // Clean up leading dashes
        branchName = branchName.replace(/^-\s*/, '').trim();
        
        // Check if there's a continuation on the next line
        const matchIndex = message.indexOf(match[0]);
        if (matchIndex !== -1) {
          const afterMatch = message.substring(matchIndex + match[0].length);
          // Look for the next non-empty line that might be a continuation
          const lines = afterMatch.split(/\n|\r\n|\r/);
          for (let i = 0; i < Math.min(lines.length, 2); i++) {
            const nextLine = lines[i].trim();
            // Skip empty lines
            if (!nextLine) continue;
            
            // If next line looks like a location/city name (not a label or metadata)
            if (nextLine.length > 0 && 
                !nextLine.toLowerCase().match(/^(branch|bank|account|ifsc|name|type|no|number|masked|update|details|ac\s+no|account\s+holder)/) &&
                !nextLine.match(/^\d+$/) && // Not just numbers
                !nextLine.match(/^[A-Z]{4}0[A-Z0-9]{6}$/i) && // Not an IFSC code
                nextLine.length < 100) {
              branchName = `${branchName} ${nextLine}`;
              break;
            }
          }
        }
        
        branchName = cleanBranchName(branchName);
        if (branchName.length > 0) {
          extracted.branchName = branchName;
          break;
        }
      }
    }
  }

  // Fallback: Extract from line-separated format (when no labels are present)
  // Format: Name, Account Type, Bank Name, Branch Name, Account Number, IFSC Code
  if (!extracted.accountNumber || !extracted.bankName || !extracted.accountHolderName) {
    const lines = message.split(/\n|\r\n|\r/).map(line => line.trim()).filter(line => line.length > 0);
    
    // Filter out lines that are clearly labels or metadata
    const dataLines = lines.filter(line => {
      const lowerLine = line.toLowerCase();
      // Skip lines that are labels, mentions, or metadata
      if (lowerLine.includes('@') || 
          lowerLine.includes('masked account') ||
          lowerLine.includes('mask account') ||
          lowerLine.includes('plz update') ||
          lowerLine.includes('please update') ||
          lowerLine.includes('update bank details') ||
          lowerLine.includes('bank details') ||
          lowerLine.includes('details mask') ||
          lowerLine.includes('add reference') ||
          lowerLine.match(/^\d{10}$/) || // Skip phone numbers (10 digits)
          lowerLine.match(/^[A-Z]{5}\d{4}[A-Z]$/)) { // Skip PAN numbers
        return false;
      }
      return true;
    });

    // Try to identify patterns in the remaining lines (process in order)
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      
      // Check for account type (savings, current, etc.) - exact match
      if (!extracted.accountType) {
        const accountTypeMatch = line.match(/^(saving|savings|current|salary|fd|recurring|rd|nro|nre|fcnr)$/i);
        if (accountTypeMatch) {
          let accountType = accountTypeMatch[1].toLowerCase();
          if (accountType === 'savings') accountType = 'saving';
          extracted.accountType = accountType;
          continue;
        }
      }
      
      // Check for IFSC code (4 letters + 0 + 6 alphanumeric) - exact match first
      if (!extracted.ifscCode) {
        const ifscMatch = line.match(/^([A-Z]{4}0[A-Z0-9]{6})$/i);
        if (ifscMatch) {
          extracted.ifscCode = ifscMatch[1].toUpperCase();
          continue;
        }
      }
      
      // Check for account number (9-18 digits only) - exact match
      if (!extracted.accountNumber) {
        const accountNumMatch = line.match(/^(\d{9,18})$/);
        if (accountNumMatch) {
          extracted.accountNumber = accountNumMatch[1];
          continue;
        }
      }
      
      // Check for bank name (contains "bank" or common bank keywords)
      if (!extracted.bankName) {
        const bankKeywords = ['bank', 'national', 'state bank', 'icici', 'hdfc', 'axis', 'sbi', 'pnb', 'punjab', 'bob', 'baroda', 'canara', 'union', 'idfc', 'kotak', 'first', 'yes', 'indian'];
        const lowerLine = line.toLowerCase();
        
        // Exclude lines that contain metadata keywords
        const excludeKeywords = ['update', 'details', 'mask', 'plz', 'please', 'reference', '@'];
        const hasExcludeKeyword = excludeKeywords.some(keyword => lowerLine.includes(keyword));
        
        // Check if line contains bank keywords
        const hasBankKeyword = bankKeywords.some(keyword => lowerLine.includes(keyword));
        // Exclude if it's a number, IFSC code, or location
        const isNotNumber = !line.match(/^\d+$/);
        const isNotIFSC = !line.match(/^[A-Z]{4}0[A-Z0-9]{6}$/i);
        const isNotLocation = !lowerLine.includes('road') && !lowerLine.includes('street') && !lowerLine.includes('branch') && !lowerLine.includes('vadodara') && !lowerLine.includes('mumbai') && !lowerLine.includes('delhi') && !lowerLine.includes('bangalore') && !lowerLine.includes('chennai');
        const isValidLength = line.length > 3 && line.length < 100;
        
        // Bank name should look like a proper bank name (title case or all caps, not all lowercase)
        const looksLikeBankName = /^[A-Z]/.test(line) || line === line.toUpperCase();
        
        if (hasBankKeyword && !hasExcludeKeyword && isNotNumber && isNotIFSC && isNotLocation && isValidLength && looksLikeBankName) {
          extracted.bankName = line;
          continue;
        }
      }
      
      // Check for branch name (location-like, contains comma or location keywords)
      if (!extracted.branchName) {
        const locationKeywords = ['road', 'street', 'avenue', 'nagar', 'colony', 'chowk', 'branch', 'vadodara', 'mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad', 'pune', 'kolkata'];
        const lowerLine = line.toLowerCase();
        if ((locationKeywords.some(keyword => lowerLine.includes(keyword)) || line.includes(',')) && !line.match(/^\d+$/) && !line.match(/^[A-Z]{4}0[A-Z0-9]{6}$/i)) {
          const cleaned = cleanBranchName(line);
          if (cleaned) extracted.branchName = cleaned;
          continue;
        }
      }
      
      // Check for name (person's name - 2-4 words, no numbers, not all keywords)
      if (!extracted.beneficiaryName && !extracted.accountHolderName) {
        // Skip if it matches other patterns
        if (line.match(/^(saving|savings|current|salary|fd|recurring|rd|nro|nre|fcnr)$/i) ||
            line.match(/^\d{9,18}$/) ||
            line.match(/^[A-Z]{4}0[A-Z0-9]{6}$/i)) {
          continue;
        }
        
        // Pattern: Mixed case (like "Praveen Saxena") - most common
        const mixedCaseNameMatch = line.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/);
        if (mixedCaseNameMatch && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 4) {
          extracted.beneficiaryName = line;
          extracted.accountHolderName = line;
          continue;
        }
        
        // Pattern: Title case (first letter uppercase, rest lowercase)
        const titleCaseNameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$/);
        if (titleCaseNameMatch && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 4) {
          extracted.beneficiaryName = line;
          extracted.accountHolderName = line;
          continue;
        }
        
        // Pattern: All caps name (like "PRAVEEN SAXENA") - but not if it contains bank keywords
        const allCapsNameMatch = line.match(/^([A-Z\s]{5,50})$/);
        if (allCapsNameMatch && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 4 && 
            !line.match(/\d/) && 
            !line.toLowerCase().includes('bank') &&
            !line.toLowerCase().includes('road') &&
            !line.toLowerCase().includes('branch')) {
          extracted.beneficiaryName = line;
          extracted.accountHolderName = line;
          continue;
        }
      }
    }
  }

  // Set default account type to "saving" if not extracted
  if (!extracted.accountType || extracted.accountType.trim() === '') {
    extracted.accountType = 'saving';
  }

  // Final safety guard for incorrect bank name extraction.
  // Keep existing regex/logic intact and only correct clearly wrong values
  // like person names being set as bank name.
  if (extracted.bankName) {
    const bankNameNormalized = extracted.bankName.trim().toLowerCase();
    const accountHolderNormalized = extracted.accountHolderName.trim().toLowerCase();
    const beneficiaryNormalized = extracted.beneficiaryName.trim().toLowerCase();
    const looksLikePersonNameAsBank =
      (accountHolderNormalized && bankNameNormalized === accountHolderNormalized) ||
      (beneficiaryNormalized && bankNameNormalized === beneficiaryNormalized) ||
      !bankNameNormalized.includes('bank');

    if (looksLikePersonNameAsBank) {
      // Prefer IFSC prefix mapping when available
      if (extracted.ifscCode) {
        const ifscPrefix = extracted.ifscCode.substring(0, 4).toUpperCase();
        const bankNameMap = {
          'HDFC': 'HDFC BANK',
          'ICIC': 'ICICI BANK',
          'SBIN': 'STATE BANK OF INDIA',
          'SBI': 'STATE BANK OF INDIA',
          'PUNB': 'PUNJAB NATIONAL BANK',
          'BARB': 'BANK OF BARODA',
          'BOB': 'BANK OF BARODA',
          'CNRB': 'CANARA BANK',
          'UBIN': 'UNION BANK OF INDIA',
          'IDFB': 'IDFC FIRST BANK',
          'IDFC': 'IDFC FIRST BANK',
          'KKBK': 'KOTAK MAHINDRA BANK',
          'KOTK': 'KOTAK MAHINDRA BANK',
          'AXIS': 'AXIS BANK',
          'UTIB': 'AXIS BANK',
          'YESB': 'YES BANK',
          'INDB': 'INDUSIND BANK',
          'FDRL': 'FEDERAL BANK',
          'IOBA': 'INDIAN OVERSEAS BANK',
          'BKID': 'BANK OF INDIA',
          'CBIN': 'CENTRAL BANK OF INDIA',
        };
        if (bankNameMap[ifscPrefix]) {
          extracted.bankName = bankNameMap[ifscPrefix];
        }
      }

      // If still unresolved, prefer any clean line containing "bank"
      if (!extracted.bankName || !extracted.bankName.toLowerCase().includes('bank')) {
        const lines = message
          .split(/\n|\r\n|\r/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const bankLine = lines.find((line) => {
          const lower = line.toLowerCase();
          return (
            lower.includes('bank') &&
            !lower.includes('ifsc') &&
            !lower.includes('account') &&
            !lower.includes('a/c')
          );
        });
        if (bankLine) {
          extracted.bankName = bankLine;
        }
      }
    }
  }

  return extracted;
};

const MaskedAccount = forwardRef(({ isSelected }, ref) => {
  const [maskedAccountForm, setMaskedAccountForm] = useState({
    panNumber: "",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    accountHolderName: "",
    accountType: "",
    branchName: "",
    remarks: "Bank details update triggered as per request",
    isMaskedAccount: false, // Flag to determine if this is masked account update
  });
  const [isLoadingMaskedAccount, setIsLoadingMaskedAccount] = useState(false);
  const [panError, setPanError] = useState("");
  const [messageText, setMessageText] = useState("");
  const messageInputRef = useRef(null);

  const handleMaskedAccountInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "panNumber") {
      const formattedValue = formatPAN(value);
      const error = validatePAN(formattedValue);
      setMaskedAccountForm((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
      setPanError(error);
    } else if (name === "remarks") {
      // Remarks field stays as-is (not uppercase)
      setMaskedAccountForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      // All other fields convert to uppercase
      let upperValue = value.toUpperCase();
      // Convert "SAVINGS" to "SAVING" for account type
      if (name === "accountType" && upperValue === "SAVINGS") {
        upperValue = "SAVING";
      }
      setMaskedAccountForm((prev) => ({
        ...prev,
        [name]: upperValue,
      }));
    }
  };

  const handleMaskedAccountSubmit = async () => {
    const panValidationError = validatePAN(maskedAccountForm.panNumber);
    if (panValidationError) {
      toast.error(panValidationError);
      return { success: false, error: panValidationError };
    }

    if (!maskedAccountForm.panNumber.trim()) {
      toast.error("Please enter PAN number");
      return { success: false, error: "Please enter PAN number" };
    }
    if (!maskedAccountForm.remarks.trim()) {
      toast.error("Please enter remarks");
      return { success: false, error: "Please enter remarks" };
    }

    setIsLoadingMaskedAccount(true);

    try {
      // Check if this is a masked account update (from message or explicit flag)
      const isMaskedUpdate = maskedAccountForm.isMaskedAccount;

      // Check if any full bank details fields are filled
      const hasAnyFullDetailField = 
        maskedAccountForm.bankName?.trim() ||
        maskedAccountForm.ifscCode?.trim() ||
        maskedAccountForm.accountHolderName?.trim() ||
        maskedAccountForm.accountType?.trim() ||
        maskedAccountForm.branchName?.trim();

      // If any full detail field is filled, all must be filled (including account_number)
      const hasAllFullDetails = 
        maskedAccountForm.bankName?.trim() &&
        maskedAccountForm.ifscCode?.trim() &&
        maskedAccountForm.accountHolderName?.trim() &&
        maskedAccountForm.accountNumber?.trim();


      // Full bank details update logic
      if (hasAnyFullDetailField && !hasAllFullDetails) {
        setIsLoadingMaskedAccount(false);
        return { success: false, error: "For full bank details update, required fields are: bank_name, account_number, ifsc_code, and account_holder_name" };
      }

      if (!maskedAccountForm.accountNumber?.trim()) {
        setIsLoadingMaskedAccount(false);
        return { success: false, error: "Please provide account number" };
      }

      const data = {
        remarks: maskedAccountForm.remarks.trim(),
      };

      if (hasAllFullDetails) {
        // Full bank details update
        data.bank_name = maskedAccountForm.bankName.trim();
        data.ifsc_code = maskedAccountForm.ifscCode.trim();
        data.account_holder_name = maskedAccountForm.accountHolderName.trim();
        data.account_number = maskedAccountForm.accountNumber.trim();
        
        // Add optional fields if provided
        if (maskedAccountForm.accountType?.trim()) {
          data.account_type = maskedAccountForm.accountType.trim();
        }
        if (maskedAccountForm.branchName?.trim()) {
          data.branch_name = maskedAccountForm.branchName.trim();
        }
      } 

      const response = await updateBankDetailsService(maskedAccountForm.panNumber.trim(), data);

      if (response && response.success) {
        setMaskedAccountForm({
          panNumber: "",
          accountNumber: "",
          bankName: "",
          ifscCode: "",
          accountHolderName: "",
          accountType: "",
          branchName: "",
          remarks: "Bank details update triggered as per request",
          isMaskedAccount: false,
        });
        setPanError("");
        setIsLoadingMaskedAccount(false);
        return { success: true, message: response.message || "Bank details update triggered successfully!" };
      } else {
        setIsLoadingMaskedAccount(false);
        return { success: false, error: response?.message || "Failed to trigger bank details update" };
      }
    } catch (error) {
      console.error("Masked Account Error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to trigger bank details update";
      setIsLoadingMaskedAccount(false);
      return { success: false, error: errorMessage };
    }
  };

  // Expose form data and submit handler to parent
  useImperativeHandle(ref, () => ({
    getFormData: () => maskedAccountForm,
    submit: handleMaskedAccountSubmit,
    isLoading: isLoadingMaskedAccount,
    clearForm: handleClearForm
  }));

  const handleExtractAndAutoFill = () => {
    if (!messageText.trim()) {
      toast.error("Please paste a message first");
      return;
    }

    const extracted = extractDataFromMessage(messageText);

    // At least account number should be extracted
    if (!extracted.accountNumber && !extracted.panNumber) {
      toast.error("Could not extract PAN or account number from the message");
      return;
    }

    // Update form with extracted data
    const updatedForm = { ...maskedAccountForm };
    
    if (extracted.panNumber) {
      updatedForm.panNumber = extracted.panNumber;
      const error = validatePAN(extracted.panNumber);
      setPanError(error);
    }

    // Store account number
    if (extracted.accountNumber) {
      updatedForm.accountNumber = extracted.accountNumber;
    }

    // Store bank details if extracted (convert to uppercase)
    if (extracted.bankName) {
      updatedForm.bankName = extracted.bankName.toUpperCase();
    }
    if (extracted.ifscCode) {
      updatedForm.ifscCode = extracted.ifscCode.toUpperCase();
    }
    
    // Handle account holder name
    if (extracted.accountHolderName) {
      updatedForm.accountHolderName = extracted.accountHolderName.toUpperCase();
    }
    
    // If beneficiary name was extracted but account holder name wasn't, use beneficiary name for account holder name
    if (extracted.beneficiaryName && !extracted.accountHolderName) {
      updatedForm.accountHolderName = extracted.beneficiaryName.toUpperCase();
    }
    // Set account type (default to "saving" if not extracted)
    if (extracted.accountType) {
      let accountType = extracted.accountType.toUpperCase();
      // Convert "SAVINGS" to "SAVING"
      if (accountType === "SAVINGS") {
        accountType = "SAVING";
      }
      updatedForm.accountType = accountType;
    } else {
      // Set default account type to "saving" if not extracted
      updatedForm.accountType = "SAVING";
    }
    if (extracted.branchName) {
      updatedForm.branchName = extracted.branchName.toUpperCase();
    }

    // Set masked account flag if detected in message
    if (extracted.isMaskedAccount) {
      updatedForm.isMaskedAccount = true;
    }

    setMaskedAccountForm(updatedForm);

    // Show success message with details
    const extractedItems = [];
    if (extracted.panNumber) extractedItems.push(`PAN: ${extracted.panNumber}`);
    if (extracted.accountNumber) extractedItems.push(`Account Number: ${extracted.accountNumber}`);
    if (extracted.bankName) extractedItems.push(`Bank: ${extracted.bankName}`);
    if (extracted.ifscCode) extractedItems.push(`IFSC: ${extracted.ifscCode}`);
    if (extracted.accountHolderName) extractedItems.push(`Name: ${extracted.accountHolderName}`);
    if (extracted.accountType) extractedItems.push(`Type: ${extracted.accountType}`);
    if (extracted.branchName) extractedItems.push(`Branch: ${extracted.branchName}`);
    if (extracted.isMaskedAccount) extractedItems.push("Masked Account Mode");
    
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
    setMaskedAccountForm({
      panNumber: "",
      accountNumber: "",
      bankName: "",
      ifscCode: "",
      accountHolderName: "",
      accountType: "",
      branchName: "",
      remarks: "Bank details update triggered as per request",
      isMaskedAccount: false,
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
          <CreditCard className="h-5 w-5 text-brand-link" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Masked Account
          </h2>
          <p className="text-sm text-gray-600">
            Update bank account details
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
          placeholder="Paste message here (e.g., Beneficiary Name: jeevan tanaji sakunde, Account Type: savings, Bank Name: bank of baroda, Branch Name: BANK OF BARODA, CHAPHEKAR CHOWK, Account No: 51970100013137, IFSC Code: BARB0CHAPHE)"
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
          💡 The parser will extract PAN, Account Number, Bank Name, IFSC Code, Account Holder Name, Account Type, and Branch Name from your message.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* PAN Number */}
        <div className="space-y-2">
          <label
            htmlFor="maskedAccountPanNumber"
            className="block text-sm font-semibold text-gray-700"
          >
            PAN Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="maskedAccountPanNumber"
            name="panNumber"
            value={maskedAccountForm.panNumber}
            onChange={handleMaskedAccountInputChange}
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

        {/* Full Bank Details Section */}
        <div className="border-t border-gray-200 pt-4 md:pt-6">
          <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-3 md:mb-4">
            Full Bank Details <span className="text-gray-400 text-xs">(Optional - for full update)</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            💡 If you provide all fields below (Bank Name, IFSC Code, Account Holder Name, and Account Number), it will perform a full bank details update. Otherwise, only the masked account number will be updated.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Bank Name */}
            <div className="space-y-2">
              <label
                htmlFor="bankName"
                className="block text-sm font-semibold text-gray-700"
              >
                Bank Name
              </label>
              <input
                type="text"
                id="bankName"
                name="bankName"
                value={maskedAccountForm.bankName}
                onChange={handleMaskedAccountInputChange}
                placeholder="Enter bank name (e.g., ICICI Bank)"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base uppercase"
              />
            </div>

            {/* IFSC Code */}
            <div className="space-y-2">
              <label
                htmlFor="ifscCode"
                className="block text-sm font-semibold text-gray-700"
              >
                IFSC Code
              </label>
              <input
                type="text"
                id="ifscCode"
                name="ifscCode"
                value={maskedAccountForm.ifscCode}
                onChange={handleMaskedAccountInputChange}
                placeholder="Enter IFSC code (e.g., ICIC0003530)"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base font-mono uppercase"
                maxLength={11}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
            {/* Account Number */}
            <div className="space-y-2">
              <label
                htmlFor="maskedAccountNumber"
                className="block text-sm font-semibold text-gray-700"
              >
                {maskedAccountForm.isMaskedAccount ? "Masked Account Number" : "Account Number"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="maskedAccountNumber"
                name="accountNumber"
                value={maskedAccountForm.accountNumber}
                onChange={handleMaskedAccountInputChange}
                placeholder={maskedAccountForm.isMaskedAccount ? "Enter masked account number (will be extracted from message if available)" : "Enter account number (will be extracted from message if available)"}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base uppercase"
                required
              />
              {maskedAccountForm.isMaskedAccount && (
                <p className="text-xs text-amber-600 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>Masked account update mode detected</span>
                </p>
              )}
            </div>

            {/* Account Holder Name */}
            <div className="space-y-2">
              <label
                htmlFor="accountHolderName"
                className="block text-sm font-semibold text-gray-700"
              >
                Account Holder Name
              </label>
              <input
                type="text"
                id="accountHolderName"
                name="accountHolderName"
                value={maskedAccountForm.accountHolderName}
                onChange={handleMaskedAccountInputChange}
                placeholder="Enter account holder's name"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
            {/* Account Type */}
            <div className="space-y-2">
              <label
                htmlFor="accountType"
                className="block text-sm font-semibold text-gray-700"
              >
                Account Type
              </label>
              <input
                type="text"
                id="accountType"
                name="accountType"
                value={maskedAccountForm.accountType}
                onChange={handleMaskedAccountInputChange}
                placeholder="Enter account type (e.g., savings, current)"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base uppercase"
              />
            </div>
          </div>

        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <label
            htmlFor="maskedAccountRemarks"
            className="block text-sm font-semibold text-gray-700"
          >
            Remarks <span className="text-red-500">*</span>
          </label>
          <textarea
            id="maskedAccountRemarks"
            name="remarks"
            value={maskedAccountForm.remarks}
            onChange={handleMaskedAccountInputChange}
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

MaskedAccount.displayName = 'MaskedAccount';

export default MaskedAccount;