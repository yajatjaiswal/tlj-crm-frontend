import { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import {
  User,
  Building2,
  Landmark,
  FileSpreadsheet,
  Users,
  ChevronDown,
  ChevronUp,
  UserPlus,
  X,
  File,
  MapPin,
  Calendar as CalendarIcon,
  CheckCircle,
  Fingerprint,
  XCircle,
  Clock,
  Search,
  FileText,
  DollarSign,
  Shield,
  Ban,
  AlertTriangle,
  AlertCircle,
  Info,
  Settings,
  CreditCard,
  Banknote,
  TrendingUp,
  ClipboardList,
  Circle,
  ArrowRight,
  Pencil,
  Check,
  Maximize2,
  Minimize2,
  Compass,
  ArrowUpRight,
  Upload,
  Trash2,
  Calculator,
} from "lucide-react";
import Calendar from "../../Components/Calendar/Calendar";
import { useDispatch, useSelector } from "react-redux";
import { closeDetailModal } from "../../redux/slices/detailModal";
import {
  LEAD_TOUR_DISMISS_EVENT,
  isLeadTourSeen,
  requestLeadTour,
} from "../../utils/productTour";
// import SvgLoader from "./../../ui/SvgLoader";
import toast from "react-hot-toast";
import { formatDate } from "../../utils/formatDate";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getAddressById,
  getBankDetailsById,
  getCustomerDetailsById,
  getDocumentById,
  getDocumentByLink,
  getLeadLogsById,
  getLoanDetailsById,
  getMobileNumberByPan,
  getThirdPartyApiData,
  getReferenceById,
  getKycAuditDetailsById,
  holdNewLeadWithRemark,
  getRepaymentDates,
  updateRepaymentDate,
} from "../../services/functions/lead-details";
import RejectionModal from "../../Components/Modals/RejectionModal";
import ConfirmationModal from "../../Components/ConfirmationModal";
import ActionModal from "../../Components/Modals/ActionModal";
import { useTheme } from "../../context/ThemeContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerTabSkeleton from "../../utils/CustomerTabSkeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  moveToBanking,
  approveBreRejectedLead,
  uploadAddtionalDocument,
  rejectBreRejectedLead,
  rejectAuditLead,
} from "../../services/functions/credit-analyst";
import { REJECTION_REASONS } from "../../utils/rejectionReasons";
import { updateBankDetails, updateSanctionAmount } from "../../services/functions/admin";
import { getProfile } from "../../services/functions/user";
import { rejectLeadById } from "../../services/functions/screener";
import AuditSummary from "../../Components/Modals/AuditSummary";
import SvgLoader from "../../ui/SvgLoader";
import EmailEditField from "../../Components/EmailEditField";
import LoanCalculator from "../screener/components/LoanCalculator";
import { isEditSanctionPermissionEmail } from "../../constants/permissionEmails";

const tabs = [
  { id: "customer", label: "Customer Details", icon: User },
  { id: "loan", label: "Loan Details", icon: Building2 },
  { id: "bank", label: "Bank Info", icon: Landmark },
  { id: "review-actions", label: "Review Actions", icon: CheckCircle },
  { id: "third-party", label: "Third Party Logs", icon: FileSpreadsheet },
  { id: "lead-log", label: "Lead Logs", icon: Users },
  { id: "reference", label: "Reference Info", icon: UserPlus },
  { id: "audit-details", label: "Audit Details", icon: ClipboardList },
  { id: "documents", label: "Documents", icon: File },
  { id: "address", label: "Addresses", icon: MapPin },
  { id: "calculator", label: "Calculator", icon: Calculator },
];

const rejectionReasons = REJECTION_REASONS;

