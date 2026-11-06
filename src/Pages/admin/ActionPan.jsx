import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { actionPan, updateSanctionAmount, assignLeadToEmployee, getPerformanceData, getAssignedFreshLeadsData, getAllAssignedLeads, getAssignedReloanLeadsData, updateNarration, updateIncomeSalaryDate, getOtpByMobile, getTokenByPan, bypassAlternateNumber, undisposeLead } from '../../services/functions/admin';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, Clock, Lock, Unlock, DollarSign, Edit, Calendar, Banknote, Mail, Phone, CreditCard, Building2, User, Download, MapPin, FileText, Copy, Wallet, RotateCcw } from 'lucide-react';
import { useSelector } from 'react-redux';
import { getProfile } from '../../services/functions/user';
import EmailBypass from './components/Email_Bypass';
import UpdateMobileNumber from './components/UpdateMobileNumber';
import MaskedAccount from './components/MaskedAccount';
import MoveToBanking from './components/MoveToBanking';
import EnablePincode from './components/EnablePincode';
import DateRangePicker from './components/DateRangePicker';
import UploadBankStatement from './components/UploadBankStatement';
import * as XLSX from 'xlsx';
import { emailBypassUpdate, updateMobileNumber, updateBankDetails, moveToBanking } from '../../services/functions/admin';
import {
  isActionPanPermissionEmail,
  isGetOtpPermissionEmail,
} from '../../constants/permissionEmails';

