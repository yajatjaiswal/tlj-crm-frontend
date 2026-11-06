import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload,
  Pause,
  RotateCcw,
  Plus,
  Check,
} from "lucide-react";
import {
  verifyCompany,
  approveAuditLeadWithVerification,
  takeAuditAction,
} from "../../services/functions/credit-analyst";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

const ADDRESS_PROOF_TYPES = [
  "Aadhaar Card",
  "Voter ID",
  "Driving License",
  "Passport",
  "Electricity Bill",
  "Water Bill",
  "Gas Bill",
  "Rent Agreement",
  "Property Tax Receipt",
  "Insurance Policy",
  "Other",
];

const BRE_FORM_INPUT_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-100";

const BreFormField = ({ label, required = false, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
      {label}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
    {children}
    {hint ? <p className="text-[11px] leading-snug text-slate-500">{hint}</p> : null}
  </div>
);

const BreFormSection = ({ title, description, children }) => (
  <section className="space-y-4 rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm">
    <div className="border-b border-slate-200/80 pb-2">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {description ? (
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
    {children}
  </section>
);

const ActionModal = ({
  showModal,
  handleModalOutsideClick,
  selectedLead,
  selectedRows,
  setShowModal,
  setSelectedLead,
  confirmAction,
  modalTitle,
  modalDescription,
  modalButtonText,
  calculatedLoanAmount,
  setCalculatedLoanAmount,
  monthlyIncome,
  setMonthlyIncome,
  approvalRemarks,
  setApprovalRemarks,
  isInputNeeded,
  branchName,
  setBranchName,
  bankAccountNo,
  setBankAccountNo,
  ifscCode,
  setIfscCode,
  salaryDate,
  setSalaryDate,
  showSalaryRejection = false,
  salaryRejectionMessage = "",
  salaryIncome = [
    { amount: "", date: "" },
    { amount: "", date: "" },
    { amount: "", date: "" },
  ],
  setSalaryIncome,
  salaryTransactions = [],
  selectedSalaryTransactions = [],
  onToggleSalaryTransaction,
  isSalaryTransactionSelected,
  onSubmitSalaryTransactions,
  isSubmittingSalaryTransactions = false,
  onGetSalary,
  isGettingSalary = false,
  onModalClose,
  // New props for company verification form
  modalType = "bre-rejected", // 'bre-rejected', 'allocated-audit', or 'credit-head'
  onApproveWithVerification,
  onRejectWithVerification,
  onCreditHeadAction,
  salaryConflictLogs = [],
}) => {
  // State for company verification form
  const [companyName, setCompanyName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [showWebsiteField, setShowWebsiteField] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showLinkedInField, setShowLinkedInField] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [residenceProof, setResidenceProof] = useState(null);
  const [residenceProofType, setResidenceProofType] = useState("");
  const [customResidenceProofType, setCustomResidenceProofType] = useState("");
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creditHeadError, setCreditHeadError] = useState("");
  const [isSalOverride, setIsSalOverride] = useState(false);
  const [repaymentDate, setRepaymentDate] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Company verification mutation
  const { mutate: mutateVerifyCompany } = useMutation({
    mutationFn: verifyCompany,
    onSuccess: (data) => {
      setIsVerifying(false);
      if (data.success) {
        if (data.verification_status) {
          setVerificationStatus("success");
          setVerificationDetails(data.details);
          toast.success("Company verified successfully!");
        } else {
          setVerificationStatus("failed");
          setVerificationDetails(data.details);
          toast.error("Company verification failed");
        }
      } else {
        // Handle "company is already verified" case as success
        if (
          data.message &&
          data.message.toLowerCase().includes("already verified")
        ) {
          setVerificationStatus("success");
          setVerificationDetails({
            company_name: companyName,
            gstin: gstNumber,
            already_verified: true,
          });
          toast.success("Company is already verified!");
        } else {
          setVerificationStatus("failed");
          setVerificationDetails(null);
          toast.error(data.message || "Company verification failed");
        }
      }
    },
    onError: (error) => {
      setIsVerifying(false);
      // Handle 400 error with "already verified" message as success
      if (
        error.response?.status === 400 &&
        error.response?.data?.message
          ?.toLowerCase()
          .includes("already verified")
      ) {
        setVerificationStatus("success");
        setVerificationDetails({
          company_name: companyName,
          gstin: gstNumber,
          already_verified: true,
        });
        toast.success("Company is already verified!");
      } else {
        setVerificationStatus("failed");
        setVerificationDetails(null);
        toast.error(error.message || "Failed to verify company");
      }
    },
  });

  // Approve with verification mutation
  const { mutate: mutateApproveWithVerification } = useMutation({
    mutationFn: approveAuditLeadWithVerification,
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success("Audit lead approved successfully!");
      handleCloseModal();
      if (onApproveWithVerification) {
        onApproveWithVerification();
      }
      // Refresh the page after successful action
      window.location.reload();
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(error.message || "Failed to approve audit lead");
    },
  });

  // Reject with verification mutation
  const { mutate: mutateRejectWithVerification } = useMutation({
    mutationFn: approveAuditLeadWithVerification,
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success("Audit lead rejected successfully!");
      handleCloseModal();
      if (onRejectWithVerification) {
        onRejectWithVerification();
      }
      // Refresh the page after successful action
      // window.location.reload();
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(error.message || "Failed to reject audit lead");
    },
  });

  // Credit Head Action mutation
  const {
    mutate: mutateCreditHeadAction,
    isPending: isCreditHeadActionPending,
  } = useMutation({
    mutationFn: takeAuditAction,
    onSuccess: (data) => {
      setCreditHeadError("");
      toast.success("Action completed successfully!");
      handleCloseModal();
      if (onCreditHeadAction) {
        onCreditHeadAction();
      }
      // Refresh the page after successful action
      window.location.reload();
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to complete action";
      setCreditHeadError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedLead(null);
    if (onModalClose) onModalClose();
    // Only call these setters if they exist (for BRE modal)
    if (setCalculatedLoanAmount) setCalculatedLoanAmount("");
    if (setMonthlyIncome) setMonthlyIncome("");
    if (setApprovalRemarks) setApprovalRemarks("");
    if (setBranchName) setBranchName("");
    if (setBankAccountNo) setBankAccountNo("");
    if (setIfscCode) setIfscCode("");
    if (setSalaryDate) setSalaryDate("");
    if (setSalaryIncome) {
      setSalaryIncome([
        { amount: "", date: "" },
        { amount: "", date: "" },
        { amount: "", date: "" },
      ]);
    }
    // Reset company verification form
    setCompanyName("");
    setGstNumber("");
    setShowWebsiteField(false);
    setWebsiteUrl("");
    setShowLinkedInField(false);
    setLinkedinUrl("");
    setResidenceProof(null);
    setResidenceProofType("");
    setCustomResidenceProofType("");
    setVerificationStatus(null);
    setVerificationDetails(null);
    setIsVerifying(false);
    setIsSubmitting(false);
    setCreditHeadError("");
    setIsSalOverride(false);
    setRepaymentDate("");
    setShowCalendar(false);
    setCalendarMonth(new Date().getMonth());
    setCalendarYear(new Date().getFullYear());
  };

  const handleVerifyCompany = () => {
    if (!companyName || !gstNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (showWebsiteField && !websiteUrl) {
      toast.error("Please enter website URL");
      return;
    }

    if (showLinkedInField && !linkedinUrl) {
      toast.error("Please enter LinkedIn URL");
      return;
    }

    setIsVerifying(true);
    setVerificationStatus(null);

    mutateVerifyCompany({
      company_name: companyName,
      audit_id: selectedLead?.audit_id,
      gstin: gstNumber,
    });
  };

  const handleApproveWithVerification = () => {
    // if (verificationStatus !== 'success') {
    //   toast.error('Please verify the company first');
    //   return;
    // }

    // if (!repaymentDate) {
    //   toast.error("Please select a repayment date");
    //   return;
    // }

    const today = new Date();
    const selectedDate = new Date(repaymentDate);
    const diffTime = selectedDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7 || diffDays > 45) {
      toast.error("Repayment date must be between 7 and 45 days from today");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("audit_id", selectedLead?.audit_id);
    formData.append("action", "approve");
    formData.append("remarks", approvalRemarks);
    formData.append("linkedin_url", linkedinUrl);
    formData.append("website_url", websiteUrl);
    formData.append("is_linkedin_verify", showLinkedInField);
    formData.append("is_website_verify", showWebsiteField);

    if (residenceProof) {
      formData.append("residenceProof", residenceProof);
    }

    const finalResidenceProofType =
      residenceProofType === "Other"
        ? customResidenceProofType
        : residenceProofType;
    if (finalResidenceProofType) {
      formData.append("residenceProofType", finalResidenceProofType);
    }

    mutateApproveWithVerification({
      audit_id: selectedLead?.audit_id,
      action: "approve",
      residenceProof: residenceProof?.name || "",
      residenceProofType: finalResidenceProofType,
      remarks: approvalRemarks,
      linkedin_url: linkedinUrl,
      website_url: websiteUrl,
      is_linkedin_verify: showLinkedInField,
      is_website_verify: showWebsiteField,
      action_type: "sales-team",
      repayment_date: repaymentDate,
    });
  };

  const handleRejectWithVerification = () => {
    if (!repaymentDate) {
      toast.error("Please select a repayment date");
      return;
    }

    const today = new Date();
    const selectedDate = new Date(repaymentDate);
    const diffTime = selectedDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7 || diffDays > 45) {
      toast.error("Repayment date must be between 7 and 45 days from today");
      return;
    }
    setIsSubmitting(true);

    const finalResidenceProofType =
      residenceProofType === "Other"
        ? customResidenceProofType
        : residenceProofType;

    mutateRejectWithVerification({
      audit_id: selectedLead?.audit_id,
      action: "reject",
      residenceProof: residenceProof?.name || "",
      residenceProofType: finalResidenceProofType,
      remarks: approvalRemarks,
      linkedin_url: linkedinUrl,
      website_url: websiteUrl,
      is_linkedin_verify: showLinkedInField,
      is_website_verify: showWebsiteField,
      action_type: "sales-team",
      repayment_date: repaymentDate,
    });
  };

  const handleCreditHeadAction = (action) => {
    if (!selectedLead?.audit_id) {
      toast.error("Invalid audit lead selected");
      return;
    }

    const formData = new FormData();
    formData.append("audit_id", selectedLead.audit_id);
    formData.append("action", action);
    formData.append("remarks", approvalRemarks || "");
    formData.append("is_sal_override", isSalOverride ? "true" : "false");

    setCreditHeadError("");
    mutateCreditHeadAction(formData);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setResidenceProof(file);
  };

  // Helper functions for date validation
  const isDateDisabled = (date) => {
    const today = new Date();
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday
    const month = selectedDate.getMonth() + 1; // 0-based, so add 1
    const day = selectedDate.getDate();
    
    // Disable Sundays
    if (dayOfWeek === 0) return true;
    
    // Disable November 5th and December 25th
    if ((month === 11 && day === 5) || (month === 12 && day === 25)) return true;
    
    // Disable dates before today
    if (selectedDate <= today) return true;
    
    // Check if date is within 7-45 days range
    const diffTime = selectedDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays < 7 || diffDays > 45;
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleDateSelect = (date) => {
    setRepaymentDate(date);
    setShowCalendar(false);
  };

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
    // Reset calendar to current month when opening
    if (!showCalendar) {
      const today = new Date();
      setCalendarMonth(today.getMonth());
      setCalendarYear(today.getFullYear());
    }
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCalendar && !event.target.closest('.calendar-container')) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendar]);

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear(calendarYear - 1);
      } else {
        setCalendarMonth(calendarMonth - 1);
      }
    } else {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(calendarYear + 1);
      } else {
        setCalendarMonth(calendarMonth + 1);
      }
    }
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateStr,
        isCurrentMonth: true
      });
    }
    
    return days;
  };

  const isVerifyButtonDisabled =
    !companyName ||
    !gstNumber ||
    (showWebsiteField && !websiteUrl) ||
    (showLinkedInField && !linkedinUrl);

  const isApproveButtonDisabled =
    verificationStatus !== "success" || isSubmitting;
  const isRejectButtonDisabled = verificationStatus === null || isSubmitting;
  const showSalaryOverrideCheckbox = creditHeadError
    .toLowerCase()
    .includes("must not be greater than salary date");

  const todayDate = (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  if (!showModal) return null;

  const formatSalaryTransactionDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatSalaryAmount = (amount) => {
    if (amount == null || amount === "") return "—";
    return Number(amount).toLocaleString("en-IN");
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-51"
      onClick={handleModalOutsideClick}
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 max-w-2xl w-full mx-4 shadow-xl border border-gray-200 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-brand rounded-lg">
            <AlertCircle className="text-white" size={24} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800">
            {selectedLead?.lead_no
              ? modalTitle
              : `${modalButtonText} ${selectedRows.size} selected ${
                  selectedRows.size > 1 ? "leads" : "lead"
                }`}
          </h3>
        </div>

        {/* Dynamic form based on modal type */}
        {modalType === "credit-head" ? (
          // Credit Head Action Form
          <div className="space-y-6">
            {salaryConflictLogs.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 text-sm font-semibold text-amber-800">
                  Salary Date Override Logs
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                  {salaryConflictLogs.map((log, index) => (
                    <li key={`${index}-${log}`}>{log}</li>
                  ))}
                </ul>
              </div>
            )}
            {showSalaryOverrideCheckbox && (
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <input
                  type="checkbox"
                  checked={isSalOverride}
                  onChange={(e) => setIsSalOverride(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-link focus:ring-brand"
                />
                <span className="text-sm font-medium text-gray-800">
                  Salary date override
                </span>
              </label>
            )}
            {creditHeadError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {creditHeadError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Remarks
              </label>
              <textarea
                value={approvalRemarks}
                placeholder="Enter remarks for this action"
                onChange={(e) => setApprovalRemarks(e.target.value)}
                rows={4}
                className="w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-gray-400"
              />
            </div>
          </div>
        ) : modalType === "allocated-audit" ? (
          // Company Verification Form for AllocatedAuditLeads
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Full Company Name<span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                placeholder="Enter the full company name"
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showWebsiteField}
                  onChange={(e) => setShowWebsiteField(e.target.checked)}
                  className="rounded border-gray-300 text-brand-link focus:ring-brand"
                />
                <span className="text-sm font-medium text-gray-800">
                  Company Website
                </span>
              </label>
            </div>

            {showWebsiteField && (
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Website URL<span className="text-red-700">*</span>
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  placeholder="Enter the company website URL"
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-gray-400"
                />
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showLinkedInField}
                  onChange={(e) => setShowLinkedInField(e.target.checked)}
                  className="rounded border-gray-300 text-brand-link focus:ring-brand"
                />
                <span className="text-sm font-medium text-gray-800">
                  LinkedIn
                </span>
              </label>
            </div>

            {showLinkedInField && (
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  LinkedIn URL<span className="text-red-700">*</span>
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  placeholder="Enter the LinkedIn URL"
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-gray-400"
                />
              </div>
            )}

            {/* <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Repayment Date<span className="text-red-700">*</span>
              </label>
              <div className="relative calendar-container">
                <input
                  type="text"
                  value={formatDateForDisplay(repaymentDate)}
                  placeholder="Select repayment date (7-45 days from today)"
                  onClick={toggleCalendar}
                  readOnly
                  className="w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-gray-400 cursor-pointer"
                />
                {showCalendar && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4 min-w-[320px]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Select Repayment Date</h3>
                      <button
                        onClick={() => setShowCalendar(false)}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {getMonthName(calendarMonth)} {calendarYear}
                      </h4>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
                      <div className="p-2 font-semibold text-gray-600">Sun</div>
                      <div className="p-2 font-semibold text-gray-600">Mon</div>
                      <div className="p-2 font-semibold text-gray-600">Tue</div>
                      <div className="p-2 font-semibold text-gray-600">Wed</div>
                      <div className="p-2 font-semibold text-gray-600">Thu</div>
                      <div className="p-2 font-semibold text-gray-600">Fri</div>
                      <div className="p-2 font-semibold text-gray-600">Sat</div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays().map((dayData, index) => {
                        if (!dayData) {
                          return <div key={index} className="p-2"></div>;
                        }

                        const { day, dateStr } = dayData;
                        const isDisabled = isDateDisabled(dateStr);
                        const isSelected = repaymentDate === dateStr;
                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                        return (
                          <button
                            key={dateStr}
                            onClick={() => !isDisabled && handleDateSelect(dateStr)}
                            disabled={isDisabled}
                            className={`p-2 text-sm rounded-lg transition-all duration-200 ${
                              isSelected
                                ? 'bg-brand text-white font-semibold shadow-md'
                                : isDisabled
                                ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                : isToday
                                ? 'bg-brand-light text-brand-link font-semibold hover:bg-brand-light'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-brand rounded-full"></span>
                          Selected date
                        </p>
                        <p className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                          Disabled (Sundays, outside 7-45 days)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                GST Number<span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={gstNumber}
                placeholder="Enter the GST number"
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleVerifyCompany}
                disabled={isVerifyButtonDisabled || isVerifying}
                className="px-6 py-3 bg-brand text-white hover:bg-brand-hover rounded-xl transition-all duration-300 hover:scale-105 font-medium shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isVerifying ? "Verifying..." : "Verify"}
              </button>

              {verificationStatus && (
                <div className="flex items-center gap-2">
                  {verificationStatus === "success" ? (
                    <>
                      <CheckCircle className="text-green-500" size={20} />
                      <span className="text-green-600 font-medium">
                        ✅ Company Verified
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-red-500" size={20} />
                      <span className="text-red-600 font-medium">
                        ❌ Not Verified
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Detailed verification results */}
            {verificationDetails && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  Verification Details:
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company Name:</span>
                    <span className="font-medium text-gray-800">
                      {verificationDetails.company_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GSTIN:</span>
                    <span className="font-medium text-gray-800">
                      {verificationDetails.gstin}
                    </span>
                  </div>

                  {verificationDetails.already_verified ? (
                    <div className="mt-3 p-3 bg-brand-light border border-brand/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="text-brand-link" size={16} />
                        <span className="text-brand-link font-medium text-sm">
                          Company Already Verified
                        </span>
                      </div>
                      <p className="text-brand-link text-xs mt-1">
                        This company has been previously verified and is
                        eligible for approval.
                      </p>
                    </div>
                  ) : (
                    verificationDetails.verification_criteria && (
                      <div className="mt-3">
                        <h5 className="text-xs font-semibold text-gray-700 mb-2">
                          Verification Criteria:
                        </h5>
                        <div className="space-y-1">
                          {Object.entries(
                            verificationDetails.verification_criteria
                          ).map(([key, criteria]) => (
                            <div
                              key={key}
                              className="flex justify-between items-center"
                            >
                              <span className="text-xs text-gray-600 capitalize">
                                {key.replace(/_/g, " ")}:
                              </span>
                              <div className="flex items-center gap-1">
                                {criteria.status ? (
                                  <CheckCircle
                                    className="text-green-500"
                                    size={12}
                                  />
                                ) : (
                                  <XCircle className="text-red-500" size={12} />
                                )}
                                <span
                                  className={`text-xs font-medium ${
                                    criteria.status
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {criteria.value}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {verificationDetails.all_conditions_passed !== undefined &&
                    !verificationDetails.already_verified && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-gray-700">
                            Overall Status:
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              verificationDetails.all_conditions_passed
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {verificationDetails.all_conditions_passed
                              ? "ALL CONDITIONS PASSED"
                              : "SOME CONDITIONS FAILED"}
                          </span>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Residence Proof (Optional)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  id="residenceProof"
                />
                <label
                  htmlFor="residenceProof"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  <Upload size={16} />
                  Choose File
                </label>
                {residenceProof && (
                  <span className="text-sm text-gray-600">
                    {residenceProof.name}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Residence Proof Type (Optional)
              </label>
              <select
                value={residenceProofType}
                onChange={(e) => setResidenceProofType(e.target.value)}
                className="w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-gray-400"
              >
                <option value="">Select a proof type</option>
                {ADDRESS_PROOF_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {residenceProofType === "Other" && (
                <input
                  type="text"
                  value={customResidenceProofType}
                  placeholder="Enter other proof type"
                  onChange={(e) => setCustomResidenceProofType(e.target.value)}
                  className="mt-4 w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-gray-400"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                value={approvalRemarks}
                placeholder="Enter any additional remarks"
                onChange={(e) => setApprovalRemarks(e.target.value)}
                rows={3}
                className="w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-gray-400"
              />
            </div>
          </div>
        ) : (
          // Existing BRE form for bre-rejected leads
          isInputNeeded && (
            <div className="mb-4 space-y-5">
              <BreFormSection
                title="Loan & Salary"
                description="Enter the approved loan amount and salary details."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <BreFormField
                      label="Calculated Loan Amount"
                      required
                      hint="Maximum eligible amount is ₹1,25,000"
                    >
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={calculatedLoanAmount || ""}
                          placeholder="e.g. 50000"
                          onChange={(e) => {
                            if (!setCalculatedLoanAmount) return;
                            const raw = e.target.value;
                            if (raw === "") {
                              setCalculatedLoanAmount("");
                              return;
                            }
                            const num = Number(raw);
                            if (Number.isNaN(num)) return;
                            setCalculatedLoanAmount(String(Math.min(num, 125000)));
                          }}
                          max={125000}
                          className={`${BRE_FORM_INPUT_CLASS} pl-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                        />
                      </div>
                    </BreFormField>
                  </div>

                  <BreFormField label="Salary">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={monthlyIncome || ""}
                        placeholder="Monthly income"
                        onChange={(e) =>
                          setMonthlyIncome && setMonthlyIncome(e.target.value)
                        }
                        className={`${BRE_FORM_INPUT_CLASS} pl-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                      />
                    </div>
                  </BreFormField>

                  <BreFormField label="Salary Date">
                    <input
                      type="date"
                      value={salaryDate || ""}
                      onChange={(e) =>
                        setSalaryDate && setSalaryDate(e.target.value)
                      }
                      className={BRE_FORM_INPUT_CLASS}
                    />
                  </BreFormField>
                </div>
              </BreFormSection>

              <BreFormSection
                title="Bank Details"
                description="Optional disbursement account information."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <BreFormField label="Branch Name">
                    <input
                      type="text"
                      value={branchName || ""}
                      placeholder="Branch name"
                      onChange={(e) =>
                        setBranchName && setBranchName(e.target.value)
                      }
                      className={BRE_FORM_INPUT_CLASS}
                    />
                  </BreFormField>

                  <BreFormField label="Bank Account Number">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bankAccountNo || ""}
                      placeholder="Account number"
                      onChange={(e) =>
                        setBankAccountNo && setBankAccountNo(e.target.value)
                      }
                      className={BRE_FORM_INPUT_CLASS}
                    />
                  </BreFormField>

                  <div className="sm:col-span-2">
                    <BreFormField label="IFSC Code">
                      <input
                        type="text"
                        value={ifscCode || ""}
                        placeholder="e.g. SBIN0001234"
                        onChange={(e) =>
                          setIfscCode && setIfscCode(e.target.value.toUpperCase())
                        }
                        className={`${BRE_FORM_INPUT_CLASS} uppercase tracking-wide`}
                      />
                    </BreFormField>
                  </div>
                </div>
              </BreFormSection>

              <BreFormSection title="Remarks">
                <textarea
                  value={approvalRemarks || ""}
                  placeholder="Add any notes for this approval..."
                  rows={3}
                  onChange={(e) =>
                    setApprovalRemarks && setApprovalRemarks(e.target.value)
                  }
                  className={`${BRE_FORM_INPUT_CLASS} min-h-[88px] resize-y`}
                />
              </BreFormSection>

              {showSalaryRejection && (
                <section className="overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50/40 shadow-sm">
                  <div className="border-b border-amber-200/80 bg-amber-100/60 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-900">
                      Salary verification required
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-800">
                      {salaryRejectionMessage}
                    </p>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="grid grid-cols-[3.5rem_1fr_1fr] gap-x-2 gap-y-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <span />
                      <span>Amount</span>
                      <span>Date</span>
                    </div>

                    <div className="space-y-2">
                      {salaryIncome.map((entry, index) => (
                        <div
                          key={`salary-income-${index}`}
                          className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-2 rounded-lg border border-amber-100 bg-white/80 p-2"
                        >
                          <span className="text-xs font-semibold text-slate-700">
                            Sal {index + 1}
                            {index === 0 ? (
                              <span className="text-red-600">*</span>
                            ) : null}
                          </span>
                          <input
                            type="number"
                            value={entry.amount || ""}
                            placeholder="Amount"
                            onChange={(e) =>
                              setSalaryIncome &&
                              setSalaryIncome((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, amount: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <input
                            type="date"
                            value={entry.date || ""}
                            max={todayDate}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value && value > todayDate) return;
                              setSalaryIncome &&
                                setSalaryIncome((prev) =>
                                  prev.map((item, i) =>
                                    i === index ? { ...item, date: value } : item
                                  )
                                );
                            }}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={onGetSalary}
                      disabled={isGettingSalary}
                      className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGettingSalary ? "Getting Salary..." : "Get Salary"}
                    </button>

                    {salaryTransactions.length > 0 && (
                      <div className="space-y-2 border-t border-amber-200/80 pt-3">
                        <p className="text-xs font-semibold text-slate-700">
                          Found {salaryTransactions.length} transaction
                          {salaryTransactions.length > 1 ? "s" : ""}
                        </p>
                        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                          {salaryTransactions.map((txn, idx) => {
                            const isSelected = isSalaryTransactionSelected?.(txn);

                            return (
                              <div
                                key={`${txn.id ?? idx}-${idx}`}
                                className={`rounded-lg border bg-white p-3 text-xs shadow-sm transition-colors ${
                                  isSelected
                                    ? "border-brand ring-2 ring-brand/15"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-1 justify-between gap-2">
                                    <span className="text-slate-500">Amount</span>
                                    <span className="font-semibold text-slate-900">
                                      ₹{formatSalaryAmount(txn.amount)}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => onToggleSalaryTransaction?.(txn)}
                                    className={`shrink-0 rounded-md p-1.5 transition-colors ${
                                      isSelected
                                        ? "bg-brand text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-brand hover:text-white"
                                    }`}
                                    aria-label={
                                      isSelected
                                        ? "Remove transaction"
                                        : "Add transaction"
                                    }
                                  >
                                    {isSelected ? (
                                      <Check size={14} />
                                    ) : (
                                      <Plus size={14} />
                                    )}
                                  </button>
                                </div>
                                <div className="mt-2 flex justify-between gap-2">
                                  <span className="shrink-0 text-slate-500">Date</span>
                                  <span className="text-right text-slate-900">
                                    {formatSalaryTransactionDate(txn.transaction_date)}
                                  </span>
                                </div>
                                <div className="mt-2">
                                  <span className="text-slate-500">Narration</span>
                                  <p className="mt-0.5 break-words leading-snug text-slate-800">
                                    {txn.narration || "—"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={onSubmitSalaryTransactions}
                          disabled={
                            isSubmittingSalaryTransactions ||
                            selectedSalaryTransactions.length === 0
                          }
                          className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSubmittingSalaryTransactions
                            ? "Submitting..."
                            : `Submit selected (${selectedSalaryTransactions.length})`}
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )
        )}

        <p className="text-gray-600 mb-8 text-lg">
          {selectedRows.size > 1
            ? modalDescription
            : `Are you sure you want to ${modalButtonText} this lead?`}
        </p>

        <div className="flex justify-end gap-4">
          <button
            onClick={handleCloseModal}
            className="px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-300 hover:scale-105 font-medium cursor-pointer"
          >
            Cancel
          </button>

          {modalType === "credit-head" ? (
            <>
              {/* <button
                onClick={() => handleCreditHeadAction('hold')}
                disabled={isCreditHeadActionPending}
                className="px-6 py-3 bg-yellow-600 text-white hover:bg-yellow-700 rounded-xl transition-all duration-300 hover:scale-105 font-medium shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                <Pause size={16} />
                {isCreditHeadActionPending ? 'Processing...' : '⏸️ Hold'}
              </button> */}
              <button
                onClick={() => handleCreditHeadAction("reject")}
                disabled={isCreditHeadActionPending}
                className="px-6 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-all duration-300 hover:scale-105 font-medium shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                <XCircle size={16} />
                {isCreditHeadActionPending ? "Processing..." : "Reject"}
              </button>
              <button
                onClick={() => handleCreditHeadAction("approve")}
                disabled={isCreditHeadActionPending}
                className="px-6 py-3 bg-brand text-white hover:bg-brand-hover rounded-xl transition-all duration-300 hover:scale-105 font-medium shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                <CheckCircle size={16} />
                {isCreditHeadActionPending ? "Processing..." : "Approve"}
              </button>
            </>
          ) : modalType === "allocated-audit" ? (
            <>
              <button
                onClick={handleRejectWithVerification}
                // disabled={isRejectButtonDisabled}
                className="px-6 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-all duration-300 hover:scale-105 font-medium shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? "Rejecting..." : "❌ Reject"}
              </button>
              <button
                onClick={handleApproveWithVerification}
                // disabled={isApproveButtonDisabled}
                className="px-6 py-3 bg-brand text-white hover:bg-brand-hover rounded-xl transition-all duration-300 hover:scale-105 font-medium shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? "Approving..." : "✅ Approve"}
              </button>
            </>
          ) : (
            <button
              onClick={confirmAction}
              className="px-6 py-3 bg-brand text-white hover:bg-brand-hover rounded-xl transition-all duration-300 hover:scale-105 font-medium shadow-lg cursor-pointer"
            >
              {modalButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