const CustomerModal = ({
  isOpen,
  onClose,
  modalSize = "xlarge",
  hideBackdrop = false,
  showFullViewAction = true,
  isFullPageView = false,
  onMinimizeFullView,
  initialTab = "customer",
  isAssignedLeadsFlow = false,
  isCreditHeadAssignedAuditFlow = false,
  isAllocatedAuditFlow = false,
}) => {
  const dispatch = useDispatch();
  const { customer, showReject, handleReject, showApprove, handleApprove, role } = useSelector(
    (state) => state["detail-modal"]
  );
  const user = useSelector((state) => state.user);
  const canEditSanction = isEditSanctionPermissionEmail(user?.email);
  const { data: profileData } = useQuery({
    queryKey: ["employee-profile"],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });
  const isTeamLead = profileData?.data?.id === profileData?.data?.team_lead;
  const canEditPrivilegedLeadDetails = isTeamLead || canEditSanction;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [error, setError] = useState(null);
  const { isDarkMode } = useTheme();
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [editedBankDetails, setEditedBankDetails] = useState({
    beneficiary_name: "",
    account_type: "",
    bank_name: "",
    bank_acc_no: "",
    ifsc_code: "",
    branch_name: "",
  });
  const [isSavingBankDetails, setIsSavingBankDetails] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isAssignedLeadsPage = location.pathname.includes("credit-analyst/allocated-application");
  const isCreditHeadAssignedAuditPage = location.pathname.includes("credit-head/assigned-audit-leads");
  const isAllocatedAuditPage = location.pathname.includes("allocated-leads-audit");
  const isRejectAadharKycLead = customer?.lead_stage === "REJECT_AADHAR_KYC";
  const shouldShowApproveButton =
    showApprove &&
    (isAssignedLeadsPage || (isFullPageView && isAssignedLeadsFlow) || isRejectAadharKycLead);
  const shouldShowCreditHeadActionButton =
    showApprove &&
    (isCreditHeadAssignedAuditPage || (isFullPageView && isCreditHeadAssignedAuditFlow));
  const shouldShowAllocatedAuditActionButton =
    showApprove && (isAllocatedAuditPage || (isFullPageView && isAllocatedAuditFlow));

  const modalTitle = customer?.full_name
    ? `${customer.full_name}'s Details`
    : "Lead Information";
  const locationSuspiciousValue =
    customer?.location_suspicious ?? customer?.["location-suspicious"];
  const isLocationSuspicious =
    locationSuspiciousValue === true ||
    locationSuspiciousValue === 1 ||
    String(locationSuspiciousValue).toLowerCase() === "true";
  const isQualityCheckerView =
    String(user?.selectedRole || "").toLowerCase() === "quality-checker" ||
    location.pathname.toLowerCase().includes("/quality-checker");

  // Full-page view approval modal state (BRE manual approve)
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingLead, setApprovingLead] = useState(null);
  const [calculatedLoanAmount, setCalculatedLoanAmount] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [branchName, setBranchName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [salaryDate, setSalaryDate] = useState("");

  const handleApprovalModalOutsideClick = (e) => {
    try {
      if (e?.target === e?.currentTarget) {
        setShowApprovalModal(false);
      }
    } catch (err) {
      // no-op
    }
  };

  const { mutate: mutateApproveBreRejectedLead, isPending: isApprovingLead } =
    useMutation({
      mutationFn: approveBreRejectedLead,
      onSuccess: () => {
        toast.success("Lead approved successfully");
        setShowApprovalModal(false);
        setApprovingLead(null);
        queryClient.invalidateQueries(["bre-rejected-allocated-leads"]);
        queryClient.invalidateQueries(["company-leads"]);
        if (typeof onClose === "function") {
          onClose();
        }
      },
      onError: (error) => {
        toast.error(error?.message || "Failed to approve lead. Please try again.");
      },
    });

  const handleApproveConfirm = () => {
    const leadId = approvingLead?.id ?? customer?.id;
    if (!leadId) {
      toast.error("Invalid lead selected");
      return;
    }
    if (!calculatedLoanAmount) {
      toast.error("Please enter the calculated loan amount");
      return;
    }

    mutateApproveBreRejectedLead({
      id: leadId,
      calculated_loan_amount: calculatedLoanAmount,
      monthly_income: monthlyIncome ? Number(monthlyIncome) : undefined,
      branch_name: branchName,
      bank_acc_no: bankAccountNo,
      ifsc_code: ifscCode,
      salary_date: salaryDate,
      remarks: approvalRemarks,
    });
  };

  const { mutate: mutateFallbackRejectLead } = useMutation({
    mutationFn: ({ id, remarks }) => {
      if (
        isAssignedLeadsPage ||
        (isFullPageView && isAssignedLeadsFlow) ||
        isRejectAadharKycLead
      ) {
        return rejectBreRejectedLead({ id, remarks });
      }

      if (
        isCreditHeadAssignedAuditPage ||
        (isFullPageView && isCreditHeadAssignedAuditFlow) ||
        isAllocatedAuditPage ||
        (isFullPageView && isAllocatedAuditFlow)
      ) {
        return rejectAuditLead({ id, remarks });
      }

      return rejectLeadById(id, remarks);
    },
  });

  // Move to Banking states
  const [showMoveToBankingModal, setShowMoveToBankingModal] = useState(false);
  const [moveToBankingReason, setMoveToBankingReason] = useState("");

  // EMI: month filter and expandable companies
  const [selectedEmiMonth, setSelectedEmiMonth] = useState("");
  const [expandedEmiCompany, setExpandedEmiCompany] = useState(null);
  const [emiMonths, setEmiMonths] = useState([]);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [showNotInterestedConfirm, setShowNotInterestedConfirm] = useState(false);
  const [showInterestedConfirm, setShowInterestedConfirm] = useState(false);
  const [pendingRemark, setPendingRemark] = useState("");
  const [extraRemark, setExtraRemark] = useState("");
  const [isMarkedNotInterested, setIsMarkedNotInterested] = useState(false);
  const [isMarkedInterested, setIsMarkedInterested] = useState(false);
  const [additionalDocument, setAdditionalDocument] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [documentName, setDocumentName] = useState("");
  const [documentRemark, setDocumentRemark] = useState("");
  const [isDocumentSectionOpen, setIsDocumentSectionOpen] = useState(false);
  const documentInputRef = useRef(null);
  const isUploadAddtionalDocumentNeeded = true;

  // Sanction edit state
  const [isEditingSanction, setIsEditingSanction] = useState(false);
  const [editedSanction, setEditedSanction] = useState({
    loan_amount: "",
    roi: "",
    repayment_date: "",
    tenure: "",
    pf: "",
    remarks: "",
  });
  const [isSavingSanction, setIsSavingSanction] = useState(false);
  const [sanctionUpdateError, setSanctionUpdateError] = useState("");
  const [isSalaryDateOverride, setIsSalaryDateOverride] = useState(false);

  // Repayment date inline edit state
  const [isEditingRepaymentDate, setIsEditingRepaymentDate] = useState(false);
  const [selectedRepaymentDate, setSelectedRepaymentDate] = useState(null);

  useEffect(() => {
    const syncTabAcrossViews = (event) => {
      const nextTab = event?.detail?.tab;
      if (!nextTab || nextTab === activeTab) return;
      if (tabs.some((tab) => tab.id === nextTab)) {
        setActiveTab(nextTab);
      }
    };

    window.addEventListener("lead-modal-tab-sync", syncTabAcrossViews);
    return () =>
      window.removeEventListener("lead-modal-tab-sync", syncTabAcrossViews);
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen || isLeadTourSeen()) return undefined;
    const timer = window.setTimeout(() => {
      if (document.querySelector("[data-tour-active='role'], [data-tour-active='summary']")) return;
      requestLeadTour();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent(LEAD_TOUR_DISMISS_EVENT));
    };
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.dispatchEvent(
      new CustomEvent("lead-modal-tab-sync", { detail: { tab: tabId } })
    );
  };

  const getCurrentMonthLabel = () => {
    const now = new Date();
    const shortMonth = now.toLocaleString("en-US", { month: "short" });
    return `${shortMonth}-${now.getFullYear()}`;
  };

  // Populate EMI months from BSA API response

  useEffect(() => {
    if (activeTab === "documents") {
      setExpandedSection("documents");
    } else {
      setExpandedSection(null);
    }
  }, [activeTab]);

  const { data: customerDetails, isLoading: isLoadingCustomerDetails } = useQuery({
    queryKey: ["customer-details", customer?.id],
    queryFn: () => getCustomerDetailsById(customer?.id),
    enabled: (activeTab === "customer" || activeTab === "calculator") && !!customer?.id,
    onError: (error) => {
      setError("Failed to load customer details");
      console.error("Customer details error:", error);
    }
  });

  const { data: loanDetails, isLoading: isLoadingLoanDetails } = useQuery({
    queryKey: ["loan-details", customer?.id],
    queryFn: () => getLoanDetailsById(customer?.id),
    enabled: (activeTab === "loan" || activeTab === "calculator") && !!customer?.id,
    onError: (error) => {
      setError("Failed to load loan details");
      console.error("Loan details error:", error);
    }
  });

  const { data: bankDetails, isLoading: isLoadingBankDetails } = useQuery({
    queryKey: ["bank-details", customer?.id],
    queryFn: () => getBankDetailsById(customer?.id),
    enabled: activeTab === "bank" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load bank details");
      console.error("Bank details error:", error);
    }
  });

  // When multiple bank details are returned, treat the first as the "primary"
  // record for editing, and the rest as additional read‑only accounts.
  const primaryBankDetails = Array.isArray(bankDetails) ? bankDetails[0] : bankDetails;
  const otherBankDetails = Array.isArray(bankDetails) ? bankDetails.slice(1) : [];

  const { data: repaymentDatesData, isLoading: isLoadingRepaymentDates } = useQuery({
    queryKey: ["repayment-dates", customer?.id],
    queryFn: () => getRepaymentDates(customer?.id),
    enabled: isEditingRepaymentDate && !!customer?.id,
  });

  const allowedRepaymentDates =
    repaymentDatesData?.allOptions ??
    repaymentDatesData?.dates ??
    repaymentDatesData?.data ??
    (Array.isArray(repaymentDatesData) ? repaymentDatesData : null);
  const initialRepaymentCalendarDate =
    repaymentDatesData?.targetRepaymentDate ?? allowedRepaymentDates?.[0] ?? null;

  const { mutate: mutateRepaymentDate, isLoading: isUpdatingRepaymentDate } = useMutation({
    mutationFn: ({ id, repaymentDate }) => updateRepaymentDate({ id, repaymentDate }),
    onSuccess: () => {
      toast.success("Repayment date updated successfully");
      queryClient.invalidateQueries(["loan-details", customer?.id]);
      setIsEditingRepaymentDate(false);
      setSelectedRepaymentDate(null);
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to update repayment date");
    },
  });

  const { data: leadLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["lead-logs", customer?.id],
    queryFn: () => getLeadLogsById(customer?.id),
    enabled: activeTab === "lead-log" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load lead logs");
      console.error("Lead logs error:", error);
    }
  });

  const { data: panData, isLoading: isLoadingPan } = useQuery({
    queryKey: ["pan-data", customer?.id],
    queryFn: () => getThirdPartyApiData(customer?.id, "PAN_DETAILS"),
    enabled: expandedSection === "pan" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load PAN details");
      console.error("PAN details error:", error);
    }
  });

  const { data: bsaData, isLoading: isLoadingBsa } = useQuery({
    queryKey: ["bsa-data", customer?.id],
    queryFn: () => getThirdPartyApiData(customer?.id, "bsa"),
    enabled: expandedSection === "bsa" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load BSA data");
      console.error("BSA data error:", error);
    }
  });

  const { data: cibil_bureau, isLoading: isLoadingCibilBureau } = useQuery({
    queryKey: ["cibil_bureau", customer?.id],
    queryFn: () => getThirdPartyApiData(customer?.id, "CREDIT_REPORT"),
    enabled: expandedSection === "cibil_bureau" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load Cibil Bureau data");
      console.error("Cibil Bureau data error:", error);
    }
  });

  const { data: uanData, isLoading: isLoadingUan } = useQuery({
    queryKey: ["uan-data", customer?.id],
    queryFn: () => getThirdPartyApiData(customer?.id, "UAN"),
    enabled: expandedSection === "UAN" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load UAN details");
      console.error("UAN details error:", error);
    }
  });

  // Move to Banking mutation
  const { mutate: moveToBankingMutation, isPending: isMovingToBanking } = useMutation({
    mutationFn: ({ pan, reason }) => moveToBanking({ pan, reason }),
    onSuccess: () => {
      toast.success("Lead moved to banking successfully");
      setShowMoveToBankingModal(false);
      setMoveToBankingReason("");
      queryClient.invalidateQueries(["bre-rejected-allocated-leads"]);
      queryClient.invalidateQueries(["company-leads"]);
      if (typeof onClose === "function") {
        onClose();
      }
    },
    onError: (error) => {
      console.error("Error moving to banking:", error);
      toast.error(error.message || "Failed to move lead to banking");
    },
  });

  const handleMoveToBanking = () => {
    if (!moveToBankingReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    const pan =
      customerDetails?.data?.pan ||
      customer?.pan ||
      customer?.pan_no ||
      customer?.pan_number ||
      customer?.panNumber;
    if (!pan) {
      toast.error("PAN number not found");
      return;
    }
    moveToBankingMutation({ pan, reason: moveToBankingReason.trim() });
  };

  const { mutate: holdLeadWithRemark, isPending: isHolding } = useMutation({
    mutationFn: holdNewLeadWithRemark,
    onSuccess: (_data, variables) => {
      const isUnhold = variables?.category === "unhold";
      if (isUnhold) {
        toast.success("Lead marked as interested");
        setShowInterestedConfirm(false);
        setIsMarkedNotInterested(false);
        setIsMarkedInterested(true);
      } else {
        toast.success("Lead marked as not interested");
        setShowNotInterestedConfirm(false);
        setIsMarkedNotInterested(true);
        setIsMarkedInterested(false);
      }
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update lead");
    },
  });

  const handleConfirmHold = () => {
    if (!customer?.id) return;
    const finalRemark = extraRemark?.trim()
      ? `${pendingRemark} - ${extraRemark.trim()}`
      : pendingRemark;
    holdLeadWithRemark({ id: customer.id, remarks: finalRemark, category: "hold" });
  };

  const handleConfirmInterested = () => {
    if (!customer?.id) return;
    holdLeadWithRemark({ id: customer.id, remarks: "Interested", category: "unhold" });
  };

  const isEffectivelyHold = (customer?.is_hold || isMarkedNotInterested) && !isMarkedInterested;

  const { mutate: uploadDocument, isPending: isUploadingDocument } = useMutation({
    mutationFn: uploadAddtionalDocument,
    onSuccess: () => {
      toast.success("Documents uploaded successfully");
      setSelectedDocuments([]);
      setAdditionalDocument("");
      setDocumentName("");
      setDocumentRemark("");
      if (documentInputRef.current) {
        documentInputRef.current.value = "";
      }
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to upload document");
    },
  });

  const handleDocumentNameChange = (e) => {
    e.preventDefault();
    setDocumentName(e.target.value);
  };

  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files || []);
    const maxFileSize = 10 * 1024 * 1024;
    const validFiles = files.filter((file) => {
      if (file.size > maxFileSize) {
        toast.error(`${file.name} is larger than 10MB`);
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      setSelectedDocuments((prev) => [...prev, ...validFiles]);
    }
    e.target.value = "";
  };

  const removeDocument = (index) => {
    setSelectedDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadDocument = () => {
    if (!customer?.id) {
      toast.error("Lead not found");
      return;
    }
    if (selectedDocuments.length === 0) {
      toast.error("Please select at least one document");
      return;
    }
    if (!additionalDocument) {
      toast.error("Please select a document type");
      return;
    }
    if (additionalDocument === "other-Bill" && !documentName.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    const documentType = additionalDocument === "other-Bill" ? documentName.trim() : additionalDocument;
    selectedDocuments.forEach((document) => {
      const payload = {
        lead_id: customer.id,
        file_type: documentType,
        file: document,
        remarks: documentRemark,
      };
      if (additionalDocument === "other-Bill" && documentName.trim()) {
        payload.document_name = documentName.trim();
      }
      uploadDocument(payload);
    });
  };

  const toDateInputValue = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getDaysBetween = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return "";
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const startEditSanction = () => {
    const s = loanDetails?.sanction;
    setSanctionUpdateError("");
    setIsSalaryDateOverride(false);
    setEditedSanction({
      loan_amount: s?.loan_amount ?? "",
      roi: s?.roi ?? "",
      repayment_date: toDateInputValue(s?.repayment_date) ?? "",
      tenure: s?.tenure ?? "",
      pf: s?.pf_percent ?? s?.pf ?? "",
      remarks: "",
    });
    setIsEditingSanction(true);
  };

  const cancelEditSanction = () => {
    setIsEditingSanction(false);
    setSanctionUpdateError("");
    setIsSalaryDateOverride(false);
    setEditedSanction({
      loan_amount: "",
      roi: "",
      repayment_date: "",
      tenure: "",
      pf: "",
      remarks: "",
    });
  };

  const handleEditedSanctionChange = (field, value) => {
    if (sanctionUpdateError) {
      setSanctionUpdateError("");
    }
    setEditedSanction((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "repayment_date" && value && loanDetails?.sanction?.sanction_date) {
        const days = getDaysBetween(loanDetails.sanction.sanction_date, value);
        if (days !== "") next.tenure = String(days);
      }
      return next;
    });
  };

  const handleUpdateSanction = async () => {
    setSanctionUpdateError("");
    const pan =
      customerDetails?.data?.pan ||
      customer?.pan ||
      customer?.pan_no ||
      customer?.pan_number ||
      customer?.panNumber;
    if (!pan) {
      toast.error("PAN number not found");
      return;
    }
    setIsSavingSanction(true);
    try {
      await updateSanctionAmount(pan, {
        loan_amount: editedSanction.loan_amount,
        remarks: editedSanction.remarks || undefined,
        repayment_date: editedSanction.repayment_date || undefined,
        tenure: editedSanction.tenure ? Number(editedSanction.tenure) : undefined,
        roi: editedSanction.roi ? Number(editedSanction.roi) : undefined,
        pf: editedSanction.pf ? Number(editedSanction.pf) : undefined,
        is_sal_override: isSalaryDateOverride,
      });
      toast.success("Sanction updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loan-details", customer?.id] });
      cancelEditSanction();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update sanction";
      setSanctionUpdateError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSavingSanction(false);
    }
  };

  // Populate EMI months from BSA API response (after bsaData is initialized)
  useEffect(() => {
    try {
      const rawBsaEmi = bsaData?.data?.[0]?.api_response?.apimsg?.data?.[0]?.emi || [];
      const monthToTimestamp = new Map();
      rawBsaEmi.forEach((loan) => {
        (loan?.transactions || []).forEach((t) => {
          if (!t?.monthYear) return;
          const ts = t?.transactionDate || 0;
          const prev = monthToTimestamp.get(t.monthYear) || 0;
          if (ts > prev) monthToTimestamp.set(t.monthYear, ts);
        });
      });

      const months = Array.from(monthToTimestamp.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([m]) => m);
      setEmiMonths(months);

      const current = getCurrentMonthLabel();
      if (months.includes(current)) {
        setSelectedEmiMonth(current);
      } else if (months.length > 0) {
        // default to latest available month from data
        setSelectedEmiMonth(months[months.length - 1]);
      } else {
        setSelectedEmiMonth(current);
      }
    } catch (e) {
      // no-op; keep defaults
    }
  }, [bsaData]);

  const { data: breDecisionData, isLoading: isLoadingBureauDecision } = useQuery({
    queryKey: ["bre-decision-data", customer?.id],
    queryFn: () => getThirdPartyApiData(customer?.id, "BRE"),
    enabled: expandedSection === "bre-decision" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load BRE Decision data");
      console.error("BRE Decision data error:", error);
    }
  });

  const { data: documentsData, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["documents-data", customer?.id],
    queryFn: () => getDocumentById(customer?.id),
    enabled: activeTab === "documents" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load documents");
      console.error("Documents error:", error);
    }
  });

  const { data: addressData, isLoading: isLoadingAddress } = useQuery({
    queryKey: ["address-data", customer?.id],
    queryFn: () => getAddressById(customer?.id),
    enabled: activeTab === "address" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load address data");
      console.error("Address data error:", error);
    }
  });

  const { data: mobileNumberData, isLoading: isLoadingMobileNumber } = useQuery({
    queryKey: ["mobile-number-data", customerDetails?.data?.pan],
    queryFn: () => getMobileNumberByPan(customerDetails?.data?.pan),
    enabled: activeTab === "reference" && !!customerDetails?.data?.pan,
    onError: (error) => {
      setError("Failed to load mobile number data");
      console.error("Mobile number data error:", error);
    }
  });

  // Fetch KYC Audit Details
  const { data: kycAuditDetails, isLoading: isLoadingKycAudit } = useQuery({
    queryKey: ["kyc-audit-details", customer?.id],
    queryFn: () => getKycAuditDetailsById(customer?.id),
    enabled: activeTab === "audit-details" && !!customer?.id,
    onError: (error) => {
      setError("Failed to load KYC audit details");
      console.error("KYC audit details error:", error);
    }
  });

  // Fetch reference details
  const {
    data: referenceResponse,
    isLoading: isLoadingReference,
    error: referenceError,
  } = useQuery({
    queryKey: ["reference-details", customer?.id],
    queryFn: () => getReferenceById(customer?.id),
    enabled: activeTab === "reference" && !!customer?.id,
  });

  const handleRejectClick = () => {
    try {
      setIsLoading(true);
      const rejectMutationFn =
        typeof handleReject === "function"
          ? handleReject
          : typeof handleReject?.mutate === "function"
            ? handleReject.mutate
            : mutateFallbackRejectLead;

      const finalReason =
        selectedReason === "Other" ? customReason.trim() : selectedReason;

      if (!finalReason) {
        toast.error("Please provide a rejection reason");
        setIsLoading(false);
        return;
      }
      const remarks = `${finalReason}${rejectionNotes ? ` - ${rejectionNotes}` : ""
        }`;
      rejectMutationFn(
        { id: customer.id, remarks },
        {
          onSuccess: async () => {
            const shouldRefreshLeadList = (query) => {
              const firstKey = query?.queryKey?.[0];
              return (
                typeof firstKey === "string" &&
                (firstKey.includes("lead") || firstKey.includes("company"))
              );
            };

            await queryClient.invalidateQueries({
              predicate: shouldRefreshLeadList,
            });
            await queryClient.refetchQueries({
              predicate: shouldRefreshLeadList,
              type: "active",
            });
            setSelectedReason("");
            setRejectionNotes("");
            setCustomReason("");
            setShowRejectionModal(false);
            setIsLoading(false);
            // Clear Redux modal state (overlay in AppLayout) then close route / full-page view
            dispatch(closeDetailModal());
            if (typeof onClose === "function") {
              onClose();
            }
          },
          onError: (error) => {
            setError("Failed to reject lead");
            console.error("Reject lead error:", error);
            setIsLoading(false);
          },
        }
      );
    } catch (err) {
      console.error("Error handling modal click:", err);
      setError("Error occurred while handling modal. Please try again.");
      setIsLoading(false);
    }
  };

  const handleModalOutsideClick = (e) => {
    try {
      if (e.target === e.currentTarget) {
        setShowRejectionModal(false);
        setSelectedReason("");
        setCustomReason("");
        setRejectionNotes("");
      }
    } catch (err) {
      console.error("Error handling modal click:", err);
      setError("Error occurred while handling modal. Please try again.");
    }
  };

  const handleViewDocument = async (documentUrl) => {
    try {
      const response = await getDocumentByLink(documentUrl);
      if (response?.downloadUrl) {
        window.open(response?.downloadUrl, '_blank');
      } else {
        setError('Failed to get document link');
        toast.error('Failed to get document link');
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('Failed to fetch document');
      toast.error('Failed to fetch document');
    }
  };

  // Add error display component
  const ErrorDisplay = () => {
    if (!error) return null;
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
            </svg>
          </span>
        </div>
      </div>
    );
  };

  // Bank details handling
  const handleSaveBankDetails = async () => {
    const pan =
      customerDetails?.data?.pan ||
      customer?.pan ||
      customer?.pan_no ||
      customer?.pan_number ||
      customer?.panNumber;
    if (!pan) {
      toast.error("PAN number not found");
      return;
    }
    try {
      setIsSavingBankDetails(true);
      const payload = {
        remarks: "Bank details update triggered as per request",
        bank_name: editedBankDetails.bank_name,
        ifsc_code: editedBankDetails.ifsc_code,
        account_holder_name: editedBankDetails.beneficiary_name,
        account_number: editedBankDetails.bank_acc_no,
        account_type: editedBankDetails.account_type,
        branch_name: editedBankDetails.branch_name,
      };
      const response = await updateBankDetails(pan, payload);
      if (response) {
        toast.success("Bank details updated successfully");
        setIsEditingBank(false);
        queryClient.invalidateQueries(["bank-details", customer?.id]);
      }
    } catch (error) {
      setError("Failed to save bank details");
      console.error("Error saving bank details:", error);
      toast.error(error.message || "Failed to save bank details");
    } finally {
      setIsSavingBankDetails(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      titleClassName={
        isLocationSuspicious && !isQualityCheckerView
          ? "text-orange-600 line-through decoration-orange-600"
          : ""
      }
      titleAddon={
        isLocationSuspicious ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-orange-200 ${
              isQualityCheckerView
                ? "bg-orange-50 text-orange-700"
                : "bg-orange-100 text-orange-600 line-through decoration-orange-600"
            }`}
          >
            Location suspicious
          </span>
        ) : null
      }
      size={modalSize}
      compactHeader={true}
      hideBackdrop={hideBackdrop}
      headerActions={
        <>
        <button
          type="button"
          onClick={() => requestLeadTour()}
          className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          aria-label="Take a lead tour"
          title="Lead tour"
        >
          <Compass className="h-4 w-4" />
        </button>
        {isFullPageView ? (
          <button
            type="button"
            onClick={onMinimizeFullView || (() => navigate(-1))}
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Minimize view"
            title="Minimize view"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        ) : showFullViewAction ? (
          <button
            type="button"
            onClick={() =>
              navigate("/lead-information/full-view", {
                state: {
                  fromLeadModal: true,
                  activeTab,
                  isAssignedLeadsPage,
                  isCreditHeadAssignedAuditPage,
                  isAllocatedAuditPage,
                },
              })
            }
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Open full view"
            title="Open full view"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        ) : null}
        </>
      }
    >
      <ErrorDisplay />
      <div className="flex h-full flex-col bg-slate-50">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur sm:px-4 sm:py-2">
          <div
            data-tour="lead-tabs"
            className="flex w-full flex-nowrap gap-1.5 overflow-x-auto rounded-lg border border-slate-200/90 bg-slate-50/80 p-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-tour={`lead-tab:${tab.id}`}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap border ${activeTab === tab.id
                    ? "border-brand/40 bg-brand text-white shadow-sm"
                    : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                    }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          data-tour="lead-panel"
          className={`flex-1 overflow-y-auto px-4 sm:px-6 ${
            activeTab === "third-party" ? "pb-4 pt-0" : "py-4"
          }`}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

            {activeTab === "customer" && (
              <div className="col-span-full">
                {isLoadingCustomerDetails ? (
                  <CustomerTabSkeleton />
                ) : (
                  <div className="col-span-full">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {/* Basic Information Card */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-brand-dark">Basic Information</h3>
                        </div>
                        <div className="space-y-2 sm:space-y-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          <InfoField label="Customer No." value={customerDetails?.data?.customer_no || "N/A"} />
                          <InfoField label="Full Name" value={customerDetails?.data?.full_name || "N/A"} />
                          <InfoField label="Gender" value={customerDetails?.data?.gender || "N/A"} />
                          <InfoField label="Credit Score" value={customerDetails?.data?.credit_score || "N/A"} />
                        </div>
                      </div>

                      {/* Contact Information Card */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-brand-dark">Contact Information</h3>
                        </div>
                        <div className="space-y-3">
                          <EmailEditField
                            variant="light"
                            layout="stack"
                            officialLabel="Office Email"
                            panNumber={customerDetails?.data?.pan}
                            personalEmail={customerDetails?.data?.personal_email}
                            officialEmail={customerDetails?.data?.office_email}
                            showEmailBlocked={customerDetails?.data?.is_email_check_blocked}
                            onUpdated={() =>
                              queryClient.invalidateQueries(["customer-details", customer?.id])
                            }
                          />
                          <InfoField label="Phone" value={customerDetails?.data?.mobile ?? "N/A"} />
                          <InfoField label="Alternate Phone" value={customerDetails?.data?.alternate_mobile ?? "N/A"} />
                        </div>
                      </div>

                      {/* Identity Information Card */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <Fingerprint className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-brand-dark">Identity Information</h3>
                        </div>
                        <div className="space-y-3 grid grid-cols-2 gap-3">
                          <InfoField label="PAN No." value={customerDetails?.data?.pan ?? "N/A"} />
                          <InfoField label="Aadhar No." value={customerDetails?.data?.aadhaar ?? "N/A"} />
                          <InfoField label="Monthly Income" value={customerDetails?.data?.monthly_income ?? "N/A"} />
                          <InfoField label="User Input Salary" value={customerDetails?.data?.user_input_salary ?? "N/A"} />
                        </div>
                      </div>

                      {/* Address Information Card */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-brand-dark">Address Information</h3>
                        </div>
                        <div className="space-y-3">
                          <InfoField label="Aadhar Address" value={customerDetails?.data?.address ?? "N/A"} />
                          <div className="grid grid-cols-2 gap-3">
                            <InfoField label="City" value={customerDetails?.data?.city ?? "N/A"} />
                            <InfoField label="State" value={customerDetails?.data?.state ?? "N/A"} />
                            <InfoField label="Pincode" value={customerDetails?.data?.pincode ?? "N/A"} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "loan" && (
              <div className="col-span-full">
                {isLoadingLoanDetails ? (
                  <CustomerTabSkeleton />
                ) : (
                  <div className="space-y-4">
                    {/* Loan Summary Section */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-brand-dark">Loan Summary</h3>
             
                      </div>
                      {!isEditingSanction && canEditPrivilegedLeadDetails ? (
                          <button
                            type="button"
                            onClick={startEditSanction}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-muted rounded-lg hover:bg-brand-dark transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">Loan Number</label>
                          <p className="text-sm font-medium text-gray-900">{loanDetails?.loan_no || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">Max Eligible Amount</label>
                          <p className="text-sm font-medium text-gray-900">₹{loanDetails?.elegible_loan_amount || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">Requested Amount</label>
                          {isEditingSanction && canEditPrivilegedLeadDetails ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editedSanction.loan_amount}
                              onChange={(e) => handleEditedSanctionChange("loan_amount", e.target.value)}
                              className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-2 py-1.5 focus:ring-brand focus:border-brand"
                              placeholder="Amount"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">₹{loanDetails?.sanction?.loan_amount || "N/A"}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sanction Details Section */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-md">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <FileSpreadsheet className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-brand-dark">Sanction Details</h3>
                        </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">Sanction Date</label>
                          <p className="text-sm font-medium text-gray-900">{formatDate(loanDetails?.sanction?.sanction_date) || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">Interest Rate Per Day</label>
                          {isEditingSanction && canEditPrivilegedLeadDetails ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editedSanction.roi}
                              onChange={(e) => handleEditedSanctionChange("roi", e.target.value)}
                              className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-2 py-1.5 focus:ring-brand focus:border-brand"
                              placeholder="%"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{loanDetails?.sanction?.roi ? `${loanDetails?.sanction?.roi}%` : "N/A"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">Processing Fee</label>
                          <p className="text-sm font-medium text-gray-900">₹{loanDetails?.sanction?.processing_fee || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">Net Disbursal Amount</label>
                          <p className="text-sm font-medium text-gray-900">₹{loanDetails?.sanction?.net_disbursal || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">Repayment Amount</label>
                          <p className="text-sm font-medium text-gray-900">₹{loanDetails?.sanction?.repayment_amount || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs font-medium text-gray-500">Repayment Date</label>
                            {/* {!isEditingSanction && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingRepaymentDate((prev) => !prev);
                                  setSelectedRepaymentDate(null);
                                }}
                                className="text-gray-400 hover:text-slate-700 transition-colors cursor-pointer"
                                title="Edit repayment date"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )} */}
                          </div>
                          {isEditingSanction && canEditPrivilegedLeadDetails ? (
                            <Calendar
                              value={editedSanction.repayment_date}
                              onChange={(dateStr) =>
                                handleEditedSanctionChange("repayment_date", dateStr)
                              }
                              placeholder="Select repayment date"
                              disablePastDates={true}
                              className="mt-0.5"
                            />
                          ) : isEditingRepaymentDate ? (
                            <div className="space-y-2">
                              {isLoadingRepaymentDates ? (
                                <p className="text-xs text-gray-400">Loading dates...</p>
                              ) : (
                                <Calendar
                                  value={selectedRepaymentDate}
                                  onChange={(dateStr) => setSelectedRepaymentDate(dateStr)}
                                  placeholder="Select repayment date"
                                  allowedDates={allowedRepaymentDates}
                                  initialVisibleDate={initialRepaymentCalendarDate}
                                  className="mt-0.5"
                                />
                              )}
                              {selectedRepaymentDate && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      mutateRepaymentDate({ id: customer?.id, repaymentDate: selectedRepaymentDate });
                                    }}
                                    disabled={isUpdatingRepaymentDate}
                                    className="flex-1 text-xs bg-brand text-white rounded-md px-3 py-1.5 hover:bg-brand-hover disabled:opacity-50 transition-colors cursor-pointer"
                                  >
                                    {isUpdatingRepaymentDate ? "Saving..." : "Submit"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsEditingRepaymentDate(false);
                                      setSelectedRepaymentDate(null);
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(loanDetails?.sanction?.repayment_date) || "N/A"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">Tenure</label>
                          <p className="text-sm font-medium text-gray-900">
                            {isEditingSanction && canEditPrivilegedLeadDetails
                              ? (editedSanction.tenure ? `${editedSanction.tenure} days` : "N/A")
                              : (loanDetails?.sanction?.tenure ? `${loanDetails?.sanction?.tenure} days` : "N/A")}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">APR(Annual Percentage Rate)</label>
                          <p className="text-sm font-medium text-gray-900">{loanDetails?.sanction?.apr ? `${loanDetails?.sanction?.apr}%` : "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">GST</label>
                          <p className="text-sm font-medium text-gray-900">₹{loanDetails?.sanction?.gst || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-500">PF Percentage</label>
                          {isEditingSanction && canEditPrivilegedLeadDetails ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editedSanction.pf}
                              onChange={(e) => handleEditedSanctionChange("pf", e.target.value)}
                              className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-2 py-1.5 focus:ring-brand focus:border-brand"
                              placeholder="%"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{loanDetails?.sanction?.pf_percent ?? loanDetails?.sanction?.pf ?? "N/A"}%</p>
                          )}
                        </div>
                        {isEditingSanction && canEditPrivilegedLeadDetails && (
                          <div className="space-y-1 md:col-span-2 lg:col-span-3">
                            <label className="text-xs font-medium text-gray-500">Remarks (optional)</label>
                            <input
                              type="text"
                              value={editedSanction.remarks}
                              onChange={(e) => handleEditedSanctionChange("remarks", e.target.value)}
                              className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-2 py-1.5 focus:ring-brand focus:border-brand"
                              placeholder="Remarks for update"
                            />
                          </div>
                        )}
                      </div>
                      {isEditingSanction && canEditPrivilegedLeadDetails && sanctionUpdateError && (
                        <>
                          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {sanctionUpdateError}
                          </div>
                          <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-gray-700">
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
                      {isEditingSanction && canEditPrivilegedLeadDetails && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={handleUpdateSanction}
                            disabled={isSavingSanction}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            {isSavingSanction ? "Updating..." : "Update"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditSanction}
                            disabled={isSavingSanction}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-60 transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Disbursal Details Section */}
                    {loanDetails?.disbursal && (
                      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-md">
                        <div className="flex items-center space-x-2 mb-3">
                          {/* <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-white" />
                          </div> */}
                          <h3 className="text-sm font-semibold text-brand-dark">Disbursal Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Disbursal Date</label>
                            <p className="text-sm font-medium text-gray-900">{formatDate(loanDetails?.disbursal?.disbursal_date) || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Payment Mode</label>
                            <p className="text-sm font-medium text-gray-900">{loanDetails?.disbursal?.payment_mode?.replace(/_/g, ' ') || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">UTR Number</label>
                            <p className="text-sm font-medium text-gray-900">{loanDetails?.disbursal?.utr || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Payable Account</label>
                            <p className="text-sm font-medium text-gray-900">{loanDetails?.disbursal?.payable_account || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Disbursed Amount</label>
                            <p className="text-sm font-medium text-gray-900">₹{loanDetails?.disbursal?.amount || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "review-actions" && (
              <div className="col-span-full">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-4">
                  <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Review Actions</div>
                      <h3 className="mt-1 text-sm font-semibold text-brand-dark sm:text-base">Lead workflow controls</h3>
                      <p className="mt-1 text-xs text-slate-500">Trigger lead decisions and manage supporting documents from one place.</p>
                    </div>
                    <span className="hidden rounded-md border-0 bg-brand-muted px-2 py-1 text-[11px] font-semibold text-white sm:inline-flex">
                      Quick actions
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 sm:p-3">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      <CheckCircle className="h-3.5 w-3.5 text-brand-dark" />
                      Lead Decisions
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">


                      {customer?.audit_id && (
                        <button
                          onClick={() => setShowSummary(true)}
                          className="cursor-pointer inline-flex h-10 items-center justify-center rounded-lg bg-orange-600 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-700 sm:text-sm"
                        >
                          Summary
                        </button>
                      )}

                      {showReject && (
                        <button
                          onClick={() => {
                            setSelectedReason("");
                            setCustomReason("");
                            setRejectionNotes("");
                            setShowRejectionModal(true);
                          }}
                          className="cursor-pointer inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-700 sm:text-sm"
                        >
                          <X className="mr-2" size={16} />
                          Reject Lead
                        </button>
                      )}

                      {!isEffectivelyHold && (
                        <>
                          <button
                            onClick={() => {
                              setPendingRemark("Not interested at all");
                              setExtraRemark("");
                              setShowNotInterestedConfirm(true);
                            }}
                            disabled={isHolding}
                            className="cursor-pointer inline-flex h-10 items-center justify-center rounded-lg bg-amber-600 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                          >
                            Not Interested at all
                          </button>
                          <button
                            onClick={() => {
                              setPendingRemark("Not interested right now");
                              setExtraRemark("");
                              setShowNotInterestedConfirm(true);
                            }}
                            disabled={isHolding}
                            className="cursor-pointer inline-flex h-10 items-center justify-center rounded-lg bg-amber-600 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                          >
                            Not Interested right now
                          </button>
                        </>
                      )}

                      {isEffectivelyHold && (
                        <button
                          onClick={() => setShowInterestedConfirm(true)}
                          disabled={isHolding}
                          className="cursor-pointer inline-flex h-10 items-center justify-center rounded-lg bg-green-600 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                        >
                          Interested
                        </button>
                      )}
                    </div>
                  </div>

                  {isUploadAddtionalDocumentNeeded && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2">
                      <button
                        onClick={() => setIsDocumentSectionOpen(!isDocumentSectionOpen)}
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border-0 bg-brand-muted">
                            <Upload className="w-3.5 h-3.5 text-white" />
                          </span>
                          <div className="text-left">
                            <p className="text-xs font-semibold text-slate-800 sm:text-sm">Upload Additional Documents</p>
                            <p className="text-[11px] text-slate-500">Attach JPG, PNG or PDF files up to 10MB each</p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isDocumentSectionOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isDocumentSectionOpen && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                              <div className="relative group">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Document Type<span className="text-red-700">*</span></label>
                                <select
                                  className="h-10 w-full cursor-pointer rounded-lg border border-slate-300 px-3 text-sm text-gray-800 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
                                  value={additionalDocument}
                                  onChange={(e) => setAdditionalDocument(e.target.value)}
                                >
                                  <option value="" disabled className="text-gray-800">Select Document Type</option>
                                  <option value="Bank-Statement" className="text-gray-800">Bank Statement</option>
                                  <option value="Electricity-Bill" className="text-gray-800">Electricity Bill</option>
                                  <option value="Gas-Bill" className="text-gray-800">Gas Bill</option>
                                  <option value="Water-Bill" className="text-gray-800">Water Bill</option>
                                  <option value="Mobile-Bill" className="text-gray-800">Mobile Bill</option>
                                  <option value="Credit-Card-Bill" className="text-gray-800">Credit Card Bill</option>
                                  <option value="Debit-Card-Bill" className="text-gray-800">Debit Card Bill</option>
                                  <option value="Salary-Account-Statement" className="text-gray-800">Latest Salary Account Statement</option>
                                  <option value="Office-ID-Card" className="text-gray-800">Office ID Card</option>
                                  <option value="Appointment-or-Offer-Letter" className="text-gray-800">Appointment or Offer Letter</option>
                                  <option value="wifi-bill" className="text-gray-800">Wifi Bill</option>
                                  <option value="selfie" className="text-gray-800">Selfie</option>
                                  <option value="payslip" className="text-gray-800">Payslip</option>
                                  <option value="rent-agreement" className="text-gray-800">Rent Agreement</option>
                                  <option value="form-16" className="text-gray-800">Form 16</option>
                                  <option value="other-Bill" className="text-gray-800">Other Bill</option>
                                </select>
                              </div>

                              {additionalDocument === "other-Bill" && (
                                <div className="relative group">
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Document Name<span className="text-red-700">*</span></label>
                                  <input
                                    type="text"
                                    placeholder="Name-Bill"
                                    onChange={handleDocumentNameChange}
                                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
                                  />
                                </div>
                              )}
                            </div>

                            {additionalDocument && (
                              <div className="relative group">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Remarks</label>
                                <textarea
                                  value={documentRemark}
                                  onChange={(e) => setDocumentRemark(e.target.value)}
                                  placeholder="Enter remarks for the documents (Optional)"
                                  rows={2}
                                  className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                              </div>
                            )}

                            <div className="relative group">
                              <input
                                ref={documentInputRef}
                                type="file"
                                id="additionalDocumentModal"
                                onChange={handleDocumentChange}
                                className="hidden"
                                multiple
                                accept=".jpg,.jpeg,.png,.pdf"
                              />
                              <label
                                htmlFor="additionalDocumentModal"
                                className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-3 py-4 transition-all duration-200 hover:bg-slate-100/70"
                              >
                                <div className="text-center w-full">
                                  {selectedDocuments.length > 0 ? (
                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold text-gray-700">Selected Documents ({selectedDocuments.length})</p>
                                      <div className="max-h-44 overflow-y-auto space-y-2">
                                        {selectedDocuments.map((doc, index) => (
                                          <div key={`${doc.name}-${index}`} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                            <div className="flex items-center justify-between">
                                              <span className="text-gray-600 truncate flex-1 text-xs font-medium">{doc.name}</span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  removeDocument(index);
                                                }}
                                                className="text-red-500 hover:text-red-700 transition-colors ml-2"
                                                title="Remove document"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      <p className="mt-1 text-[11px] text-gray-500">Click to add more documents</p>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm text-gray-600">Drag & drop or click to browse</p>
                                      <p className="mt-0.5 text-[11px] text-gray-500">Supported: .jpg, .jpeg, .png, .pdf</p>
                                    </>
                                  )}
                                </div>
                              </label>
                            </div>

                            <div className="flex justify-end">
                              <button
                                onClick={handleUploadDocument}
                                disabled={isUploadingDocument || selectedDocuments.length === 0}
                                className={`
                                  relative inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-brand-dark
                                  transition-all duration-200 cursor-pointer
                                  ${selectedDocuments.length > 0 && !isUploadingDocument
                                    ? "bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover shadow-sm"
                                    : "bg-gray-400 cursor-not-allowed"
                                  }
                                `}
                              >
                                {isUploadingDocument ? (
                                  <div className="flex items-center">
                                    <SvgLoader />
                                    <span className="ml-2">Uploading...</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload {selectedDocuments.length > 1 ? `${selectedDocuments.length} Documents` : "Document"}
                                  </div>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "bank" && (
              <div className="col-span-full">
                {isLoadingBankDetails ? (
                  <CustomerTabSkeleton />
                ) : (
                  <div className="col-span-full">
                    {canEditPrivilegedLeadDetails && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => {
                          setIsEditingBank(!isEditingBank);
                          if (!isEditingBank) {
                            // Auto-fill the form with existing bank details when entering edit mode
                            setEditedBankDetails({
                              beneficiary_name: primaryBankDetails?.beneficiary_name || "",
                              account_type: primaryBankDetails?.account_type || "",
                              bank_name: primaryBankDetails?.bank_name || "",
                              bank_acc_no: primaryBankDetails?.bank_acc_no || "",
                              ifsc_code: primaryBankDetails?.ifsc_code || "",
                              branch_name: primaryBankDetails?.branch_name || "",
                            });
                          }
                        }}
                        className="cursor-pointer px-2.5 py-1 text-xs bg-brand text-white rounded-md hover:bg-brand/90 transition-colors flex items-center gap-1.5"
                      >
                        {isEditingBank ? (
                          <>
                            <X className="h-3 w-3" />
                            Cancel Edit
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3" />
                            Edit Details
                          </>
                        )}
                      </button>
                    </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Account Holder Card */}
                      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-md">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-brand-dark">Account Holder</h3>
                        </div>
                        <div className="space-y-3">
                          {isEditingBank && canEditPrivilegedLeadDetails ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500">Beneficiary Name</label>
                                <input
                                  type="text"
                                  value={editedBankDetails.beneficiary_name}
                                  placeholder="Enter Beneficiary Name"
                                  onChange={(e) => setEditedBankDetails(prev => ({
                                    ...prev,
                                    beneficiary_name: e.target.value
                                  }))}
                                  className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-white !text-gray-900"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500">Account Type</label>
                                <input
                                  type="text"
                                  value={editedBankDetails.account_type}
                                  placeholder="Enter Account Type"
                                  onChange={(e) => setEditedBankDetails(prev => ({
                                    ...prev,
                                    account_type: e.target.value
                                  }))}
                                  className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-white !text-gray-900"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <InfoField label="Beneficiary Name" value={primaryBankDetails?.beneficiary_name ?? "N/A"} />
                              <InfoField label="Account Type" value={primaryBankDetails?.account_type ?? "N/A"} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bank Details Card */}
                      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-md">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <Landmark className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-brand-dark">Bank Details</h3>
                        </div>
                        <div className="space-y-3">
                          {isEditingBank && canEditPrivilegedLeadDetails ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500">Bank Name</label>
                                <input
                                  type="text"
                                  value={editedBankDetails.bank_name}
                                  placeholder="Enter Bank Name"
                                  onChange={(e) => setEditedBankDetails(prev => ({
                                    ...prev,
                                    bank_name: e.target.value
                                  }))}
                                  className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-white !text-gray-900"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500">Account No</label>
                                <input
                                  type="text"
                                  value={editedBankDetails.bank_acc_no}
                                  placeholder="Enter Account No"
                                  onChange={(e) => setEditedBankDetails(prev => ({
                                    ...prev,
                                    bank_acc_no: e.target.value
                                  }))}
                                  className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-white !text-gray-900"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500">IFSC Code</label>
                                <input
                                  type="text"
                                  value={editedBankDetails.ifsc_code}
                                  placeholder="Enter IFSC Code"
                                  onChange={(e) => setEditedBankDetails(prev => ({
                                    ...prev,
                                    ifsc_code: e.target.value
                                  }))}
                                  className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-white !text-gray-900"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <InfoField label="Bank Name" value={primaryBankDetails?.bank_name ?? "N/A"} />
                              <InfoField label="Account No" value={primaryBankDetails?.bank_acc_no ?? "N/A"} />
                              <InfoField label="IFSC Code" value={primaryBankDetails?.ifsc_code ?? "N/A"} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Branch Information Card */}
                      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-md">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-brand-dark">Branch Information</h3>
                        </div>
                        <div className="space-y-3">
                          {isEditingBank && canEditPrivilegedLeadDetails ? (
                            <div className="space-y-1">
                              <label className="text-xs text-gray-500">Branch Name</label>
                              <input
                                type="text"
                                value={editedBankDetails.branch_name}
                                placeholder="Enter Branch Name"
                                onChange={(e) => setEditedBankDetails(prev => ({
                                  ...prev,
                                  branch_name: e.target.value
                                }))}
                                className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand bg-white !text-gray-900"
                              />
                            </div>
                          ) : (
                            <InfoField label="Branch Name" value={primaryBankDetails?.branch_name ?? "N/A"} />
                          )}
                        </div>
                      </div>
                    </div>

                    {isEditingBank && canEditPrivilegedLeadDetails && (
                      <div className="flex justify-end mt-2 space-x-2">
                        <button
                          onClick={() => {
                            setIsEditingBank(false);
                            setEditedBankDetails(primaryBankDetails || {});
                          }}
                          className="cursor-pointer px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveBankDetails}
                          disabled={isSavingBankDetails}
                          className="cursor-pointer px-2.5 py-1 text-xs bg-brand text-white rounded-md hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {isSavingBankDetails ? (
                            <>
                              <div className="cursor-pointer h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 text-white" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Additional bank accounts (read-only list) */}
                    {otherBankDetails.length > 0 && (
                      <div className="mt-6 space-y-4">
                        <h3 className="text-sm font-semibold text-brand-dark">
                          Other Bank Accounts
                        </h3>
                        {otherBankDetails.map((bank, index) => (
                          <div
                            key={bank?.id || index}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-md"
                          >
                            <InfoField label="Beneficiary Name" value={bank?.beneficiary_name ?? "N/A"} />
                            <InfoField label="Account Type" value={bank?.account_type ?? "N/A"} />
                            <InfoField label="Bank Name" value={bank?.bank_name ?? "N/A"} />
                            <InfoField label="Account No" value={bank?.bank_acc_no ?? "N/A"} />
                            <InfoField label="IFSC Code" value={bank?.ifsc_code ?? "N/A"} />
                            <InfoField label="Branch Name" value={bank?.branch_name ?? "N/A"} />
                          </div>
                        ))}
                      </div>
                    )}


                  </div>
                )}
              </div>
            )}

            {activeTab === "third-party" && (
              <div className="col-span-full">
                <div className="space-y-4">
                  <CollapsibleSection
                    title="Pan Detail"
                    tourId="third-party:pan"
                    type="pan"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                    data={panData}
                    isLoading={isLoadingPan}
                    role={role}
                  />
                  <CollapsibleSection
                    title="BSA Report"
                    tourId="third-party:bsa"
                    type="bsa"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                    data={bsaData}
                    isLoading={isLoadingBsa}
                    selectedEmiMonth={selectedEmiMonth}
                    setSelectedEmiMonth={setSelectedEmiMonth}
                    expandedEmiCompany={expandedEmiCompany}
                    setExpandedEmiCompany={setExpandedEmiCompany}
                    emiMonths={emiMonths}
                    getCurrentMonthLabel={getCurrentMonthLabel}
                    transactionSearchTerm={transactionSearchTerm}
                    setTransactionSearchTerm={setTransactionSearchTerm}
                    role={role}
                    onMoveToBankingClick={() => setShowMoveToBankingModal(true)}
                  />
                  <CollapsibleSection
                    title="CIBIL Bureau"
                    tourId="third-party:cibil"
                    type="cibil_bureau"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                    data={cibil_bureau}
                    isLoading={isLoadingCibilBureau}
                    role={role}
                  />
                  <CollapsibleSection
                    title="BRE Decision"
                    tourId="third-party:bre"
                    type="bre-decision"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                    role={role}
                    data={breDecisionData}
                    isLoading={isLoadingBureauDecision}
                  />
                  <CollapsibleSection
                    title="UAN Details"
                    tourId="third-party:uan"
                    type="UAN"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                    role={role}
                    data={uanData}
                    isLoading={isLoadingUan}
                  />
                </div>
              </div>
            )}

            {activeTab === "lead-log" && (
              <div className="col-span-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isLoadingLogs ? (
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <div key={i} className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm animate-pulse">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted/20"></div>
                          <div className="h-4 bg-slate-100 rounded w-24"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-100 rounded w-full"></div>
                          <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))
                  ) : leadLogs?.length > 0 ? (
                    [...leadLogs]
                      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                      .map((log, index) => (
                        <div
                          key={log.id}
                          className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                              <Clock className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-sm font-semibold text-brand-dark">Log #{index + 1}</h3>
                          </div>
                          <div className="space-y-3">
                            <InfoField label="Remarks" value={log.remarks} />
                            <InfoField label="Date" value={formatDate(log.created_at, { showTime: true })} />
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="col-span-full text-center py-8 bg-zinc-50 rounded-xl border border-zinc-200">
                      <div className="mx-auto w-16 h-16 bg-brand-muted rounded-full flex items-center justify-center mb-4">
                        <Clock className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Logs Found</h3>
                      <p className="text-sm text-gray-500">There are no logs available for this customer yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "reference" && (
              <div className="col-span-full">
                {/* Reference Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <UserPlus className="h-5 w-5 mr-2 text-brand-dark" />
                    Reference Information
                  </h3>
                  {console.log("referenceResponse-><<<<<<---->>>", referenceResponse)}
                  {isLoadingReference ? (
                    <div className="text-gray-500">Loading reference data...</div>
                  ) : referenceError ? (
                    <div className="text-red-500">Failed to load reference data</div>
                  ) : (referenceResponse && Object.keys(referenceResponse).length) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2].map((index) => {
                        const refName = referenceResponse[`ref_name_${index}`];
                        const refNo = referenceResponse[`ref_no_${index}`];
                        const refRelation = referenceResponse[`ref_relation_${index}`];
                        const refAdd = referenceResponse[`ref_add_${index}`];
                        return (
                          <div
                            key={index}
                            className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                          >
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                                <UserPlus className="h-4 w-4 text-white" />
                              </div>
                              <h3 className="text-sm font-semibold text-brand-dark">Reference {index}</h3>
                            </div>
                            <div className="space-y-3">
                              <InfoField label="Name" value={refName ?? "N/A"} />
                              <InfoField label="Contact" value={refNo ?? "N/A"} />
                              <InfoField label="Relation" value={refRelation ?? "N/A"} />
                              <InfoField label="Address" value={refAdd ?? "N/A"} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-gray-500">No reference data available.</div>
                  )}
                </div>

                {/* Mobile Number Data */}
                {/* <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Search className="h-5 w-5 mr-2 text-brand-dark" />
                    UPI Mobile Numbers from Bank Statement**
                  </h3>
                  {isLoadingMobileNumber ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm animate-pulse">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="h-8 w-8 rounded-full bg-brand-muted/20"></div>
                            <div className="h-4 bg-slate-100 rounded w-24"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 bg-slate-100 rounded w-full"></div>
                            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : mobileNumberData?.result?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mobileNumberData.result.map((mobile, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                              <Search className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-sm font-semibold text-brand-dark">Mobile {index + 1}</h3>
                          </div>
                          <div className="space-y-3">
                            <InfoField label="Mobile Number" value={mobile.mobile_number} />
                            <InfoField label="Total Transactions" value={mobile.transaction_count} />
                            <div className="grid grid-cols-2 gap-2">
                              <InfoField label="Debit Count" value={mobile.debit_count} />
                              <InfoField label="Credit Count" value={mobile.credit_count} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <InfoField label="Total Debit" value={`₹${mobile.total_debit_amount}`} />
                              <InfoField label="Total Credit" value={`₹${mobile.total_credit_amount}`} />
                            </div>
                            <InfoField label="First Transaction" value={formatDate(mobile.first_transaction)} />
                            <InfoField label="Last Transaction" value={formatDate(mobile.last_transaction)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-zinc-50 rounded-xl border border-zinc-200">
                      <div className="mx-auto w-16 h-16 bg-brand-muted rounded-full flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Mobile Number Data Found</h3>
                      <p className="text-sm text-gray-500">No mobile number analysis data available for this customer.</p>
                    </div>
                  )}
                </div> */}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="col-span-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isLoadingDocuments ? (
                    [1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm animate-pulse">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted/20"></div>
                          <div className="h-4 bg-slate-100 rounded w-24"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-100 rounded w-full"></div>
                          <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))
                  ) : documentsData?.length > 0 ? (
                    documentsData.map((doc, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                            <File className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-brand-dark">
                            {doc.document_type.replace(/_/g, ' ').replace(/-/g, ' ')}
                          </h3>
                        </div>
                        <div className="space-y-3">
                          <InfoField label="Upload Date" value={formatDate(doc.created_at, { showTime: true })} />
                          <InfoField label="Remarks" value={doc.remarks} />
                          <button
                            onClick={() => handleViewDocument(doc.document_url)}
                            className="cursor-pointer w-full py-2 px-3 bg-brand-muted text-white rounded-md text-sm font-medium hover:bg-brand-dark transition-colors duration-200 flex items-center justify-center space-x-2"
                          >
                            <File className="h-4 w-4" />
                            <span>View Document</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 bg-zinc-50 rounded-xl border border-zinc-200">
                      <div className="mx-auto w-16 h-16 bg-brand-muted rounded-full flex items-center justify-center mb-4">
                        <File className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Documents Found</h3>
                      <p className="text-sm text-gray-500">There are no documents uploaded for this customer yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "audit-details" && (
              <div className="col-span-full">
                {isLoadingKycAudit ? (
                  <CustomerTabSkeleton />
                ) : kycAuditDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Company Info */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-md">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-brand-dark">Company Information</h3>
                      </div>
                      <div className="space-y-3">
                        <InfoField label="Company Name" value={kycAuditDetails?.company_name ?? "N/A"} />
                        <InfoField label="Company Email" value={kycAuditDetails?.company_email ?? "N/A"} />
                        <InfoField label="GST No" value={kycAuditDetails?.gst_no ?? "N/A"} />
                        <InfoField label="Website" value={kycAuditDetails?.website_url ?? "N/A"} />
                        <InfoField label="LinkedIn" value={kycAuditDetails?.linkedin_url ?? "N/A"} />
                      </div>
                    </div>

                    {/* Assignment & Approval */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-md">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-brand-dark">Assignment & Approval</h3>
                      </div>
                      <div className="space-y-3">
                        <InfoField label="Assigned To" value={kycAuditDetails?.credit_employee_name ?? kycAuditDetails?.assigned_to ?? "N/A"} />
                        <InfoField label="Assigned By" value={kycAuditDetails?.credit_head_name ?? kycAuditDetails?.assigned_by ?? "N/A"} />
                        <InfoField label="Approved By" value={kycAuditDetails?.approved_by_name ?? kycAuditDetails?.approved_by ?? "N/A"} />
                        <InfoField label="Rejected By" value={kycAuditDetails?.rejected_by_name ?? (kycAuditDetails?.rejected_by || "-")} />
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-md">
                      <div className="flex items-center space-x-2 mb-3">
                        <h3 className="text-sm font-semibold text-brand-dark">Timestamps</h3>
                      </div>
                      <div className="space-y-3">
                        <InfoField label="Created At" value={formatDate(kycAuditDetails?.created_at, { showTime: true })} />
                        <InfoField label="Updated At" value={formatDate(kycAuditDetails?.updated_at, { showTime: true })} />
                        <InfoField label="Remarks" value={kycAuditDetails?.remarks ?? "N/A"} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="col-span-full text-center py-8 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div className="mx-auto w-16 h-16 bg-brand-muted rounded-full flex items-center justify-center mb-4">
                      <ClipboardList className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Audit Details Found</h3>
                    <p className="text-sm text-gray-500">There are no audit details available for this customer yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "address" && (
              <div className="col-span-full">
                {isLoadingAddress ? (
                  <CustomerTabSkeleton />
                ) : (
                  <div className="col-span-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {addressData?.map((address, index) => (
                        <div key={index} className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                              <MapPin className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-sm font-semibold text-brand-dark">
                              {address.address_source === 'ON_GRID' ? 'ADDITIONAL_ADDRESS' : address.address_source ?? "N/A"}
                            </h3>
                          </div>
                          <div className="space-y-3">
                            <InfoField label="Address" value={address.address ?? "N/A"} />
                            <div className="grid grid-cols-2 gap-3">
                              <InfoField label="City" value={address.city ?? "N/A"} />
                              <InfoField label="State" value={address.state ?? "N/A"} />
                              <InfoField label="Country" value={address.country ?? "N/A"} />
                              <InfoField label="Pincode" value={address.pincode ?? "N/A"} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "calculator" && (
              <div className="col-span-full">
                {isLoadingCustomerDetails || isLoadingLoanDetails ? (
                  <CustomerTabSkeleton />
                ) : (
                  <LoanCalculator
                    customerName={
                      customerDetails?.data?.full_name ||
                      customer?.full_name ||
                      customer?.cust_name
                    }
                    pan={
                      customerDetails?.data?.pan ||
                      customer?.pan ||
                      customer?.pan_no ||
                      customer?.pan_number ||
                      customer?.panNumber
                    }
                    defaultLoanAmount={
                      loanDetails?.sanction?.loan_amount ??
                      loanDetails?.elegible_loan_amount
                    }
                    defaultPfPercent={
                      loanDetails?.sanction?.pf_percent ?? loanDetails?.sanction?.pf
                    }
                    defaultRoi={loanDetails?.sanction?.roi}
                    repaymentDate={loanDetails?.sanction?.repayment_date}
                  />
                )}
              </div>
            )}

          </div>
        </div>

        <div
          data-tour="lead-actions"
          className="sticky bottom-0 z-30 -mx-4 sm:-mx-6 border-t border-slate-200 bg-white/95 px-4 pt-2 sm:px-6 backdrop-blur"
        >
            <div className="flex items-center justify-end gap-2">
              {shouldShowApproveButton && (
                <button
                  onClick={() => {
                    setApprovingLead(customer);
                    setShowApprovalModal(true);
                  }}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-md bg-brand px-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover cursor-pointer"
                  aria-label="Approve Lead"
                  title="Approve Lead"
                >
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Approve
                </button>
              )}

              {showReject && (
                <button
                  onClick={() => {
                    setSelectedReason("");
                    setCustomReason("");
                    setRejectionNotes("");
                    setShowRejectionModal(true);
                  }}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-md bg-red-600 px-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Reject Lead
                </button>
              )}

              {shouldShowCreditHeadActionButton && (
                <button
                  onClick={() => {
                    setApprovingLead(customer);
                    setShowApprovalModal(true);
                  }}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-md bg-brand px-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover cursor-pointer"
                  aria-label="Action"
                  title="Action"
                >
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Action
                </button>
              )}

              {shouldShowAllocatedAuditActionButton && (
                <button
                  onClick={() => {
                    setApprovingLead(customer);
                    setShowApprovalModal(true);
                  }}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-md bg-brand px-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover cursor-pointer"
                  aria-label="Action"
                  title="Action"
                >
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Action
                </button>
              )}

              <button
                onClick={onClose}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-brand-dark shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        {/* Rejection Modal */}
        <RejectionModal
          isDarkMode={isDarkMode}
          showRejectionModal={showRejectionModal}
          handleModalOutsideClick={handleModalOutsideClick}
          rejectingLead={customer}
          setShowRejectionModal={setShowRejectionModal}
          submitRejection={handleRejectClick}
          selectedReason={selectedReason}
          setSelectedReason={setSelectedReason}
          rejectionReasons={rejectionReasons}
          rejectionNotes={rejectionNotes}
          setRejectionNotes={setRejectionNotes}
          customReason={customReason}
          setCustomReason={setCustomReason}
          loadingState={isLoading}
          leadID={customer?.lead_no}
        />

        <ActionModal
          showModal={showApprovalModal}
          handleModalOutsideClick={handleApprovalModalOutsideClick}
          selectedLead={approvingLead}
          selectedRows={new Set([approvingLead?.id])}
          setShowModal={setShowApprovalModal}
          setSelectedLead={setApprovingLead}
          confirmAction={
            shouldShowCreditHeadActionButton || shouldShowAllocatedAuditActionButton
              ? () => {
                  setShowApprovalModal(false);
                  setApprovingLead(null);
                  setApprovalRemarks("");
                }
              : handleApproveConfirm
          }
          calculatedLoanAmount={calculatedLoanAmount}
          setCalculatedLoanAmount={setCalculatedLoanAmount}
          monthlyIncome={monthlyIncome}
          setMonthlyIncome={setMonthlyIncome}
          approvalRemarks={approvalRemarks}
          setApprovalRemarks={setApprovalRemarks}
          branchName={branchName}
          setBranchName={setBranchName}
          bankAccountNo={bankAccountNo}
          setBankAccountNo={setBankAccountNo}
          ifscCode={ifscCode}
          setIfscCode={setIfscCode}
          salaryDate={salaryDate}
          setSalaryDate={setSalaryDate}
          isInputNeeded={true}
          modalType={
            shouldShowCreditHeadActionButton
              ? "credit-head"
              : shouldShowAllocatedAuditActionButton
                ? "allocated-audit"
                : "bre-rejected"
          }
          modalTitle={
            shouldShowCreditHeadActionButton
              ? `Action on Audit Lead ${approvingLead?.lead_no ?? ""}`
              : shouldShowAllocatedAuditActionButton
                ? `Approve Audit Lead ${approvingLead?.lead_no ?? ""}`
                : `Approve Lead ${approvingLead?.lead_no ?? ""}`
          }
          modalDescription={
            shouldShowCreditHeadActionButton
              ? "Select an action for this audit lead"
              : shouldShowAllocatedAuditActionButton
                ? "Are you sure you want to approve this audit lead?"
                : "Are you sure you want to approve this lead? This action cannot be undone."
          }
          modalButtonText={
            shouldShowCreditHeadActionButton || shouldShowAllocatedAuditActionButton
              ? "Action"
              : "Approve"
          }
          onCreditHeadAction={() => {
            setShowApprovalModal(false);
            setApprovingLead(null);
            setApprovalRemarks("");
            queryClient.invalidateQueries(["assigned-credit-head-audit-leads"]);
          }}
          onApproveWithVerification={() => {
            setShowApprovalModal(false);
            setApprovingLead(null);
            setApprovalRemarks("");
            queryClient.invalidateQueries(["allocated-audit-leads"]);
          }}
          onRejectWithVerification={() => {
            setShowApprovalModal(false);
            setApprovingLead(null);
            setApprovalRemarks("");
            queryClient.invalidateQueries(["allocated-audit-leads"]);
          }}
        />

        {/* Move to Banking Confirmation Modal */}
        <ConfirmationModal
          isOpen={showMoveToBankingModal}
          onClose={() => {
            setShowMoveToBankingModal(false);
            setMoveToBankingReason("");
          }}
          onConfirm={handleMoveToBanking}
          title="Move to Banking"
          message="Are you sure you want to move this lead to banking? Please provide a reason for this action."
          confirmText={isMovingToBanking ? "Moving..." : "Move to Banking"}
          cancelText="Cancel"
          remarkLabel="Reason"
          remarkValue={moveToBankingReason}
          onRemarkChange={setMoveToBankingReason}
          remarkPlaceholder="Enter reason for moving to banking (required)"
          remarkRequired={true}
        />

        <ConfirmationModal
          isOpen={showNotInterestedConfirm}
          onClose={() => setShowNotInterestedConfirm(false)}
          onConfirm={handleConfirmHold}
          title="Confirm Not Interested"
          message="Are you sure you want to mark this lead as not interested?"
          confirmText={isHolding ? "Updating..." : "Confirm"}
          cancelText="Cancel"
          remarkLabel="Additional remark (optional)"
          remarkValue={extraRemark}
          onRemarkChange={setExtraRemark}
          remarkPlaceholder="Enter any additional context"
        />

        <ConfirmationModal
          isOpen={showInterestedConfirm}
          onClose={() => setShowInterestedConfirm(false)}
          onConfirm={handleConfirmInterested}
          title="Confirm Interested"
          message="Are you sure you want to mark this lead as interested?"
          confirmText={isHolding ? "Updating..." : "Confirm"}
          cancelText="Cancel"
        />

        <AuditSummary
          auditId={customer?.audit_id}
          open={showSummary}
          onClose={() => setShowSummary(false)}
        />
      </div>
    </Modal>
  );
};

const InfoField = ({ label, value }) => (
  <div className="flex flex-col">
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
    <p className="text-sm font-medium text-slate-800 whitespace-pre-line mt-1">
      {value}
    </p>
  </div>
);

const buildBsaSnapshots = (data) => {
  const snapshots = [];
  const dataItems = Array.isArray(data?.data) ? data.data : [];

  dataItems.forEach((item, apiIndex) => {
    const apimsgRecords = item?.api_response?.apimsg?.data;
    const records = Array.isArray(apimsgRecords)
      ? apimsgRecords.filter((record) => record && typeof record === "object")
      : [];

    records.forEach((bsaRecord, recordIndex) => {
      snapshots.push({
        index: snapshots.length,
        apiIndex,
        recordIndex,
        label:
          dataItems.length > 1 || records.length > 1
            ? `BSA report (index ${snapshots.length})`
            : "BSA report",
        bsaData: bsaRecord,
        created_at: item?.created_at,
      });
    });
  });

  if (snapshots.length === 0) {
    const fallback = data?.data?.[0]?.api_response?.apimsg?.data?.[0];
    if (fallback) {
      snapshots.push({
        index: 0,
        apiIndex: 0,
        recordIndex: 0,
        label: "BSA report",
        bsaData: fallback,
        created_at: data?.data?.[0]?.created_at,
      });
    }
  }

  return snapshots;
};

const ApiSnapshotCollapsibleList = ({
  snapshots,
  renderSnapshot,
  renderSnapshotSummary,
}) => {
  const [expandedSnapshotIndexes, setExpandedSnapshotIndexes] = useState(
    () => new Set([0])
  );
  const snapshotKey = snapshots.map((s) => s.index).join("-");

  useEffect(() => {
    setExpandedSnapshotIndexes(new Set([0]));
  }, [snapshotKey]);

  const toggleSnapshotExpand = (index) => {
    setExpandedSnapshotIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {snapshots.map((snapshot) => {
        const isSnapshotOpen = expandedSnapshotIndexes.has(snapshot.index);

        return (
          <div
            key={`api-snapshot-${snapshot.index}`}
            className="overflow-hidden rounded-lg border border-gray-200"
          >
            <button
              type="button"
              onClick={() => toggleSnapshotExpand(snapshot.index)}
              aria-expanded={isSnapshotOpen}
              className={`flex w-full cursor-pointer items-center justify-between p-4 text-left ${
                isSnapshotOpen
                  ? "border-b border-gray-200 bg-slate-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="min-w-0 pr-3">
                <span className="text-base font-medium text-gray-900">
                  {snapshot.label}
                </span>
                {snapshot.created_at && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    Recorded:{" "}
                    {formatDate(snapshot.created_at, { showTime: true })}
                  </p>
                )}
                {renderSnapshotSummary?.(snapshot)}
              </div>
              {isSnapshotOpen ? (
                <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400" />
              )}
            </button>
            {isSnapshotOpen && (
              <div className="border-t border-gray-200 p-4">
                {renderSnapshot(snapshot)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const CollapsibleSection = ({
  title,
  type,
  expandedSection,
  setExpandedSection,
  data,
  isLoading,
  // EMI UI state (only used when type === 'bsa')
  selectedEmiMonth,
  setSelectedEmiMonth,
  expandedEmiCompany,
  setExpandedEmiCompany,
  emiMonths,
  getCurrentMonthLabel,
  transactionSearchTerm,
  setTransactionSearchTerm,
  role,
  onMoveToBankingClick,
  tourId,
}) => {
  const isExpanded = expandedSection === type;

  const renderLoadingSkeleton = () => {
    if (type === "pan") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Personal Information Card Skeleton */}
          <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-brand-muted/20 animate-pulse"></div>
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-20 bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-4 w-full bg-slate-100 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Status Card Skeleton */}
          <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-brand-muted/20 animate-pulse"></div>
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse"></div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
                <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-slate-100 rounded animate-pulse"></div>
                <div className="h-4 w-40 bg-slate-100 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === "cibil_bureau") {
      return (
        <div className="space-y-4">
          {/* Personal Information Section */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Full Name</label>
                <p className="text-sm font-medium text-gray-900">{data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp?.names?.[0]?.name}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">PAN Number</label>
                <p className="text-sm font-medium text-gray-900 font-mono">{data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp?.ids?.find(id => id.idType === 'TaxId')?.idNumber}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Aadhaar Number</label>
                <p className="text-sm font-medium text-gray-900 font-mono">{data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp?.ids?.find(id => id.idType === 'SocialId')?.idNumber}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">CKYC ID</label>
                <p className="text-sm font-medium text-gray-900 font-mono">{data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp.ids.find(id => id.idType === 'CkycId')?.idNumber}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Date of Birth</label>
                <p className="text-sm font-medium text-gray-900">{formatDate(data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp?.names?.[0]?.birthDate)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Gender</label>
                <p className="text-sm font-medium text-gray-900 capitalize">{data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp?.names?.[0]?.gender}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Emails</label>
                <div className="space-y-0.5">
                  {data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp?.emails?.map((email, idx) => (
                    <p key={idx} className="text-sm font-medium text-gray-900">{email.emailID.toLowerCase()}</p>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Phone Numbers</label>
                <div className="space-y-0.5">
                  {data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp?.telephones?.map((tel, idx) => (
                    <p key={idx} className="text-sm font-medium text-gray-900">{tel.telephoneNumber}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Credit Score Section */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                <File className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Credit Score</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp.scores?.map((score, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Score</span>
                    <span className="text-2xl font-bold text-green-600">{score.score}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="text-gray-900">{formatDate(score.scoreDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Score Type</span>
                      <span className="text-gray-900">{score.scoreName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Score Card</span>
                      <span className="text-gray-900">{score.scoreCardName}</span>
                    </div>
                    <div className="mt-3">
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Reason Codes</label>
                      <div className="grid grid-cols-2 gap-2">
                        {score.reasonCodes.map((reason, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border border-gray-100">
                            <p className="text-xs text-gray-900">{reason.reasonCodeName}</p>
                            <p className="text-xs text-gray-500">{reason.reasonCodeValue}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Summary Section */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Account Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Total Accounts</label>
                <p className="text-sm font-medium text-gray-900">{data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp.accountSummary.totalAccounts}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Total Inquiries</label>
                <p className="text-sm font-medium text-gray-900">{data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp.inquirySummary.totalInquiry}</p>
              </div>
            </div>
          </div>

          {/* Recent Accounts Section */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center">
                <Landmark className="h-4 w-4 text-yellow-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Recent Accounts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">High Credit</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Balance</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Payment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp.accounts?.slice(0, 5).map((account, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {account.accountType}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {account.memberShortName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {formatAmount(account.highCreditAmount)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {formatAmount(account.currentBalance)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {formatAmount(account.amountOverdue)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(account.creditFacilityStatus)}`}>
                          {account.creditFacilityStatus === '02' ? 'Active' : 'Closed'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {formatDate(account.lastPaymentDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Enquiries Section */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                <Search className="h-4 w-4 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Recent Enquiries</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp.enquiries?.slice(0, 5).map((enquiry, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {formatDate(enquiry.enquiryDate)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {formatAmount(enquiry.enquiryAmount)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {enquiry.enquiryPurpose}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {enquiry.memberShortName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Address Information Section */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Address Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.data?.[0]?.api_response?.data?.credit_report?.[0].response?.consumerSummaryresp.addresses?.map((address, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      {address.addressCategory === "01" ? "Current Address" :
                        address.addressCategory === "02" ? "Permanent Address" :
                          address.addressCategory === "03" ? "Office Address" : "Other Address"}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(address.dateReported)}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900">{address.line1}</p>
                    {address.line2 && <p className="text-sm text-gray-900">{address.line2}</p>}
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Pincode</span>
                      <span className="text-gray-900">{address.pinCode}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Default skeleton for other types
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="mt-2 h-4 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  };
  const renderPanData = (data) => {
    const panData = data?.data?.[0]?.api_response?.result;
    if (!panData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Information Card */}
        <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-brand-dark">Personal Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Full Name</label>
              <p className="text-sm font-medium text-gray-900">{panData.name}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">PAN Number</label>
              <p className="text-sm font-medium text-gray-900 font-mono">{panData.pan}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Date of Birth</label>
              <p className="text-sm font-medium text-gray-900">{formatDate(panData.dob)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Gender</label>
              <p className="text-sm font-medium text-gray-900 capitalize">{panData.gender}</p>
            </div>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-brand-dark">Verification Status</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Fingerprint className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Aadhaar Linked</span>
              </div>
              {panData.aadhaar_linked ? (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Yes</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <XCircle className="h-3 w-3" />
                  <span>No</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Last Updated: {formatDate(data.data[0].created_at, { showTime: true })}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBsaSnapshotContent = (
    bsaData,
    emiUiState,
    currentRole,
    onMoveToBankingClick
  ) => {
    if (!bsaData) return null;

    const {
      selectedEmiMonth,
      setSelectedEmiMonth,
      expandedEmiCompany,
      setExpandedEmiCompany,
      emiMonths,
      getCurrentMonthLabel,
      transactionSearchTerm,
      setTransactionSearchTerm,
    } = emiUiState || {};

    const analysisData = bsaData?.analysisData || [];
    const grandTotal = analysisData.find(item => item.month === "Grand Total") || {};
    const camAnalysisData = bsaData?.camAnalysisData || {};
    const chequeBounces = bsaData?.chequeBounces || [];
    const transactions = bsaData?.transactions || [];
    const emi = bsaData?.emi || [];
    const fundReceived = bsaData?.fundReceived || [];
    const fundRemittance = bsaData?.fundRemittance || [];
    const monthIndexMap = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };

    const getMonthSortValue = (entry) => {
      const label = entry?.month;
      if (!label) return -Infinity;

      const [rawMonth, rawYear] = label.split(/[-\s]/);
      const monthKey = rawMonth?.toLowerCase() || "";
      const monthValue = monthIndexMap[monthKey] || 0;
      const yearValue = parseInt(rawYear, 10) || 0;

      return yearValue * 100 + monthValue;
    };

    const salary = Array.isArray(bsaData?.salary)
      ? [...bsaData.salary].sort((a, b) => getMonthSortValue(b) - getMonthSortValue(a))
      : [];

    const formatAmount = (amount) => {
      if (!amount && amount !== 0) return "₹0";
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount);
    };

    const formatDate = (timestamp) => {
      if (!timestamp) return "N/A";
      return new Date(timestamp).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };

    // Calculate key metrics
    const totalEmiAmount = emi.reduce((sum, loan) => sum + (loan.amount || 0), 0);
    const totalFundReceived = fundReceived.reduce((sum, month) => sum + parseFloat(month.totalAmount || 0), 0);
    const totalFundRemittance = fundRemittance.reduce((sum, month) => sum + parseFloat(month.totalAmount || 0), 0);
    const normalizedTxnSearch = (transactionSearchTerm || "").trim().toLowerCase();
    const filteredTransactions = normalizedTxnSearch
      ? transactions.filter((transaction) => {
        const searchableText = [
          formatDate(transaction?.transactionDate),
          transaction?.type,
          transaction?.paymentCategory,
          transaction?.narration,
          transaction?.paymentMode,
          transaction?.cheque,
          transaction?.name,
          String(transaction?.amount ?? ""),
          String(transaction?.closingBalance ?? ""),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedTxnSearch);
      })
      : transactions;
    const orderedTransactions = [...filteredTransactions].reverse();

    return (
      <div className="space-y-4">
        {/* Header Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm font-medium">Total EMI Amount</p>
                <p className="text-xl font-bold">{formatAmount(totalEmiAmount)}</p>
                <p className="text-slate-300 text-xs mt-1">{emi.length} Active Loans</p>
              </div>
              <div className="h-9 w-9 bg-white/15 rounded-md flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Funds Received</p>
                <p className="text-xl font-bold">{formatAmount(totalFundReceived)}</p>
                <p className="text-green-100 text-xs mt-1">{fundReceived.length} Months</p>
              </div>
              <div className="h-9 w-9 bg-green-400 rounded-md flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-lg text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Funds Remitted</p>
                <p className="text-xl font-bold">{formatAmount(totalFundRemittance)}</p>
                <p className="text-red-100 text-xs mt-1">{fundRemittance.length} Months</p>
              </div>
              <div className="h-9 w-9 bg-red-400 rounded-md flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 rounded-lg text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm font-medium">Total Transactions</p>
                <p className="text-xl font-bold">{transactions.length}</p>
                <p className="text-slate-300 text-xs mt-1">All Time</p>
              </div>
              <div className="h-9 w-9 bg-white/15 rounded-md flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information Card */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-md">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-9 w-9 rounded-full bg-brand-muted flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Account Information</h3>
              <p className="text-sm text-gray-600">Complete account details and banking information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Account Name</label>
                  <p className="text-sm font-semibold text-gray-900">{bsaData?.accountName || "N/A"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Account Number</label>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{bsaData?.accountNumber || "N/A"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Account Type</label>
                  <p className="text-sm font-semibold text-gray-900">{bsaData?.accountType || "N/A"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Bank Name</label>
                  <p className="text-sm font-semibold text-gray-900">{bsaData?.bankFullName || bsaData?.bankName || "N/A"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Branch Name</label>
                  <p className="text-sm font-semibold text-gray-900">{bsaData?.branchName || "N/A"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">IFSC Code</label>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{bsaData?.ifscCode || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="text-sm font-medium text-gray-500 mb-2 block">Address</label>
                <p className="text-sm font-semibold text-gray-900">{bsaData?.address || "N/A"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Period Start</label>
                  <p className="text-sm font-semibold text-gray-900">{bsaData?.periodStart || "N/A"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Period End</label>
                  <p className="text-sm font-semibold text-gray-900">{bsaData?.periodEnd || "N/A"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Email</label>
                  <p className="text-sm font-semibold text-gray-900">{bsaData?.email || "N/A"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Mobile</label>
                  <p className="text-sm font-semibold text-gray-900">{bsaData?.mobileNumber || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Salary Data */}
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-md">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center space-x-3 sm:space-x-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Salary Information</h3>
                <p className="text-sm sm:text-base text-gray-600">Monthly salary details and transaction history</p>
              </div>
            </div>
            {currentRole === "Credit-Analyst" && (
              <button
                onClick={onMoveToBankingClick}
                className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ArrowRight className="w-5 h-5" />
                Move to Banking
              </button>
            )}
          </div>

          {/* Salary Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
              <h4 className="text-sm font-medium text-emerald-600 mb-2">Total Salary Received</h4>
              <p className="text-xl font-bold text-emerald-900">
                {formatAmount(salary.reduce((sum, month) => sum + (month.totalSalary || 0), 0))}
              </p>
              <p className="text-emerald-600 text-sm mt-1">{salary.length} Months</p>
            </div>
            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <h4 className="text-sm font-medium text-brand-muted mb-2">Average Monthly Salary</h4>
              <p className="text-xl font-bold text-brand-dark">
                {formatAmount(salary.length > 0 ? salary.reduce((sum, month) => sum + (month.totalSalary || 0), 0) / salary.length : 0)}
              </p>
              <p className="text-slate-600 text-sm mt-1">Per Month</p>
            </div>
            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <h4 className="text-sm font-medium text-brand-muted mb-2">Latest Salary</h4>
              <p className="text-xl font-bold text-brand-dark">
                {salary.length > 0 ? formatAmount(salary[0].totalSalary) : "N/A"}
              </p>
              <p className="text-slate-600 text-sm mt-1">{salary.length > 0 ? salary[0].month : "N/A"}</p>
            </div>
          </div>

          {/* Monthly Salary Breakdown */}
          <div className="space-y-3">
            {salary.map((monthData, index) => (
              <div key={index} className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 sm:p-4 rounded-lg border border-emerald-200">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-emerald-900">{monthData.month}</h4>
                    <p className="text-emerald-600 text-sm">Salary Period</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xl font-bold text-emerald-900">{formatAmount(monthData.totalSalary)}</p>
                    <p className="text-emerald-600 text-sm">Total Salary</p>
                  </div>
                </div>

                {/* Salary Transactions */}
                <div className="space-y-3">
                  {monthData.transactions?.map((transaction, tIndex) => (
                    <div key={tIndex} className="bg-white p-3 rounded-md border border-emerald-200 shadow-sm">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <h5 className="break-words text-sm sm:text-base font-semibold text-gray-900">{transaction.name}</h5>
                            <p className="text-sm text-gray-600">{formatDate(transaction.transactionDate)}</p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="inline-flex max-w-full break-words bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                            {transaction.type} {formatAmount(transaction.amount)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Payment Mode:</span>
                          <p className="font-medium text-gray-900 break-all">{transaction.paymentMode}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Opening Balance:</span>
                          <p className="font-medium text-gray-900">{formatAmount(transaction.openingBalance)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Closing Balance:</span>
                          <p className="font-medium text-gray-900">{formatAmount(transaction.closingBalance)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Cheque Number:</span>
                          <p className="font-medium text-gray-900 break-all">{transaction.cheque || "N/A"}</p>
                        </div>
                      </div>

                      <div className="mt-2 p-2 bg-gray-50 rounded-md">
                        <span className="text-gray-500 text-sm">Narration:</span>
                        <p className="mt-1 break-words text-sm font-medium text-gray-900">{transaction.narration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Salary Trend Chart Placeholder */}
          {salary.length > 1 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-base font-semibold text-gray-900 mb-3">Salary Trend</h4>
              <div className="overflow-x-auto">
                <div className="flex min-w-[520px] items-end space-x-2 h-24">
                {salary.map((monthData, index) => {
                  const maxSalary = Math.max(...salary.map((s) => s.totalSalary));
                  const height = Math.max((monthData.totalSalary / maxSalary) * 100, 10);
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-emerald-500 rounded-t-lg transition-all duration-300 hover:bg-emerald-600"
                        style={{ height: `${height}px` }}
                      ></div>
                      <p className="text-xs text-gray-600 mt-2 text-center">{monthData.month}</p>
                      <p className="text-xs font-medium text-gray-900">
                        {formatAmount(monthData.totalSalary)}
                      </p>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Funds Received */}
        <div className="bg-white p-3 sm:p-4 md:p-4 rounded-lg border border-gray-200 shadow-md">
          <details className="group" close>
            <summary className="flex items-center justify-between mb-3 sm:mb-4 md:mb-4 cursor-pointer list-none">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Funds Received</h3>
                  <p className="text-gray-600 text-sm sm:text-base">Month-wise credit inflows into the account</p>
                </div>
              </div>
              <div className="ml-4 flex items-center justify-center rounded-full bg-sky-50 p-2">
                <ChevronDown className="h-4 w-4 text-sky-700 transition-transform duration-200 group-open:rotate-180" />
              </div>
            </summary>

            {(!fundReceived || fundReceived.length === 0) ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                No funds received data available.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Funds summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-sky-50 p-4 rounded-lg border border-sky-200">
                  <h4 className="text-sm font-medium text-sky-600 mb-2">Total Funds Received</h4>
                  <p className="text-xl font-bold text-sky-900">
                    {formatAmount(totalFundReceived)}
                  </p>
                  <p className="text-sky-600 text-sm mt-1">{fundReceived.length} Months</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <h4 className="text-sm font-medium text-emerald-600 mb-2">Average Monthly Inflow</h4>
                  <p className="text-xl font-bold text-emerald-900">
                    {formatAmount(
                      fundReceived.length > 0 ? totalFundReceived / fundReceived.length : 0
                    )}
                  </p>
                  <p className="text-emerald-600 text-sm mt-1">Per Month</p>
                </div>
                <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                  <h4 className="text-sm font-medium text-brand-muted mb-2">Highest Monthly Inflow</h4>
                  <p className="text-xl font-bold text-brand-dark">
                    {formatAmount(
                      Math.max(
                        ...fundReceived.map((m) => parseFloat(m.totalAmount || 0))
                      )
                    )}
                  </p>
                  <p className="text-slate-600 text-sm mt-1">
                    {fundReceived.reduce(
                      (maxMonth, month) =>
                        parseFloat(month.totalAmount || 0) >
                        parseFloat(maxMonth.totalAmount || 0)
                          ? month
                          : maxMonth,
                      fundReceived[0]
                    )?.month}
                  </p>
                </div>
                </div>

                {/* Month-wise funds cards */}
                <div className="space-y-3">
                  {fundReceived
                    .slice()
                    .sort((a, b) => getMonthSortValue(b) - getMonthSortValue(a))
                    .map((monthData, index) => {
                      const visibleTxns = (monthData.transactions || []).filter(
                        (t) => !t.ignorableTransaction
                      );
                      const monthTotal = parseFloat(monthData.totalAmount || 0);
                      const visibleTotal = visibleTxns.reduce(
                        (sum, t) => sum + (t.amount || 0),
                        0
                      );

                      return (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-sky-50 to-sky-100 p-4 rounded-lg border border-sky-200"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                            <div>
                              <h4 className="text-lg font-bold text-sky-900">
                                {monthData.month}
                              </h4>
                              <p className="text-sky-700 text-sm">
                                Credits received during this month
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-sky-700 uppercase tracking-wide">
                                  Reported Total
                                </p>
                                <p className="text-lg font-bold text-sky-900">
                                  {formatAmount(monthTotal)}
                                </p>
                              </div>
                              <div className="h-8 w-px bg-sky-200 hidden md:block" />
                              <div className="text-right">
                                <p className="text-xs text-emerald-700 uppercase tracking-wide">
                                  Considered (Excl. Ignorable)
                                </p>
                                <p className="text-lg font-bold text-emerald-900">
                                  {formatAmount(visibleTotal)}
                                </p>
                              </div>
                              <div className="h-8 w-px bg-sky-200 hidden md:block" />
                              <div className="text-right">
                                <p className="text-xs text-gray-600 uppercase tracking-wide">
                                  Transactions
                                </p>
                                <p className="text-lg font-bold text-gray-900">
                                  {visibleTxns.length}
                                </p>
                              </div>
                            </div>
                          </div>

                          {visibleTxns.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-sky-200 bg-white/60 p-4 text-sm text-sky-700">
                              All transactions for this month are marked as ignorable.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {visibleTxns.map((transaction, tIndex) => (
                                <div
                                  key={tIndex}
                                  className="bg-white p-3 rounded-md border border-sky-200 shadow-sm flex flex-col justify-between"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="text-xs font-medium text-sky-600">
                                        {formatDate(transaction.transactionDate)}
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-gray-900 break-words whitespace-pre-wrap">
                                        {transaction.name || "Fund Credit"}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                      {transaction.paymentMode || "NA"}
                                    </span>
                                  </div>

                                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                    {transaction.narration}
                                  </p>

                                  <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-500">Amount</span>
                                      <p className="font-semibold text-gray-900">
                                        {formatAmount(transaction.amount)}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-gray-500">Closing Balance</span>
                                      <p className="font-semibold text-gray-900">
                                        {formatAmount(transaction.closingBalance)}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Category</span>
                                      <p className="font-medium text-gray-900">
                                        {transaction.paymentCategory || "N/A"}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-gray-500">Cheque / Ref</span>
                                      <p className="font-medium text-gray-900">
                                        {transaction.cheque || "-"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </details>
        </div>

        {/* EMI Details Card */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-md">
          <div className="flex items-start md:items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">EMI Details</h3>
                <p className="text-gray-600">Company-wise EMI and transactions</p>
              </div>
            </div>

            {/* Month Filter */}
            <div className="w-full md:w-auto mt-4 md:mt-0">
              <label className="block text-sm font-medium text-gray-600 mb-1">Select Month</label>
              <div className="relative">
                <select
                  className="w-full md:w-56 appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                  value={selectedEmiMonth}
                  onChange={(e) => setSelectedEmiMonth(e.target.value)}
                >
                  <option value="">Overall</option>
                  {(emiMonths.length > 0 ? emiMonths : [getCurrentMonthLabel()]).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Companies accordion */}
          {(() => {
            const companyGroups = emi.reduce((acc, loan) => {
              const companyName = loan?.commonEntity || "Unknown";
              const existing = acc[companyName] || { amountTotal: 0, transactions: [] };
              existing.amountTotal += Number(loan?.amount || 0);
              existing.transactions = existing.transactions.concat(loan?.transactions || []);
              acc[companyName] = existing;
              return acc;
            }, {});

            const companies = Object.entries(companyGroups);

            if (companies.length === 0) {
              return (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                  No EMI data available.
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {companies.map(([companyName, group]) => {
                  const txnsThisMonth = (group.transactions || []).filter(
                    (t) => !selectedEmiMonth || t?.monthYear === selectedEmiMonth
                  );
                  const totalTxnAmount = txnsThisMonth.reduce(
                    (sum, t) => sum + Number(t?.amount || 0),
                    0
                  );

                  const expanded = expandedEmiCompany === companyName;

                  // hide company if no transactions for selected month (when a specific month is chosen)
                  if (selectedEmiMonth && txnsThisMonth.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={companyName}
                      className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEmiCompany(expanded ? null : companyName)
                        }
                      className="w-full px-4 py-3 flex items-center justify-between cursor-pointer"
                      >
                        <div className="text-left">
                          <h4 className="text-base font-bold text-red-900">{companyName}</h4>
                          <div className="mt-1 flex items-center gap-3 text-xs">
                            <span className="text-red-700">
                              EMI Amount: <span className="font-semibold text-red-900">{formatAmount(group.amountTotal)}</span>
                            </span>
                            <span className="text-red-700">
                              Transactions: <span className="font-semibold text-red-900">{txnsThisMonth.length}</span>
                            </span>
                            <span className="text-red-700">
                              Total This Month: <span className="font-semibold text-red-900">{formatAmount(totalTxnAmount)}</span>
                            </span>
                          </div>
                        </div>
                        {expanded ? (
                          <ChevronUp className="h-5 w-5 text-red-700" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-red-700" />
                        )}
                      </button>

                      {expanded && (
                        <div className="px-4 pb-4">
                          {txnsThisMonth.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-red-200 bg-white/60 p-4 text-sm text-red-700">
                              No transactions for {selectedEmiMonth}.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {txnsThisMonth.map((transaction, tIndex) => (
                                <div key={tIndex} className="bg-white p-3 rounded-md border border-red-200 shadow-sm">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-medium text-red-600">{formatDate(transaction.transactionDate)}</span>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${transaction.type === 'Dr' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                        }`}
                                    >
                                      {transaction.type}
                                    </span>
                                  </div>
                                  <p className="text-sm text-red-900 font-medium break-words whitespace-pre-wrap">
                                    {transaction.narration}
                                  </p>
                                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <span className="text-gray-500">Payment Mode</span>
                                      <p className="font-medium text-gray-900">{transaction.paymentMode}</p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-gray-500">Amount</span>
                                      <p className="font-semibold text-gray-900">{formatAmount(transaction.amount)}</p>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-red-600 mt-2">{transaction.paymentCategory}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Monthly Analysis Table */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-md">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-brand-muted flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Monthly Analysis</h3>
              <p className="text-gray-600">Comprehensive monthly transaction analysis</p>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-brand-muted">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Month</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">EMI Count</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">EMI Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">EMI Bounces</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Bank Charges</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Avg Balance</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Max Balance</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Debit Count</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Credit Count</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysisData?.filter(item => item?.month !== "Grand Total")?.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-900">{item?.month}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">{item?.noOfEMI || 0}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">{formatAmount(item?.totalEMIAmount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item?.noOfEMIBounce > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                        {item?.noOfEMIBounce || 0}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">{formatAmount(item?.totalBankChargesAmount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">{formatAmount(item?.averageEODBalance)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">{formatAmount(item?.maximumEODBalance)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">{item?.noOfDebitTransactions || 0}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">{item?.noOfCreditTransactions || 0}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gradient-to-r from-gray-800 to-gray-900">
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-white">Grand Total</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-white">{grandTotal?.noOfEMI || 0}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-white">{formatAmount(grandTotal?.totalEMIAmount)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-white">{grandTotal?.noOfEMIBounce || 0}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-white">{formatAmount(grandTotal?.totalBankChargesAmount)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-white">{formatAmount(grandTotal?.averageEODBalance)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-white">{formatAmount(grandTotal?.maximumEODBalance)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-white">{grandTotal?.noOfDebitTransactions || 0}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-white">{grandTotal?.noOfCreditTransactions || 0}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* CAM Analysis */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-md">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-brand-muted flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">CAM Analysis</h3>
              <p className="text-gray-600">Credit Analysis and Monitoring data</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <h4 className="text-sm font-medium text-brand-muted mb-2">Average Balance</h4>
              <p className="text-xl font-bold text-brand-dark">{formatAmount(camAnalysisData?.averageBalance)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-sm font-medium text-green-600 mb-2">Total Net Credits</h4>
              <p className="text-xl font-bold text-green-900">{formatAmount(camAnalysisData?.totalNetCredits)}</p>
            </div>
            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <h4 className="text-sm font-medium text-brand-muted mb-2">Last 3 Months Avg</h4>
              <p className="text-xl font-bold text-brand-dark">{formatAmount(camAnalysisData?.averageBalanceLastThreeMonth)}</p>
            </div>
            <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <h4 className="text-sm font-medium text-brand-muted mb-2">Last 6 Months Avg</h4>
              <p className="text-xl font-bold text-brand-dark">{formatAmount(camAnalysisData?.averageBalanceLastSixMonth)}</p>
            </div>
          </div>

          {/* Monthly CAM Analysis Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-brand-muted">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Month</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Debits</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Net Credit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Net Debit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Avg Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {camAnalysisData.camAnalysisMonthly?.filter(item => item.month !== "Grand Total").map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item?.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item?.noOfCredit || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item?.noOfDebit || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-900">{formatAmount(item?.netCreditAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-900">{formatAmount(item?.netDebitAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatAmount(item?.overallAveragePositiveNegativeEODBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Transactions */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-md">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">All Transactions</h3>
              <p className="text-gray-600">Complete transaction history</p>
            </div>
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={transactionSearchTerm || ""}
              onChange={(e) => setTransactionSearchTerm?.(e.target.value)}
              placeholder="Search transactions (date, type, narration, category, amount...)"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-500 to-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Narration</th>
                  <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderedTransactions.slice(0, 50).map((transaction, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      {formatDate(transaction.transactionDate)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${transaction.type === 'Dr' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                      {formatAmount(transaction.amount)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                      {transaction.paymentCategory}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 align-top">
                      <div className="max-w-3xl break-words whitespace-pre-wrap">
                        {transaction.narration}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                      {formatAmount(transaction.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length === 0 && (
              <div className="mt-3 rounded-md border border-dashed border-gray-300 p-3 text-center text-xs text-gray-500">
                No transactions found for your search.
              </div>
            )}
            {filteredTransactions.length > 50 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">Showing first 50 transactions of {filteredTransactions.length} matched transactions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBsaData = (data, emiUiState, currentRole, onMoveToBankingClick) => {
    const bsaSnapshots = buildBsaSnapshots(data);

    if (!bsaSnapshots.length) {
      return (
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-1 text-lg font-medium text-gray-900">
            No BSA Report Data
          </h3>
          <p className="text-sm text-gray-500">No BSA report data available.</p>
        </div>
      );
    }

    if (bsaSnapshots.length === 1) {
      return renderBsaSnapshotContent(
        bsaSnapshots[0].bsaData,
        emiUiState,
        currentRole,
        onMoveToBankingClick
      );
    }

    return (
      <ApiSnapshotCollapsibleList
        snapshots={bsaSnapshots}
        renderSnapshotSummary={(snapshot) => (
          <p className="mt-1 text-xs font-medium text-slate-600">
            Account: {snapshot.bsaData?.accountNumber || "N/A"}
            {(snapshot.bsaData?.bankFullName || snapshot.bsaData?.bankName) &&
              ` · ${snapshot.bsaData?.bankFullName || snapshot.bsaData?.bankName}`}
          </p>
        )}
        renderSnapshot={(snapshot) =>
          renderBsaSnapshotContent(
            snapshot.bsaData,
            emiUiState,
            currentRole,
            onMoveToBankingClick
          )
        }
      />
    );
  };

  const renderBreData = (data) => {
    const creditReport = data?.data?.[0]?.api_response;
    if (!creditReport) return null;
    const consumerData = creditReport?.consumerCreditData?.[0];
    const summaryData = creditReport?.consumerSummaryData;
    const formatDate = (dateStr) => {
      if (dateStr && dateStr.length === 8) {
        const day = dateStr.substring(0, 2);
        const month = dateStr.substring(2, 4);
        const year = dateStr.substring(4);
        return `${day}/${month}/${year}`;
      }
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('en-IN');
    };

    // console.log("Consumer Data >><<<>> ", consumerData);
    // console.log("Summary Data >><<<>> ", summaryData?.accountSummary);

    const formatAmount = (amount) => {
      if (!amount || amount === '-1') return '-';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount);
    };

    const getStatusColor = (status) => {
      if (status === '0') return 'bg-green-100 text-green-800';
      if (status === 'STD') return 'bg-slate-100 text-slate-600';
      if (status === 'DBT') return 'bg-red-100 text-red-800';
      if (status === 'SUB') return 'bg-yellow-100 text-yellow-800';
      return 'bg-gray-100 text-gray-800';
    };

    return (
      <div className="space-y-4">
        {/* Personal Information Section */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Full Name</label>
              <p className="text-sm font-medium text-gray-900 break-words">{consumerData?.names?.[0]?.name}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Date of Birth</label>
              <p className="text-sm font-medium text-gray-900">{formatDate(consumerData?.names?.[0]?.birthDate)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Gender</label>
              <p className="text-sm font-medium text-gray-900 capitalize">{consumerData?.names?.[0]?.gender}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Emails</label>
              <div className="space-y-0.5">
                {consumerData?.emails?.map((email, idx) => (
                  <p key={idx} className="text-sm font-medium text-gray-900 break-all">{email?.emailID?.toLowerCase()}</p>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Phone Numbers</label>
              <div className="space-y-0.5">
                {consumerData?.telephones?.map((tel, idx) => (
                  <p key={idx} className="text-sm font-medium text-gray-900 break-all">{tel?.telephoneNumber}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* IDs Section */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
              <Fingerprint className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Identity Information</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Index</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consumerData?.ids?.map((id, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{id?.index}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {id?.idType === 'SocialId' ? 'SocialId' :
                        id?.idType === 'TaxId' ? 'TaxId(PAN Number)' :
                          id?.idType === 'CkycId' ? 'CKYC ID' : id?.idType}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-mono">{id?.idNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employment Section */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Employment Information</h3>
          </div>
          <div className="flex gap-4">
            {consumerData?.employment?.map((emp, index) => (
              <div key={index} className="space-y-1 flex gap-10">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Account Type</label>
                  <p className="text-sm font-medium text-gray-900">{emp?.accountType}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Occupation Code</label>
                  <p className="text-sm font-medium text-gray-900">{emp?.occupationCode}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Date Reported</label>
                  <p className="text-sm font-medium text-gray-900">{formatDate(emp?.dateReported)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Score Section */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
              <File className="h-4 w-4 text-green-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Credit Score</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consumerData?.scores?.map((score, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">Score</span>
                  <span className="text-2xl font-bold text-green-600">{score?.score}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date</span>
                    <span className="text-gray-900">{formatDate(score?.scoreDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Score Type</span>
                    <span className="text-gray-900">{score?.scoreName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Score Card</span>
                    <span className="text-gray-900">{score?.scoreCardName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Response Summary Section */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Response Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Total Accounts Information */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Total Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.totalAccounts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Total Active Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.totalActiveAccounts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Total Closed Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.totalClosedAccounts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Total Written Off Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.totalWrittenOffAccounts}</p>
            </div>

            {/* Balance Information */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Current Balance</label>
              <p className="text-sm font-medium text-gray-900">{formatAmount(summaryData?.accountSummary?.currentBalance)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Overdue Balance</label>
              <p className="text-sm font-medium text-gray-900">{formatAmount(summaryData?.accountSummary?.overdueBalance)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">High Credit Amount</label>
              <p className="text-sm font-medium text-gray-900">{formatAmount(summaryData?.accountSummary?.highCreditAmount)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Total Credit Limit</label>
              <p className="text-sm font-medium text-gray-900">{formatAmount(summaryData?.accountSummary?.totalCreditLimit)}</p>
            </div>

            {/* Account Status Information */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Overdue Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.overdueAccounts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Zero Balance Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.zeroBalanceAccounts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Settled Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.settledAccounts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Written Off Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.writtenOffAccounts}</p>
            </div>

            {/* Account Type Distribution */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Home Loan Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.homeLoanAccounts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Auto Loan Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.autoLoanAccounts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Personal Loan Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.personalLoanAccounts}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Credit Card Accounts</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.accountSummary?.creditCardAccounts}</p>
            </div>

            {/* Additional Information */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Total Inquiries</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.inquirySummary?.totalInquiry}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Recent Inquiry Date</label>
              <p className="text-sm font-medium text-gray-900">{formatDate(summaryData?.inquirySummary?.recentInquiryDate)}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Past 30 Days Inquiries</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.inquirySummary?.inquiryPast30Days}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Past 12 Months Inquiries</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.inquirySummary?.inquiryPast12Months}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Past 24 Months Inquiries</label>
              <p className="text-sm font-medium text-gray-900">{summaryData?.inquirySummary?.inquiryPast24Months}</p>
            </div>
          </div>
        </div>

        {/* Recent Accounts Section */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center">
              <Landmark className="h-4 w-4 text-yellow-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Account Details</h3>
          </div>
          <div className="space-y-4">
            {consumerData?.accounts?.map((account, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">{account?.accountType}</h4>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(account?.creditFacilityStatus)}`}>
                    {account?.creditFacilityStatus === '02' ? 'Active' : 'Closed'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Account Number</label>
                    <p className="text-sm font-medium text-gray-900">{account?.accountNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Member</label>
                    <p className="text-sm font-medium text-gray-900">{account?.memberShortName}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Date Opened</label>
                    <p className="text-sm font-medium text-gray-900">{formatDate(account?.dateOpened)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Date Closed</label>
                    <p className="text-sm font-medium text-gray-900">{account?.dateClosed === 'NA' ? 'N/A' : formatDate(account?.dateClosed)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">High Credit Amount</label>
                    <p className="text-sm font-medium text-gray-900">{formatAmount(account?.highCreditAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Current Balance</label>
                    <p className="text-sm font-medium text-gray-900">{formatAmount(account?.currentBalance)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Amount Overdue</label>
                    <p className="text-sm font-medium text-gray-900">{formatAmount(account?.amountOverdue)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Last Payment Date</label>
                    <p className="text-sm font-medium text-gray-900">{formatDate(account?.lastPaymentDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">EMI Amount</label>
                    <p className="text-sm font-medium text-gray-900">{formatAmount(account?.emiAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Payment Frequency</label>
                    <p className="text-sm font-medium text-gray-900">{account?.paymentFrequency || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Payment Start Date</label>
                    <p className="text-sm font-medium text-gray-900">{formatDate(account?.paymentStartDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Payment End Date</label>
                    <p className="text-sm font-medium text-gray-900">{formatDate(account?.paymentEndDate)}</p>
                  </div>
                </div>

                {/* Payment History Section */}
                <div className="mt-4">
                  <h5 className="text-xs font-medium text-gray-500 mb-2">Payment History</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {account?.monthlyPayStatus?.map((status, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-gray-100">
                        <p className="text-xs text-gray-500">{formatDate(status?.date)}</p>
                        <p className="text-xs font-medium text-gray-900">{status?.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Enquiries Section */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
              <Search className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Recent Enquiries</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consumerData?.enquiries?.map((enquiry, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {formatDate(enquiry?.enquiryDate)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {formatAmount(enquiry?.enquiryAmount)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {enquiry?.enquiryPurpose}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {enquiry?.memberShortName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Address Information Section */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-brand-muted flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Address Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consumerData?.addresses?.map((address, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">
                    {address?.addressCategory === "01" ? "Current Address" :
                      address?.addressCategory === "02" ? "Permanent Address" :
                        address?.addressCategory === "03" ? "Office Address" : "Other Address"}
                  </span>
                  {/* <span className="text-xs text-gray-500">{formatDate(address.dateReported)}</span> */}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">{address?.line1}</p>
                  {address?.line2 && <p className="text-sm text-gray-900">{address?.line2}</p>}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">State Code</label>
                      <p className="text-sm font-medium text-gray-900">{address?.stateCode || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Date Reported</label>
                      <p className="text-sm font-medium text-gray-900">{formatDate(address?.dateReported)}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Country</label>
                      <p className="text-sm font-medium text-gray-900">{address?.country || 'INDIA'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Pincode</label>
                      <p className="text-sm font-medium text-gray-900">{address?.pinCode || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderBreDecisionData = (data) => {
    console.log("BRE Decision data >><<<>> ", data);

    const dataItems = Array.isArray(data?.data) ? data.data : [];
    const lastDataIndex = Math.max(0, dataItems.length - 1);

    const getApimsgFromDataItem = (item) => item?.api_response?.apimsg;

    const breSnapshots = [];
    const firstApimsg = data?.apimsg || getApimsgFromDataItem(dataItems[0]);
    const lastApimsg =
      dataItems.length > 0
        ? getApimsgFromDataItem(dataItems[lastDataIndex])
        : firstApimsg;

    if (firstApimsg) {
      breSnapshots.push({
        index: 0,
        // label:
        //   dataItems.length > 1
        //     ? `First decision (index 0)`
        //     : "BRE decision",
        label:
          dataItems.length > 1
            ? `First decision`
            : "BRE decision",
        cibil_bureau: firstApimsg,
        created_at: data?.created_at || dataItems[0]?.created_at,
      });
    }

    if (lastApimsg && lastDataIndex > 0) {
      breSnapshots.push({
        index: lastDataIndex,
        // label: `Latest decision (index ${lastDataIndex})`,
        label: `Latest decision`,
        cibil_bureau: lastApimsg,
        created_at: dataItems[lastDataIndex]?.created_at,
      });
    }

    if (!breSnapshots.length) {
      return (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No BRE Decision Data</h3>
          <p className="text-sm text-gray-500">No BRE Decision data available.</p>
        </div>
      );
    }

    const formatAmount = (amount) => {
      if (!amount && amount !== 0) return "N/A";
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount);
    };

    const getDecisionColor = (decision) => {
      if (decision === 'APPROVE') return 'bg-green-100 text-green-800';
      if (decision === 'REJECT') return 'bg-red-100 text-red-800';
      return 'bg-yellow-100 text-yellow-800';
    };

    const getSeverityColor = (severity) => {
      switch (severity) {
        case 'HIGH':
          return 'bg-red-50 border-red-200 text-red-800';
        case 'MEDIUM':
          return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        case 'LOW':
          return 'bg-slate-100 border-slate-200 text-slate-600';
        default:
          return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    };

    const getSeverityIcon = (severity) => {
      switch (severity) {
        case 'HIGH':
          return AlertTriangle;
        case 'MEDIUM':
          return AlertCircle;
        case 'LOW':
          return Info;
        default:
          return Circle;
      }
    };

    const getCodeIcon = (code) => {
      if (code.startsWith('GEN')) return Settings;
      if (code.startsWith('EMI')) return CreditCard;
      if (code.startsWith('NBF')) return Banknote;
      if (code.startsWith('ELG')) return TrendingUp;
      if (code.startsWith('SAL')) return DollarSign;
      return ClipboardList;
    };

    const renderBreSnapshot = (cibil_bureau, snapshotCreatedAt) => {
      const auditDetails = cibil_bureau.auditLog?.logEntry?.details || [];
      const firstAuditDetail = auditDetails[0];
      const lastAuditDetail =
        auditDetails.length > 0
          ? auditDetails[auditDetails.length - 1]
          : null;
      const cibilAuditDetail =
        auditDetails.find((d) => d.module === "CIBIL") ||
        auditDetails[1] ||
        lastAuditDetail;
      const eligibilityAuditDetail =
        auditDetails.find((d) => d.module === "ELIGIBILITY") ||
        auditDetails[2] ||
        lastAuditDetail;

      return (
      <div className="space-y-6">
        {/* Final Decision Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-brand-muted flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Final Decision</h3>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDecisionColor(cibil_bureau.finalDecision)}`}>
              {cibil_bureau.finalDecision}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Decision Date</h4>
              <p className="text-lg font-semibold text-gray-900">
                {snapshotCreatedAt ? formatDate(snapshotCreatedAt) : "N/A"}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">User ID</h4>
              <p className="text-lg font-semibold text-gray-900">
                {cibil_bureau.auditLog?.logEntry?.userId || 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Evaluation Months</h4>
              <p className="text-lg font-semibold text-gray-900">
                {typeof firstAuditDetail?.analysisPeriod === "object"
                  ? firstAuditDetail?.analysisPeriod?.period || "N/A"
                  : firstAuditDetail?.analysisPeriod || "N/A"}{" "}
                months
              </p>
            </div>
          </div>
        </div>

        {/* Reasons Analysis Card */}
        {cibil_bureau.reasons && cibil_bureau.reasons.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Decision Reasons Analysis</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Total Reasons:</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  {cibil_bureau.reasons.length}
                </span>
              </div>
            </div>

            {/* Severity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {['HIGH', 'MEDIUM', 'LOW'].map((severity) => {
                const count = cibil_bureau.reasons.filter(reason => reason.severity === severity).length;
                if (count === 0) return null;

                const SeverityIcon = getSeverityIcon(severity);
                return (
                  <div key={severity} className={`p-4 rounded-lg border ${getSeverityColor(severity)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <SeverityIcon className="h-5 w-5" />
                        <span className="font-medium">{severity}</span>
                      </div>
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reasons List */}
            <div className="space-y-4">
              {cibil_bureau.reasons.map((reason, index) => {
                const CodeIcon = getCodeIcon(reason.code);
                const SeverityIcon = getSeverityIcon(reason.severity);

                return (
                  <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(reason.severity)} hover:shadow-md transition-shadow duration-200`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0">
                          <CodeIcon className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-50">
                              {reason.code}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(reason.severity)}`}>
                              <SeverityIcon className="h-3 w-3 mr-1" />
                              {reason.severity}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-2">{reason.message}</p>

                          {/* Additional Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="flex gap-1">
                              <span className="text-gray-600">Value:</span>
                              <span className="font-medium">{reason.value}</span>
                            </div>
                            <div className="flex gap-1">
                              <span className="text-gray-600">Threshold:</span>
                              <span className="font-medium">{reason.threshold}</span>
                            </div>
                            {reason.month && (
                              <div className="flex gap-1">
                                <span className="text-gray-600">Month:</span>
                                <span className="font-medium">{reason.month}</span>
                              </div>
                            )}
                            {reason.analysisPeriod && (
                              <div className="flex gap-1">
                                <span className="text-gray-600">Period:</span>
                                <span className="font-medium">
                                  {typeof reason.analysisPeriod === 'object'
                                    ? reason.analysisPeriod.period || reason.analysisPeriod.description || 'N/A'
                                    : reason.analysisPeriod}
                                </span>
                              </div>
                            )}
                            {reason.overdueAmount !== undefined && (
                              <div className="flex gap-1">
                                <span className="text-gray-600">Overdue:</span>
                                <span className="font-medium">{formatAmount(reason.overdueAmount)}</span>
                              </div>
                            )}
                            {reason.originalSalary !== undefined && (
                              <div className="flex gap-1">
                                <span className="text-gray-600">Original Salary:</span>
                                <span className="font-medium">{formatAmount(reason.originalSalary)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className="flex-shrink-0 ml-4">
                        <div className={`w-3 h-3 rounded-full ${reason.value >= reason.threshold ? 'bg-green-500' : 'bg-red-500'
                          }`} title={reason.value >= reason.threshold ? 'Passed' : 'Failed'}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Statistics */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{cibil_bureau.reasons.length}</div>
                  <div className="text-sm text-gray-500">Total Reasons</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {cibil_bureau.reasons.filter(r => r.severity === 'HIGH').length}
                  </div>
                  <div className="text-sm text-gray-500">High Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {cibil_bureau.reasons.filter(r => r.severity === 'MEDIUM').length}
                  </div>
                  <div className="text-sm text-gray-500">Medium Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-700">
                    {cibil_bureau.reasons.filter(r => r.severity === 'LOW').length}
                  </div>
                  <div className="text-sm text-gray-500">Low Risk</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CIBIL Analysis Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                <File className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">CIBIL Analysis</h3>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDecisionColor(cibil_bureau.cibil?.decision)}`}>
              {cibil_bureau.cibil?.decision}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Configuration</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">DPD Threshold</span>
                  <span className="text-gray-900">{cibilAuditDetail?.details?.dpdThreshold || 'N/A'} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Overdue Threshold</span>
                  <span className="text-gray-900">{formatAmount(cibilAuditDetail?.details?.overdueThreshold)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Account Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Accounts</span>
                  <span className="text-gray-900">{cibilAuditDetail?.details?.total_accounts || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Overdue Accounts</span>
                  <span className="text-gray-900">{cibilAuditDetail?.details?.total_overdue_accounts || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Sanction</span>
                  <span className="text-gray-900">{formatAmount(cibilAuditDetail?.details?.total_sanction_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Overdue Amount</span>
                  <span className="text-gray-900">{formatAmount(cibilAuditDetail?.details?.total_overdue_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BSA Analysis Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-brand-muted flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Bank Statement Analysis (BSA)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Salary Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Salary Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Company</span>
                  <span className="text-gray-900 text-xs">{cibil_bureau.bsa?.salary?.companyName || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Average Salary</span>
                  <span className="text-gray-900">{formatAmount(cibil_bureau.bsa?.salary?.averageSalary)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Salary</span>
                  <span className="text-gray-900">{formatAmount(cibil_bureau.bsa?.salary?.lastSalaryAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Salary Date</span>
                  <span className="text-gray-900">{cibil_bureau.bsa?.salary?.lastSalaryDate ? formatDate(cibil_bureau.bsa.salary.lastSalaryDate) : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Company Same</span>
                  <span className="text-gray-900">{cibil_bureau.bsa?.salary?.isCompanySame ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* EMI Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">EMI Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total EMI Count</span>
                  <span className="text-gray-900">{cibil_bureau.bsa?.emi?.totalEmiCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total EMI Amount</span>
                  <span className="text-gray-900">{formatAmount(cibil_bureau.bsa?.emi?.totalEmiAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Latest EMI Paid</span>
                  <span className="text-gray-900">{formatAmount(cibil_bureau.bsa?.emi?.latestEmiPaidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Latest EMI Date</span>
                  <span className="text-gray-900">{cibil_bureau.bsa?.emi?.latestEmiPaidDate ? formatDate(cibil_bureau.bsa.emi.latestEmiPaidDate) : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* NBFC Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">NBFC Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">NBFC Count</span>
                  <span className="text-gray-900">{cibil_bureau.bsa?.nbfc?.companySummary?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Paydays (30d)</span>
                  <span className="text-gray-900">{cibil_bureau.bsa?.nbfc?.totalNoOfPaydays?.last30days || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Latest Disbursal</span>
                  <span className="text-gray-900">{formatAmount(cibil_bureau.bsa?.nbfc?.latestDisbursal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Remaining Credit</span>
                  <span className="text-gray-900">
                    {formatAmount(cibil_bureau.bsa?.nbfc?.companySummary?.reduce((sum, company) => sum + (company.remainingCreditAmount || 0), 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Credit Transactions</span>
                  <span className="text-gray-900">
                    {cibil_bureau.bsa?.nbfc?.companySummary?.reduce((sum, company) => sum + (company.totalCreditTxns || 0), 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Analysis Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Analysis Months</span>
                  <span className="text-gray-900">{cibil_bureau.bsa?.analysis?.data?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total EMI Bounces</span>
                  <span className="text-gray-900">
                    {cibil_bureau.bsa?.analysis?.data?.reduce((sum, month) => sum + (month.noOfEMIBounce || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Loan Disbursals</span>
                  <span className="text-gray-900">
                    {cibil_bureau.bsa?.analysis?.data?.reduce((sum, month) => sum + (month.noOfLoanDisbursal || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total EMI Bounce Charges</span>
                  <span className="text-gray-900">
                    {cibil_bureau.bsa?.analysis?.data?.reduce((sum, month) => sum + (month.noOfEMIBounceCharges || 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Analysis Table */}
          {cibil_bureau.bsa?.analysis?.data && cibil_bureau.bsa.analysis.data.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-4">Monthly Analysis</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI Bounces</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Expense</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Disbursals</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disbursal Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI Bounce Charges</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cibil_bureau.bsa.analysis.data.map((month, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{month.noOfEMI || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatAmount(month.totalEMIAmount)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{month.noOfEMIBounce || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatAmount(month.averageExpense)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{month.noOfLoanDisbursal || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatAmount(month.loanDisbursalAmount)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{month.noOfEMIBounceCharges || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NBFC Company Details Table */}
          {cibil_bureau.bsa?.nbfc?.companySummary && cibil_bureau.bsa.nbfc.companySummary.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-4">NBFC Company Details</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Transactions</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit Transactions</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pair Matched Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pair Matched Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Credit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cibil_bureau.bsa.nbfc.companySummary.map((company, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{company.company}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{company.totalCreditTxns || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{company.totalDebitTxns || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{company.pairMatchedCount || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatAmount(company.pairMatchedAmount)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${company.remainingCreditAmount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {formatAmount(company.remainingCreditAmount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cibil_bureau.bsa.nbfc.companySummary.reduce((sum, company) => sum + (company.totalCreditTxns || 0), 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cibil_bureau.bsa.nbfc.companySummary.reduce((sum, company) => sum + (company.totalDebitTxns || 0), 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cibil_bureau.bsa.nbfc.companySummary.reduce((sum, company) => sum + (company.pairMatchedCount || 0), 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatAmount(cibil_bureau.bsa.nbfc.companySummary.reduce((sum, company) => sum + (company.pairMatchedAmount || 0), 0))}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatAmount(cibil_bureau.bsa.nbfc.companySummary.reduce((sum, company) => sum + (company.remainingCreditAmount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Eligibility Analysis Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-brand-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Eligibility Analysis</h3>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDecisionColor(cibil_bureau.eligibility?.decision)}`}>
              {cibil_bureau.eligibility?.decision}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Net Salary</h4>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(cibil_bureau.eligibility?.netSalary)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Multiplier</h4>
              <p className="text-2xl font-bold text-gray-900">{cibil_bureau.eligibility?.multiplier || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Average Salary</h4>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(cibil_bureau.eligibility?.averageSalary)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Eligible Amount</h4>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(cibil_bureau.eligibility?.eligibleLoanAmount)}</p>
            </div>
          </div>

          {/* Eligibility Input/Output Details */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Input Parameters</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Paydays</span>
                  <span className="text-gray-900">{eligibilityAuditDetail?.input?.totalPaydays || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Average Salary</span>
                  <span className="text-gray-900">{formatAmount(eligibilityAuditDetail?.input?.averageSalary)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payday Loan Amount</span>
                  <span className="text-gray-900">{formatAmount(eligibilityAuditDetail?.input?.paydayLoanAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">EMI Amount (30d)</span>
                  <span className="text-gray-900">{formatAmount(eligibilityAuditDetail?.input?.totalEmiAmountLast30Days)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Result</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Decision</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDecisionColor(eligibilityAuditDetail?.result?.decision)}`}>
                    {eligibilityAuditDetail?.result?.decision}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Net Salary</span>
                  <span className="text-gray-900">{formatAmount(eligibilityAuditDetail?.result?.netSalary)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Multiplier</span>
                  <span className="text-gray-900">{eligibilityAuditDetail?.result?.multiplier}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Eligible Amount</span>
                  <span className="text-gray-900">{formatAmount(eligibilityAuditDetail?.result?.eligibleLoanAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fraud Analysis Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Fraud Analysis</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Fraud Score</h4>
              <p className="text-2xl font-bold text-gray-900">{cibil_bureau.fraudResult?.fraudScore || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Total Triggers</h4>
              <p className="text-2xl font-bold text-gray-900">{cibil_bureau.fraudResult?.totalFraudTriggered || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Risk Level</h4>
              <p className={`text-2xl font-bold ${(cibil_bureau.fraudResult?.fraudScore || 0) > 70 ? 'text-red-600' :
                (cibil_bureau.fraudResult?.fraudScore || 0) > 30 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                {(cibil_bureau.fraudResult?.fraudScore || 0) > 70 ? 'High' :
                  (cibil_bureau.fraudResult?.fraudScore || 0) > 30 ? 'Medium' : 'Low'}
              </p>
            </div>
          </div>

          {/* Fraud Reasons */}
          {cibil_bureau.fraudResult?.fraudReasons && cibil_bureau.fraudResult.fraudReasons.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-4">Fraud Reasons</h4>
              <div className="space-y-2">
                {cibil_bureau.fraudResult.fraudReasons.map((reason, idx) => (
                  <div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">{reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payday Amount Analysis */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-yellow-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Payday Amount Analysis</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Net Disbursal Amount</h4>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(cibil_bureau.paydayAmount?.netDisbursalAmount)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Detailed Companies</h4>
              <p className="text-lg font-semibold text-gray-900">{cibil_bureau.paydayAmount?.detailedCompanies?.length || 0}</p>
            </div>
          </div>

          {/* Detailed Companies */}
          {cibil_bureau.paydayAmount?.detailedCompanies && cibil_bureau.paydayAmount.detailedCompanies.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-4">Detailed Companies</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Txns</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit Txns</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pair Matched Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pair Matched Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Credit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cibil_bureau.paydayAmount.detailedCompanies.map((company, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{company.company || 'N/A'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{company.totalCreditTxns ?? 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{company.totalDebitTxns ?? 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{company.pairMatchedCount ?? 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatAmount(company.pairMatchedAmount)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${company.remainingCreditAmount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {formatAmount(company.remainingCreditAmount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cibil_bureau.paydayAmount.detailedCompanies.reduce((sum, c) => sum + (c.totalCreditTxns || 0), 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cibil_bureau.paydayAmount.detailedCompanies.reduce((sum, c) => sum + (c.totalDebitTxns || 0), 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cibil_bureau.paydayAmount.detailedCompanies.reduce((sum, c) => sum + (c.pairMatchedCount || 0), 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatAmount(cibil_bureau.paydayAmount.detailedCompanies.reduce((sum, c) => sum + (c.pairMatchedAmount || 0), 0))}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatAmount(cibil_bureau.paydayAmount.detailedCompanies.reduce((sum, c) => sum + (c.remainingCreditAmount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log Summary */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Audit Log Summary</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">NBFC Count</h4>
              <p className="text-2xl font-bold text-gray-900">{cibil_bureau.auditLog?.logEntry?.metadata?.nbfcCount || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Eligible Amount</h4>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(cibil_bureau.auditLog?.logEntry?.metadata?.eligibleAmount)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">CIBIL Accounts</h4>
              <p className="text-2xl font-bold text-gray-900">{cibil_bureau.auditLog?.logEntry?.metadata?.cibilAccountsCount || 0}</p>
            </div>
          </div>

          {/* Module-wise Decisions */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-4">Module-wise Decisions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                auditDetails.length > 1
                  ? [...new Set([0, auditDetails.length - 1])].map(
                      (i) => auditDetails[i]
                    )
                  : auditDetails
              ).map((detail, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-900">{detail.module}</h5>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDecisionColor(detail.decision)}`}>
                      {detail.decision}
                    </span>
                  </div>
                  {detail.module === 'CIBIL' && detail.details && (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Accounts:</span>
                        <span className="text-gray-900">{detail.details.total_accounts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Overdue:</span>
                        <span className="text-gray-900">{detail.details.total_overdue_accounts}</span>
                      </div>
                    </div>
                  )}
                  {detail.module === 'BSA' && (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Salary:</span>
                        <span className="text-gray-900">{formatAmount(detail.salary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">EMI:</span>
                        <span className="text-gray-900">{detail.emi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">NBFC:</span>
                        <span className="text-gray-900">{detail.nbfcCount}</span>
                      </div>
                    </div>
                  )}
                  {detail.module === 'ELIGIBILITY' && detail.result && (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Net Salary:</span>
                        <span className="text-gray-900">{formatAmount(detail.result.netSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Multiplier:</span>
                        <span className="text-gray-900">{detail.result.multiplier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Eligible:</span>
                        <span className="text-gray-900">{formatAmount(detail.result.eligibleLoanAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
    };

    return (
      <ApiSnapshotCollapsibleList
        snapshots={breSnapshots}
        renderSnapshotSummary={(snapshot) => (
          <p className="mt-1 text-xs font-medium text-slate-600">
            Final decision: {snapshot.cibil_bureau?.finalDecision || "N/A"}
          </p>
        )}
        renderSnapshot={(snapshot) =>
          renderBreSnapshot(snapshot.cibil_bureau, snapshot.created_at)
        }
      />
    );
  };

  const renderUanData = (data) => {
    // Handling different wrapper levels of data returned based on project's typical structure
    const uanDetails = data?.apimsg || data?.data?.[0]?.api_response?.apimsg || data?.data?.[0]?.api_response || data?.data || data;

    // Fallbacks to empty object
    const summary = uanDetails?.employment_summary || {};
    const currentEmp = uanDetails?.current_employment || {};

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-brand-muted flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Employment Summary</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">UAN Number</h4>
              <p className="text-lg font-bold text-gray-900">{summary.uan || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Currently Employed</h4>
              <p className="text-lg font-bold text-gray-900">
                {summary.is_employed !== undefined ? (summary.is_employed ? 'Yes' : 'No') : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Total UANs Found</h4>
              <p className="text-lg font-bold text-gray-900">{summary.uan_count ?? 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Current Employer</h4>
              <p className="text-lg font-bold text-gray-900">{currentEmp.employer_name || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Date of Joining</h4>
              <p className="text-lg font-bold text-gray-900">
                {currentEmp.date_of_joining ? currentEmp.date_of_joining : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Name Match Found</h4>
              <p className="text-lg font-bold text-gray-900">
                {summary.employee_name_match !== undefined ? (summary.employee_name_match ? 'Yes' : 'No') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        data-tour={tourId || undefined}
        onClick={() => setExpandedSection(isExpanded ? null : type)}
        aria-expanded={isExpanded}
        className={`flex w-full items-center justify-between p-4 text-left cursor-pointer ${
          isExpanded
            ? "sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm"
            : "hover:bg-gray-50"
        }`}
      >
        <span className="text-base font-medium text-gray-900">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {isLoading ? (
            renderLoadingSkeleton()
          ) : data ? (
            type === "pan" ? (
              renderPanData(data)
            )
              : type === "bsa" ? (
                renderBsaData(data, {
                  selectedEmiMonth,
                  setSelectedEmiMonth,
                  expandedEmiCompany,
                  setExpandedEmiCompany,
                  emiMonths,
                  getCurrentMonthLabel,
                  transactionSearchTerm,
                  setTransactionSearchTerm,
                }, role, onMoveToBankingClick)
              )
                : type === "cibil_bureau" ? (
                  renderBreData(data)
                ) : type === "bre-decision" ? (
                  renderBreDecisionData(data)
                ) : type === "UAN" ? (
                  renderUanData(data)
                ) : (
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(data?.data, null, 2)}
                  </pre>
                )
          ) : (
            <div className="text-center text-gray-500">No data available</div>
          )}
        </div>
      )}
    </div>
  );
};



export default CustomerModal;