function ActionPan() {
  const [formData, setFormData] = useState({
    panNumber: '',
    reason: '',
    actionType: '', // 'block' | 'unblock' | 'hold' | 'unhold' | 'updateSanction' | 'changeAssignee' | 'enablePincode' | 'uploadBankStatement'
    loanAmount: '000',
    tenure: '',
    repaymentDate: '',
    assignedTo: '',
    narration: '',
    narrationAmount: '',
    companyName: '',
    month: '',
    salaryDate: '',
    monthlyIncome: '',
    alternatePhoneNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [panError, setPanError] = useState('');
  const [panStatus, setPanStatus] = useState(null); // 'held', 'blocked', 'active', null
  const [userEmail, setUserEmail] = useState('');
  const [canUpdateSanction, setCanUpdateSanction] = useState(false);
  const [canEmailBypass, setCanEmailBypass] = useState(false);
  const [canUpdateMobile, setCanUpdateMobile] = useState(false);
  const [canMaskedAccount, setCanMaskedAccount] = useState(false);
  const [canMoveToBanking, setCanMoveToBanking] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showSpecialActions, setShowSpecialActions] = useState(true);
  const [showGuidelinesActions, setShowGuidelinesActions] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [performanceStartDate, setPerformanceStartDate] = useState('');
  const [performanceEndDate, setPerformanceEndDate] = useState('');
  const [isDownloadingPerformance, setIsDownloadingPerformance] = useState(false);
  const [assignedLeadStartDate, setAssignedLeadStartDate] = useState(getTodayDate());
  const [assignedLeadEndDate, setAssignedLeadEndDate] = useState(getTodayDate());
  const [assignedLeadRows, setAssignedLeadRows] = useState([]);
  const [isLoadingAssignedLeads, setIsLoadingAssignedLeads] = useState(false);
  const [assignedReloanLeadStartDate, setAssignedReloanLeadStartDate] = useState(getTodayDate());
  const [assignedReloanLeadEndDate, setAssignedReloanLeadEndDate] = useState(getTodayDate());
  const [assignedReloanLeadRows, setAssignedReloanLeadRows] = useState([]);
  const [isLoadingAssignedReloanLeads, setIsLoadingAssignedReloanLeads] = useState(false);
  const [isAuthorizedEmail, setIsAuthorizedEmail] = useState(false);
  const [isDownloadingAllAssignedLeads, setIsDownloadingAllAssignedLeads] = useState(false);
  const [sanctionError, setSanctionError] = useState('');
  const [isSalaryDateOverride, setIsSalaryDateOverride] = useState(false);
  const [otpMobileNumber, setOtpMobileNumber] = useState('');
  const [isFetchingOtp, setIsFetchingOtp] = useState(false);
  const [otpResponse, setOtpResponse] = useState(null);
  const [tokenPanNumber, setTokenPanNumber] = useState('');
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [tokenResponse, setTokenResponse] = useState(null);

  // Toggle special actions visibility
  const toggleSpecialActions = useCallback(() => {
    setShowSpecialActions(prev => {
      const newValue = !prev;
      // If hiding special actions and a special action is selected, switch to Block PAN
      if (!newValue && ['emailBypass', 'updateMobileNumber', 'bypassAlternateNumber', 'undisposeLead', 'maskedAccount', 'moveToBanking', 'updateSanction', 'changeAssignee', 'enablePincode', 'uploadBankStatement', 'updateNarration', 'updateIncomeSalaryDate'].includes(formData.actionType)) {
        setFormData(prevForm => ({
          ...prevForm,
          actionType: 'block',
          reason: 'PAN blocked as per request',
          loanAmount: '000',
          tenure: '',
          repaymentDate: '',
          narration: '',
          narrationAmount: '',
          companyName: '',
          month: '',
          salaryDate: '',
          monthlyIncome: '',
          alternatePhoneNumber: ''
        }));
        setPanError('');
        setMessageInput('');
        setIsSalaryDateOverride(false);
      }
      return newValue;
    });
  }, [formData.actionType]);

  const repaymentDateRef = useRef(null);
  const panNumberRef = useRef(null);
  const messageInputRef = useRef(null);
  const emailBypassRef = useRef(null);
  const updateMobileRef = useRef(null);
  const maskedAccountRef = useRef(null);
  const moveToBankingRef = useRef(null);
  const enablePincodeRef = useRef(null);
  const uploadBankStatementRef = useRef(null);
  const assignedTableRef = useRef(null);
  const assignedReloanTableRef = useRef(null);
  const userRoles = useSelector((state) => state.user.allRoles);
  const canAccessAdminOnlyPanActions =
    isActionPanPermissionEmail(userEmail);

  // PAN regex pattern: 5 letters + 4 digits + 1 letter
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  // Get default reason message based on action type
  const getDefaultReason = (actionType) => {
    switch (actionType) {
      // case 'block':
      //   return 'PAN blocked as per request';
      // case 'unblock':
      //   return 'PAN unblocked as per request';
      // case 'hold':
      //   return 'PAN held as per request';
      // case 'unhold':
      //   return 'PAN unheld as per request';
      case 'updateSanction':
        return 'Sanction amount updated as per request';
      case 'enablePincode':
        return 'enable pin as per request';
      case 'moveToBanking':
        return 'moved to banking as per request';
      default:
        return '';
    }
  };

  const validatePAN = (pan) => {
    if (!pan) return '';
    if (!PAN_REGEX.test(pan)) {
      return 'PAN must be in format: ABCDE1234F (5 letters + 4 digits + 1 letter)';
    }
    return '';
  };

  const formatPAN = (value) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Limit to 10 characters
    if (cleaned.length > 10) return cleaned.slice(0, 10);
    return cleaned;
  };

  // Calculate tenure in days from repayment date
  const calculateTenureFromDate = (repaymentDate) => {
    if (!repaymentDate) return '';

    try {
      // Get today's date (without time)
      const today = new Date();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();

      // Parse repayment date (format: YYYY-MM-DD)
      const [year, month, day] = repaymentDate.split('-').map(Number);

      // Create date objects for comparison (both at midnight)
      const todayDate = new Date(todayYear, todayMonth, todayDay);
      const repayment = new Date(year, month - 1, day); // month is 0-indexed

      // Calculate difference in milliseconds
      const diffTime = repayment.getTime() - todayDate.getTime();

      // If repayment date is in the past, return empty
      if (diffTime < 0) return '';

      // Calculate difference in days (convert milliseconds to days)
      // Using Math.floor to get exact day count (both dates are at midnight, so exact division)
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Return days (at least 1 day if there's any difference)
      return diffDays > 0 ? diffDays.toString() : '1';
    } catch (error) {
      console.error('Error calculating tenure:', error);
      return '';
    }
  };

  // Calculate repayment date from tenure (days)
  const calculateDateFromTenure = (tenureDays) => {
    if (!tenureDays || parseFloat(tenureDays) <= 0) return '';

    try {
      const days = parseInt(tenureDays);
      if (isNaN(days) || days <= 0) return '';

      // Get today's date
      const today = new Date();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();

      // Create date object for today
      const todayDate = new Date(todayYear, todayMonth, todayDay);

      // Add tenure days
      const repaymentDate = new Date(todayDate);
      repaymentDate.setDate(todayDate.getDate() + days);

      // Format as YYYY-MM-DD for date input
      const year = repaymentDate.getFullYear();
      const month = String(repaymentDate.getMonth() + 1).padStart(2, '0');
      const day = String(repaymentDate.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error calculating date from tenure:', error);
      return '';
    }
  };

  function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (formData.actionType === 'updateSanction' && sanctionError) {
      setSanctionError('');
    }

    if (name === 'panNumber') {
      const formattedValue = formatPAN(value);
      const error = validatePAN(formattedValue);
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
      setPanError(error);
      // Reset PAN status when PAN number changes
      if (panStatus) setPanStatus(null);
    } else if (name === 'repaymentDate') {
      // Auto-calculate tenure when repayment date is selected
      const calculatedTenure = calculateTenureFromDate(value);
      // Check if calculated tenure exceeds 45 days
      if (calculatedTenure && parseInt(calculatedTenure) > 45) {
        toast.error('Max tenure is 45 days');
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Always update tenure if calculation succeeds, otherwise keep previous value
        tenure: calculatedTenure ? calculatedTenure : prev.tenure
      }));
    } else if (name === 'tenure' && formData.actionType === 'updateSanction') {
      // Validate tenure max 45 days
      const tenureValue = parseFloat(value);
      if (value && !isNaN(tenureValue) && tenureValue > 45) {
        toast.error('Max tenure is 45 days');
        return;
      }
      // Auto-calculate repayment date when tenure is entered
      const calculatedDate = calculateDateFromTenure(value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Always update repayment date if calculation succeeds, otherwise keep previous value
        repaymentDate: calculatedDate ? calculatedDate : prev.repaymentDate
      }));
    } else if (name === 'alternatePhoneNumber') {
      const sanitizedValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: sanitizedValue
      }));
    } else if (name === 'loanAmount' && formData.actionType === 'updateSanction') {
      // Validate loan amount max 1.25 lacs (125000)
      const amountValue = parseFloat(value);
      if (value && !isNaN(amountValue) && amountValue > 125000) {
        toast.error('Max amount is 1.25 lacs');
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleActionChange = (value) => {
    setSanctionError('');
    if (value !== 'updateSanction') {
      setIsSalaryDateOverride(false);
    }

    // Prevent selecting updateSanction if user is not authorized
    if (value === 'updateSanction' && !canUpdateSanction) {
      toast.error('You do not have permission to update sanction');
      return;
    }
    // Prevent selecting emailBypass if user is not authorized
    if (value === 'emailBypass' && !canEmailBypass) {
      toast.error('You do not have permission to bypass email');
      return;
    }
    // Prevent selecting updateMobileNumber if user is not authorized
    if (value === 'updateMobileNumber' && !canUpdateMobile) {
      toast.error('You do not have permission to update mobile number');
      return;
    }
    // Prevent selecting bypassAlternateNumber if user is not authorized
    if (value === 'bypassAlternateNumber' && !isAuthorizedEmail) {
      toast.error('You do not have permission to bypass alternate number');
      return;
    }
    // Prevent selecting undisposeLead if user is not authorized
    if (value === 'undisposeLead' && !canAccessAdminOnlyPanActions) {
      toast.error('You do not have permission to undispose lead');
      return;
    }
    // Prevent selecting maskedAccount if user is not authorized
    if (value === 'maskedAccount' && !canMaskedAccount) {
      toast.error('You do not have permission to update masked account');
      return;
    }
    // Prevent selecting moveToBanking if user is not authorized
    if (value === 'moveToBanking' && !canMoveToBanking) {
      toast.error('You do not have permission to move lead to banking');
      return;
    }
    // Prevent selecting uploadBankStatement if user is not authorized
    if (value === 'uploadBankStatement' && !isGetOtpPermissionEmail(userEmail)) {
      toast.error('You do not have permission to upload bank statement');
      return;
    }
    // Prevent selecting changeAssignee if user is not authorized
    if (value === 'changeAssignee' && !canUpdateSanction) {
      toast.error('You do not have permission to change assignee');
      return;
    }
    if (value === 'updateIncomeSalaryDate' && !canUpdateSanction) {
      toast.error('You do not have permission to update income and salary date');
      return;
    }

    setFormData(prev => {
      // If reason is empty or is the previous default, set new default
      const previousDefault = getDefaultReason(prev.actionType);
      const shouldSetDefault = !prev.reason || prev.reason === previousDefault;

      // Reset repayment date and tenure when switching to updateSanction
      // User must manually select repayment date
      let newRepaymentDate = prev.repaymentDate;
      let newTenure = prev.tenure;
      let newAssignedTo = prev.assignedTo;
      let newNarration = prev.narration;
      let newNarrationAmount = prev.narrationAmount;
      let newCompanyName = prev.companyName;
      let newMonth = prev.month;
      let newSalaryDate = prev.salaryDate;
      let newMonthlyIncome = prev.monthlyIncome;
      if (value === 'updateSanction') {
        // Only reset if switching from another action
        if (prev.actionType !== 'updateSanction') {
          newRepaymentDate = '';
          newTenure = '';
          newAssignedTo = '';
          newNarration = '';
          newNarrationAmount = '';
          newCompanyName = '';
          newMonth = '';
          newSalaryDate = '';
          newMonthlyIncome = '';
        }
      } else if (value === 'changeAssignee') {
        // Only reset if switching from another action
        if (prev.actionType !== 'changeAssignee') {
          newRepaymentDate = '';
          newTenure = '';
          newAssignedTo = '';
          newNarration = '';
          newNarrationAmount = '';
          newCompanyName = '';
          newMonth = '';
          newSalaryDate = '';
          newMonthlyIncome = '';
        }
      } else if (value === 'updateNarration') {
        if (prev.actionType !== 'updateNarration') {
          newRepaymentDate = '';
          newTenure = '';
          newAssignedTo = '';
          newMonthlyIncome = '';
        }
      } else if (value === 'updateIncomeSalaryDate') {
        if (prev.actionType !== 'updateIncomeSalaryDate') {
          newRepaymentDate = '';
          newTenure = '';
          newAssignedTo = '';
          newNarration = '';
          newNarrationAmount = '';
          newCompanyName = '';
          newMonth = '';
          newSalaryDate = '';
          newMonthlyIncome = '';
        }
      } else if (value === 'enablePincode') {
        // Only reset if switching from another action
        if (prev.actionType !== 'enablePincode') {
          newRepaymentDate = '';
          newTenure = '';
          newAssignedTo = '';
          newNarration = '';
          newNarrationAmount = '';
          newCompanyName = '';
          newMonth = '';
          newSalaryDate = '';
          newMonthlyIncome = '';
        }
      } else {
        // Reset repayment date and tenure when switching away from updateSanction or changeAssignee
        newRepaymentDate = '';
        newTenure = '';
        newAssignedTo = '';
        newNarration = '';
        newNarrationAmount = '';
        newCompanyName = '';
        newMonth = '';
        newSalaryDate = '';
        newMonthlyIncome = '';
      }

      return {
        ...prev,
        actionType: value,
        reason: shouldSetDefault ? getDefaultReason(value) : prev.reason,
        repaymentDate: newRepaymentDate,
        tenure: newTenure,
        assignedTo: newAssignedTo,
        narration: newNarration,
        narrationAmount: newNarrationAmount,
        companyName: newCompanyName,
        month: newMonth,
        salaryDate: newSalaryDate,
        monthlyIncome: newMonthlyIncome,
        alternatePhoneNumber: value === 'bypassAlternateNumber' ? prev.alternatePhoneNumber : ''
      };
    });
  };

  const toggleGuidelinesActions = useCallback(() => {
    if (!showGuidelinesActions) {
      setShowGuidelinesActions(true);
      return;
    }

    setShowGuidelinesActions(false);
    if (formData.actionType === 'undisposeLead') {
      setFormData(prevForm => ({
        ...prevForm,
        actionType: 'block',
        reason: 'PAN blocked as per request',
      }));
      setPanError('');
    }
  }, [showGuidelinesActions, formData.actionType]);

  // Parse message and extract PAN, loan amount, tenure, repayment date, pincode, state, and district
  const parseMessage = (message) => {
    const extracted = {
      pan: '',
      loanAmount: '',
      tenure: '',
      repaymentDate: '',
      pincode: '',
      state: '',
      district: ''
    };

    if (!message || !message.trim()) {
      return extracted;
    }

    // Extract PAN (format: 5 letters + 4 digits + 1 letter) - case insensitive
    const panMatch = message.match(/\b[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}\b/);
    if (panMatch) {
      extracted.pan = panMatch[0].toUpperCase();
    }

    // Extract loan amount - handle various formats: ₹23K, 60k, 42000, sanction-60k, saction-60k, amount 42000, Amount revise 50000, Loan Amt: 50k
    const amountPatterns = [
      // Prioritize sanction/saction patterns (most common in user messages)
      /(?:sanction|saction)[\s:]*[₹]?[\s-]+(\d+(?:\.\d+)?)\s*(?:k|K|thousand|thousands)?/i,
      // Handle "Amount revise 50000" or "amount revise"
      /(?:amount|loan\s*amount)[\s:]*revise[\s:]*[₹]?[\s-]*(\d+(?:\.\d+)?)\s*(?:k|K|thousand|thousands)?/i,
      // Handle "Loan Amt: 50k" or "loan amt: 50k" (abbreviated form)
      /(?:loan\s*amt|amt)[\s:]*[₹]?[\s-]+(\d+(?:\.\d+)?)\s*(?:k|K|thousand|thousands)?/i,
      // Handle "amount 50000" or "loan amount 50000"
      /(?:loan\s*amount|amount)[\s:]*[₹]?[\s-]+(\d+(?:\.\d+)?)\s*(?:k|K|thousand|thousands)?/i,
      // Handle standalone amounts with k/K
      /[₹]?\s*(\d+(?:\.\d+)?)\s*(?:k|K|thousand|thousands)/i,
      // Fallback: any amount mention
      /(?:loan\s*amount|loan\s*amt|sanction|saction|amount|amt)[\s:]*[₹]?[\s-]*(\d+(?:\.\d+)?)/i
    ];

    for (const pattern of amountPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let amount = parseFloat(match[1]);
        if (isNaN(amount)) continue;

        // If followed by k/K, multiply by 1000
        if (match[0].toLowerCase().includes('k')) {
          amount = amount * 1000;
        }
        extracted.loanAmount = Math.round(amount).toString();
        break;
      }
    }

    // Extract tenure - handle formats: "34 days", "32 days", "31 days", "tenure-32 days", "tenure 32 days", "tenure -45"
    const tenurePatterns = [
      // Prioritize explicit "tenure" mentions - handles "tenure -45", "tenure-45", "tenure 45", "tenure: 45"
      /tenure[\s:]*[-]?\s*(\d+)(?:\s*days?)?/i,
      // Handle "tenure 32 days" format with explicit "days"
      /tenure[\s-]*(\d+)\s*days?/i,
      // Fallback: any number followed by "days" (but make sure it's not part of a date or phone number)
      // Only match 1-3 digit numbers to avoid matching phone numbers or dates
      /\b(\d{1,3})\s*days?\b/i
    ];

    for (const pattern of tenurePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const tenureValue = parseInt(match[1]);
        // Validate tenure is reasonable (1-365 days) and not a phone number or date component
        if (tenureValue >= 1 && tenureValue <= 365) {
          // Make sure it's not part of a date pattern (DD-MM-YYYY or similar)
          const matchIndex = message.indexOf(match[0]);
          const beforeMatch = message.substring(Math.max(0, matchIndex - 5), matchIndex);
          const afterMatch = message.substring(matchIndex + match[0].length, matchIndex + match[0].length + 5);
          const isPartOfDate = /[-\/]\d{1,2}[-\/]/.test(beforeMatch + match[0] + afterMatch);

          if (!isPartOfDate) {
            extracted.tenure = match[1];
            break;
          }
        }
      }
    }

    // Extract repayment date - handle various formats: 02-01-2026, 31/12/25, 30-12-2025, (02-01-2026)
    const datePatterns = [
      /(?:repayment\s*date|repay\s*date|date)[\s:]*[\(]?(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/i,
      /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/
    ];

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        let day = parseInt(match[1]);
        let month = parseInt(match[2]);
        let year = parseInt(match[3]);

        // Handle 2-digit years
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }

        // Format as YYYY-MM-DD for date input
        extracted.repaymentDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        break;
      }
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

  // Parse message for Change Assignee action - extract PAN and assignee ID
  const parseChangeAssigneeMessage = (message) => {
    const extracted = {
      pan: '',
      assignedTo: ''
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
      /^([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})(?![A-Za-z0-9])/m
    ];

    for (const pattern of panPatterns) {
      const panMatch = message.match(pattern);
      if (panMatch) {
        const pan = panMatch[1] || panMatch[0];
        extracted.pan = pan.toUpperCase();
        break;
      }
    }

    // Extract assignee ID - handle various formats: "ID 48", "ID 12", "assign this to ID 33", "assign to ID 23"
    const assigneePatterns = [
      // "ID 48" or "id 48" (most common)
      /(?:^|\s)(?:ID|id)[\s:]+(\d+)\b/i,
      // "assign this to ID 48" or "assign to ID 48"
      /assign\s+(?:this\s+)?to\s+(?:ID|id)[\s:]+(\d+)/i,
      // "assign ID 48" or "assign id 48"
      /assign\s+(?:ID|id)[\s:]+(\d+)/i,
      // Just a number after "ID" or "id" with various separators
      /(?:ID|id)[\s:]+(\d+)/i
    ];

    for (const pattern of assigneePatterns) {
      const assigneeMatch = message.match(pattern);
      if (assigneeMatch && assigneeMatch[1]) {
        const assigneeId = parseInt(assigneeMatch[1]);
        if (!isNaN(assigneeId) && assigneeId > 0) {
          extracted.assignedTo = assigneeId.toString();
          break;
        }
      }
    }

    return extracted;
  };

  // Handle message parsing for Change Assignee action
  const handleParseChangeAssigneeMessage = () => {
    if (!messageInput.trim()) {
      toast.error('Please paste a message to parse');
      return;
    }

    const extracted = parseChangeAssigneeMessage(messageInput);

    if (!extracted.pan && !extracted.assignedTo) {
      toast.error('Could not extract PAN or assignee ID from message');
      return;
    }

    // Update form data with extracted values
    setFormData(prev => {
      const updates = { ...prev };

      if (extracted.pan) {
        const formattedPAN = formatPAN(extracted.pan);
        const error = validatePAN(formattedPAN);
        updates.panNumber = formattedPAN;
        setPanError(error);
        if (error) {
          toast.error(error);
        }
      }

      if (extracted.assignedTo) {
        updates.assignedTo = extracted.assignedTo;
      }

      return updates;
    });

    // Show success message
    const extractedFields = [];
    if (extracted.pan) extractedFields.push('PAN');
    if (extracted.assignedTo) extractedFields.push('Assignee ID');

    if (extractedFields.length > 0) {
      toast.success(`Extracted: ${extractedFields.join(', ')}`);
    } else {
      toast.error('Could not extract any information from the message');
    }
  };

  const parseBypassAlternateNumberMessage = (message) => {
    const extracted = {
      pan: '',
      phone: ''
    };

    if (!message || !message.trim()) {
      return extracted;
    }

    const panPatterns = [
      /\b([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})\b/,
      /[A-Za-z]{5}\s*[0-9]{4}\s*[A-Za-z]{1}/
    ];

    for (const pattern of panPatterns) {
      const panMatch = message.match(pattern);
      if (panMatch) {
        extracted.pan = formatPAN(panMatch[1] || panMatch[0]);
        break;
      }
    }

    const allNumbers = [];
    const mobilePatterns = [
      /(?:\+91[\s-]?)(\d{10})\b/g,
      /\b91[\s-]?(\d{10})\b/g,
      /\b(\d{10})\b/g,
      /\b(\d{5}[\s-]\d{5})\b/g
    ];

    for (const pattern of mobilePatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const cleanedNumber = match[1].replace(/[\s-]/g, '');
        if (/^\d{10}$/.test(cleanedNumber) && !cleanedNumber.startsWith('0')) {
          allNumbers.push(cleanedNumber);
        }
      }
    }

    const uniqueNumbers = [...new Set(allNumbers)];
    if (uniqueNumbers.length === 1) {
      extracted.phone = uniqueNumbers[0];
    } else if (uniqueNumbers.length > 1) {
      const messageLower = message.toLowerCase();
      const preferredKeywords = [
        'alternate number',
        'alternate no',
        'alt number',
        'alt no',
        'alt mob',
        'bypass',
        'new number',
        'new mobile',
        'mobile number',
        'mobile no',
        'phone number',
        'phone no'
      ];

      let preferredNumber = '';
      for (const keyword of preferredKeywords) {
        const keywordIndex = messageLower.indexOf(keyword);
        if (keywordIndex === -1) continue;
        for (const num of uniqueNumbers) {
          const numIndex = messageLower.indexOf(num);
          if (numIndex > keywordIndex && numIndex < keywordIndex + 80) {
            preferredNumber = num;
            break;
          }
        }
        if (preferredNumber) break;
      }

      extracted.phone = preferredNumber || uniqueNumbers[uniqueNumbers.length - 1];
    }

    return extracted;
  };

  const handleParseBypassAlternateNumberMessage = () => {
    if (!messageInput.trim()) {
      toast.error('Please paste a message to parse');
      return;
    }

    const extracted = parseBypassAlternateNumberMessage(messageInput);

    if (!extracted.pan && !extracted.phone) {
      toast.error('Could not extract PAN or phone number from message');
      return;
    }

    setFormData(prev => {
      const updates = { ...prev };

      if (extracted.pan) {
        const formattedPAN = formatPAN(extracted.pan);
        const error = validatePAN(formattedPAN);
        updates.panNumber = formattedPAN;
        setPanError(error);
        if (panStatus) setPanStatus(null);
        if (error) {
          toast.error(error);
        }
      }

      if (extracted.phone) {
        updates.alternatePhoneNumber = extracted.phone;
      }

      return updates;
    });

    const extractedFields = [];
    if (extracted.pan) extractedFields.push('PAN');
    if (extracted.phone) extractedFields.push('Phone Number');

    if (extractedFields.length > 0) {
      toast.success(`Extracted: ${extractedFields.join(', ')}`);
    }
  };

  const parseUpdateNarrationMessage = (message) => {
    const extracted = {
      pan: '',
      narration: '',
      amount: '',
      companyName: '',
      month: '',
      salaryDate: ''
    };

    if (!message || !message.trim()) {
      return extracted;
    }

    // PAN extraction
    const panMatch = message.match(/\b([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})\b/);
    if (panMatch?.[1]) {
      extracted.pan = panMatch[1].toUpperCase();
    }

    // Narration extraction from "_narration : .... , _amount"
    const narrationBlockMatch = message.match(
      /_narration\s*:\s*([\s\S]*?)(?:,\s*_amount\b|_amount\b)/i
    );
    if (narrationBlockMatch?.[1]) {
      extracted.narration = narrationBlockMatch[1]
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Amount extraction
    const amountMatch = message.match(/_amount\s*:\s*([\d,]+(?:\.\d+)?)/i);
    if (amountMatch?.[1]) {
      extracted.amount = amountMatch[1].replace(/,/g, '');
    }

    // Company name extraction
    const companyMatch = message.match(
      /_company_name\s*:\s*([^\n,]+(?:\n[^\n,]+)*)/i
    );
    if (companyMatch?.[1]) {
      extracted.companyName = companyMatch[1]
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const getMonthAbbrev = (monthValue) => {
      const monthKey = (monthValue || '').trim().toLowerCase();
      const monthMap = {
        jan: 'Jan',
        january: 'Jan',
        feb: 'Feb',
        february: 'Feb',
        mar: 'Mar',
        march: 'Mar',
        apr: 'Apr',
        april: 'Apr',
        may: 'May',
        jun: 'Jun',
        june: 'Jun',
        jul: 'Jul',
        july: 'Jul',
        aug: 'Aug',
        august: 'Aug',
        sep: 'Sep',
        sept: 'Sep',
        september: 'Sep',
        oct: 'Oct',
        october: 'Oct',
        nov: 'Nov',
        november: 'Nov',
        dec: 'Dec',
        december: 'Dec'
      };
      return monthMap[monthKey] || '';
    };

    // Month extraction and normalization to MMM-YYYY (e.g., Apr-2026)
    const monthMatch = message.match(/_month\s*:\s*([^\n,]+)/i);
    if (monthMatch?.[1]) {
      const rawMonth = monthMatch[1].trim();
      const monthYearMatch = rawMonth.match(/([A-Za-z]+)\s*-?\s*(\d{4})/);
      if (monthYearMatch) {
        const monthAbbrev = getMonthAbbrev(monthYearMatch[1]);
        if (monthAbbrev) {
          extracted.month = `${monthAbbrev}-${monthYearMatch[2]}`;
        }
      }
    }

    const monthNumberToAbbrev = (monthNumber) => {
      const monthIndex = parseInt(monthNumber, 10);
      const map = {
        1: 'Jan',
        2: 'Feb',
        3: 'Mar',
        4: 'Apr',
        5: 'May',
        6: 'Jun',
        7: 'Jul',
        8: 'Aug',
        9: 'Sep',
        10: 'Oct',
        11: 'Nov',
        12: 'Dec'
      };
      return map[monthIndex] || '';
    };

    // Salary date extraction and normalization to YYYY-MM-DD for <input type="date">
    const salaryDateMatch = message.match(/_salary_date\s*:\s*([^\n,]+)/i);
    if (salaryDateMatch?.[1]) {
      const rawSalaryDate = salaryDateMatch[1].trim();
      let monthName = '';
      let yearText = '';
      const monthYearFromField = extracted.month.match(/([A-Za-z]+)-(\d{4})/);
      if (monthYearFromField) {
        monthName = monthYearFromField[1];
        yearText = monthYearFromField[2];
      }

      const monthMap = {
        jan: '01',
        feb: '02',
        mar: '03',
        apr: '04',
        may: '05',
        jun: '06',
        jul: '07',
        aug: '08',
        sep: '09',
        oct: '10',
        nov: '11',
        dec: '12'
      };

      // Formats: "1 April", "1 April 2026", "01-04-2026", "2026-04-01"
      const dmyTextMatch = rawSalaryDate.match(
        /^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/i
      );
      const ymdMatch = rawSalaryDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const dmyDashMatch = rawSalaryDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

      if (ymdMatch) {
        extracted.salaryDate = rawSalaryDate;
        if (!extracted.month) {
          const monthAbbrev = monthNumberToAbbrev(ymdMatch[2]);
          if (monthAbbrev) {
            extracted.month = `${monthAbbrev}-${ymdMatch[1]}`;
          }
        }
      } else if (dmyDashMatch) {
        const day = String(parseInt(dmyDashMatch[1], 10)).padStart(2, '0');
        const month = String(parseInt(dmyDashMatch[2], 10)).padStart(2, '0');
        let year = dmyDashMatch[3];
        if (year.length === 2) {
          year = `20${year}`;
        }
        extracted.salaryDate = `${year}-${month}-${day}`;
        if (!extracted.month) {
          const monthAbbrev = monthNumberToAbbrev(month);
          if (monthAbbrev) {
            extracted.month = `${monthAbbrev}-${year}`;
          }
        }
      } else if (dmyTextMatch) {
        const day = String(parseInt(dmyTextMatch[1], 10)).padStart(2, '0');
        const monthToken = (dmyTextMatch[2] || monthName || '').toLowerCase();
        const normalizedMonthToken = monthToken.slice(0, 3);
        const month = monthMap[normalizedMonthToken];
        const year = dmyTextMatch[3] || yearText || String(new Date().getFullYear());
        if (month) {
          extracted.salaryDate = `${year}-${month}-${day}`;
          if (!extracted.month) {
            const monthAbbrev = monthNumberToAbbrev(month);
            if (monthAbbrev) {
              extracted.month = `${monthAbbrev}-${year}`;
            }
          }
        }
      }
    }

    return extracted;
  };

  const handleParseUpdateNarrationMessage = () => {
    if (!messageInput.trim()) {
      toast.error('Please paste a message to parse');
      return;
    }

    const extracted = parseUpdateNarrationMessage(messageInput);
    const hasAnyField = Boolean(
      extracted.pan ||
      extracted.narration ||
      extracted.amount ||
      extracted.companyName ||
      extracted.month ||
      extracted.salaryDate
    );

    if (!hasAnyField) {
      toast.error('Could not extract narration details from message');
      return;
    }

    setFormData((prev) => {
      const updates = { ...prev };

      if (extracted.pan) {
        const formattedPAN = formatPAN(extracted.pan);
        const error = validatePAN(formattedPAN);
        updates.panNumber = formattedPAN;
        setPanError(error);
        if (error) {
          toast.error(error);
        }
      }
      if (extracted.narration) updates.narration = extracted.narration;
      if (extracted.amount) updates.narrationAmount = extracted.amount;
      if (extracted.companyName) updates.companyName = extracted.companyName;
      if (extracted.month) updates.month = extracted.month;
      if (extracted.salaryDate) updates.salaryDate = extracted.salaryDate;

      return updates;
    });

    const extractedFields = [];
    if (extracted.pan) extractedFields.push('PAN');
    if (extracted.narration) extractedFields.push('Narration');
    if (extracted.amount) extractedFields.push('Amount');
    if (extracted.companyName) extractedFields.push('Company Name');
    if (extracted.month) extractedFields.push('Month');
    if (extracted.salaryDate) extractedFields.push('Salary Date');

    toast.success(`Extracted: ${extractedFields.join(', ')}`);
  };

  // Handle message parsing and auto-fill form
  const handleParseMessage = () => {
    if (!messageInput.trim()) {
      toast.error('Please paste a message to parse');
      return;
    }

    const extracted = parseMessage(messageInput);

    // Check if this is an enable pincode message
    const isEnablePincodeMessage = /enable\s*(?:pincode|pin|location)/i.test(messageInput);

    if (isEnablePincodeMessage && extracted.pincode) {
      // Auto-select enablePincode action if not already selected
      if (formData.actionType !== 'enablePincode') {
        setFormData(prev => ({
          ...prev,
          actionType: 'enablePincode'
        }));
      }
      // Show info message to use the component's extract button
      toast.info('Please use the Extract & Auto-Fill button in the Enable Pincode form below');
    }

    if (!extracted.pan && !extracted.loanAmount && !extracted.tenure && !extracted.repaymentDate) {
      toast.error('Could not extract any information from the message');
      return;
    }

    // Update form data with extracted values
    setFormData(prev => {
      const updates = { ...prev };

      if (extracted.pan) {
        const formattedPAN = formatPAN(extracted.pan);
        const error = validatePAN(formattedPAN);
        updates.panNumber = formattedPAN;
        setPanError(error);
        if (error) {
          toast.error(error);
        }
      }

      if (extracted.loanAmount) {
        const amountValue = parseFloat(extracted.loanAmount);
        if (!isNaN(amountValue) && amountValue > 125000) {
          toast.error('Max amount is 1.25 lacs');
        } else {
          updates.loanAmount = extracted.loanAmount;
        }
      }

      if (extracted.tenure) {
        const tenureValue = parseInt(extracted.tenure);
        if (!isNaN(tenureValue) && tenureValue > 45) {
          toast.error('Max tenure is 45 days');
        } else {
          updates.tenure = extracted.tenure;
          // Auto-calculate repayment date if tenure is set
          if (extracted.tenure && !extracted.repaymentDate) {
            const calculatedDate = calculateDateFromTenure(extracted.tenure);
            if (calculatedDate) {
              updates.repaymentDate = calculatedDate;
            }
          }
        }
      }

      if (extracted.repaymentDate) {
        updates.repaymentDate = extracted.repaymentDate;
        // Only auto-calculate tenure if repayment date is set AND tenure wasn't explicitly extracted
        // This prevents overwriting user-specified tenure with calculated value
        if (!extracted.tenure) {
          const calculatedTenure = calculateTenureFromDate(extracted.repaymentDate);
          if (calculatedTenure) {
            const tenureValue = parseInt(calculatedTenure);
            if (tenureValue > 45) {
              toast.error('Max tenure is 45 days');
            } else {
              updates.tenure = calculatedTenure;
            }
          }
        }
      }

      return updates;
    });

    // Show success message
    const extractedFields = [];
    if (extracted.pan) extractedFields.push('PAN');
    if (extracted.loanAmount) extractedFields.push('Loan Amount');
    if (extracted.tenure) extractedFields.push('Tenure');
    if (extracted.repaymentDate) extractedFields.push('Repayment Date');

    if (extractedFields.length > 0) {
      toast.success(`Extracted: ${extractedFields.join(', ')}`);
    }
  };


  // Fetch user profile and check if user can update sanction
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userProfile = await getProfile();
        console.log('User Profile:', userProfile);
        console.log('User Roles from Redux:', userRoles);

        // Check different possible response structures
        let email = '';
        if (userProfile?.employee?.email) {
          email = userProfile.employee.email;
        } else if (userProfile?.email) {
          email = userProfile.email;
        } else if (userProfile?.data?.email) {
          email = userProfile.data.email;
        }

        email = email.trim().toLowerCase();
        setUserEmail(email);

        console.log('Extracted Email:', email);

        const authorizedEmail = isActionPanPermissionEmail(email);
        setIsAuthorizedEmail(authorizedEmail);
        console.log('Email Match:', authorizedEmail);
        const isAdmin = userRoles && (userRoles.includes('ADMIN') || userRoles.includes('admin') || userRoles.some(role => role.toLowerCase() === 'admin'));

        console.log('Is Authorized Email:', authorizedEmail);
        console.log('Is Admin:', isAdmin);

        // const hasPermission = authorizedEmail && isAdmin;
        const hasPermission = authorizedEmail;
        console.log('Has Permission:', hasPermission);
        setCanUpdateSanction(hasPermission);
        setCanEmailBypass(hasPermission);
        setCanUpdateMobile(hasPermission);
        setCanMaskedAccount(hasPermission);
        setCanMoveToBanking(hasPermission);

        // If user doesn't have permission and updateSanction is selected, reset it
        if (!hasPermission) {
          setFormData(prev => {
            if (prev.actionType === 'updateSanction') {
              return {
                ...prev,
                actionType: '',
                loanAmount: '000',
                tenure: '',
                repaymentDate: ''
              };
            }
            if (prev.actionType === 'emailBypass') {
              return {
                ...prev,
                actionType: '',
                reason: ''
              };
            }
            if (prev.actionType === 'updateMobileNumber') {
              return {
                ...prev,
                actionType: '',
                reason: ''
              };
            }
            if (prev.actionType === 'bypassAlternateNumber') {
              return {
                ...prev,
                actionType: '',
                reason: ''
              };
            }
            if (prev.actionType === 'undisposeLead') {
              return {
                ...prev,
                actionType: '',
                reason: ''
              };
            }
            if (prev.actionType === 'maskedAccount') {
              return {
                ...prev,
                actionType: '',
                reason: ''
              };
            }
            if (prev.actionType === 'updateIncomeSalaryDate') {
              return {
                ...prev,
                actionType: '',
                reason: '',
                monthlyIncome: '',
                salaryDate: ''
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setCanUpdateSanction(false);
        setCanEmailBypass(false);
        setCanUpdateMobile(false);
        setCanMaskedAccount(false);
        // Reset if error occurs and updateSanction is selected
        setFormData(prev => {
          if (prev.actionType === 'updateSanction') {
            return {
              ...prev,
              actionType: '',
              loanAmount: '000',
              tenure: '',
              repaymentDate: ''
            };
          }
          if (prev.actionType === 'emailBypass') {
            return {
              ...prev,
              actionType: '',
              reason: ''
            };
          }
          if (prev.actionType === 'updateMobileNumber') {
            return {
              ...prev,
              actionType: '',
              reason: ''
            };
          }
          if (prev.actionType === 'bypassAlternateNumber') {
            return {
              ...prev,
              actionType: '',
              reason: ''
            };
          }
          if (prev.actionType === 'undisposeLead') {
            return {
              ...prev,
              actionType: '',
              reason: ''
            };
          }
          if (prev.actionType === 'maskedAccount') {
            return {
              ...prev,
              actionType: '',
              reason: ''
            };
          }
          if (prev.actionType === 'moveToBanking') {
            return {
              ...prev,
              actionType: '',
              reason: ''
            };
          }
          if (prev.actionType === 'changeAssignee') {
            return {
              ...prev,
              actionType: '',
              assignedTo: ''
            };
          }
          if (prev.actionType === 'updateIncomeSalaryDate') {
            return {
              ...prev,
              actionType: '',
              reason: '',
              monthlyIncome: '',
              salaryDate: ''
            };
          }
          return prev;
        });
      }
    };

    fetchUserProfile();
  }, [userRoles]);

  // Set default action to updateSanction when user has permission and page loads
  useEffect(() => {
    if (canUpdateSanction && !formData.actionType) {
      setFormData(prev => ({
        ...prev,
        actionType: 'updateSanction',
        reason: getDefaultReason('updateSanction')
      }));
    }
  }, [canUpdateSanction, formData.actionType]);

  // Auto-focus message input textarea when updateSanction or changeAssignee is selected
  useEffect(() => {
    if (formData.actionType === 'updateSanction' || formData.actionType === 'changeAssignee') {
      // Small delay to ensure the textarea is rendered
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 150);
    }
  }, [formData.actionType]);

  // Auto-calculate tenure when repayment date changes (for updateSanction action)
  useEffect(() => {
    if (formData.actionType === 'updateSanction' && formData.repaymentDate) {
      const calculatedTenure = calculateTenureFromDate(formData.repaymentDate);
      if (calculatedTenure) {
        setFormData(prev => {
          // Only update if the calculated value is different
          if (prev.tenure !== calculatedTenure) {
            return {
              ...prev,
              tenure: calculatedTenure
            };
          }
          return prev;
        });
      }
    }
  }, [formData.repaymentDate, formData.actionType]);

  // Function to validate all required fields
  const validateAllFields = () => {
    // Check if action type is selected
    if (!formData.actionType) {
      toast.error('Please select an action');
      return false;
    }

    // For special action types, validation is handled by child components
    if (formData.actionType === 'emailBypass' ||
      formData.actionType === 'updateMobileNumber' ||
      formData.actionType === 'maskedAccount' ||
      formData.actionType === 'moveToBanking' ||
      formData.actionType === 'enablePincode' ||
      formData.actionType === 'uploadBankStatement') {
      // Validation will be done in child component's submit handler
      return true;
    }

    // Validate PAN format for standard actions and changeAssignee
    const panValidationError = validatePAN(formData.panNumber);
    if (panValidationError) {
      toast.error(panValidationError);
      return false;
    }
    if (!formData.panNumber.trim()) {
      toast.error('Please enter PAN number');
      return false;
    }

    // Validate changeAssignee action
    if (formData.actionType === 'changeAssignee') {
      if (!formData.assignedTo || !formData.assignedTo.trim()) {
        toast.error('Please enter assigned_to number');
        return false;
      }
      // Validate that assigned_to is a number
      const assignedToNum = parseInt(formData.assignedTo);
      if (isNaN(assignedToNum) || assignedToNum <= 0) {
        toast.error('Assigned to must be a valid positive number');
        return false;
      }
      // changeAssignee doesn't require reason, so return early
      return true;
    }

    if (formData.actionType === 'bypassAlternateNumber') {
      const phone = (formData.alternatePhoneNumber || '').trim();
      if (phone && !/^\d{10}$/.test(phone)) {
        toast.error('Please enter a valid 10-digit phone number');
        return false;
      }
      return true;
    }

    if (formData.actionType === 'undisposeLead') {
      return true;
    }

    if (formData.actionType === 'updateNarration') {
      if (!formData.narration.trim()) {
        toast.error('Please enter narration');
        return false;
      }
      if (!formData.narrationAmount || Number(formData.narrationAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return false;
      }
      if (!formData.companyName.trim()) {
        toast.error('Please enter company name');
        return false;
      }
      if (!formData.month.trim()) {
        toast.error('Please enter month');
        return false;
      }
      if (!formData.salaryDate) {
        toast.error('Please select salary date');
        return false;
      }
      return true;
    }

    if (formData.actionType === 'updateIncomeSalaryDate') {
      const incomeRaw = String(formData.monthlyIncome ?? '').trim();
      if (incomeRaw !== '' && (Number.isNaN(Number(incomeRaw)) || Number(incomeRaw) <= 0)) {
        toast.error('Monthly income must be a positive number when provided');
        return false;
      }
      return true;
    }

    // Check reason/remarks
    const finalReason = formData.reason.trim() || getDefaultReason(formData.actionType);
    if (!finalReason) {
      toast.error('Please enter a reason/remarks');
      return false;
    }

    // For updateSanction action, validate additional fields
    if (formData.actionType === 'updateSanction') {
      if (!formData.loanAmount || parseFloat(formData.loanAmount) <= 0) {
        toast.error('Please enter a valid loan amount');
        return false;
      }
      // Validate max loan amount (1.25 lacs = 125000)
      const loanAmount = parseFloat(formData.loanAmount);
      if (loanAmount > 125000) {
        toast.error('Max amount is 1.25 lacs');
        return false;
      }
      if (!formData.tenure || parseFloat(formData.tenure) <= 0) {
        toast.error('Please enter a valid tenure in days');
        return false;
      }
      // Validate max tenure (45 days)
      const tenure = parseInt(formData.tenure);
      if (tenure > 45) {
        toast.error('Max tenure is 45 days');
        return false;
      }
      if (!formData.repaymentDate) {
        toast.error('Please select a repayment date');
        return false;
      }
    }

    return true;
  };

  // Keyboard shortcut handler (Cmd+Enter for Mac, Ctrl+Enter for Windows)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isSubmitShortcut = isMac
        ? (e.metaKey && e.key === 'Enter')
        : (e.ctrlKey && e.key === 'Enter');

      if (isSubmitShortcut) {
        e.preventDefault();

        // Validate all fields first
        if (validateAllFields()) {
          // Trigger form submission by clicking submit button
          const submitButton = document.querySelector('button[type="submit"]');
          if (submitButton && !submitButton.disabled) {
            submitButton.click();
          }
        }
      }

      // Check for Cmd+B (Mac) or Ctrl+B (Windows/Linux) to toggle special actions
      const isToggleShortcut = isMac
        ? (e.metaKey && e.key === 'b')
        : (e.ctrlKey && e.key === 'b');

      if (isToggleShortcut) {
        e.preventDefault();
        toggleSpecialActions();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [formData, toggleSpecialActions]);

  // Function to check PAN status before performing action
  const checkPanStatus = async (panNumber) => {
    try {
      // Check if PAN is blocked by looking for it in blacklisted_pan table
      // For now, we'll skip the status check and let the backend handle validation
      // This prevents the frontend validation mismatch
      return null; // Return null to skip frontend validation
    } catch (error) {
      console.log('Could not check PAN status, proceeding with action');
      return null; // Return null to skip frontend validation
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSanctionError('');

    // Validate all required fields first
    if (!validateAllFields()) {
      return;
    }

    // Use default reason if reason is empty or just whitespace
    const finalReason = formData.reason.trim() || getDefaultReason(formData.actionType);

    setIsLoading(true);

    try {
      // Check PAN status before performing action (skip for enablePincode and uploadBankStatement as they handle PAN validation internally)
      if (formData.actionType !== 'enablePincode' && formData.actionType !== 'uploadBankStatement') {
        const currentStatus = await checkPanStatus(formData.panNumber.trim());
        setPanStatus(currentStatus);

        // Skip frontend validation if status check is not available
        // Let the backend handle all validation
        if (currentStatus === null) {
          console.log('Skipping frontend validation, letting backend handle it');
        } else {
          // Validation checks (only if status is available)
          if (formData.actionType === 'hold' && currentStatus === 'held') {
            toast.error('This PAN is already held!');
            setIsLoading(false);
            return;
          }

          if (formData.actionType === 'unhold' && currentStatus !== 'held') {
            toast.error('This PAN is not currently held!');
            setIsLoading(false);
            return;
          }

          if (formData.actionType === 'block' && currentStatus === 'blocked') {
            toast.error('This PAN is already blocked!');
            setIsLoading(false);
            return;
          }

          if (formData.actionType === 'unblock' && currentStatus !== 'blocked') {
            toast.error('This PAN is not currently blocked!');
            setIsLoading(false);
            return;
          }
        }
      }

      let response;
      let successMessage = '';

      // Handle special action types that use child components
      if (formData.actionType === 'emailBypass') {
        if (!emailBypassRef.current) {
          toast.error('Email Bypass form not available');
          setIsLoading(false);
          return;
        }
        response = await emailBypassRef.current.submit();
        if (response.success) {
          successMessage = response.message || 'Email bypassed successfully!';
          emailBypassRef.current.clearForm();
        } else {
          toast.error(response.error || 'Failed to bypass email');
          setIsLoading(false);
          return;
        }
      } else if (formData.actionType === 'updateMobileNumber') {
        if (!updateMobileRef.current) {
          toast.error('Update Mobile Number form not available');
          setIsLoading(false);
          return;
        }
        response = await updateMobileRef.current.submit();
        if (response.success) {
          successMessage = response.message || 'Mobile number updated successfully!';
          updateMobileRef.current.clearForm();
        } else {
          toast.error(response.error || 'Failed to update mobile number');
          setIsLoading(false);
          return;
        }
      } else if (formData.actionType === 'maskedAccount') {
        if (!maskedAccountRef.current) {
          toast.error('Masked Account form not available');
          setIsLoading(false);
          return;
        }
        response = await maskedAccountRef.current.submit();
        if (response.success) {
          successMessage = response.message || 'Bank details updated successfully!';
          maskedAccountRef.current.clearForm();
        } else {
          toast.error(response.error || 'Failed to update bank details');
          setIsLoading(false);
          return;
        }
      } else if (formData.actionType === 'moveToBanking') {
        if (!moveToBankingRef.current) {
          toast.error('Move to Banking form not available');
          setIsLoading(false);
          return;
        }
        response = await moveToBankingRef.current.submit();
        if (response.success) {
          successMessage = response.message || 'Lead moved to banking successfully!';
          moveToBankingRef.current.clearForm();
        } else {
          toast.error(response.error || 'Failed to move lead to banking');
          setIsLoading(false);
          return;
        }
      } else if (formData.actionType === 'updateSanction') {
        // Format repayment date from YYYY-MM-DD to "YYYY-MM-DD HH:MM:SS" format
        const repaymentDateFormatted = formData.repaymentDate
          ? `${formData.repaymentDate} 00:00:00`
          : '';

        const sanctionData = {
          loan_amount: parseFloat(formData.loanAmount),
          tenure: parseInt(formData.tenure),
          repayment_date: repaymentDateFormatted,
          remarks: finalReason,
          is_sal_override: isSalaryDateOverride
        };

        try {
          response = await updateSanctionAmount(
            formData.panNumber.trim(),
            sanctionData
          );
        } catch (error) {
          const backendError =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'Failed to update sanction amount';
          setSanctionError(backendError);
          throw error;
        }
        if (response.success) {
          successMessage = 'Sanction amount updated successfully!';
        }
      } else if (formData.actionType === 'changeAssignee') {
        response = await assignLeadToEmployee(
          formData.panNumber.trim(),
          parseInt(formData.assignedTo.trim())
        );
        if (response.success) {
          successMessage = 'Lead assigned to employee successfully!';
        }
      } else if (formData.actionType === 'bypassAlternateNumber') {
        response = await bypassAlternateNumber(
          formData.panNumber.trim(),
          (formData.alternatePhoneNumber || '').trim() || undefined
        );
        if (response.success) {
          successMessage = response.message || 'Alternate number bypassed successfully!';
        }
      } else if (formData.actionType === 'undisposeLead') {
        response = await undisposeLead(formData.panNumber.trim());
        if (response.success) {
          successMessage = response.message || 'Lead undisposed successfully!';
        }
      } else if (formData.actionType === 'updateNarration') {
        response = await updateNarration({
          _narration: formData.narration.trim(),
          _amount: Number(formData.narrationAmount),
          _company_name: formData.companyName.trim(),
          _month: formData.month.trim(),
          _salary_date: formData.salaryDate,
          pan: formData.panNumber.trim()
        });
        if (response.success) {
          successMessage = response.message || 'Narration updated successfully!';
        } else {
          successMessage = response.message || 'Narration update request completed';
        }
      } else if (formData.actionType === 'updateIncomeSalaryDate') {
        const incomePayload = {};
        const incomeRaw = String(formData.monthlyIncome ?? '').trim();
        if (incomeRaw !== '' && !Number.isNaN(Number(incomeRaw))) {
          incomePayload.monthly_income = Number(incomeRaw);
        }
        if (formData.salaryDate) {
          incomePayload.salary_date = formData.salaryDate;
        }
        response = await updateIncomeSalaryDate(
          formData.panNumber.trim(),
          incomePayload
        );
        if (response.success) {
          successMessage =
            response.message || 'Income salary date updated successfully!';
        }
      } else if (formData.actionType === 'enablePincode') {
        if (!enablePincodeRef.current) {
          toast.error('Enable Pincode form not available');
          setIsLoading(false);
          return;
        }
        response = await enablePincodeRef.current.submit();
        if (response.success) {
          successMessage = response.message || 'Pincode enabled successfully!';
          enablePincodeRef.current.clearForm();
        } else {
          toast.error(response.error || 'Failed to enable pincode');
          setIsLoading(false);
          return;
        }
      } else if (formData.actionType === 'uploadBankStatement') {
        if (!uploadBankStatementRef.current) {
          toast.error('Upload Bank Statement form not available');
          setIsLoading(false);
          return;
        }
        response = await uploadBankStatementRef.current.submit();
        if (response.success) {
          successMessage = response.message || 'Bank statement uploaded successfully!';
          uploadBankStatementRef.current.clearForm();
        } else {
          toast.error(response.error || 'Failed to upload bank statement');
          setIsLoading(false);
          return;
        }
      } else {
        // Use single actionPan function with action parameter
        response = await actionPan(
          formData.panNumber.trim(),
          formData.actionType, // 'block', 'unblock', 'hold', 'unhold'
          finalReason
        );
        if (response.success) {
          switch (formData.actionType) {
            case 'block':
              successMessage = 'PAN blocked successfully!';
              break;
            case 'unblock':
              successMessage = 'PAN unblocked successfully!';
              break;
            case 'hold':
              successMessage = 'PAN held successfully!';
              break;
            case 'unhold':
              successMessage = 'PAN unheld successfully!';
              break;
            default:
              successMessage = 'Action successful!';
          }
        }
      }

      if (response && response.success) {
        toast.success(successMessage);
        setFormData({
          panNumber: '',
          reason: '',
          actionType: '',
          loanAmount: '000',
          tenure: '',
          repaymentDate: '',
          assignedTo: '',
          narration: '',
          narrationAmount: '',
          companyName: '',
          month: '',
          salaryDate: '',
          monthlyIncome: '',
          alternatePhoneNumber: ''
        });
        setPanError('');
        setMessageInput('');
        setIsSalaryDateOverride(false);
      } else if (response && !response.success) {
        toast.error(response.message || response.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error:', error);
      // Show backend validation errors properly
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to process request');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getActionLabel = () => {
    switch (formData.actionType) {
      case 'block':
        return 'Block PAN';
      case 'unblock':
        return 'Unblock PAN';
      case 'hold':
        return 'Hold PAN';
      case 'unhold':
        return 'Unhold PAN';
      case 'updateSanction':
        return 'Update Sanction Amount';
      case 'emailBypass':
        return 'Email Bypass';
      case 'updateMobileNumber':
        return 'Update Mobile Number';
      case 'bypassAlternateNumber':
        return 'Bypass Alternate Number';
      case 'undisposeLead':
        return 'Undispose Lead';
      case 'maskedAccount':
        return 'Update Bank Details';
      case 'moveToBanking':
        return 'Move to Banking';
      case 'changeAssignee':
        return 'Change Assignee';
      case 'updateNarration':
        return 'Update Narration';
      case 'updateIncomeSalaryDate':
        return 'Update Income & Salary Date';
      case 'enablePincode':
        return 'Enable pincode';
      case 'uploadBankStatement':
        return 'Upload Bank Statement';
      default:
        return 'Select Action';
    }
  };

  // Get current month start and end dates (end date is yesterday)
  const getThisMonthDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    // Set end date to yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(firstDay),
      endDate: formatDate(yesterday)
    };
  };

  // Handle date range selection
  const handleDateRangeSelect = (startDate, endDate) => {
    setPerformanceStartDate(startDate);
    setPerformanceEndDate(endDate);
  };

  // Handle "This Month" button click
  const handleThisMonthClick = () => {
    const { startDate, endDate } = getThisMonthDates();
    setPerformanceStartDate(startDate);
    setPerformanceEndDate(endDate);
  };

  const fetchAssignedFreshLeads = useCallback(
    async (startDateParam, endDateParam) => {
      if (!startDateParam || !endDateParam) {
        toast.error('Please select both start and end dates');
        return;
      }
      setIsLoadingAssignedLeads(true);
      try {
        const response = await getAssignedFreshLeadsData(startDateParam, endDateParam);
        let rows = [];
        if (Array.isArray(response)) {
          rows = response;
        } else if (Array.isArray(response?.data)) {
          rows = response.data;
        } else if (Array.isArray(response?.data?.data)) {
          rows = response.data.data;
        }
        setAssignedLeadRows(rows);
      } catch (error) {
        console.error('Error fetching assigned leads data:', error);
        toast.error(error?.response?.data?.message || error.message || 'Failed to load assigned leads data');
      } finally {
        setIsLoadingAssignedLeads(false);
      }
    },
    []
  );

  const fetchAssignedReloanLeads = useCallback(
    async (startDateParam, endDateParam) => {
      if (!startDateParam || !endDateParam) {
        toast.error('Please select both start and end dates');
        return;
      }
      setIsLoadingAssignedReloanLeads(true);
      try {
        const response = await getAssignedReloanLeadsData(startDateParam, endDateParam);
        let rows = [];
        if (Array.isArray(response)) {
          rows = response;
        } else if (Array.isArray(response?.data)) {
          rows = response.data;
        } else if (Array.isArray(response?.data?.data)) {
          rows = response.data.data;
        }
        setAssignedReloanLeadRows(rows);
      } catch (error) {
        console.error('Error fetching assigned reloan leads data:', error);
        toast.error(error?.response?.data?.message || error.message || 'Failed to load assigned reloan leads data');
      } finally {
        setIsLoadingAssignedReloanLeads(false);
      }
    },
    []
  );

  const handleDownloadAssignedScreenshot = async () => {
    if (!assignedLeadRows || assignedLeadRows.length === 0) {
      toast.error('Please fetch data first');
      return;
    }
    if (!assignedTableRef.current) return;
    try {
      const canvas = await html2canvas(assignedTableRef.current, {
        backgroundColor: '#111827', // match dark background
        scale: 2
      });
      const link = document.createElement('a');
      const startLabel = assignedLeadStartDate || 'start';
      const endLabel = assignedLeadEndDate || 'end';
      link.download = `assigned-leads-${startLabel}-to-${endLabel}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      toast.error('Failed to save screenshot');
    }
  };

  const handleDownloadAssignedReloanScreenshot = async () => {
    if (!assignedReloanLeadRows || assignedReloanLeadRows.length === 0) {
      toast.error('Please fetch data first');
      return;
    }
    if (!assignedReloanTableRef.current) return;
    try {
      const canvas = await html2canvas(assignedReloanTableRef.current, {
        backgroundColor: '#111827', // match dark background
        scale: 2
      });
      const link = document.createElement('a');
      const startLabel = assignedReloanLeadStartDate || 'start';
      const endLabel = assignedReloanLeadEndDate || 'end';
      link.download = `assigned-reloan-leads-${startLabel}-to-${endLabel}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error capturing reloan screenshot:', error);
      toast.error('Failed to save screenshot');
    }
  };

  // Format date-time fields to readable format
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';

    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return dateTimeString; // Return original if invalid date

      // Format as YYYY-MM-DD HH:mm:ss
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateTimeString; // Return original if error
    }
  };

  // Handle download all assigned leads
  const handleDownloadAllAssignedLeads = async () => {
    setIsDownloadingAllAssignedLeads(true);
    try {
      const response = await getAllAssignedLeads();

      // Handle different response structures
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.data && Array.isArray(response.data)) {
        dataArray = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        dataArray = response.data.data;
      } else {
        // If response structure is different, try to find array
        const findArray = (obj) => {
          if (Array.isArray(obj)) return obj;
          if (typeof obj !== 'object' || obj === null) return null;
          for (const key in obj) {
            const result = findArray(obj[key]);
            if (result) return result;
          }
          return null;
        };
        const foundArray = findArray(response);
        if (foundArray) {
          dataArray = foundArray;
        } else {
          throw new Error('No array data found in response');
        }
      }

      if (!dataArray || dataArray.length === 0) {
        toast.error('No assigned leads data available');
        setIsDownloadingAllAssignedLeads(false);
        return;
      }

      // Format date-time fields in the data array
      const formattedDataArray = dataArray.map(item => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const formattedItem = { ...item };

          // Format any date-time fields if they exist
          Object.keys(formattedItem).forEach(key => {
            if (formattedItem[key] && typeof formattedItem[key] === 'string') {
              // Check if it's a date-time string
              const dateMatch = formattedItem[key].match(/^\d{4}-\d{2}-\d{2}/);
              if (dateMatch) {
                try {
                  const date = new Date(formattedItem[key]);
                  if (!isNaN(date.getTime())) {
                    formattedItem[key] = formatDateTime(formattedItem[key]);
                  }
                } catch (error) {
                  // Keep original value if formatting fails
                }
              }
            }
          });

          return formattedItem;
        }
        return item;
      });

      // Convert array to worksheet
      let worksheet;
      if (formattedDataArray.length > 0 && typeof formattedDataArray[0] === 'object' && !Array.isArray(formattedDataArray[0])) {
        // Array of objects - each object becomes a row
        worksheet = XLSX.utils.json_to_sheet(formattedDataArray);
      } else {
        // Array of arrays - each array becomes a row
        worksheet = XLSX.utils.aoa_to_sheet(formattedDataArray);
      }

      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'All Assigned Leads');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.download = `all-assigned-leads-${today}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('All assigned leads downloaded successfully!');
    } catch (error) {
      console.error('Error downloading all assigned leads:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to download all assigned leads');
    } finally {
      setIsDownloadingAllAssignedLeads(false);
    }
  };

  // Handle performance data download
  const handleDownloadPerformance = async () => {
    if (!performanceStartDate || !performanceEndDate) {
      toast.error('Please select a date range or click "This Month"');
      return;
    }

    setIsDownloadingPerformance(true);
    try {
      const response = await getPerformanceData(performanceStartDate, performanceEndDate);

      // Handle array response - extract data array from response
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.data && Array.isArray(response.data)) {
        dataArray = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        dataArray = response.data.data;
      } else {  
        // If response structure is different, try to find array
        const findArray = (obj) => {
          if (Array.isArray(obj)) return obj;
          if (typeof obj !== 'object' || obj === null) return null;
          for (const key in obj) {
            const result = findArray(obj[key]);
            if (result) return result;
          }
          return null;
        };
        const foundArray = findArray(response);
        if (foundArray) {
          dataArray = foundArray;
        } else {
          throw new Error('No array data found in response');
        }
      }

      if (!dataArray || dataArray.length === 0) {
        toast.error('No data available for the selected date range');
        setIsDownloadingPerformance(false);
        return;
      }

      // Format date-time fields in the data array
      const formattedDataArray = dataArray.map(item => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const formattedItem = { ...item };

          // Format repayment_date if it exists
          if (formattedItem.repayment_date) {
            formattedItem.repayment_date = formatDateTime(formattedItem.repayment_date);
          }

          // Format disbursal_date if it exists
          if (formattedItem.disbursal_date) {
            formattedItem.disbursal_date = formatDateTime(formattedItem.disbursal_date);
          }

          return formattedItem;
        }
        return item;
      });

      // Convert array to worksheet
      // If first element is an object, use its keys as headers
      let worksheet;
      if (formattedDataArray.length > 0 && typeof formattedDataArray[0] === 'object' && !Array.isArray(formattedDataArray[0])) {
        // Array of objects - each object becomes a row
        worksheet = XLSX.utils.json_to_sheet(formattedDataArray);
      } else {
        // Array of arrays - each array becomes a row
        worksheet = XLSX.utils.aoa_to_sheet(formattedDataArray);
      }

      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Performance Data');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `performance data ${performanceStartDate} to ${performanceEndDate}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Performance data downloaded successfully!');
    } catch (error) {
      console.error('Error downloading performance data:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to download performance data');
    } finally {
      setIsDownloadingPerformance(false);
    }
  };

  const handleGetOtp = async () => {
    const mobile = otpMobileNumber.trim();

    if (!mobile) {
      toast.error('Please enter mobile number');
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      toast.error('Mobile number must be 10 digits');
      return;
    }

    setIsFetchingOtp(true);
    setOtpResponse(null);

    try {
      const response = await getOtpByMobile(mobile);
      setOtpResponse(response);
      toast.success(response?.message || 'OTP fetched successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch OTP';
      toast.error(errorMessage);
      setOtpResponse({ success: false, message: errorMessage });
    } finally {
      setIsFetchingOtp(false);
    }
  };

  const handleCopyOtp = async () => {
    const otpValue =
      otpResponse?.data?.otp ??
      otpResponse?.otp ??
      (typeof otpResponse?.data === 'string' ? otpResponse.data : '');

    if (!otpValue) {
      toast.error('No OTP available to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(String(otpValue));
      toast.success('OTP copied');
    } catch (error) {
      toast.error('Failed to copy OTP');
    }
  };

  const handleGetToken = async () => {
    const pan = tokenPanNumber.trim().toUpperCase();

    if (!pan) {
      toast.error('Please enter PAN number');
      return;
    }

    if (!PAN_REGEX.test(pan)) {
      toast.error('PAN must be in format: ABCDE1234F');
      return;
    }

    setIsFetchingToken(true);
    setTokenResponse(null);

    try {
      const response = await getTokenByPan(pan);
      setTokenResponse(response);
      const tokenValue =
        response?.data?.token ??
        response?.token ??
        (typeof response?.data === 'string' ? response.data : '');

      if (tokenValue) {
        localStorage.setItem('authToken', String(tokenValue));
        const thankYouUrl = import.meta.env.VITE_THANK_YOU_URL || 'https://www.theloanjunction.com/apply/thank-you';
        const targetUrl = `${thankYouUrl}?authToken=${encodeURIComponent(String(tokenValue))}`;
   
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
      toast.success(response?.message || 'Token fetched successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch token';
      toast.error(errorMessage);
      setTokenResponse({ success: false, message: errorMessage });
    } finally {
      setIsFetchingToken(false);
    }
  };

  const handleCopyToken = async () => {
    const tokenValue =
      tokenResponse?.data?.token ??
      tokenResponse?.token ??
      (typeof tokenResponse?.data === 'string' ? tokenResponse.data : '');

    if (!tokenValue) {
      toast.error('No token available to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(String(tokenValue));
      toast.success('Token copied');
    } catch (error) {
      toast.error('Failed to copy token');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-extra-light to-brand-light p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        {/* <div className="relative overflow-hidden bg-gradient-to-r from-brand-dark via-blue-600 to-brand-hover rounded-xl md:rounded-2xl shadow-2xl mb-4 md:mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative p-4 sm:p-6 md:p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
              <div className="p-2 sm:p-3 bg-white/20 rounded-lg md:rounded-xl backdrop-blur-sm self-start sm:self-auto">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">PAN Management System</h1>
                <p className="text-blue-100 text-sm sm:text-base md:text-lg">Secure control over PAN blocking, holding, unblocking, and unholding operations</p>
              </div>
            </div>
          </div>
        </div> */}
        {/* Main Content */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
                <h2
                  onClick={toggleSpecialActions}
                  className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-0 transition-colors"
                  title="Click to toggle special actions (Cmd+B / Ctrl+B)"
                >
                  Action Panel
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    {showPreview ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                {/* Action Toggle */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-200">
                  <label className="text-sm font-semibold text-gray-700 mb-3 md:mb-4 block">Select Action:</label>
                  <div className={`grid grid-cols-2 sm:grid-cols-3 ${canUpdateSanction && canEmailBypass && canUpdateMobile ? 'lg:grid-cols-4' : (canUpdateSanction && canEmailBypass) || (canUpdateSanction && canUpdateMobile) || (canEmailBypass && canUpdateMobile) ? 'lg:grid-cols-6' : canUpdateSanction || canEmailBypass || canUpdateMobile ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 md:gap-4`}>
                    {/* Block PAN */}
                    <label
                      className={`group relative cursor-pointer transition-all duration-300
                        ${formData.actionType === 'block'
                          ? 'scale-105 shadow-lg border-red-500 bg-gradient-to-br from-red-50 to-red-100'
                          : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-red-300'}
                        rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                      `}
                    >
                      <input
                        type="radio"
                        name="actionType"
                        value="block"
                        checked={formData.actionType === 'block'}
                        onChange={() => handleActionChange('block')}
                        className="sr-only"
                      />
                      <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-100 group-hover:bg-red-200">
                        <Lock className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                      </div>
                      <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Block PAN</div>
                      <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Prevent loan applications</div>
                      {formData.actionType === 'block' && (
                        <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        </div>
                      )}
                    </label>
                    {/* Unblock PAN */}
                    <label
                      className={`group relative cursor-pointer transition-all duration-300
                        ${formData.actionType === 'unblock'
                          ? 'scale-105 shadow-lg border-green-500 bg-gradient-to-br from-green-50 to-green-100'
                          : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-green-300'}
                        rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                      `}
                    >
                      <input
                        type="radio"
                        name="actionType"
                        value="unblock"
                        checked={formData.actionType === 'unblock'}
                        onChange={() => handleActionChange('unblock')}
                        className="sr-only"
                      />
                      <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-100 group-hover:bg-green-200">
                        <Unlock className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                      </div>
                      <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Unblock PAN</div>
                      <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Restore loan access</div>
                      {formData.actionType === 'unblock' && (
                        <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        </div>
                      )}
                    </label>
                    {/* Hold PAN */}
                    <label
                      className={`group relative cursor-pointer transition-all duration-300
                        ${formData.actionType === 'hold'
                          ? 'scale-105 shadow-lg border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100'
                          : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-orange-300'}
                        rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                      `}
                    >
                      <input
                        type="radio"
                        name="actionType"
                        value="hold"
                        checked={formData.actionType === 'hold'}
                        onChange={() => handleActionChange('hold')}
                        className="sr-only"
                      />
                      <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-orange-100 group-hover:bg-orange-200">
                        <Clock className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                      </div>
                      <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Hold PAN</div>
                      <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Temporarily suspend access</div>
                      {formData.actionType === 'hold' && (
                        <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        </div>
                      )}
                    </label>
                    {/* Unhold PAN */}
                    <label
                      className={`group relative cursor-pointer transition-all duration-300
                        ${formData.actionType === 'unhold'
                          ? 'scale-105 shadow-lg border-brand bg-gradient-to-br from-brand-extra-light to-brand-light'
                          : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-brand/50'}
                        rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                      `}
                    >
                      <input
                        type="radio"
                        name="actionType"
                        value="unhold"
                        checked={formData.actionType === 'unhold'}
                        onChange={() => handleActionChange('unhold')}
                        className="sr-only"
                      />
                      <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-light group-hover:bg-brand-light">
                        <Clock className="w-5 h-5 md:w-6 md:h-6 text-brand-link" />
                      </div>
                      <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Unhold PAN</div>
                      <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Restore access from hold</div>
                      {formData.actionType === 'unhold' && (
                        <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-brand rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        </div>
                      )}
                    </label>
                    {/* Email Bypass - Only visible for authorized emails (prem.kushum@instantsalaryloans.com or admin2@blinkrloan.com) with ADMIN role */}
                    {canEmailBypass && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'emailBypass'
                            ? 'scale-105 shadow-lg border-brand bg-gradient-to-br from-brand-extra-light to-brand-light'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-brand/50'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="emailBypass"
                          checked={formData.actionType === 'emailBypass'}
                          onChange={() => handleActionChange('emailBypass')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-light group-hover:bg-brand-light">
                          <Mail className="w-5 h-5 md:w-6 md:h-6 text-brand-link" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Email Bypass</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Bypass email verification</div>
                        {formData.actionType === 'emailBypass' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-brand rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Update Mobile Number - Only visible for authorized emails (prem.kushum@instantsalaryloans.com or admin2@blinkrloan.com) with ADMIN role */}
                    {canUpdateMobile && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'updateMobileNumber'
                            ? 'scale-105 shadow-lg border-brand bg-gradient-to-br from-brand-extra-light to-brand-light'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-brand/50'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="updateMobileNumber"
                          checked={formData.actionType === 'updateMobileNumber'}
                          onChange={() => handleActionChange('updateMobileNumber')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-light group-hover:bg-brand-light">
                          <Phone className="w-5 h-5 md:w-6 md:h-6 text-brand-link" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Update Mobile Number</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Update customer mobile</div>
                        {formData.actionType === 'updateMobileNumber' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-brand rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Bypass Alternate Number - Only visible for authorized action-pan emails */}
                    {isAuthorizedEmail && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'bypassAlternateNumber'
                            ? 'scale-105 shadow-lg border-brand bg-gradient-to-br from-brand-extra-light to-brand-light'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-brand/50'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="bypassAlternateNumber"
                          checked={formData.actionType === 'bypassAlternateNumber'}
                          onChange={() => handleActionChange('bypassAlternateNumber')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-light group-hover:bg-brand-light">
                          <Phone className="w-5 h-5 md:w-6 md:h-6 text-brand-link" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Bypass Alternate Number</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Bypass alternate number verification using PAN</div>
                        {formData.actionType === 'bypassAlternateNumber' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-brand rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Masked Account - Only visible for authorized emails (prem.kushum@instantsalaryloans.com or admin2@blinkrloan.com) with ADMIN role */}
                    {canMaskedAccount && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'maskedAccount'
                            ? 'scale-105 shadow-lg border-brand bg-gradient-to-br from-brand-extra-light to-brand-light'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-brand/50'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="maskedAccount"
                          checked={formData.actionType === 'maskedAccount'}
                          onChange={() => handleActionChange('maskedAccount')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-light group-hover:bg-brand-light">
                          <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-brand-link" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Masked Account</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Update bank details</div>
                        {formData.actionType === 'maskedAccount' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-brand rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Move to Banking - Only visible for authorized emails (prem.kushum@instantsalaryloans.com or admin2@blinkrloan.com) with ADMIN role */}
                    {canMoveToBanking && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'moveToBanking'
                            ? 'scale-105 shadow-lg border-brand bg-gradient-to-br from-brand-extra-light to-brand-light'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-brand/50'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="moveToBanking"
                          checked={formData.actionType === 'moveToBanking'}
                          onChange={() => handleActionChange('moveToBanking')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-light group-hover:bg-brand-light">
                          <Building2 className="w-5 h-5 md:w-6 md:h-6 text-brand-link" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Move to Banking</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Move lead to banking</div>
                        {formData.actionType === 'moveToBanking' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-brand rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Update Sanction - Only visible for authorized emails (prem.kushum@instantsalaryloans.com or admin2@blinkrloan.com) with ADMIN role */}
                    {canUpdateSanction && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'updateSanction'
                            ? 'scale-105 shadow-lg border-brand bg-gradient-to-br from-brand-extra-light to-brand-light'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-brand/50'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="updateSanction"
                          checked={formData.actionType === 'updateSanction'}
                          onChange={() => handleActionChange('updateSanction')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-light group-hover:bg-brand-light">
                          <Edit className="w-5 h-5 md:w-6 md:h-6 text-brand-link" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Update Sanction</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Modify loan amount</div>
                        {formData.actionType === 'updateSanction' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-brand rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Change Assignee - Only visible for authorized emails (prem.kushum@instantsalaryloans.com or admin2@blinkrloan.com) with ADMIN role */}
                    {canUpdateSanction && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'changeAssignee'
                            ? 'scale-105 shadow-lg border-teal-500 bg-gradient-to-br from-teal-50 to-teal-100'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-teal-300'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="changeAssignee"
                          checked={formData.actionType === 'changeAssignee'}
                          onChange={() => handleActionChange('changeAssignee')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-teal-100 group-hover:bg-teal-200">
                          <User className="w-5 h-5 md:w-6 md:h-6 text-teal-500" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Change Assignee</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Assign lead to employee</div>
                        {formData.actionType === 'changeAssignee' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-teal-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Update Narration - Only visible for authorized emails with ADMIN role */}
                    {canUpdateSanction && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'updateNarration'
                            ? 'scale-105 shadow-lg border-cyan-500 bg-gradient-to-br from-cyan-50 to-cyan-100'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-cyan-300'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="updateNarration"
                          checked={formData.actionType === 'updateNarration'}
                          onChange={() => handleActionChange('updateNarration')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-cyan-100 group-hover:bg-cyan-200">
                          <FileText className="w-5 h-5 md:w-6 md:h-6 text-cyan-600" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Update Narration</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Update salary narration details</div>
                        {formData.actionType === 'updateNarration' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Update Income & Salary Date - authorized ADMIN */}
                    {canUpdateSanction && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'updateIncomeSalaryDate'
                            ? 'scale-105 shadow-lg border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-emerald-300'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="updateIncomeSalaryDate"
                          checked={formData.actionType === 'updateIncomeSalaryDate'}
                          onChange={() => handleActionChange('updateIncomeSalaryDate')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-100 group-hover:bg-emerald-200">
                          <Wallet className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Income & Salary Date</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Update monthly income & salary date</div>
                        {formData.actionType === 'updateIncomeSalaryDate' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Enable Pincode - Only visible for authorized emails (prem.kushum@instantsalaryloans.com or admin2@blinkrloan.com) with ADMIN role */}
                    {canUpdateSanction && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'enablePincode'
                            ? 'scale-105 shadow-lg border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-orange-300'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="enablePincode"
                          checked={formData.actionType === 'enablePincode'}
                          onChange={() => handleActionChange('enablePincode')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-orange-100 group-hover:bg-orange-200">
                          <MapPin className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Enable Pincode</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Enable pincode for leads</div>
                        {formData.actionType === 'enablePincode' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                    {/* Upload Bank Statement - only GET_OTP_PERMISSION_EMAILS */}
                    {isGetOtpPermissionEmail(userEmail) && showSpecialActions && (
                      <label
                        className={`group relative cursor-pointer transition-all duration-300
                          ${formData.actionType === 'uploadBankStatement'
                            ? 'scale-105 shadow-lg border-brand bg-gradient-to-br from-brand-extra-light to-brand-light'
                            : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-brand/50'}
                          rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center min-h-[120px] hover:shadow-md
                        `}
                      >
                        <input
                          type="radio"
                          name="actionType"
                          value="uploadBankStatement"
                          checked={formData.actionType === 'uploadBankStatement'}
                          onChange={() => handleActionChange('uploadBankStatement')}
                          className="sr-only"
                        />
                        <div className="mb-2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-light group-hover:bg-brand-light">
                          <FileText className="w-5 h-5 md:w-6 md:h-6 text-brand-link" />
                        </div>
                        <div className="font-bold text-sm md:text-base text-gray-900 mb-1 text-center leading-tight">Upload Bank Statement</div>
                        <div className="text-xs md:text-sm text-gray-600 text-center leading-tight px-1">Upload bank statement file</div>
                        {formData.actionType === 'uploadBankStatement' && (
                          <div className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 bg-brand rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        )}
                      </label>
                    )}
                  </div>
                </div>
              </form>

              {/* Email Bypass Form - Outside main form to avoid nested forms, but after action cards */}
              {formData.actionType === 'emailBypass' && (
                <div className="mt-4 md:mt-6">
                  <EmailBypass ref={emailBypassRef} isSelected={formData.actionType === 'emailBypass'} />
                </div>
              )}

              {/* Update Mobile Number Form - Outside main form to avoid nested forms, but after action cards */}
              {formData.actionType === 'updateMobileNumber' && (
                <div className="mt-4 md:mt-6">
                  <UpdateMobileNumber ref={updateMobileRef} isSelected={formData.actionType === 'updateMobileNumber'} />
                </div>
              )}

              {/* Masked Account Form - Outside main form to avoid nested forms, but after action cards */}
              {formData.actionType === 'maskedAccount' && (
                <div className="mt-4 md:mt-6">
                  <MaskedAccount ref={maskedAccountRef} isSelected={formData.actionType === 'maskedAccount'} />
                </div>
              )}

              {formData.actionType === 'moveToBanking' && (
                <div className="mt-4 md:mt-6">
                  <MoveToBanking ref={moveToBankingRef} isSelected={formData.actionType === 'moveToBanking'} />
                </div>
              )}

              {/* Enable Pincode Form - Outside main form to avoid nested forms, but after action cards */}
              {formData.actionType === 'enablePincode' && (
                <div className="mt-4 md:mt-6">
                  <EnablePincode ref={enablePincodeRef} isSelected={formData.actionType === 'enablePincode'} />
                </div>
              )}

              {/* Upload Bank Statement Form - Outside main form to avoid nested forms, but after action cards */}
              {formData.actionType === 'uploadBankStatement' && (
                <div className="mt-4 md:mt-6">
                  <UploadBankStatement ref={uploadBankStatementRef} isSelected={formData.actionType === 'uploadBankStatement'} />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                {formData.actionType === 'bypassAlternateNumber' && isAuthorizedEmail && (
                  <div className="bg-gradient-to-r from-brand-extra-light to-brand-light rounded-lg md:rounded-xl p-4 md:p-6 border border-brand/40">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2 text-brand-link" />
                      Paste Message to Auto-Fill
                    </label>
                    <div className="space-y-3">
                      <textarea
                        ref={messageInputRef}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Paste message here (e.g., Rahul Sharma 9876543210 ABCDE1234F bypass alternate number)"
                        rows={3}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-brand/50 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/90 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base resize-vertical"
                      />
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={handleParseBypassAlternateNumberMessage}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-lg md:rounded-xl hover:from-brand-hover hover:to-brand-hover transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Extract & Auto-Fill</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessageInput('');
                            setTimeout(() => {
                              messageInputRef.current?.focus();
                            }, 0);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg md:rounded-xl hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Clear</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        The parser will extract PAN and an optional phone number from your message
                      </p>
                    </div>
                  </div>
                )}

                {/* PAN Number - Always shown */}
                {formData.actionType !== 'updateSanction' && formData.actionType !== 'emailBypass' && formData.actionType !== 'updateMobileNumber' && formData.actionType !== 'maskedAccount' && formData.actionType !== 'moveToBanking' && formData.actionType !== 'changeAssignee' && formData.actionType !== 'enablePincode' && formData.actionType !== 'uploadBankStatement' && formData.actionType !== 'updateNarration' && formData.actionType !== 'updateIncomeSalaryDate' && (
                  <div className="space-y-2">
                    <label htmlFor="panNumber" className="block text-sm font-semibold text-gray-700">
                      PAN Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="panNumber"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={handleInputChange}
                        placeholder="Enter PAN number (e.g., ABCDE1234F)"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base font-mono ${panError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                        required
                        maxLength={10}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      </div>
                    </div>
                    {panError && (
                      <div className="text-red-500 text-xs sm:text-sm flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{panError}</span>
                      </div>
                    )}
                    {formData.panNumber && !panError && (
                      <div className="text-green-600 text-xs sm:text-sm flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Valid PAN format</span>
                      </div>
                    )}
                    {/* PAN Status Indicator */}
                    {panStatus && (
                      <div className={`mt-2 p-2 rounded-lg border text-xs sm:text-sm font-medium ${panStatus === 'held'
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                          : panStatus === 'blocked'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-green-50 border-green-200 text-green-800'
                        }`}>
                        <div className="flex items-center space-x-2">
                          {panStatus === 'held' ? (
                            <Clock className="w-4 h-4 text-yellow-600" />
                          ) : panStatus === 'blocked' ? (
                            <Lock className="w-4 h-4 text-red-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          <span>
                            Current Status: {panStatus === 'held' ? 'Held' : panStatus === 'blocked' ? 'Blocked' : 'Active'}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Check Status Button */}
                    {formData.panNumber && !panError && !panStatus && (
                      <button
                        type="button"
                        onClick={async () => {
                          const status = await checkPanStatus(formData.panNumber.trim());
                          setPanStatus(status);
                        }}
                        className="mt-2 px-3 py-1 bg-brand-light text-brand-link rounded-lg text-xs hover:bg-brand-light transition-colors border border-brand/40"
                      >
                        🔍 Check PAN Status
                      </button>
                    )}
                  </div>
                )}

                {formData.actionType === 'bypassAlternateNumber' && isAuthorizedEmail && (
                  <div className="space-y-2">
                    <label htmlFor="alternatePhoneNumber" className="block text-sm font-semibold text-gray-700">
                      Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        id="alternatePhoneNumber"
                        name="alternatePhoneNumber"
                        value={formData.alternatePhoneNumber}
                        onChange={handleInputChange}
                        placeholder="Enter 10-digit phone number"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
                        maxLength={10}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Leave blank to bypass with PAN only</p>
                  </div>
                )}

                {/* Message Parser - Only shown for updateSanction */}
                {formData.actionType === 'updateSanction' && (
                  <div className="bg-gradient-to-r from-brand-extra-light to-brand-light rounded-lg md:rounded-xl p-4 md:p-6 border border-brand/40">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Edit className="w-4 h-4 inline mr-2 text-brand-link" />
                      Paste Message to Auto-Fill
                    </label>
                    <div className="space-y-3">
                      <textarea
                        ref={messageInputRef}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Paste message here (e.g., Anuj Kumar Tyagi 8929395200 AUFPT4641M Loan Amount: ₹23K Tenure: 34 days Repayment Date: 02-01-2026) or enable pincode messages with address"
                        rows={3}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-brand/50 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/90 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base resize-vertical"
                      />
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={handleParseMessage}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-lg md:rounded-xl hover:from-brand-hover hover:to-brand-hover transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Extract & Auto-Fill</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessageInput('');
                            // Auto-focus on textarea after clearing
                            setTimeout(() => {
                              messageInputRef.current?.focus();
                            }, 0);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg md:rounded-xl hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Clear</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        💡 The parser will extract PAN, Loan Amount, Tenure, Repayment Date, Pincode, State, and District from your message
                      </p>
                    </div>
                  </div>
                )}

                {/* Update Sanction Fields - Grid Layout */}
                {formData.actionType === 'updateSanction' && (
                  <>
                    {/* Row 1: PAN (Left) and Loan Amount (Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      {/* PAN Number */}
                      <div className="space-y-2">
                        <label htmlFor="panNumber" className="block text-sm font-semibold text-gray-700">
                          PAN Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            ref={panNumberRef}
                            type="text"
                            id="panNumber"
                            name="panNumber"
                            value={formData.panNumber}
                            onChange={handleInputChange}
                            placeholder="Enter PAN number (e.g., ABCDE1234F)"
                            className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base font-mono ${panError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                            required
                            maxLength={10}
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          </div>
                        </div>
                        {panError && (
                          <div className="text-red-500 text-xs sm:text-sm flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{panError}</span>
                          </div>
                        )}
                      </div>
                      {/* Loan Amount */}
                      <div className="space-y-2">
                        <label htmlFor="loanAmount" className="block text-sm font-semibold text-gray-700">
                          Loan Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            id="loanAmount"
                            name="loanAmount"
                            value={formData.loanAmount}
                            onChange={handleInputChange}
                            placeholder="Enter loan amount"
                            min="0"
                            step="0.01"
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-12 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
                            required
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center justify-center">
                            <Banknote className="w-5 h-5 text-brand-link" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Tenure (Left) and Repayment Date (Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      {/* Tenure */}
                      <div className="space-y-2">
                        <label htmlFor="tenure" className="block text-sm font-semibold text-gray-700">
                          Tenure (days) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            id="tenure"
                            name="tenure"
                            value={formData.tenure}
                            onChange={handleInputChange}
                            placeholder="Enter tenure in days"
                            min="1"
                            step="1"
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
                            required
                          />
                        </div>
                      </div>
                      {/* Repayment Date */}
                      <div className="space-y-2">
                        <label htmlFor="repaymentDate" className="block text-sm font-semibold text-gray-700">
                          Repayment Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            ref={repaymentDateRef}
                            type="date"
                            id="repaymentDate"
                            name="repaymentDate"
                            value={formData.repaymentDate}
                            onChange={handleInputChange}
                            onBlur={(e) => {
                              // Recalculate tenure when date input loses focus
                              if (formData.actionType === 'updateSanction' && e.target.value) {
                                const calculatedTenure = calculateTenureFromDate(e.target.value);
                                if (calculatedTenure) {
                                  setFormData(prev => ({
                                    ...prev,
                                    tenure: calculatedTenure
                                  }));
                                }
                              }
                            }}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (repaymentDateRef.current) {
                                repaymentDateRef.current.showPicker();
                              }
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer hover:text-brand-link transition-colors"
                            title="Open calendar"
                          >
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Format: YYYY-MM-DD HH:MM:SS (e.g., 2025-12-26 00:00:00)
                        </p>
                        {formData.repaymentDate && (
                          <p className="text-xs text-brand-link mt-1 font-medium">
                            Selected: {formData.repaymentDate} 00:00:00
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}






                {/* Message Parser - Only shown for changeAssignee */}
                {formData.actionType === 'changeAssignee' && (
                  <div className="bg-gradient-to-r from-teal-50 to-brand-light rounded-lg md:rounded-xl p-4 md:p-6 border border-teal-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2 text-teal-600" />
                      Paste Message to Auto-Fill
                    </label>
                    <div className="space-y-3">
                      <textarea
                        ref={messageInputRef}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Paste message here (e.g., Sanyam Dhawan 8146324666 CIWPD5287L please assign this to ID 48)"
                        rows={3}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-teal-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-700 bg-white/90 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base resize-vertical"
                      />
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={handleParseChangeAssigneeMessage}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-teal-500 to-brand-hover text-white font-semibold rounded-lg md:rounded-xl hover:from-teal-600 hover:to-brand-hover transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                        >
                          <User className="w-4 h-4" />
                          <span>Extract & Auto-Fill</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessageInput('');
                            // Auto-focus on textarea after clearing
                            setTimeout(() => {
                              messageInputRef.current?.focus();
                            }, 0);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg md:rounded-xl hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Clear</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        💡 The parser will extract PAN and Assignee ID from your message
                      </p>
                    </div>
                  </div>
                )}

                {/* Update Narration Fields */}
                {formData.actionType === 'updateNarration' && (
                  <>
                    <div className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-lg md:rounded-xl p-4 md:p-6 border border-cyan-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <FileText className="w-4 h-4 inline mr-2 text-cyan-600" />
                        Paste Message to Auto-Fill
                      </label>
                      <div className="space-y-3">
                        <textarea
                          ref={messageInputRef}
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Paste update narration message here"
                          rows={5}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-cyan-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-700 bg-white/90 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base resize-vertical"
                        />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={handleParseUpdateNarrationMessage}
                            className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-semibold rounded-lg md:rounded-xl hover:from-cyan-600 hover:to-sky-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Extract & Auto-Fill</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMessageInput('');
                              setTimeout(() => {
                                messageInputRef.current?.focus();
                              }, 0);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg md:rounded-xl hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Clear</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <label htmlFor="panNumber" className="block text-sm font-semibold text-gray-700">
                          PAN Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="panNumber"
                          name="panNumber"
                          value={formData.panNumber}
                          onChange={handleInputChange}
                          placeholder="Enter PAN number (e.g., ABCDE1234F)"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-700 bg-white/80 transition-all duration-300 text-sm sm:text-base font-mono ${panError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                          required
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="narration" className="block text-sm font-semibold text-gray-700">
                          Narration <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="narration"
                          name="narration"
                          value={formData.narration}
                          onChange={handleInputChange}
                          placeholder="Enter narration"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-700 bg-white/80 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="narrationAmount" className="block text-sm font-semibold text-gray-700">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="narrationAmount"
                          name="narrationAmount"
                          value={formData.narrationAmount}
                          onChange={handleInputChange}
                          placeholder="Enter amount"
                          min="1"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-700 bg-white/80 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="companyName" className="block text-sm font-semibold text-gray-700">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="companyName"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          placeholder="Enter company name"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-700 bg-white/80 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="month" className="block text-sm font-semibold text-gray-700">
                          Month <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="month"
                          name="month"
                          value={formData.month}
                          onChange={handleInputChange}
                          placeholder="April 2026"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-700 bg-white/80 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="salaryDate" className="block text-sm font-semibold text-gray-700">
                          Salary Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="salaryDate"
                          name="salaryDate"
                          value={formData.salaryDate}
                          onChange={handleInputChange}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-700 bg-white/80 transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Update Income & Salary Date */}
                {formData.actionType === 'updateIncomeSalaryDate' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label htmlFor="panNumberIncomeSalary" className="block text-sm font-semibold text-gray-700">
                        PAN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="panNumberIncomeSalary"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={handleInputChange}
                        placeholder="Enter PAN number (e.g., ABCDE1234F)"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-700 bg-white/80 transition-all duration-300 text-sm sm:text-base font-mono ${panError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                        required
                        maxLength={10}
                      />
                      {panError && (
                        <div className="text-red-500 text-xs sm:text-sm flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{panError}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="monthlyIncome" className="block text-sm font-semibold text-gray-700">
                        Monthly income <span className="text-gray-400 font-normal text-xs">(optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="monthlyIncome"
                          name="monthlyIncome"
                          value={formData.monthlyIncome}
                          onChange={handleInputChange}
                          placeholder="Enter monthly income"
                          min="0"
                          step="1"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-12 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-700 bg-white/80 transition-all duration-300 text-sm sm:text-base"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <Banknote className="w-5 h-5 text-emerald-600" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="incomeSalaryDate" className="block text-sm font-semibold text-gray-700">
                        Salary date <span className="text-gray-400 font-normal text-xs">(optional)</span>
                      </label>
                      <input
                        type="date"
                        id="incomeSalaryDate"
                        name="salaryDate"
                        value={formData.salaryDate}
                        onChange={handleInputChange}
                        className="w-full max-w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-700 bg-white/80 transition-all duration-300 text-sm sm:text-base"
                      />
                    </div>
                  </div>
                )}

                {/* Change Assignee Fields */}
                {formData.actionType === 'changeAssignee' && (
                  <>
                    {/* PAN Number */}
                    <div className="space-y-2">
                      <label htmlFor="panNumber" className="block text-sm font-semibold text-gray-700">
                        PAN Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="panNumber"
                          name="panNumber"
                          value={formData.panNumber}
                          onChange={handleInputChange}
                          placeholder="Enter PAN number (e.g., ABCDE1234F)"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base font-mono ${panError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                          required
                          maxLength={10}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        </div>
                      </div>
                      {panError && (
                        <div className="text-red-500 text-xs sm:text-sm flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{panError}</span>
                        </div>
                      )}
                    </div>
                    {/* Assigned To */}
                    <div className="space-y-2">
                      <label htmlFor="assignedTo" className="block text-sm font-semibold text-gray-700">
                        Assigned To (Employee ID) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="assignedTo"
                          name="assignedTo"
                          value={formData.assignedTo}
                          onChange={handleInputChange}
                          placeholder="Enter employee ID number"
                          min="1"
                          step="1"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-12 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center justify-center">
                          <User className="w-5 h-5 text-brand-link" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Reason / Remarks */}
                {formData.actionType !== 'updateSanction' && formData.actionType !== 'emailBypass' && formData.actionType !== 'updateMobileNumber' && formData.actionType !== 'maskedAccount' && formData.actionType !== 'moveToBanking' && formData.actionType !== 'changeAssignee' && formData.actionType !== 'bypassAlternateNumber' && formData.actionType !== 'undisposeLead' && formData.actionType !== 'uploadBankStatement' && formData.actionType !== 'updateNarration' && formData.actionType !== 'updateIncomeSalaryDate' && (
                  <div className="space-y-2">
                    <label htmlFor="reason" className="block text-sm font-semibold text-gray-700">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder={`Enter detailed reason for ${getActionLabel().toLowerCase()} this PAN`}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-vertical text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
                      required
                    />
                  </div>
                )}
                {/* Remarks for Update Sanction */}
                {formData.actionType === 'updateSanction' && (
                  <div className="space-y-2">
                    <label htmlFor="reason" className="block text-sm font-semibold text-gray-700">
                      Remarks <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Enter remarks"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-vertical text-gray-700 bg-white/80 backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
                      required
                    />
                  </div>
                )}

                {formData.actionType === 'updateSanction' && sanctionError && (
                  <>
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {sanctionError}
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={isSalaryDateOverride}
                        onChange={(e) => setIsSalaryDateOverride(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-link focus:ring-brand"
                      />
                      Salary Date Override
                    </label>
                  </>
                )}

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading || panError || !formData.actionType}
                    className={`relative overflow-hidden px-6 sm:px-8 py-2 sm:py-3 rounded-lg md:rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${formData.actionType === 'block'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl'
                        : formData.actionType === 'unblock'
                          ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
                          : formData.actionType === 'hold'
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl'
                            : formData.actionType === 'unhold'
                              ? 'bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover text-white shadow-lg hover:shadow-xl'
                              : formData.actionType === 'updateSanction'
                                ? 'bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover text-white shadow-lg hover:shadow-xl'
                                : formData.actionType === 'updateNarration'
                                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl'
                                  : formData.actionType === 'updateIncomeSalaryDate'
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                                  : formData.actionType === 'enablePincode'
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl'
                                    : formData.actionType === 'emailBypass' || formData.actionType === 'updateMobileNumber' || formData.actionType === 'bypassAlternateNumber' || formData.actionType === 'undisposeLead' || formData.actionType === 'maskedAccount' || formData.actionType === 'moveToBanking' || formData.actionType === 'changeAssignee' || formData.actionType === 'uploadBankStatement'
                                      ? 'bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover text-white shadow-lg hover:shadow-xl'
                                      : 'bg-gray-400 text-white cursor-not-allowed'
                      } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        {formData.actionType === 'block' ? (
                          <Lock className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'unblock' ? (
                          <Unlock className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'hold' ? (
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'unhold' ? (
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'updateSanction' ? (
                          <Edit className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'updateNarration' ? (
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'updateIncomeSalaryDate' ? (
                          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'emailBypass' ? (
                          <Mail className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'updateMobileNumber' ? (
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'bypassAlternateNumber' ? (
                          <Phone className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'undisposeLead' ? (
                          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'maskedAccount' ? (
                          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'moveToBanking' ? (
                          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'changeAssignee' ? (
                          <User className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'enablePincode' ? (
                          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : formData.actionType === 'uploadBankStatement' ? (
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        ) : (
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
                        )}
                        <span className="cursor-pointer">{getActionLabel()}</span>
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        panNumber: '',
                        reason: '',
                        actionType: '',
                        loanAmount: '000',
                        tenure: '',
                        repaymentDate: '',
                        assignedTo: '',
                        narration: '',
                        narrationAmount: '',
                        companyName: '',
                        month: '',
                        salaryDate: '',
                        monthlyIncome: '',
                        alternatePhoneNumber: ''
                      });
                      setPanError('');
                      setMessageInput('');
                    }}
                    className="px-6 sm:px-8 py-2 sm:py-3 border-2 border-gray-300 rounded-lg md:rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 text-sm sm:text-base cursor-pointer"
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </div>
          {/* Preview & Info Section */}
          <div className="space-y-4 md:space-y-6">
            {/* Preview Card */}
            {showPreview && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/20 p-4 md:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center space-x-2">
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-brand-link" />
                  <span>Preview</span>
                </h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                    <div className="text-xs sm:text-sm text-gray-500">Action</div>
                    <div className="font-semibold text-gray-800 text-sm sm:text-base">
                      {getActionLabel()}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                    <div className="text-xs sm:text-sm text-gray-500">PAN Number</div>
                    <div className="font-mono text-gray-800 text-sm sm:text-base">
                      {formData.panNumber || 'Not entered'}
                    </div>
                    {formData.panNumber && (
                      <div className={`text-xs mt-1 ${panError ? 'text-red-500' : 'text-green-600'}`}>{panError ? '❌ Invalid format' : '✅ Valid format'}</div>
                    )}
                    {panStatus && (
                      <div className="text-xs mt-1 text-brand-link">
                        📊 Status: {panStatus === 'held' ? '🟡 Held' : panStatus === 'blocked' ? '🔴 Blocked' : '🟢 Active'}
                      </div>
                    )}
                    {!panStatus && (
                      <div className="text-xs mt-1 text-gray-500">
                        📊 Status: Not checked
                      </div>
                    )}
                  </div>
                  {formData.actionType === 'bypassAlternateNumber' && isAuthorizedEmail && (
                    <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                      <div className="text-xs sm:text-sm text-gray-500">Phone Number</div>
                      <div className="font-semibold text-gray-800 text-sm sm:text-base">
                        {formData.alternatePhoneNumber || 'Not entered'}
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                    <div className="text-xs sm:text-sm text-gray-500">Reason</div>
                    <div className="text-gray-800 text-sm sm:text-base">
                      {formData.reason || 'Not entered'}
                    </div>
                  </div>
                  {formData.actionType === 'updateSanction' && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                        <div className="text-xs sm:text-sm text-gray-500">Loan Amount</div>
                        <div className="font-semibold text-gray-800 text-sm sm:text-base">
                          {formData.loanAmount ? `₹${parseFloat(formData.loanAmount).toLocaleString('en-IN')}` : 'Not entered'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                        <div className="text-xs sm:text-sm text-gray-500">Tenure</div>
                        <div className="font-semibold text-gray-800 text-sm sm:text-base">
                          {formData.tenure ? `${formData.tenure} days` : 'Not entered'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                        <div className="text-xs sm:text-sm text-gray-500">Repayment Date</div>
                        <div className="font-semibold text-gray-800 text-sm sm:text-base">
                          {formData.repaymentDate
                            ? `${formData.repaymentDate} 00:00:00`
                            : 'Not entered'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Assigned Leads Data Section */}
          {showSpecialActions && isAuthorizedEmail && (
            <div
              className="md:col-span-2 rounded-xl md:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 md:mb-6"
              style={{ background: '#0f172a', border: '1px solid #1f2937', color: '#e5e7eb' }}
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-4 md:mb-6 flex items-center space-x-2" style={{ color: '#e5e7eb' }}>
                <Download className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#a5b4fc' }} />
                <span>Assigned Leads Summary</span>
              </h3>
              <div className="grid md:grid-cols-4 gap-3 md:gap-4 mb-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-1" style={{ color: '#cbd5e1' }}>Start Date</label>
                  <input
                    type="date"
                    value={assignedLeadStartDate}
                    onChange={(e) => setAssignedLeadStartDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: '#111827', border: '1px solid #1f2937', color: '#e5e7eb', boxShadow: '0 0 0 2px transparent' }}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-1" style={{ color: '#cbd5e1' }}>End Date</label>
                  <input
                    type="date"
                    value={assignedLeadEndDate}
                    onChange={(e) => setAssignedLeadEndDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: '#111827', border: '1px solid #1f2937', color: '#e5e7eb', boxShadow: '0 0 0 2px transparent' }}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => fetchAssignedFreshLeads(assignedLeadStartDate, assignedLeadEndDate)}
                    className="w-full px-4 py-2 sm:px-6 sm:py-3 font-semibold rounded-lg md:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-60"
                    style={{ background: '#066039', color: '#ffffff' }}
                    disabled={isLoadingAssignedLeads}
                  >
                    {isLoadingAssignedLeads ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Fetch Data</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleDownloadAssignedScreenshot}
                    className="w-full px-4 py-2 sm:px-6 sm:py-3 font-semibold rounded-lg md:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-60"
                    style={{ background: '#374151', color: '#fff' }}
                    disabled={isLoadingAssignedLeads}
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Save Screenshot</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto" ref={assignedTableRef}>
                <table className="min-w-full text-sm" style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead style={{ background: '#1f2937', color: '#e5e7eb' }}>
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">employee_id</th>
                      <th className="px-4 py-2 text-left font-semibold">employee_name</th>
                      <th className="px-4 py-2 text-left font-semibold">total_leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedLeadRows && assignedLeadRows.length > 0 ? (
                      assignedLeadRows.map((row, index) => (
                        <tr
                          key={`${row.employee_id ?? 'null'}-${index}`}
                          style={{
                            background: index % 2 === 0 ? '#0f172a' : '#1f2937',
                            color: '#e5e7eb'
                          }}
                        >
                          <td className="px-4 py-2 font-mono">{row.employee_id ?? 'NULL'}</td>
                          <td className="px-4 py-2">{row.employee_name || 'EMPTY'}</td>
                          <td className="px-4 py-2 font-semibold">{row.total_leads ?? 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-center" style={{ color: '#9ca3af' }}>
                          {isLoadingAssignedLeads ? 'Loading data...' : 'No data available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Assigned Reloan Leads Data Section */}
          {showSpecialActions && isAuthorizedEmail && (
            <div
              className="rounded-xl md:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 md:mb-6"
              style={{ background: '#0f172a', border: '1px solid #1f2937', color: '#e5e7eb' }}
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-4 md:mb-6 flex items-center space-x-2" style={{ color: '#e5e7eb' }}>
                <Download className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#a5b4fc' }} />
                <span>Assigned Reloan Leads Summary</span>
              </h3>
              <div className="grid md:grid-cols-4 gap-3 md:gap-4 mb-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-1" style={{ color: '#cbd5e1' }}>Start Date</label>
                  <input
                    type="date"
                    value={assignedReloanLeadStartDate}
                    onChange={(e) => setAssignedReloanLeadStartDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: '#111827', border: '1px solid #1f2937', color: '#e5e7eb', boxShadow: '0 0 0 2px transparent' }}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-1" style={{ color: '#cbd5e1' }}>End Date</label>
                  <input
                    type="date"
                    value={assignedReloanLeadEndDate}
                    onChange={(e) => setAssignedReloanLeadEndDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{ background: '#111827', border: '1px solid #1f2937', color: '#e5e7eb', boxShadow: '0 0 0 2px transparent' }}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => fetchAssignedReloanLeads(assignedReloanLeadStartDate, assignedReloanLeadEndDate)}
                    className="w-full px-4 py-2 sm:px-6 sm:py-3 font-semibold rounded-lg md:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-60"
                    style={{ background: '#066039', color: '#ffffff' }}
                    disabled={isLoadingAssignedReloanLeads}
                  >
                    {isLoadingAssignedReloanLeads ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Fetch Data</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleDownloadAssignedReloanScreenshot}
                    className="w-full px-4 py-2 sm:px-6 sm:py-3 font-semibold rounded-lg md:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-60"
                    style={{ background: '#374151', color: '#fff' }}
                    disabled={isLoadingAssignedReloanLeads}
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Save Screenshot</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto" ref={assignedReloanTableRef}>
                <table className="min-w-full text-sm" style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead style={{ background: '#1f2937', color: '#e5e7eb' }}>
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">employee_id</th>
                      <th className="px-4 py-2 text-left font-semibold">employee_name</th>
                      <th className="px-4 py-2 text-left font-semibold">total_leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedReloanLeadRows && assignedReloanLeadRows.length > 0 ? (
                      assignedReloanLeadRows.map((row, index) => (
                        <tr
                          key={`${row.employee_id ?? 'null'}-${index}`}
                          style={{
                            background: index % 2 === 0 ? '#0f172a' : '#1f2937',
                            color: '#e5e7eb'
                          }}
                        >
                          <td className="px-4 py-2 font-mono">{row.employee_id ?? 'NULL'}</td>
                          <td className="px-4 py-2">{row.employee_name || 'EMPTY'}</td>
                          <td className="px-4 py-2 font-semibold">{row.total_leads ?? 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-center" style={{ color: '#9ca3af' }}>
                          {isLoadingAssignedReloanLeads ? 'Loading data...' : 'No data available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Download All Assigned Leads Section */}
          {/* {showSpecialActions && isAuthorizedEmail && (
            <div className="md:col-span-2 bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8 mb-4 md:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 md:mb-6 flex items-center space-x-2">
                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-brand-link" />
                <span>Download All Assigned Leads</span>
              </h3>

              <div className="space-y-4 md:space-y-6">
                <p className="text-sm sm:text-base text-gray-600">
                  Download all assigned leads data in Excel format.
                </p>

                <button
                  type="button"
                  onClick={handleDownloadAllAssignedLeads}
                  disabled={isDownloadingAllAssignedLeads}
                  className={`w-full px-6 sm:px-8 py-2 sm:py-3 rounded-lg md:rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 ${isDownloadingAllAssignedLeads
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover text-white'
                    }`}
                >
                  {isDownloadingAllAssignedLeads ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Download All Assigned Leads (XLS)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )} */}

          {/* Performance Data Download Section */}
          {/* {showSpecialActions && isAuthorizedEmail && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8 mb-4 md:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 md:mb-6 flex items-center space-x-2">
                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-brand-link" />
                <span>Download Performance Data</span>
              </h3>

              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <button
                    type="button"
                    onClick={handleThisMonthClick}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-lg md:rounded-xl hover:from-brand-hover hover:to-brand-hover transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>This Month</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDateRangePicker(true)}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-lg md:rounded-xl hover:from-brand-hover hover:to-brand-hover transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Date Range</span>
                  </button>
                </div>

                {(performanceStartDate || performanceEndDate) && (
                  <div className="p-3 sm:p-4 bg-brand-light rounded-lg md:rounded-xl border border-brand/40">
                    <p className="text-sm sm:text-base text-brand-link">
                      <span className="font-semibold">Selected Range:</span>{' '}
                      {performanceStartDate && performanceEndDate
                        ? `${performanceStartDate} to ${performanceEndDate}`
                        : performanceStartDate
                          ? `Start: ${performanceStartDate}`
                          : `End: ${performanceEndDate}`}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDownloadPerformance}
                  disabled={!performanceStartDate || !performanceEndDate || isDownloadingPerformance}
                  className={`w-full px-6 sm:px-8 py-2 sm:py-3 rounded-lg md:rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 ${!performanceStartDate || !performanceEndDate || isDownloadingPerformance
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    }`}
                >
                  {isDownloadingPerformance ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Download Excel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )} */}

          {/* Date Range Picker Modal */}
          {showDateRangePicker && (
            <DateRangePicker
              onDateRangeSelect={handleDateRangeSelect}
              onClose={() => setShowDateRangePicker(false)}
            />
          )}

          {/* Info Cards */}
          <div className="bg-gradient-to-br from-brand-extra-light to-brand-light rounded-xl md:rounded-2xl shadow-xl border border-brand/40 p-4 md:p-6">
            <h3
              onClick={toggleGuidelinesActions}
              className="text-base sm:text-lg font-bold text-brand-link mb-3 md:mb-4 flex items-center space-x-2 cursor-pointer hover:text-brand-link transition-colors"
              title="Click to show hidden actions"
            >
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Important Guidelines</span>
            </h3>
            <div className="space-y-2 md:space-y-3 text-xs sm:text-sm text-brand-link">
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-brand rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <span>PAN format: <code className="bg-brand-light px-1 rounded">ABCDE1234F</code> (5 letters + 4 digits + 1 letter)</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-brand rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <span>Only alphanumeric characters are allowed</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-brand rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <span><strong>Block:</strong> Permanently prevents loan applications</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-brand rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <span><strong>Unblock:</strong> Restores loan application access</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-brand rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <span><strong>Hold:</strong> Temporarily suspends loan access</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-brand rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <span><strong>Unhold:</strong> Restores access from hold</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-brand rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                <span>All actions are logged for audit compliance</span>
              </div>
            </div>
            {canAccessAdminOnlyPanActions && showGuidelinesActions && (
              <div className="mt-4 pt-4 border-t border-brand/40 space-y-3">
                <label
                  className={`group relative cursor-pointer transition-all duration-300 block
                    ${formData.actionType === 'undisposeLead'
                      ? 'scale-[1.02] shadow-lg border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100'
                      : 'scale-100 shadow-sm border-gray-200 bg-white hover:border-amber-300'}
                    rounded-xl border-2 p-4 md:p-5
                  `}
                >
                  <input
                    type="radio"
                    name="actionType"
                    value="undisposeLead"
                    checked={formData.actionType === 'undisposeLead'}
                    onChange={() => handleActionChange('undisposeLead')}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 group-hover:bg-amber-200 flex-shrink-0">
                      <RotateCcw className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-gray-900">Undispose Lead</div>
                      <div className="text-sm text-gray-600 mt-0.5">Undispose a disposed lead using PAN</div>
                    </div>
                    {formData.actionType === 'undisposeLead' && (
                      <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            )}
          </div>

          {isGetOtpPermissionEmail(userEmail) && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                <div className="lg:col-span-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 md:p-5">
                  <div className="mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center space-x-2">
                      <Phone className="w-5 h-5 text-emerald-600" />
                      <span>Get OTP</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1.5">Request OTP by mobile.</p>
                  </div>
                  <div>
                    <label htmlFor="otpMobileNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      id="otpMobileNumber"
                      value={otpMobileNumber}
                      onChange={(e) => {
                        const sanitizedValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setOtpMobileNumber(sanitizedValue);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleGetOtp();
                        }
                      }}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-700 bg-white transition-all duration-300 text-sm"
                      maxLength={10}
                    />
                    <p className="text-xs text-gray-500 mt-2">Example: <code>9876543210</code></p>
                  </div>
                  <div className="flex flex-col gap-2 mt-3 w-full">
                    <button
                      type="button"
                      onClick={handleGetOtp}
                      disabled={isFetchingOtp}
                      className={`w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-white font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${isFetchingOtp
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                        }`}
                    >
                      {isFetchingOtp ? 'Fetching OTP...' : 'Get OTP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpMobileNumber('');
                        setOtpResponse(null);
                      }}
                      className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300"
                    >
                      Clear
                    </button>
                  </div>
                  {otpResponse && (
                    <div className={`rounded-xl border p-4 mt-3 ${otpResponse?.success === false
                        ? 'border-red-200 bg-red-50'
                        : 'border-emerald-200 bg-emerald-50'
                      }`}>
                      <div className={`text-sm font-semibold mb-2 ${otpResponse?.success === false ? 'text-red-700' : 'text-emerald-700'
                        }`}>
                        {otpResponse?.message || 'OTP response received'}
                      </div>
                      <div className="bg-white/70 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">response.data</div>
                            <div className="mt-1 text-xl font-bold tracking-[0.2em] text-gray-800">
                              {otpResponse?.data?.otp ??
                                otpResponse?.otp ??
                                (typeof otpResponse?.data === 'string' ? otpResponse.data : '--')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyOtp}
                            disabled={
                              !(otpResponse?.data?.otp ??
                                otpResponse?.otp ??
                                (typeof otpResponse?.data === 'string' ? otpResponse.data : ''))
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-all duration-300 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Copy OTP"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-8 rounded-xl border border-brand/25 bg-brand-light/30 p-4 md:p-6">
                  <div className="mb-5">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center space-x-2">
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-brand-link" />
                      <span>Get Token</span>
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 mt-2">Request token details using PAN number.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="tokenPanNumber"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        PAN Number
                      </label>
                      <input
                        type="text"
                        id="tokenPanNumber"
                        value={tokenPanNumber}
                        onChange={(e) => {
                          const sanitizedValue = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
                          setTokenPanNumber(sanitizedValue);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleGetToken();
                          }
                        }}
                        placeholder="Enter PAN number (e.g., ABCDE1234F)"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 bg-white transition-all duration-300 text-sm sm:text-base font-mono"
                        maxLength={10}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <button
                        type="button"
                        onClick={handleGetToken}
                        disabled={isFetchingToken}
                        className={`w-full sm:flex-1 inline-flex items-center justify-center px-5 py-2.5 sm:py-3 rounded-lg md:rounded-xl text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${isFetchingToken
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover'
                          }`}
                      >
                        {isFetchingToken ? 'Fetching Token...' : 'Get Token'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTokenPanNumber('');
                          setTokenResponse(null);
                        }}
                        className="w-full sm:flex-1 inline-flex items-center justify-center px-5 py-2.5 sm:py-3 rounded-lg md:rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300"
                      >
                        Clear
                      </button>
                    </div>

                    {tokenResponse && (
                      <div className={`rounded-xl border p-4 ${tokenResponse?.success === false
                          ? 'border-red-200 bg-red-50'
                          : 'border-brand/40 bg-brand-light'
                        }`}>
                        <div className={`text-sm font-semibold mb-2 ${tokenResponse?.success === false ? 'text-red-700' : 'text-brand-link'
                          }`}>
                          {tokenResponse?.message || 'Token response received'}
                        </div>
                        <div className="bg-white/70 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                response.data
                              </div>
                              <div className="mt-1 text-sm sm:text-base font-semibold break-all text-gray-800">
                                {tokenResponse?.data?.token ??
                                  tokenResponse?.token ??
                                  (typeof tokenResponse?.data === 'string' ? tokenResponse.data : '--')}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyToken}
                              disabled={
                                !(tokenResponse?.data?.token ??
                                  tokenResponse?.token ??
                                  (typeof tokenResponse?.data === 'string' ? tokenResponse.data : ''))
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-all duration-300 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Copy Token"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActionPan;
