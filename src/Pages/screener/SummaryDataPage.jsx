import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  ExternalLink,
  FileSearch,
  FolderOpen,
  Globe,
  MapPin,
  TrendingUp,
  Upload,
  User,
  X,
  ScrollText,
  Link2,
  Landmark,
  Loader2,
  AlertTriangle,
  Banknote,
  History,
  Phone,
  IdCard,
  Flag,
  Hash,
  Mail,
  Calculator,
  FilePlus2,
  ScanFace,
  Compass,
} from "lucide-react";
import { getLeadSummaryData, rejectLeadById, validateDocs, generateBankingUrl, submitWarnIndicatorAction, getAdditionalDocumentOptions, requestAdditionalDocuments } from "../../services/functions/screener";
import { getProfile } from "../../services/functions/user";
import { actionPan } from "../../services/functions/admin";
import { openDetailModal } from "../../redux/slices/detailModal";
import { getDocumentById, getDocumentByLink, getLeadLogsById, getAddressById, holdNewLeadWithRemark } from "../../services/functions/lead-details";
import {
  uploadAddtionalDocument,
  approveBreRejectedLead,
  getSalaryManualApprove,
  getSalaryDateConflict,
  setSalaryTransactionById,
} from "../../services/functions/credit-analyst";
import { buildSummaryDataSearchParams, resolveAuditId } from "../../utils/auditLead";
import {
  isAdminOrCreditHeadUser,
  shouldHideCreditHeadAuditActions,
  shouldShowCreditHeadAuditApprove,
  shouldShowSearchResultCreditHeadAuditApprove,
} from "../../utils/creditHeadAuditActions";
import { getLeadStageMeaning, leadStageMapping } from "../../utils/leadStageMapping";
import { REJECTION_REASONS } from "../../utils/rejectionReasons";
import RejectionModal from "../../Components/Modals/RejectionModal";
import EmailEditField from "../../Components/EmailEditField";
import ExpandableTruncatedText from "../../Components/ExpandableTruncatedText";
import LeadStageTips from "../../Components/LeadStageTips";
import ManualKycApproveModal from "../../Components/Modals/ManualKycApproveModal";
import ActionModal from "../../Components/Modals/ActionModal";
import ConfirmationModal from "../../Components/ConfirmationModal";
import LoanCalculator from "./components/LoanCalculator";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  LEAD_TOUR_DISMISS_EVENT,
  isSummaryTourSeen,
  requestSummaryTour,
} from "../../utils/productTour";

const DUMMY_SUMMARY_DATA = {
  lead_stage: "BRE_REJECT",
  cust_name: "Rajesh Kumar",
  mobile_number: "+91 9876543210",
  alternate_mobile: "+91 9876543211",
  personal_email: "rajesh.k@email.com",
  official_email: "rajesh.k@email.com",
  lead_id: 114248,
  cust_id: 114248,
  loan_no: "BLKR0001",
  lead_no: "CUST-2024-8765",
  pan: "BYMPJ0920M",
  profile_image: "",
  aadhaar_image: "",
  face_match_score: null,
  address: "Flat 12B, Green Heights, Sector 45, Gurugram, Haryana - 122003",
  net_salary: 62000,
  maximum_elegiblity: 50000,
  requested_loan_amount: 40000,
  pf: 10,
  repayment_date: "30-06-2026",
  roi: 1,
  is_bre_reject: true,
  is_kyc_reject: false,
  is_disbursed: false, 
  is_reloan_case: false,
  static_data: {
    credit_data: {
      credit_score: 710,
      credit_score_collection_percentage: 82,
      credit_score_cases_count: 20,
    },
    company_domain_data: {
      company_domain_name: "airindiaexpress.com",
      company_domain_name_collection_percentage: 82,
      company_domain_cases_count: 20,
    },
    pincode: {
      pincode_value: "294012",
      pincode_collection_percentage: 82,
      pincode_cases_count: 20,
    },
    city: {
      city_name: "Venkatanarasimharajuvaripeta",
      pincode_collection_percentage: 82,
      city_cases_count: 20,
    },
    payday_count: {
      payday_count_number: 20,
      payday_count_collection_percentage: 82,
      payday_cases_count: 20,
    },
    inquiry_data: {
      past30days: {
        inquiry_count_number: 39,
        inquiry_count_collection_percentage: 82,
        inquiry_cases_count: 20,
      },
    },
    monthly_income_data: {
      income_data: [
        {
          amount: 62000,
          date: "30-05-2026",
          income_type: "Salary",
          bank_name: "HDFC BANK",
          is_abnormal_behaviour_captured: false,
        },
        {
          amount: 62000,
          date: "30-04-2026",
          income_type: "Salary",
          bank_name: "HDFC BANK",
          is_abnormal_behaviour_captured: false,
        },
        {
          amount: 10000,
          date: "15-04-2026",
          income_type: "Incentive",
          bank_name: "HDFC BANK",
          is_abnormal_behaviour_captured: true,
        },
      ],
    },
    payday_loans_data: {
      summary: {
        new_payday_companies: {
          last_1_month: { total: 0, companies: [] },
          last_2_months: { total: 0, companies: [] },
          last_3_months: { total: 0, companies: [] },
        },
        discontinued_payday_companies: {
          last_1_month: { total: 1, companies: ["KreditBee"] },
          last_2_months: { total: 1, companies: ["KreditBee"] },
          last_3_months: { total: 2, companies: ["KreditBee", "Navi"] },
        },
        overall_unique_payday_companies_count: 5,
      },
      payday_data: [
        {
          company_name: "Agrim",
          total_credit: 1200,
          total_debit: 1200,
          transaction_wise_data: [
            { amount: 1200, transaction_type: "Cr.", month: "Apr-26" },
            { amount: 1200, transaction_type: "Dr.", month: "Apr-26" },
            { amount: 1100, transaction_type: "Cr.", month: "Mar-26" },
            { amount: 1100, transaction_type: "Dr.", month: "Mar-26" },
          ],
        },
        {
          company_name: "KreditBee",
          total_credit: 800,
          total_debit: 800,
          seek_month: "Apr-26",
          transaction_wise_data: [
            { amount: 800, transaction_type: "Cr.", month: "Apr-26" },
            { amount: 800, transaction_type: "Dr.", month: "Apr-26", seek: true },
            { amount: 750, transaction_type: "Cr.", month: "Mar-26" },
            { amount: 750, transaction_type: "Dr.", month: "Mar-26" },
          ],
        },
        {
          company_name: "Navi",
          total_credit: 600,
          total_debit: 600,
          transaction_wise_data: [
            { amount: 600, transaction_type: "Cr.", month: "Feb-26" },
            { amount: 600, transaction_type: "Dr.", month: "Feb-26" },
          ],
        },
        {
          company_name: "MoneyTap",
          total_credit: 500,
          total_debit: 500,
          transaction_wise_data: [
            { amount: 500, transaction_type: "Cr.", month: "Jan-26" },
            { amount: 500, transaction_type: "Dr.", month: "Jan-26" },
          ],
        },
        {
          company_name: "Fibe",
          total_credit: 400,
          total_debit: 400,
          transaction_wise_data: [
            { amount: 400, transaction_type: "Cr.", month: "Dec-25" },
            { amount: 400, transaction_type: "Dr.", month: "Dec-25" },
          ],
        },
      ],
    },
  },
  reloan_data: [
    {
      loan_count: 2,
      loan_no: "BLKR0002",
      loan_amount: 1200,
      disbursal_date: "2026-09-25",
      repayment_date: "2026-09-25",
      dpd: 0,
      status: "CLOSED",
    },
    {
      loan_count: 1,
      loan_no: "BLKR0001",
      loan_amount: 1200,
      disbursal_date: "2026-09-25",
      repayment_date: "2026-09-25",
      dpd: 4,
      status: "ACTIVE",
    },
  ],
};

const toSentenceCase = (text) => {
  if (!text) return "";
  const lower = String(text).trim().toLowerCase();
  if (!lower) return "";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const formatDocumentType = (type) => {
  if (!type) return "Document";
  const normalized = type.replace(/_/g, " ").replace(/-/g, " ").trim();
  return toSentenceCase(normalized);
};

const getDocumentLabel = (doc) => {
  if (doc?.document_type === "ADDITIONAL_DOCUMENT" && doc?.remarks) {
    const remarks = doc.remarks.trim();
    const addedMatch = remarks.match(/\s+added\s+/i);
    if (addedMatch?.index != null) {
      return toSentenceCase(remarks.slice(0, addedMatch.index).trim());
    }
    return toSentenceCase(remarks);
  }
  return formatDocumentType(doc?.document_type);
};

const getDocumentFileType = (url) => {
  if (!url) return "unknown";
  const path = url.toLowerCase().split("?")[0];
  if (/\.(jpe?g|png|gif|webp|bmp|svg)$/.test(path)) return "image";
  if (/\.pdf$/.test(path)) return "pdf";
  return "unknown";
};

const PRIMARY_ACTION_BUTTONS = [
  { label: "View Lead Logs", border: "border-indigo-400", text: "text-indigo-600", hover: "hover:bg-indigo-50" },
  { label: "View Address", border: "border-sky-400", text: "text-sky-600", hover: "hover:bg-sky-50" },
  { label: "Complete Details", border: "border-brand", text: "text-brand-link", hover: "hover:bg-brand-light" },
  { label: "Calculate", border: "border-emerald-400", text: "text-emerald-600", hover: "hover:bg-emerald-50", icon: Calculator },
  { label: "Send Banking Link", border: "border-pink-400", text: "text-pink-600", hover: "hover:bg-pink-50", chevron: true },
];

const BANKING_LINK_HIDDEN_STAGES = new Set([
  "PENDING_LEAD",
  "COMPLETE_REGISTRATION",
  "ADD_EMPLOYEMENT",
  "PENDING_EMPLOYEMENT_WITH_SELF_EMPLOYEED",
  "SEND_EMAIL_OTP",
  "VRIFY_EMAIL_OTP",
  "DISBURSED",
  "MANUALLY_REJECT",
]);

const REJECT_HOLD_HIDDEN_STAGES = new Set(["MANUALLY_REJECT", "DISBURSED"]);

const ASK_DOCUMENT_STAGES = new Set([
  "BRE_REJECT",
  "AUDIT_PENDING",
  "AUDIT_PENDING_CREDIT_HEAD",
  "AUDIT_ASSIGNED_CREDIT_HEAD",
]);

const SECONDARY_ACTION_BUTTONS = [
  { label: "Reject", border: "border-red-500", text: "text-red-600", hover: "hover:bg-red-50", icon: X },
  { label: "Hold", border: "border-orange-500", text: "text-orange-600", hover: "hover:bg-orange-50", icon: Clock },
];

const AUDIT_SALES_OPS_APPROVE_STAGES = new Set([
  "AUDIT_PENDING",
  "AUDIT_ASSIGN",
  "AUDIT_ASSIGNED",
  "AUDIT_HOLD_SALES_OPS",
  "AUDIT_COMPANY_VERIFIED",
  "AUDIT_APPROVED_SALES",
  "AUDIT_REJECTED_SALES",
]);

const AUDIT_CREDIT_HEAD_APPROVE_STAGES = new Set([
  "AUDIT_ASSIGNED_CREDIT_HEAD",
  "AUDIT_HOLD_CREDIT_HEAD",
]);

const ALLOCATED_AUDIT_APPROVE_STAGES = new Set(["AUDIT_PENDING", "AUDIT_ASSIGNED"]);

const SEARCH_RESULT_ALLOCATED_AUDIT_STAGES = new Set([
  "AUDIT_PENDING",
  "AUDIT_ASSIGN",
  "AUDIT_ASSIGNED",
]);

const shouldShowSearchResultAllocatedAuditApprove = (lead, profile) => {
  if (!lead || !isLeadAssignedToEmployee(profile, lead)) return false;

  if (lead.lead_stage === "AUDIT_APPROVED_CREDIT_HEAD") return false;

  const kycStatus = Number(lead?.kyc_status);
  if (SEARCH_RESULT_ALLOCATED_AUDIT_STAGES.has(lead.lead_stage) && kycStatus <= 5) return true;

  return false;
};

const shouldShowLeadApproveButton = (lead) => {
  const stage = lead?.lead_stage;
  console.log("stage", stage);
  if (!stage) return false;

  if (stage === "BRE_REJECT" && lead?.is_bre_reject === true) return true;
  if (stage === "REJECT_AADHAR_KYC" && lead?.is_kyc_reject === true) return true;
  if (AUDIT_SALES_OPS_APPROVE_STAGES.has(stage)) return true;
  if (AUDIT_CREDIT_HEAD_APPROVE_STAGES.has(stage)) return true;

  return false;
};

const isAuditLeadApproveStage = (lead) => {
  const stage = lead?.lead_stage;
  if (!stage) return false;
  return (
    AUDIT_SALES_OPS_APPROVE_STAGES.has(stage) ||
    AUDIT_CREDIT_HEAD_APPROVE_STAGES.has(stage)
  );
};

const getProfileEmployeeId = (profile) => profile?.data?.id ?? profile?.id ?? null;

const isLeadAssignedToEmployee = (profile, leadData) => {
  const employeeId = getProfileEmployeeId(profile);
  if (employeeId == null || !leadData) return false;

  const normalizedEmployeeId = String(employeeId);
  const assignedTo = leadData.assigned_to;
  const allocatedTo = leadData.allocated_to;

  return (
    (assignedTo != null && String(assignedTo) === normalizedEmployeeId) ||
    (allocatedTo != null && String(allocatedTo) === normalizedEmployeeId)
  );
};

const NAVY = "#111111";
const NAVY_LIGHT = "#1A1A1A";
const PAGE_BG = "#f1f5f9";
const CARD_CLASS =
  "overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.02]";

const SectionHeader = ({
  title,
  icon: Icon,
  badge,
  trailing,
  onClick,
  collapsible,
  open,
  className = "",
}) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-expanded={collapsible ? open : undefined}
      className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 text-left ${
        onClick ? "cursor-pointer transition-colors hover:bg-slate-50/80" : ""
      } ${className}`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100"
            style={{ color: NAVY }}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <span className="truncate text-sm font-semibold tracking-tight text-slate-900">{title}</span>
        {badge}
      </span>
      {collapsible ? (
        open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )
      ) : (
        trailing
      )}
    </Tag>
  );
};

const StatTile = ({ label, value, highlight = false }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-3">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p
      className={`mt-1 text-base font-bold tabular-nums sm:text-lg ${
        highlight ? "text-emerald-600" : "text-slate-900"
      }`}
    >
      {value ?? "—"}
    </p>
  </div>
);

const DUMMY_BRE_DECISION = {
  score: 79,
  maxScore: 100,
  grade: "B",
  decision: "Conditional Approve",
  recommendedAmount: 15000,
  recommendedTenureDays: 15,
  passingRules: [
    { label: "Clean bureau — no overdue, low inquiries", points: 6 },
    { label: "Repeat borrower", points: 5 },
    { label: "Strong pincode collection (93%)", points: 3 },
  ],
  riskRules: [
    { label: "Sub-prime CIBIL 637", points: -20 },
    { label: "Live loan at DPD 3", points: -15 },
  ],
  suggestion:
    "Approve ₹15,000 / 15d. Mandate income proof, auto-debit on salary day 30, re-loan only after one clean cycle.",
};

const DUMMY_PAYDAY_LOAN_STATUS = [
  { company: "Dinger Fin-Lease", status: "repaid", note: "On schedule" },
  { company: "Sampati Securities", status: "not_yet_due", note: "Due 14 Jul" },
  { company: "Kasar Credit", status: "overdue", note: "Pending 2nd approver", overdueLabel: "Overdue 240d+" },
  { company: "Flex Salary", status: "repaid", note: "On schedule" },
  { company: "Vaishali Securities", status: "not_yet_due", note: "Override available" },
];

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
};

const INCOME_TYPE_LABELS = {
  1: "Salary",
  2: "Incentive",
  3: "Other",
};

const formatIncomeType = (row) => {
  const raw = row?.type ?? row?.income_type;
  if (raw == null || raw === "") return "—";

  const numericType = Number(raw);
  if (!Number.isNaN(numericType) && INCOME_TYPE_LABELS[numericType]) {
    return INCOME_TYPE_LABELS[numericType];
  }

  return toSentenceCase(String(raw));
};

const formatIncomeDate = (row) => {
  const raw = row?.date ?? row?.transaction_date ?? row?.transactionDate;
  if (raw == null || raw === "") return "—";

  if (typeof raw === "string" && /^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatName = (name) => {
  if (!name) return "N/A";
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const toFaceMatchPercent = (score) => {
  if (score === null || score === undefined || score === "") return null;
  const num = Number(score);
  if (Number.isNaN(num)) return null;
  return num >= 0 && num <= 1 ? num * 100 : num;
};

const formatFaceMatchScore = (score) => {
  const pct = toFaceMatchPercent(score);
  if (pct === null) return null;
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
};

const copyText = (text, label) => {
  if (!text) return;
  navigator.clipboard.writeText(String(text)).then(() => toast.success(`${label} copied`));
};

const copyLeadProfileSummary = ({
  custName,
  mobileNumber,
  panNo,
  leadStage,
  leadId,
}) => {
  const summary = [
    custName || "N/A",
    mobileNumber || "N/A",
    panNo || "N/A",
    leadStage || "N/A",
    leadId || "N/A",
  ].join(" ");

  copyText(summary, "Lead details");
};

const getBankingUrlFromResponse = (response) =>
  response?.url ?? response?.result?.data?.url ?? null;

const showBankingUrlToast = (url) => {
  if (!url) {
    toast.success("Banking link sent successfully");
    return;
  }

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } flex max-w-md items-start gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 shadow-lg`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Banking link generated</p>
          <p className="mt-1 break-all text-xs text-slate-600">{url}</p>
        </div>
        <button
          type="button"
          onClick={() => copyText(url, "Banking link")}
          className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Copy banking link"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    ),
    { duration: 5000 }
  );
};

const BANKING_LINK_OPTIONS = [
  {
    id: "aa",
    title: "Account Aggregator",
    subtitle: "AA",
    description: "Consent-based instant bank statement fetch",
    icon: Link2,
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600",
    hoverBorder: "hover:border-pink-300 hover:bg-pink-50/60",
  },
  {
    id: "net_banking",
    title: "Net Banking",
    subtitle: null,
    description: "Send link for net banking login flow",
    icon: Landmark,
    iconBg: "bg-gradient-to-br from-fuchsia-500 to-brand-hover",
    hoverBorder: "hover:border-brand/50 hover:bg-brand-light/60",
  },
];

const BankingLinkOptionsPanel = ({ onSelect, onClose, pendingOption }) => (
  <div className="mt-3 overflow-hidden rounded-lg border border-pink-200/80 bg-white shadow-sm">
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{ background: "linear-gradient(90deg, #fdf2f8, #fce7f3)" }}
    >
      <div>
        <p className="text-xs font-semibold text-pink-900">Send Banking Link</p>
        <p className="text-[10px] text-pink-700/80">Choose how the customer shares bank details</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={Boolean(pendingOption)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-pink-700/70 transition-colors hover:bg-pink-200/50 hover:text-pink-900 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Close banking options"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
    <div className="space-y-2 p-2.5">
      {BANKING_LINK_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isLoading = pendingOption === option.id;
        const isDisabled = Boolean(pendingOption);

        return (
          <button
            key={option.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(option.id)}
            className={`group flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2.5 text-left transition-all ${option.hoverBorder} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm ${option.iconBg}`}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800">
                {option.title}
                {option.subtitle ? (
                  <span className="ml-1 font-medium text-pink-600">({option.subtitle})</span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{option.description}</p>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-pink-600" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 -rotate-90 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const CollapsibleSection = ({ title, icon: Icon, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={CARD_CLASS}>
      <SectionHeader
        title={title}
        icon={Icon}
        collapsible
        open={open}
        onClick={() => setOpen((v) => !v)}
      />
      {open ? <div className="text-slate-800">{children}</div> : null}
    </div>
  );
};

const BreScoreRing = ({ score, maxScore, grade }) => {
  const size = 88;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (Number(score) / Number(maxScore || 100)) * 100));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#dbe3f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={NAVY}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-white/80">
        <span className="text-2xl font-bold leading-none tabular-nums text-slate-900">{score}</span>
        <span
          className="mt-1 rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: NAVY_LIGHT }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
};

const BreRuleRow = ({ rule, tone }) => {
  const isPass = tone === "pass";
  return (
    <li className="group flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/70">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
          isPass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
        }`}
      >
        {isPass ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : (
          <X className="h-3 w-3" strokeWidth={3} />
        )}
      </span>
      <span className="min-w-0 flex-1 text-[12px] leading-snug text-slate-700">{rule.label}</span>
      <span
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
          isPass
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
            : "bg-red-50 text-red-700 ring-1 ring-red-100"
        }`}
      >
        {isPass ? `+${rule.points}` : rule.points}
      </span>
    </li>
  );
};

const BreDecisionEngineCard = ({ data = DUMMY_BRE_DECISION }) => {
  const [open, setOpen] = useState(false);
  const {
    score,
    maxScore,
    grade,
    decision,
    recommendedAmount,
    recommendedTenureDays,
    passingRules,
    riskRules,
    suggestion,
  } = data;

  const passTotal = passingRules.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
  const riskTotal = riskRules.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

  return (
    <div className={CARD_CLASS}>
      <SectionHeader
        title="BRE Decision Engine"
        icon={TrendingUp}
        badge={
          decision ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
              {decision}
            </span>
          ) : null
        }
      />

      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-left transition-all hover:border-slate-300 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-5 sm:p-4"
          aria-expanded={open}
        >
          <BreScoreRing score={score} maxScore={maxScore} grade={grade} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Rule-engine score
              </p>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80 text-slate-500 ring-1 ring-slate-200 sm:hidden">
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl" style={{ color: NAVY }}>
              {score}
              <span className="text-base font-semibold text-slate-400">/{maxScore}</span>
              <span className="mx-2 text-slate-300">•</span>
              <span className="text-base sm:text-lg">Grade {grade}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <Check className="h-3 w-3" strokeWidth={3} />
                Pass +{passTotal}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-100">
                <AlertTriangle className="h-3 w-3" />
                Risk {riskTotal}
              </span>
              {recommendedAmount != null ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: NAVY }}
                >
                  {formatCurrency(recommendedAmount)}
                  {recommendedTenureDays != null ? ` / ${recommendedTenureDays}d` : ""}
                </span>
              ) : null}
            </div>
          </div>

          <span className="hidden h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 sm:flex">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {open ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                  Top Passing Rules
                </p>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {passingRules.map((rule) => (
                    <BreRuleRow key={rule.label} rule={rule} tone="pass" />
                  ))}
                </ul>
              </div>

              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-red-600">
                  Top Risk Rules
                </p>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {riskRules.map((rule) => (
                    <BreRuleRow key={rule.label} rule={rule} tone="risk" />
                  ))}
                </ul>
              </div>
            </div>

            {suggestion ? (
              <div
                className="rounded-lg border border-slate-200 bg-slate-50/90 px-3.5 py-3"
                style={{ borderLeftWidth: 4, borderLeftColor: NAVY }}
              >
                <p className="text-xs leading-relaxed text-slate-700 sm:text-[13px]">
                  <span className="font-bold text-slate-900">Suggestion: </span>
                  {suggestion}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const PAYDAY_STATUS_STYLES = {
  repaid: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
    label: "Repaid",
    note: "text-slate-500",
  },
  not_yet_due: {
    badge: "bg-amber-50 text-amber-800 ring-amber-200/70",
    label: "Not yet due",
    note: "text-slate-500",
  },
  overdue: {
    badge: "bg-red-50 text-red-700 ring-red-200/70",
    label: "Overdue",
    note: "text-red-600",
  },
};

const PaydayLoanStatusCard = ({ items = DUMMY_PAYDAY_LOAN_STATUS, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={CARD_CLASS}>
      <SectionHeader
        title="Payday Loan Status"
        icon={Building2}
        collapsible
        open={open}
        onClick={() => setOpen((v) => !v)}
      />
      {open ? (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const style = PAYDAY_STATUS_STYLES[item.status] || PAYDAY_STATUS_STYLES.not_yet_due;
            const badgeLabel =
              item.status === "overdue" && item.overdueLabel
                ? item.overdueLabel
                : style.label;
            return (
              <li
                key={item.company}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-slate-50/60 sm:flex-nowrap"
              >
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                  {item.company}
                </span>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${style.badge}`}
                >
                  {badgeLabel}
                </span>
                <span
                  className={`w-full text-xs sm:w-auto sm:min-w-[8.5rem] sm:text-right ${
                    item.status === "overdue" ? "font-medium text-red-600" : style.note
                  }`}
                >
                  {item.note}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

const ReloanSummary = ({ summary }) => {
  if (!summary || typeof summary !== "object") return null;

  const items = [
    { label: "Pre Closed", value: summary.pre_closed_loan_count, tone: "emerald" },
    { label: "Post Closed", value: summary.post_closed_count, tone: "blue" },
    { label: "Due Date", value: summary.due_date_count, tone: "amber" },
  ];

  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-800",
    blue: "bg-brand-light text-brand-link",
    amber: "bg-amber-50 text-amber-800",
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 px-3 py-2 text-xs sm:gap-x-6">
      {items.map(({ label, value, tone }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="text-slate-500">{label}</span>
          <span
            className={`inline-flex min-w-[1.25rem] items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${toneClasses[tone]}`}
          >
            {value ?? 0}
          </span>
        </div>
      ))}
    </div>
  );
};

const METRIC_THEMES = {
  cibil: {
    icon: TrendingUp,
    iconFrom: "#FFD737",
    iconTo: "#FF0000",
    valueClassName: "text-emerald-700",
    glow: {
      edgeLeft: "#FFF9EB",
      midFrom: "#FFD737",
      center: "#FF3300",
      midTo: "#FFB8B8",
      edgeRight: "#FFF0F5",
    },
  },
  pincode: {
    icon: MapPin,
    iconFrom: "#2DD4BF",
    iconTo: "#22C55E",
    valueClassName: "text-slate-900",
    glow: {
      edgeLeft: "#E0F7FA",
      midFrom: "#2DD4BF",
      center: "#15803D",
      midTo: "#4ADE80",
      edgeRight: "#ECFDF5",
    },
  },
  city: {
    icon: Building2,
    iconFrom: "#38BDF8",
    iconTo: "#ed5b36",
    valueClassName: "text-slate-900",
    glow: {
      edgeLeft: "#EFF6FF",
      midFrom: "#60A5FA",
      center: "#1E40AF",
      midTo: "#93C5FD",
      edgeRight: "#F0F9FF",
    },
  },
  domain: {
    icon: Globe,
    iconFrom: "#C084FC",
    iconTo: "#EC4899",
    valueClassName: "text-slate-900",
    glow: {
      edgeLeft: "#FAF5FF",
      midFrom: "#C084FC",
      center: "#7E22CE",
      midTo: "#E879F9",
      edgeRight: "#FDF4FF",
    },
  },
  payday: {
    icon: CalendarDays,
    iconFrom: "#A3E635",
    iconTo: "#EAB308",
    valueClassName: "text-slate-900",
    glow: {
      edgeLeft: "#F7FEE7",
      midFrom: "#BEF264",
      center: "#4D7C0F",
      midTo: "#FACC15",
      edgeRight: "#FEFCE8",
    },
  },
  inquiry: {
    icon: FileSearch,
    iconFrom: "#38BDF8",
    iconTo: "#ed5b36",
    valueClassName: "text-slate-900",
    glow: {
      edgeLeft: "#FFF1F2",
      midFrom: "#FDA4AF",
      center: "#B91C1C",
      midTo: "#F87171",
      edgeRight: "#FFF5F5",
    },
  },
};

const GradientIcon = ({ Icon, gradientId, from, to }) => (
  <span className="relative inline-flex shrink-0">
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
    </svg>
    <Icon className="h-4 w-4" stroke={`url(#${gradientId})`} strokeWidth={2} />
  </span>
);

const MetricCardValue = ({ valueStr, valueSize, valueClassName }) => (
  <ExpandableTruncatedText
    value={valueStr}
    fallback="—"
    centered
    className={`font-bold leading-tight ${valueSize} ${valueClassName}`}
  />
);

const MetricCard = ({
  cardId,
  icon: Icon,
  iconFrom,
  iconTo,
  label,
  value,
  collectionPct,
  cases,
  valueClassName = "text-slate-900",
}) => {
  const valueStr = value ?? "—";
  const valueLength = String(valueStr).length;
  const valueSize =
    valueLength > 12 ? "text-sm" : valueLength > 8 ? "text-base" : valueLength > 4 ? "text-lg" : "text-3xl";

  return (
    <div className="relative flex h-full min-w-0 flex-col">
      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex min-h-[2.75rem] shrink-0 items-start gap-2">
          <GradientIcon
            Icon={Icon}
            gradientId={`metric-icon-${cardId}`}
            from={iconFrom}
            to={iconTo}
          />
          <p className="min-w-0 text-xs font-medium leading-snug text-slate-500">{label}</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 w-full min-w-0 flex-1 items-center justify-center px-0.5 py-2">
            <div className="min-w-0 w-full max-w-full">
              <MetricCardValue
                valueStr={valueStr}
                valueSize={valueSize}
                valueClassName={valueClassName}
              />
            </div>
          </div>

          <div className="mt-auto shrink-0 space-y-1 border-t border-slate-100 pt-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Collection</span>
              <span className="font-semibold tabular-nums text-emerald-600">{collectionPct ?? "—"}%</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Cases</span>
              <span className="font-semibold tabular-nums text-slate-800">{cases ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileField = ({ label, value, onCopy, icon: Icon, variant = "light", title }) => {
  const isDark = variant === "dark";
  const labelClass = isDark
    ? "text-[10px] font-medium text-blue-200/90"
    : "text-[11px] font-medium text-slate-500";
  const valueClass = isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900";
  const copyClass = isDark
    ? "text-blue-200/70 hover:text-white"
    : "text-slate-400 hover:text-slate-700";

  return (
    <div className="min-w-0">
      <p className={`flex items-center gap-1 ${labelClass}`}>
        {Icon ? <Icon className="h-3 w-3 shrink-0 opacity-80" /> : null}
        <span className="truncate">{label}</span>
      </p>
      <div className="mt-0.5 flex items-start gap-1.5">
        <ExpandableTruncatedText
          value={value}
          title={title}
          className={`flex-1 ${valueClass}`}
        />
        {onCopy && value ? (
          <button type="button" onClick={() => onCopy(value)} className={`mt-0.5 shrink-0 ${copyClass}`}>
            <Copy className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

const parsePaydayMonthLabel = (label) => {
  if (!label) return 0;
  const parts = String(label).split("-");
  if (parts.length !== 2) return 0;

  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const monthIndex = monthMap[parts[0]];
  let year = parseInt(parts[1], 10);
  if (Number.isNaN(year)) return 0;
  if (year < 100) year += 2000;

  if (monthIndex == null) return 0;
  return year * 12 + monthIndex;
};

const buildPaydayMatrix = (paydayLoans) => {
  const monthSet = new Set();
  paydayLoans.forEach((loan) => {
    loan.transaction_wise_data?.forEach((t) => t.month && monthSet.add(t.month));
  });
  const months = [...monthSet].sort(
    (a, b) => parsePaydayMonthLabel(b) - parsePaydayMonthLabel(a)
  );

  const lenders = paydayLoans.map((loan) => {
    const byMonth = {};
    loan.transaction_wise_data?.forEach((t) => {
      if (!byMonth[t.month]) byMonth[t.month] = {};
      const key = t.transaction_type?.startsWith("Cr") ? "cr" : "dr";
      const dateLabel = formatIncomeDate(t);
      const existing = byMonth[t.month][key];
      const txnAmount = Number(t.amount) || 0;
      const entries = existing?.entries ? [...existing.entries] : [];
      entries.push({
        date: dateLabel && dateLabel !== "—" ? dateLabel : null,
        amount: txnAmount,
      });
      byMonth[t.month][key] = {
        amount: (Number(existing?.amount) || 0) + txnAmount,
        seek: existing?.seek || t.seek,
        entries,
      };
    });
    return {
      name: loan.company_name,
      totalCr: loan.total_credit,
      totalDr: loan.total_debit,
      byMonth,
    };
  });

  return { months, lenders };
};

const PaydayTxnCell = ({ amount, entries, seek, variant = "cr", emptyLabel = "—" }) => {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimerRef = useRef(null);
  const hasEntries = Array.isArray(entries) && entries.length > 0;
  const isDebit = variant === "dr";
  const titleText = hasEntries
    ? entries
        .map((e) =>
          [e.date, e.amount != null ? formatCurrency(e.amount) : null]
            .filter(Boolean)
            .join(" · ")
        )
        .join(" | ")
    : undefined;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = 248;
    const gap = 8;
    const viewportPad = 8;
    const left = Math.min(
      Math.max(viewportPad, rect.left + rect.width / 2 - panelWidth / 2),
      window.innerWidth - panelWidth - viewportPad
    );
    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
    const spaceAbove = rect.top - gap - viewportPad;
    const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const available = Math.max(120, placeAbove ? spaceAbove : spaceBelow);
    setCoords({
      top: placeAbove ? rect.top - gap : rect.bottom + gap,
      left,
      placeAbove,
      width: panelWidth,
      maxHeight: Math.min(320, available),
    });
  }, []);

  const close = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
    setPinned(false);
  }, [clearCloseTimer]);

  const show = useCallback(() => {
    if (!hasEntries) return;
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }, [hasEntries, clearCloseTimer, updatePosition]);

  const scheduleHide = useCallback(() => {
    if (pinned) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  }, [pinned, clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = (e) => {
      // Keep list scrolling inside the panel; only reposition on outer scrolls
      if (panelRef.current?.contains(e.target)) return;
      updatePosition();
    };
    const onResize = () => updatePosition();
    const onDocClick = (e) => {
      if (
        buttonRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) {
        return;
      }
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, updatePosition, close]);

  if (amount == null) {
    return (
      <span
        className={
          emptyLabel === "-"
            ? "text-[9px] font-bold text-red-500"
            : "text-slate-400"
        }
      >
        {emptyLabel}
      </span>
    );
  }

  const accent = isDebit
    ? {
        amount: "text-slate-700 hover:bg-red-50 hover:text-red-700",
        active: "bg-red-50 text-red-700 ring-red-200",
        bar: "bg-red-500",
        soft: "bg-red-50 text-red-700",
        icon: "text-red-500",
        value: "text-red-600",
        label: entries?.length > 1 ? "Debit transactions" : "Debit transaction",
      }
    : {
        amount: "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700",
        active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        bar: "bg-emerald-500",
        soft: "bg-emerald-50 text-emerald-700",
        icon: "text-emerald-500",
        value: "text-emerald-600",
        label: entries?.length > 1 ? "Credit transactions" : "Credit transaction",
      };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup={hasEntries ? "dialog" : undefined}
        title={titleText}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onClick={() => {
          if (!hasEntries) return;
          if (pinned) {
            close();
            return;
          }
          show();
          setPinned(true);
        }}
        className={`inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors ${
          hasEntries
            ? `cursor-pointer ${accent.amount} ${open ? `ring-1 ${accent.active}` : ""}`
            : "cursor-default text-slate-700"
        }`}
      >
        {formatCurrency(amount)}
        {seek ? (
          <span className="rounded bg-red-500 px-1 py-0.5 text-[9px] font-bold text-white">
            Seek
          </span>
        ) : null}
      </button>
      {open && hasEntries && coords
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label={accent.label}
              onMouseEnter={show}
              onMouseLeave={scheduleHide}
              onWheel={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: coords.width,
                maxHeight: coords.maxHeight,
                transform: coords.placeAbove ? "translateY(-100%)" : undefined,
                zIndex: 9999,
              }}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)]"
            >
              <div
                className={`flex shrink-0 items-center gap-1.5 border-b border-slate-100 px-3 py-2 ${accent.soft}`}
              >
                <CalendarDays className={`h-3.5 w-3.5 shrink-0 ${accent.icon}`} />
                <span className="text-[11px] font-semibold tracking-wide">
                  {accent.label}
                </span>
                {entries.length > 1 ? (
                  <span className="ml-auto rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-slate-600">
                    {entries.length}
                  </span>
                ) : null}
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                {entries.map((entry, index) => (
                  <li
                    key={`${entry.date}-${entry.amount}-${index}`}
                    className="flex items-center gap-2 px-3 py-1.5 text-[11px]"
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.bar}`} />
                    <span className="min-w-0 flex-1 font-medium tabular-nums text-slate-600">
                      {entry.date || "—"}
                    </span>
                    <span className={`shrink-0 font-semibold tabular-nums ${accent.value}`}>
                      {formatCurrency(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {entries.length > 1 ? (
                <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[10px]">
                  <span className="font-medium text-slate-500">Total</span>
                  <span className={`font-bold tabular-nums ${accent.value}`}>
                    {formatCurrency(amount)}
                  </span>
                </div>
              ) : null}
              {pinned ? (
                <p className="shrink-0 border-t border-slate-100 px-3 py-1.5 text-[9px] text-slate-400">
                  Click again to close
                </p>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

const PAYDAY_SUMMARY_PERIODS = [
  { key: "last_1_month", label: "Last 1 Month" },
  { key: "last_2_months", label: "Last 2 Months" },
  { key: "last_3_months", label: "Last 3 Months" },
];

const hasWarnPeriodData = (period) =>
  (period?.total ?? 0) > 0 || (period?.companies?.length ?? 0) > 0;

const hasWarnIndicatorData = (warnIndicator) => {
  const snap = warnIndicator?.warn_snap;
  if (!snap || typeof snap !== "object") return false;

  return Object.values(snap).some(hasWarnPeriodData);
};

const normalizeWarnIndicators = (warnIndicator) => {
  if (!warnIndicator) return [];
  const list = Array.isArray(warnIndicator) ? warnIndicator : [warnIndicator];
  return list.filter((item) => item && typeof item === "object" && hasWarnIndicatorData(item));
};

const getWarnIndicatorAlertCount = (warnIndicator) => {
  const snap = warnIndicator?.warn_snap;
  if (!snap || typeof snap !== "object") return 0;

  return Object.values(snap).reduce(
    (sum, period) => sum + (hasWarnPeriodData(period) ? period?.total ?? 0 : 0),
    0
  );
};

const getWarnListAlertCount = (warnIndicator) =>
  normalizeWarnIndicators(warnIndicator).reduce(
    (sum, item) => sum + getWarnIndicatorAlertCount(item),
    0
  );

const isWarnIndicatorActionable = (warnIndicator) => {
  const status = Number(warnIndicator?.status);
  return status !== 2 && status !== 3;
};

const WarnIndicatorStatusBadge = ({ status }) => {
  const normalizedStatus = Number(status);

  if (normalizedStatus === 2) {
    return (
      <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
        <Check className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold">Approved</span>
      </div>
    );
  }

  if (normalizedStatus === 3) {
    return (
      <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
        <X className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold">Insufficient Data Marked</span>
      </div>
    );
  }

  return null;
};

const PaydayCompanyChips = ({ companies, variant = "new" }) => {
  if (!companies?.length) {
    return <span className="text-[11px] italic text-slate-400">None</span>;
  }

  const chipClass =
    variant === "new"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200/60"
      : "bg-red-50 text-red-800 ring-red-200/60";

  return (
    <div className="flex flex-wrap gap-1">
      {companies.map((name) => (
        <span
          key={name}
          className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ${chipClass}`}
          title={name}
        >
          {name}
        </span>
      ))}
    </div>
  );
};

const PaydayPeriodCard = ({ label, newData, discData }) => (
  <div className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <p className="mb-2.5 border-b border-slate-100 pb-2 text-xs font-bold text-slate-700">{label}</p>
    <div className="space-y-2">
      <div className="rounded-lg border border-emerald-100/80 bg-emerald-50/30 p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-emerald-700">New Companies</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[11px] font-bold text-emerald-700">
            {newData?.total ?? 0}
          </span>
        </div>
        <PaydayCompanyChips companies={newData?.companies} variant="new" />
      </div>
      <div className="rounded-lg border border-red-100/80 bg-red-50/30 p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-red-700">Discontinued</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[11px] font-bold text-red-700">
            {discData?.total ?? 0}
          </span>
        </div>
        <PaydayCompanyChips companies={discData?.companies} variant="discontinued" />
      </div>
    </div>
  </div>
);

const WarnIndicatorPeriodCard = ({ label, periodData }) => {
  const total = periodData?.total ?? 0;
  const companies = periodData?.companies ?? [];

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-amber-200 bg-amber-50/40 p-3 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <p className="text-xs font-bold text-slate-700">{label}</p>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-800">
          {total}
        </span>
      </div>
      <div className="rounded-lg border border-amber-100/80 bg-white/80 p-2.5">
        <p className="mb-1.5 text-[11px] font-semibold text-amber-800">Companies</p>
        <PaydayCompanyChips companies={companies} variant="discontinued" />
      </div>
    </div>
  );
};

const WarnIndicatorItemSection = ({ warnIndicator, showDivider }) => {
  const snap = warnIndicator?.warn_snap ?? {};
  const activePeriods = PAYDAY_SUMMARY_PERIODS.filter(({ key }) => hasWarnPeriodData(snap[key]));

  if (!activePeriods.length) return null;

  return (
    <div className={showDivider ? "border-t border-slate-200 pt-4" : ""}>
      <WarnIndicatorStatusBadge status={warnIndicator?.status} />
      <div
        className={
          activePeriods.length === 1
            ? ""
            : `grid grid-cols-1 gap-3 ${
                activePeriods.length > 1 ? "sm:grid-cols-2" : ""
              } ${activePeriods.length > 2 ? "lg:grid-cols-3" : ""}`
        }
      >
        {activePeriods.map(({ key, label }) => (
          <WarnIndicatorPeriodCard key={key} label={label} periodData={snap[key]} />
        ))}
      </div>

      {warnIndicator?.created_at ? (
        <p className="mt-3 text-center text-[11px] text-slate-500">
          Last updated:{" "}
          {new Date(warnIndicator.updated_at || warnIndicator.created_at).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
};

const WarnIndicatorModal = ({ warnIndicators, onClose, onAction, isSubmitting, pendingAction }) => {
  useLockBodyScroll(true);

  const items = warnIndicators ?? [];
  const alertCount = items.reduce((sum, item) => sum + getWarnIndicatorAlertCount(item), 0);
  const maxActivePeriods = items.reduce((max, item) => {
    const snap = item?.warn_snap ?? {};
    const count = PAYDAY_SUMMARY_PERIODS.filter(({ key }) => hasWarnPeriodData(snap[key])).length;
    return Math.max(max, count);
  }, 0);
  const modalMaxWidth =
    items.length > 1
      ? "max-w-2xl"
      : maxActivePeriods <= 1
        ? "max-w-sm"
        : maxActivePeriods === 2
          ? "max-w-xl"
          : "max-w-3xl";
  const hasActionableIndicators = items.some(isWarnIndicatorActionable);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={isSubmitting ? undefined : onClose}
      role="presentation"
    >
      <div
        className={`flex max-h-[88vh] w-fit min-w-[min(100%,280px)] ${modalMaxWidth} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Warning indicator"
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3.5"
          style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 55%, #f59e0b 100%)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Warning Indicator</h2>
              <p className="text-[11px] text-amber-100/85">New payday company activity detected</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alertCount > 0 ? (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">
                {alertCount} alert{alertCount === 1 ? "" : "s"}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/80 hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close warning indicator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-3 sm:p-4 [scrollbar-width:thin]">
          <div className="space-y-4">
            {items.map((warnIndicator, index) => (
              <WarnIndicatorItemSection
                key={warnIndicator.id ?? index}
                warnIndicator={warnIndicator}
                showDivider={index > 0}
              />
            ))}
          </div>
        </div>

        {hasActionableIndicators ? (
          <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-white p-3 sm:px-4">
            <button
              type="button"
              onClick={() => onAction("insufficient_data")}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-amber-500 bg-white px-3 py-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && pendingAction === "insufficient_data" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Insufficient Data
            </button>
            <button
              type="button"
              onClick={() => onAction("approve")}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && pendingAction === "approve" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Approve
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const PaydayLoanSummary = ({ summary }) => {
  if (!summary) return null;

  const { new_payday_companies: newCompanies, discontinued_payday_companies: discontinued } =
    summary;
  const overallCount = summary.overall_unique_payday_companies_count;

  return (
    <div className="space-y-3 border-b border-slate-100 p-4">
      {overallCount != null ? (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT})` }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-white/80">Overall Unique Payday Companies</p>
            <p className="text-2xl font-bold leading-tight">{overallCount}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PAYDAY_SUMMARY_PERIODS.map(({ key, label }) => (
          <PaydayPeriodCard
            key={key}
            label={label}
            newData={newCompanies?.[key]}
            discData={discontinued?.[key]}
          />
        ))}
      </div>
    </div>
  );
};

const formatLogTimestamp = (dateString) => {
  if (!dateString) return { date: "—", time: "" };
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
};

const getLogStyle = (remarks) => {
  const text = (remarks || "").toLowerCase();
  if (/\b(failed|failure|error|rejected|invalid|denied)\b/.test(text)) {
    return {
      dot: "bg-red-500 ring-red-100",
      card: "border-l-red-500 bg-red-50/60",
      badge: "Failed",
      badgeClass: "bg-red-100 text-red-700",
    };
  }
  if (/\b(success|successfully|approved|completed)\b/.test(text)) {
    return {
      dot: "bg-emerald-500 ring-emerald-100",
      card: "border-l-emerald-500 bg-emerald-50/50",
      badge: "Success",
      badgeClass: "bg-emerald-100 text-emerald-700",
    };
  }
  return {
    dot: "bg-brand ring-brand-light",
    card: "border-l-blue-500 bg-white",
    badge: null,
    badgeClass: "",
  };
};

const LeadLogSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex animate-pulse gap-2">
        <div className="h-5 w-5 shrink-0 rounded-full bg-slate-200" />
        <div className="flex-1 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <div className="mb-1.5 h-3 w-28 rounded bg-slate-200" />
          <div className="h-3.5 w-full rounded bg-slate-200" />
        </div>
      </div>
    ))}
  </div>
);

const formatAddressSource = (source) => {
  if (source === "ON_GRID") return "Additional Address";
  if (!source) return "Address";
  return toSentenceCase(String(source).replace(/_/g, " "));
};

const getAddressTheme = (source) => {
  const key = String(source || "").toUpperCase();
  if (key === "ON_GRID") {
    return {
      badge: "bg-amber-100 text-amber-800 ring-amber-200/60",
      border: "border-l-amber-500",
      iconWrap: "bg-amber-50 text-amber-600",
    };
  }
  if (key.includes("OFFICE")) {
    return {
      badge: "bg-brand-light text-brand-link ring-brand/30",
      border: "border-l-blue-500",
      iconWrap: "bg-brand-light text-brand-link",
    };
  }
  if (key.includes("PERMANENT")) {
    return {
      badge: "bg-brand-light text-brand-link ring-brand/30",
      border: "border-l-blue-500",
      iconWrap: "bg-brand-light text-brand-link",
    };
  }
  if (key.includes("CURRENT") || key.includes("RESIDENCE") || key.includes("HOME")) {
    return {
      badge: "bg-emerald-100 text-emerald-800 ring-emerald-200/60",
      border: "border-l-emerald-500",
      iconWrap: "bg-emerald-50 text-emerald-600",
    };
  }
  return {
    badge: "bg-slate-100 text-slate-700 ring-slate-200/60",
    border: "border-l-slate-400",
    iconWrap: "bg-slate-50 text-slate-600",
  };
};

const AddressMetaItem = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <p className="break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
};

const AddressCard = ({ address, index }) => {
  const theme = getAddressTheme(address.address_source);
  const displayAddress = address.address?.trim();
  const metaItems = [
    { label: "City", value: address.city },
    { label: "State", value: address.state },
    { label: "Pincode", value: address.pincode },
    { label: "Country", value: address.country },
  ].filter((item) => item.value);

  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${theme.border} border-l-[3px]`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${theme.iconWrap}`}
        >
          <MapPin className="h-3.5 w-3.5" />
        </div>
        <span
          className={`min-w-0 flex-1 truncate rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ring-1 ${theme.badge}`}
          title={formatAddressSource(address.address_source)}
        >
          {formatAddressSource(address.address_source)}
        </span>
        <span className="shrink-0 text-xs font-semibold text-slate-400">#{index + 1}</span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {displayAddress ? (
          <p className="break-words text-sm leading-relaxed text-slate-700 md:line-clamp-4">
            {displayAddress}
          </p>
        ) : (
          <p className="text-sm italic text-slate-400">Address not available</p>
        )}

        {metaItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-2.5 sm:grid-cols-4">
            {metaItems.map((item) => (
              <AddressMetaItem key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
};

const ADDRESS_GRID_CLASS = "grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3";

const AddressSkeleton = () => (
  <div className={ADDRESS_GRID_CLASS}>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <div className="h-7 w-7 rounded-lg bg-slate-200" />
          <div className="h-4 flex-1 rounded-full bg-slate-200" />
        </div>
        <div className="space-y-2 p-3">
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-4/5 rounded bg-slate-100" />
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-8 rounded bg-slate-50" />
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AddressModal = ({ addresses, isLoading, onClose }) => {
  useLockBodyScroll(true);

  const addressList = Array.isArray(addresses) ? addresses : [];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[min(88dvh,100%)] max-h-[88dvh] w-full min-h-0 flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-6xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Addresses"
      >
        <div
          className="flex shrink-0 flex-col"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)` }}
        >
          <div className="flex justify-center py-2 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-white/30" aria-hidden="true" />
          </div>
          <div className="flex items-center justify-between gap-2 px-3 pb-2.5 sm:gap-3 sm:px-4 sm:py-3.5 sm:pb-3.5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 sm:h-9 sm:w-9">
              <MapPin className="h-4 w-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">Customer Addresses</h2>
              <p className="hidden text-xs text-white/75 sm:block">Verified location records</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!isLoading && addressList.length > 0 ? (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white sm:px-2.5">
                {addressList.length} locations
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              aria-label="Close addresses"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-50/80 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {isLoading ? (
            <AddressSkeleton />
          ) : addressList.length > 0 ? (
            <div className={ADDRESS_GRID_CLASS}>
              {addressList.map((address, index) => (
                <AddressCard key={address.id ?? index} address={address} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 ring-1 ring-amber-200/50">
                  <MapPin className="h-8 w-8 text-amber-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                  <span className="text-xs text-slate-400">?</span>
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-800">No addresses on file</h3>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">
                We couldn&apos;t find any registered addresses for this customer yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LoanCalculatorModal = ({
  onClose,
  customerName,
  pan,
  defaultLoanAmount,
  defaultPfPercent,
  defaultRoi,
  repaymentDate,
}) => {
  useLockBodyScroll(true);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[min(88dvh,100%)] max-h-[88dvh] w-full min-h-0 flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Loan Calculator"
      >
        <div
          className="flex shrink-0 flex-col"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)` }}
        >
          <div className="flex justify-center py-2 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-white/30" aria-hidden="true" />
          </div>
          <div className="flex items-center justify-between gap-2 px-3 pb-2.5 sm:gap-3 sm:px-4 sm:py-3.5 sm:pb-3.5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 sm:h-9 sm:w-9">
                <Calculator className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-white">Loan Calculator</h2>
                <p className="hidden text-xs text-white/75 sm:block">
                  Estimate fees, disbursal &amp; repayment
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              aria-label="Close calculator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-50/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          <LoanCalculator
            customerName={customerName}
            pan={pan}
            defaultLoanAmount={defaultLoanAmount}
            defaultPfPercent={defaultPfPercent}
            defaultRoi={defaultRoi}
            repaymentDate={repaymentDate}
          />
        </div>
      </div>
    </div>
  );
};

const isOtherDocumentType = (value) =>
  /^other(?:[\s_-]*bill)?$/i.test(String(value || "").trim());

const AskDocumentModal = ({ leadId, onClose }) => {
  useLockBodyScroll(true);

  const [selectedType, setSelectedType] = useState("");
  const [otherDocName, setOtherDocName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [requestedDocs, setRequestedDocs] = useState([]);
  const isOtherSelected = isOtherDocumentType(selectedType);

  const {
    data: documentOptions = [],
    isLoading: isLoadingOptions,
    isError: isOptionsError,
    error: optionsError,
    refetch: refetchOptions,
  } = useQuery({
    queryKey: ["additional-document-options"],
    queryFn: getAdditionalDocumentOptions,
    staleTime: 5 * 60 * 1000,
  });

  const availableOptions = useMemo(
    () =>
      documentOptions.filter((name) => {
        if (isOtherDocumentType(name)) return true;
        return !requestedDocs.some((doc) => doc.document_name === name);
      }),
    [documentOptions, requestedDocs]
  );

  const requestMutation = useMutation({
    mutationFn: () =>
      requestAdditionalDocuments(leadId, {
        documents: requestedDocs.map((doc) => ({
          document_name: doc.document_name,
          remarks: doc.remarks || "",
        })),
        force_reopen: false,
      }),
    onSuccess: () => {
      toast.success("Document request sent to customer");
      onClose();
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to request documents");
    },
  });

  const handleAddDocument = () => {
    if (!selectedType) {
      toast.error("Please select a document type");
      return;
    }
    const documentName = isOtherSelected ? otherDocName.trim() : selectedType;
    if (isOtherSelected && !documentName) {
      toast.error("Please enter the other document name");
      return;
    }
    if (requestedDocs.some((doc) => doc.document_name.toLowerCase() === documentName.toLowerCase())) {
      toast.error("This document is already added");
      return;
    }
    setRequestedDocs((prev) => [
      ...prev,
      { document_name: documentName, remarks: remarks.trim() },
    ]);
    setSelectedType("");
    setOtherDocName("");
    setRemarks("");
  };

  const handleRemoveDocument = (name) => {
    setRequestedDocs((prev) => prev.filter((doc) => doc.document_name !== name));
  };

  const handleSubmit = () => {
    if (!leadId) {
      toast.error("Lead ID not available");
      return;
    }
    if (requestedDocs.length === 0) {
      toast.error("Please add at least one document");
      return;
    }
    requestMutation.mutate();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[88dvh] w-full min-h-0 flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ask document from customer"
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 px-4 py-3.5"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)` }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <FilePlus2 className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">Ask Document from Customer</h2>
              <p className="text-xs text-white/75">Select documents the customer should upload</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            aria-label="Close ask document"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Document Type<span className="ml-0.5 text-red-500">*</span>
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setOtherDocName("");
              }}
              disabled={isLoadingOptions || requestMutation.isPending}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="" disabled>
                {isLoadingOptions ? "Loading document types..." : "Select Document Type"}
              </option>
              {availableOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {isOptionsError ? (
              <button
                type="button"
                onClick={() => refetchOptions()}
                className="mt-1 text-xs font-medium text-red-600 hover:underline"
              >
                {optionsError?.message || "Failed to load options"}. Retry
              </button>
            ) : null}
          </div>

          {isOtherSelected ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Other Document Name<span className="ml-0.5 text-red-500">*</span>
              </label>
              <input
                type="text"
                value={otherDocName}
                onChange={(e) => setOtherDocName(e.target.value)}
                placeholder="e.g. Rent Agreement"
                disabled={requestMutation.isPending}
                className="h-10 w-full rounded-lg border border-slate-300 px-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light disabled:bg-slate-50"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="e.g. Upload last 3 months slips"
              disabled={requestMutation.isPending}
              className="w-full resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light disabled:bg-slate-50"
            />
          </div>

          <button
            type="button"
            onClick={handleAddDocument}
            disabled={!selectedType || requestMutation.isPending}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand bg-white px-3 py-2 text-sm font-semibold text-brand-link hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Document
          </button>

          {requestedDocs.length > 0 ? (
            <ul className="space-y-2">
              {requestedDocs.map((doc) => (
                <li
                  key={doc.document_name}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{doc.document_name}</p>
                    {doc.remarks ? (
                      <p className="mt-0.5 text-xs text-slate-500">{doc.remarks}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc.document_name)}
                    className="mt-0.5 text-slate-400 hover:text-red-500"
                    aria-label={`Remove ${doc.document_name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-xs text-slate-500">No documents added yet</p>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={requestMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            {requestMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Document Request"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const KycCompareModal = ({
  profileImageUrl,
  aadhaarImageUrl,
  faceMatchScore,
  customerName,
  onClose,
}) => {
  useLockBodyScroll(true);
  const heading = customerName
    ? `${formatName(customerName)} — KYC Photos`
    : "KYC Photos";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="truncate pr-4 text-base font-semibold text-slate-800">
            {heading}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close KYC photos"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-4 overflow-auto bg-slate-50 p-4 sm:p-5">
          <FaceMatchBadge score={faceMatchScore} />
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <KycModalPhoto src={profileImageUrl} label="Profile" customerName={customerName} />
            <KycModalPhoto src={aadhaarImageUrl} label="Aadhaar" customerName={customerName} />
          </div>
        </div>
      </div>
    </div>
  );
};

const KycModalPhoto = ({ src, label, customerName }) => {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        {showImage ? (
          <button
            type="button"
            onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
            aria-label={`Open ${label} photo in new tab`}
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
        {showImage ? (
          <img
            src={src}
            alt={customerName ? `${label} photo of ${formatName(customerName)}` : `${label} photo`}
            onError={() => setFailed(true)}
            className="max-h-[60vh] max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
            <User className="h-10 w-10" />
            <span className="text-xs font-medium">No {label.toLowerCase()} photo</span>
          </div>
        )}
      </div>
    </div>
  );
};

const KycPhotoThumb = ({ src, score, onOpen, onError, hasError }) => {
  const showImage = Boolean(src) && !hasError;

  if (!showImage) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-sm"
        style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT})` }}
        aria-label="View profile and Aadhaar photos"
      >
        <User className="h-10 w-10 text-white/90" />
        <FaceMatchBadge score={score} overlay />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-100 shadow-sm ring-2 ring-white transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      aria-label="View profile and Aadhaar photos"
    >
      <img src={src} alt="" onError={onError} className="h-full w-full object-cover" />
      <FaceMatchBadge score={score} overlay />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
        <Eye className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </button>
  );
};

const FaceMatchBadge = ({ score, overlay = false }) => {
  const pct = toFaceMatchPercent(score);
  const display = formatFaceMatchScore(score);
  if (!display) return null;

  const tone =
    pct >= 70
      ? overlay
        ? "bg-emerald-600/90 text-white"
        : "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : pct >= 50
        ? overlay
          ? "bg-amber-500/90 text-white"
          : "bg-amber-50 text-amber-800 ring-amber-200"
        : overlay
          ? "bg-red-600/90 text-white"
          : "bg-red-50 text-red-700 ring-red-200";

  if (overlay) {
    return (
      <span
        className={`absolute inset-x-1 top-1 z-10 rounded-md px-1 py-0.5 text-center text-[10px] font-bold leading-tight shadow-sm ${tone}`}
      >
        {display}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${tone}`}>
      <ScanFace className="h-3 w-3" />
      Face Match {display}
    </span>
  );
};

const useLockBodyScroll = (locked) => {
  useEffect(() => {
    if (!locked) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [locked]);
};

const LeadLogsModal = ({ logs, isLoading, onClose }) => {
  useLockBodyScroll(true);

  const sortedLogs = useMemo(
    () =>
      Array.isArray(logs)
        ? [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : [],
    [logs]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[88vh] min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Lead Logs"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-3.5"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)` }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <ScrollText className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Lead Activity Logs</h2>
              <p className="text-[11px] text-white/75">Actions & remarks history</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && sortedLogs.length > 0 ? (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">
                {sortedLogs.length} entries
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              aria-label="Close lead logs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-50/60 px-3 py-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {isLoading ? (
            <LeadLogSkeleton />
          ) : sortedLogs.length > 0 ? (
            <ol className="relative">
              <span
                className="absolute bottom-2 left-[9px] top-2 w-px bg-slate-200"
                aria-hidden
              />
              {sortedLogs.map((log, index) => {
                const { date, time } = formatLogTimestamp(log.created_at);
                const style = getLogStyle(log.remarks);
                const num = sortedLogs.length - index;
                return (
                  <li key={log.id ?? index} className="relative flex gap-2 pb-3 last:pb-0">
                    <div
                      className={`relative z-10 flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-slate-50 ${style.dot}`}
                    >
                      {num}
                    </div>

                    <div
                      className={`min-w-0 flex-1 rounded-lg border border-slate-200/80 border-l-[3px] px-3 py-2.5 ${style.card}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        {style.badge ? (
                          <span
                            className={`rounded px-1.5 py-px text-[10px] font-semibold leading-tight ${style.badgeClass}`}
                          >
                            {style.badge}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {date}{time ? ` · ${time}` : ""}
                        </span>
                      </div>
                      <p className="break-words text-[13px] leading-snug text-slate-700">
                        {log.remarks?.trim() ? (
                          log.remarks
                        ) : (
                          <span className="italic text-slate-400">No remarks recorded</span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <ScrollText className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No activity yet</h3>
              <p className="mt-1 text-xs text-slate-500">No lead logs recorded for this customer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InlineUploadSection = ({
  leadId,
  onSuccess,
  onClose,
  leadStage,
  isPersonalDetailsFilled,
}) => {
  const [docType, setDocType] = useState("");
  const [docName, setDocName] = useState("");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isAddressProofChecked, setIsAddressProofChecked] = useState(true);
  const fileInputRef = useRef(null);
  const isOtherSelected = isOtherDocumentType(docType);
  const showAddressProofCheckbox = leadStage === "LOAN_REQUESTED";
  const addressProofCategory = isPersonalDetailsFilled ? "employment" : "personal";
  const addressProofLabel = isPersonalDetailsFilled
    ? "Employment Address Proof"
    : "Personal Address Proof";

  const {
    data: documentOptions = [],
    isLoading: isLoadingOptions,
    isError: isOptionsError,
    error: optionsError,
    refetch: refetchOptions,
  } = useQuery({
    queryKey: ["additional-document-options"],
    queryFn: getAdditionalDocumentOptions,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: upload, isPending } = useMutation({
    mutationFn: uploadAddtionalDocument,
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setDocType(""); setDocName(""); setFile(null);
      setIsAddressProofChecked(true);
      onSuccess?.();
    },
    onError: () => toast.error("Failed to upload document"),
  });

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(f.type)) { toast.error("Only jpg, jpeg, png, pdf allowed"); return; }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = () => {
    if (!docType) { toast.error("Please select a document type"); return; }
    const documentName = isOtherSelected ? docName.trim() : docType;
    if (isOtherSelected && !documentName) { toast.error("Please enter a document name"); return; }
    if (!file) { toast.error("Please select a file"); return; }
    if (showAddressProofCheckbox && !isAddressProofChecked) {
      toast.error(`Please confirm ${addressProofLabel.toLowerCase()}`);
      return;
    }
    upload({
      lead_id: leadId,
      file,
      file_type: documentName,
      documentType: documentName,
      ...(isOtherSelected && documentName ? { document_name: documentName } : {}),
      ...(showAddressProofCheckbox ? { category: addressProofCategory } : {}),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-brand-link" />
          <span className="text-sm font-bold text-slate-800">Upload Document</span>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close upload section"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Document Type */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Document Type<span className="ml-0.5 text-red-500">*</span>
        </label>
        <select
          value={docType}
          onChange={(e) => { setDocType(e.target.value); setDocName(""); }}
          disabled={isLoadingOptions || isPending}
          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          <option value="" disabled>
            {isLoadingOptions ? "Loading document types..." : "Select Document Type"}
          </option>
          {documentOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {isOptionsError ? (
          <button
            type="button"
            onClick={() => refetchOptions()}
            className="mt-1 text-xs font-medium text-red-600 hover:underline"
          >
            {optionsError?.message || "Failed to load options"}. Retry
          </button>
        ) : null}
      </div>

      {/* Other doc name */}
      {isOtherSelected && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Document Name<span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Rent Agreement"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
          />
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-4 transition-colors ${
          dragOver ? "border-yellow-400 bg-yellow-50"
          : file ? "border-emerald-400 bg-emerald-50"
          : "border-yellow-300 bg-amber-50/50 hover:bg-amber-50"
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <FolderOpen className={`h-5 w-5 ${file ? "text-emerald-600" : "text-amber-500"}`} />
        </div>
        {file ? (
          <p className="max-w-full truncate text-center text-xs font-medium text-emerald-700">{file.name}</p>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-700">Drag & drop or click to browse</p>
            <p className="text-[10px] text-slate-500">Supported: jpg, jpeg, png, pdf</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {showAddressProofCheckbox ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <input
            type="checkbox"
            checked={isAddressProofChecked}
            onChange={(e) => setIsAddressProofChecked(e.target.checked)}
            disabled={isPending}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-link focus:ring-brand"
          />
          <span className="text-sm font-medium text-slate-800">{addressProofLabel}</span>
        </label>
      ) : null}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
        style={{ backgroundColor: NAVY }}
      >
        <Upload className="h-4 w-4" />
        {isPending ? "Uploading…" : "Upload Document"}
      </button>
    </div>
  );
};

const ScrollableDocumentsList = ({ children }) => {
  const listRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const updateScrollHint = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 1;
    const notAtBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
    const shouldShowHint = hasOverflow && notAtBottom;
    setShowScrollHint(shouldShowHint);
  }, []);

  useEffect(() => {
    updateScrollHint();
    window.addEventListener("resize", updateScrollHint);
    return () => window.removeEventListener("resize", updateScrollHint);
  }, [children, updateScrollHint]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

      if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
        e.preventDefault();
        window.scrollBy({ top: e.deltaY, left: e.deltaX });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [children]);

  return (
    <div className="relative">
      <ul
        ref={listRef}
        onScroll={updateScrollHint}
        className="max-h-60 overflow-y-auto scroll-smooth [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300"
      >
        {children}
      </ul>
      {showScrollHint ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-white from-50% via-white/90 to-transparent pb-0.5 pt-6"
          aria-hidden
        >
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
            <ChevronDown className="h-3 w-3" />
            More
          </span>
        </div>
      ) : null}
    </div>
  );
};

const EMPTY_SALARY_INCOME = [
  { amount: "", date: "" },
  { amount: "", date: "" },
  { amount: "", date: "" },
];

const SummaryDataPage = () => {
  const { pan } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const selectedRole = useSelector((state) => state.user.selectedRole);
  const leadId = searchParams.get("leadId");
  const auditIdParam = searchParams.get("auditId");
  const [failedImages, setFailedImages] = useState({});
  const [showKycPhotosModal, setShowKycPhotosModal] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [showLeadLogs, setShowLeadLogs] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showAskDocumentModal, setShowAskDocumentModal] = useState(false);
  const [showWarnIndicatorModal, setShowWarnIndicatorModal] = useState(false);
  const [pendingWarnAction, setPendingWarnAction] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [rejectingLead, setRejectingLead] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdRemarks, setHoldRemarks] = useState("");
  const [showManualKycApproveModal, setShowManualKycApproveModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalModalType, setApprovalModalType] = useState("bre-rejected");
  const [approvingLead, setApprovingLead] = useState(null);
  const [calculatedLoanAmount, setCalculatedLoanAmount] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [branchName, setBranchName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [salaryDate, setSalaryDate] = useState(undefined);
  const [showSalaryRejection, setShowSalaryRejection] = useState(false);
  const [salaryRejectionMessage, setSalaryRejectionMessage] = useState("");
  const [salaryIncome, setSalaryIncome] = useState(EMPTY_SALARY_INCOME);
  const [salaryTransactions, setSalaryTransactions] = useState([]);
  const [selectedSalaryTransactions, setSelectedSalaryTransactions] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [salaryConflictLogs, setSalaryConflictLogs] = useState([]);
  const [showBankingLinkOptions, setShowBankingLinkOptions] = useState(false);
  const [pendingBankOpt, setPendingBankOpt] = useState(null);
  const [showNotInterestedConfirm, setShowNotInterestedConfirm] = useState(false);
  const [showInterestedConfirm, setShowInterestedConfirm] = useState(false);
  const [pendingNcRemark, setPendingNcRemark] = useState("");
  const [extraNcRemark, setExtraNcRemark] = useState("");
  const [isMarkedNotInterested, setIsMarkedNotInterested] = useState(false);
  const [isMarkedInterested, setIsMarkedInterested] = useState(false);
  const queryClient = useQueryClient();
  const [documentPreview, setDocumentPreview] = useState({
    isOpen: false,
    url: null,
    name: "",
    fileType: null,
    loading: false,
    docId: null,
  });

  const closeDocumentPreview = () => {
    setDocumentPreview({
      isOpen: false,
      url: null,
      name: "",
      fileType: null,
      loading: false,
      docId: null,
    });
  };

  const handleBackToAssignedLeads = useCallback(() => {
    const basePath =
      location.pathname.split("/summary-data")[0] ||
      "/sales-ops/allocated-marketing";
    const returnState = location.state?.returnState;

    // Pop summary so the leads page back button returns to dashboard, not summary again.
    if (returnState || (window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }

    navigate(basePath, { state: returnState });
  }, [location.pathname, location.state, navigate]);

  const handleViewReloanLeadSummary = useCallback(
    (loan) => {
      const targetLeadId = loan?.lead_id;
      if (!targetLeadId) {
        toast.error("Lead ID not available");
        return;
      }

      const basePath = location.pathname.split("/summary-data")[0] || "";
      navigate(`${basePath}/summary-data/${targetLeadId}?leadId=${targetLeadId}`);
    },
    [location.pathname, navigate]
  );

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const { data: apiData, isPending, isError, error } = useQuery({
    queryKey: ["lead-summary-data", leadId],
    queryFn: async () => {
      try {
        return await getLeadSummaryData(leadId);
        // return { ...DUMMY_SUMMARY_DATA, _isDummy: true };
      } catch (err) {
        if (err?.status === 404) return { ...DUMMY_SUMMARY_DATA, _isDummy: true };
        throw err;
      }
    },
    enabled: Boolean(leadId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!leadId || isPending || isError || isSummaryTourSeen()) return undefined;
    const timer = window.setTimeout(() => {
      if (document.querySelector("[data-tour='lead-tabs']")) return;
      if (document.querySelector("[data-tour-active='role']")) return;
      requestSummaryTour();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [leadId, isPending, isError]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent(LEAD_TOUR_DISMISS_EVENT));
    };
  }, []);

  const { data: documentsData, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["documents-data", leadId],
    queryFn: () => getDocumentById(leadId),
    enabled: Boolean(leadId),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: leadLogs, isLoading: isLoadingLeadLogs } = useQuery({
    queryKey: ["lead-logs", leadId],
    queryFn: () => getLeadLogsById(leadId),
    enabled: showLeadLogs && Boolean(leadId),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: addressData, isLoading: isLoadingAddress } = useQuery({
    queryKey: ["address-data", leadId],
    queryFn: () => getAddressById(leadId),
    enabled: showAddressModal && Boolean(leadId),
    staleTime: 0,
    gcTime: 0,
  });

  const handleViewDocument = async (doc) => {
    const documentUrl = doc?.document_url;
    if (!documentUrl) return;

    const name = getDocumentLabel(doc);
    const docId = doc?.id ?? doc?.docs_id ?? doc?.docs_id ?? null;
    setDocumentPreview({ isOpen: true, url: null, name, fileType: null, loading: true, docId });

    try {
      const response = await getDocumentByLink(documentUrl);
      if (response?.downloadUrl) {
        const fileType =
          getDocumentFileType(response.downloadUrl) || getDocumentFileType(documentUrl);
        setDocumentPreview({
          isOpen: true,
          url: response.downloadUrl,
          name,
          fileType,
          loading: false,
          docId,
        });
      } else {
        toast.error("Failed to get document link");
        closeDocumentPreview();
      }
    } catch {
      toast.error("Failed to fetch document");
      closeDocumentPreview();
    }
  };

  const data = apiData;
  const isDummy = Boolean(data?._isDummy);
  const staticData = data?.static_data;
  const profileImageUrl = data?.profile_image || data?.profileImage;
  const aadhaarImageUrl = data?.aadhaar_image || data?.aadhaarImage;
  const faceMatchScore = data?.face_match_score ?? data?.faceMatchScore;

  useEffect(() => {
    setFailedImages({});
    setShowKycPhotosModal(false);
  }, [leadId]);

  const resolvedAuditId = useMemo(() => {
    const fromSummary = resolveAuditId(data);
    if (fromSummary != null) return fromSummary;
    if (auditIdParam) return auditIdParam;
    return resolveAuditId(location.state?.lead) ?? location.state?.auditId ?? null;
  }, [data, auditIdParam, location.state]);

  const leadRow = useMemo(() => {
    const id = data?.lead_id ?? leadId;
    if (!id) return null;
    return {
      ...data,
      id: Number(id) || id,
      lead_id: data?.lead_id ?? leadId,
      full_name: data?.cust_name ?? data?.full_name,
      pan: data?.pan ?? pan,
      audit_id: resolvedAuditId,
    };
  }, [data, leadId, pan, resolvedAuditId]);

  const isFromSearchResult = location.pathname.includes("/search-result");
  const isFromCreditHeadAssignedAuditLeads = location.pathname.includes(
    "/credit-head/assigned-audit-leads/summary-data"
  );

  const isAssignedToCurrentEmployee = useMemo(
    () => isLeadAssignedToEmployee(profileData, data),
    [profileData, data]
  );

  const canShowAssignedLeadActions = useMemo(() => {
    if (!isFromSearchResult) return true;
    return isAssignedToCurrentEmployee;
  }, [isFromSearchResult, isAssignedToCurrentEmployee]);

  const hideCreditHeadAuditApprove = useMemo(
    () => shouldHideCreditHeadAuditActions(data, profileData),
    [data, profileData]
  );

  const showCreditHeadAuditApprove = useMemo(
    () =>
      isFromCreditHeadAssignedAuditLeads &&
      isAdminOrCreditHeadUser(profileData) &&
      shouldShowCreditHeadAuditApprove(data),
    [isFromCreditHeadAssignedAuditLeads, profileData, data]
  );

  const showSearchResultAllocatedAuditApprove = useMemo(
    () =>
      isFromSearchResult &&
      shouldShowSearchResultAllocatedAuditApprove(data, profileData),
    [isFromSearchResult, data, profileData]
  );

  const showSearchResultCreditHeadAuditApprove = useMemo(
    () =>
      isFromSearchResult &&
      shouldShowSearchResultCreditHeadAuditApprove(data, profileData),
    [isFromSearchResult, data, profileData]
  );

  const showSearchResultManualKycApprove = useMemo(
    () =>
      isFromSearchResult &&
      data?.lead_stage === "REJECT_AADHAR_KYC" &&
      isAssignedToCurrentEmployee,
    [isFromSearchResult, data?.lead_stage, isAssignedToCurrentEmployee]
  );

  const showSearchResultBreRejectApprove = useMemo(
    () =>
      isFromSearchResult &&
      data?.lead_stage === "BRE_REJECT" &&
      data?.is_bre_reject === true &&
      isAssignedToCurrentEmployee,
    [isFromSearchResult, data?.lead_stage, data?.is_bre_reject, isAssignedToCurrentEmployee]
  );

  const creditHeadAuditHideBlocksApprove = useMemo(
    () => hideCreditHeadAuditApprove && isAuditLeadApproveStage(data),
    [hideCreditHeadAuditApprove, data]
  );

  const showApproveButton = useMemo(() => {
    if (isFromSearchResult && data?.lead_stage === "AUDIT_APPROVED_CREDIT_HEAD") {
      console.log("AUDIT_APPROVED_CREDIT_HEAD");
      return false;
    }

    if (
      showCreditHeadAuditApprove ||
      showSearchResultAllocatedAuditApprove ||
      showSearchResultCreditHeadAuditApprove ||
      showSearchResultManualKycApprove ||
      showSearchResultBreRejectApprove
    ) {
      return true;
    }

    return (
      shouldShowLeadApproveButton(data) &&
      canShowAssignedLeadActions &&
      !creditHeadAuditHideBlocksApprove &&
      !isFromSearchResult
    );
  }, [
    showCreditHeadAuditApprove,
    showSearchResultAllocatedAuditApprove,
    showSearchResultCreditHeadAuditApprove,
    showSearchResultManualKycApprove,
    showSearchResultBreRejectApprove,
    data,
    canShowAssignedLeadActions,
    creditHeadAuditHideBlocksApprove,
    isFromSearchResult,
  ]);
  const isCreditHeadApprovalModal = approvalModalType === "credit-head";
  const isAllocatedApprovalModal = approvalModalType === "allocated-audit";
  const isBreRejectApproveCase =
    data?.lead_stage === "BRE_REJECT" && data?.is_bre_reject === true;
  const isKycRejectApproveCase =
    data?.lead_stage === "REJECT_AADHAR_KYC" && data?.is_kyc_reject === true;
  const isAllocatedAuditApproveCase = ALLOCATED_AUDIT_APPROVE_STAGES.has(data?.lead_stage);
  const isNCandNRNeeded = !location.pathname.includes("/completed/");
  const hideRejectHoldButtons = REJECT_HOLD_HIDDEN_STAGES.has(data?.lead_stage);
  const showBankingLinkButton = !BANKING_LINK_HIDDEN_STAGES.has(data?.lead_stage);
  const showAskDocumentButton = ASK_DOCUMENT_STAGES.has(data?.lead_stage);
  const visiblePrimaryActionButtons = useMemo(
    () =>
      showBankingLinkButton
        ? PRIMARY_ACTION_BUTTONS
        : PRIMARY_ACTION_BUTTONS.filter((btn) => btn.label !== "Send Banking Link"),
    [showBankingLinkButton]
  );
  const isEffectivelyHold =
    (data?.is_hold || isMarkedNotInterested) && !isMarkedInterested;
  const currentLeadId = data?.lead_id ?? leadId;

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }) => rejectLeadById(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screener-marketing-allocated-lead"] });
      queryClient.invalidateQueries({ queryKey: ["lead-summary-data", leadId] });
      toast.success("Lead rejected successfully");
      setShowRejectionModal(false);
      setSelectedReason("");
      setCustomReason("");
      setRejectionNotes("");
      setRejectingLead(null);
      setRejectLoading(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to reject lead");
      setRejectLoading(false);
    },
  });

  const validateDocumentMutation = useMutation({
    mutationFn: validateDocs,
    onSuccess: (_, variables) => {
      toast.success(variables.is_validated ? "Document approved" : "Document rejected");
      queryClient.invalidateQueries({ queryKey: ["documents-data", leadId] });
      closeDocumentPreview();
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to validate document");
    },
  });

  const handleValidateDocument = (is_validated) => {
    const docs_id = documentPreview.docId;
    const currentLeadId = apiData?.lead_id ?? leadId;

    if (!docs_id) {
      toast.error("Document ID not available");
      return;
    }
    if (!currentLeadId) {
      toast.error("Lead ID not available");
      return;
    }

    validateDocumentMutation.mutate({
      lead_id: Number(currentLeadId) || currentLeadId,
      docs_id,
      is_validated,
    });
  };

  const handleReject = () => {
    if (!leadRow) {
      toast.error("Lead details not available");
      return;
    }
    setRejectingLead(leadRow);
    setSelectedReason("");
    setCustomReason("");
    setRejectionNotes("");
    setShowRejectionModal(true);
  };

  const resetApprovalForm = useCallback(() => {
    setCalculatedLoanAmount("");
    setMonthlyIncome("");
    setApprovalRemarks("");
    setBranchName("");
    setBankAccountNo("");
    setIfscCode("");
    setSalaryDate(undefined);
    setShowSalaryRejection(false);
    setSalaryRejectionMessage("");
    setSalaryIncome(EMPTY_SALARY_INCOME);
    setSalaryTransactions([]);
    setSelectedSalaryTransactions([]);
    setApprovalModalType("bre-rejected");
  }, []);

  const { mutate: mutateApproveBreRejectedLead } = useMutation({
    mutationKey: ["approve-bre-rejected-lead"],
    mutationFn: approveBreRejectedLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bre-rejected-allocated-leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-summary-data", leadId] });
      toast.success("Lead approved successfully");
      resetApprovalForm();
      setShowApprovalModal(false);
      setApprovingLead(null);
      setApprovalLoading(false);
      handleBackToAssignedLeads();
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to approve lead. Please try again.";
      toast.error(errorMessage);
      setApprovalLoading(false);

      if (Number(error.sal_rejection_code) === 123) {
        setShowSalaryRejection(true);
        setSalaryRejectionMessage(errorMessage);
        setShowApprovalModal(true);
      }
    },
  });

  const { mutate: mutateGetSalary, isPending: isGettingSalary } = useMutation({
    mutationKey: ["get-salary-manual-approve"],
    mutationFn: getSalaryManualApprove,
    onSuccess: (salaryData) => {
      const transactions = Array.isArray(salaryData?.data) ? salaryData.data : [];
      setSalaryTransactions(transactions);
      setSelectedSalaryTransactions([]);
      toast.success(
        transactions.length > 0
          ? `Found ${transactions.length} salary transaction(s)`
          : salaryData?.message || "Salary fetched successfully"
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to get salary");
    },
  });

  const handleGetSalary = () => {
    if (!approvingLead?.id) {
      toast.error("Invalid lead selected");
      return;
    }
    if (!salaryIncome[0]?.amount) {
      toast.error("Please enter salary amount");
      return;
    }
    if (!salaryIncome[0]?.date) {
      toast.error("Please enter salary date");
      return;
    }

    for (let i = 1; i < salaryIncome.length; i++) {
      const entry = salaryIncome[i];
      const hasAmount = Boolean(entry?.amount);
      const hasDate = Boolean(entry?.date);
      if (hasAmount !== hasDate) {
        toast.error(`Please fill both amount and date for salary entry ${i + 1}`);
        return;
      }
    }

    const income = salaryIncome
      .filter((entry) => entry.amount && entry.date)
      .map((entry) => ({
        amount: Number(entry.amount),
        date: entry.date,
      }));

    mutateGetSalary({
      lead_id: approvingLead.id,
      income,
    });
    setSalaryTransactions([]);
    setSelectedSalaryTransactions([]);
  };

  const toggleSalaryTransaction = (txn) => {
    const transaction_id = String(txn.id);
    const bank_statement_report_id = txn.bank_statement_report_id;

    setSelectedSalaryTransactions((prev) => {
      const isSelected = prev.some(
        (item) =>
          item.transaction_id === transaction_id &&
          item.bank_statement_report_id === bank_statement_report_id
      );

      if (isSelected) {
        return prev.filter(
          (item) =>
            !(
              item.transaction_id === transaction_id &&
              item.bank_statement_report_id === bank_statement_report_id
            )
        );
      }

      return [...prev, { bank_statement_report_id, transaction_id }];
    });
  };

  const isSalaryTransactionSelected = (txn) =>
    selectedSalaryTransactions.some(
      (item) =>
        item.transaction_id === String(txn.id) &&
        item.bank_statement_report_id === txn.bank_statement_report_id
    );

  const { mutate: mutateSetSalaryTransactions, isPending: isSubmittingSalaryTransactions } =
    useMutation({
      mutationKey: ["set-salary-transaction-by-id"],
      mutationFn: setSalaryTransactionById,
      onSuccess: (salaryTxnData) => {
        toast.success(salaryTxnData?.message || "Salary transactions submitted successfully");
        setSelectedSalaryTransactions([]);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to submit salary transactions");
      },
    });

  const handleSubmitSalaryTransactions = () => {
    if (!approvingLead?.id) {
      toast.error("Invalid lead selected");
      return;
    }
    if (selectedSalaryTransactions.length === 0) {
      toast.error("Please add at least one transaction");
      return;
    }

    mutateSetSalaryTransactions({
      lead_id: approvingLead.id,
      transactions: selectedSalaryTransactions,
    });
  };

  const submitApproval = () => {
    if (!approvingLead?.id) {
      toast.error("Invalid lead selected");
      return;
    }
    if (!calculatedLoanAmount) {
      toast.error("Please enter the calculated loan amount");
      return;
    }

    setApprovalLoading(true);
    mutateApproveBreRejectedLead({
      id: approvingLead.id,
      calculated_loan_amount: calculatedLoanAmount,
      monthly_income: monthlyIncome ? Number(monthlyIncome) : undefined,
      branch_name: branchName,
      bank_acc_no: bankAccountNo,
      ifsc_code: ifscCode,
      salary_date: salaryDate,
      remarks: approvalRemarks,
    });
  };

  const handleCreditHeadAuditApprove = async () => {
    if (!leadRow) {
      toast.error("Lead details not available");
      return;
    }

    try {
      const salaryConflictResponse = await getSalaryDateConflict(leadRow?.id);
      setSalaryConflictLogs(salaryConflictResponse?.data || []);
    } catch (err) {
      toast.error(err.message || "Failed to check salary date conflict");
      return;
    }

    resetApprovalForm();
    setApprovalModalType("credit-head");
    setApprovingLead(leadRow);
    setShowApprovalModal(true);
  };

  const handleLeadApprove = () => {
    if (!leadRow) {
      toast.error("Lead details not available");
      return;
    }

    if (showCreditHeadAuditApprove || showSearchResultCreditHeadAuditApprove) {
      void handleCreditHeadAuditApprove();
      return;
    }

    if (showSearchResultAllocatedAuditApprove || isAllocatedAuditApproveCase) {
      if (!resolveAuditId(leadRow)) {
        toast.error("Audit ID not available for this lead");
        return;
      }
      resetApprovalForm();
      setApprovalModalType("allocated-audit");
      setApprovingLead(leadRow);
      setShowApprovalModal(true);
      return;
    }

    if (showSearchResultBreRejectApprove || isBreRejectApproveCase) {
      resetApprovalForm();
      setApprovingLead(leadRow);
      setShowApprovalModal(true);
      return;
    }

    if (showSearchResultManualKycApprove) {
      setApprovingLead(leadRow);
      setShowManualKycApproveModal(true);
      return;
    }

    if (isKycRejectApproveCase) {
      setApprovingLead(leadRow);
      setShowManualKycApproveModal(true);
      return;
    }

    toast.error("Approve action is not available for this lead stage");
  };

  const handleApprovalModalOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowApprovalModal(false);
      setApprovingLead(null);
      setSalaryConflictLogs([]);
      resetApprovalForm();
    }
  };

  const handleCreditHeadActionComplete = useCallback(() => {
    setApprovalRemarks("");
    setSalaryConflictLogs([]);
    queryClient.invalidateQueries({ queryKey: ["assigned-credit-head-audit-leads"] });
    queryClient.invalidateQueries({ queryKey: ["lead-summary-data", leadId] });
  }, [leadId, queryClient]);

  const handleManualKycModalOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowManualKycApproveModal(false);
      setApprovingLead(null);
    }
  };

  const submitRejection = () => {
    const finalReason =
      selectedReason === "Other" ? customReason.trim() : selectedReason;

    if (!finalReason) {
      toast.error("Please provide a rejection reason");
      return;
    }

    if (!rejectingLead?.id) {
      toast.error("No lead selected for rejection");
      return;
    }

    setRejectLoading(true);
    const remarks = `${finalReason}${rejectionNotes ? ` - ${rejectionNotes}` : ""}`;
    rejectMutation.mutate({ id: rejectingLead.id, remarks });
  };

  const handleRejectionModalOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowRejectionModal(false);
      setRejectingLead(null);
      setSelectedReason("");
      setRejectionNotes("");
      setCustomReason("");
    }
  };

  const holdMutation = useMutation({
    mutationFn: ({ panNumber, reason }) => actionPan(panNumber, "hold", reason),
    onSuccess: (response) => {
      if (response?.success) {
        toast.success(response.message || "Lead held successfully");
        queryClient.invalidateQueries({ queryKey: ["screener-marketing-allocated-lead"] });
        queryClient.invalidateQueries({ queryKey: ["lead-summary-data", leadId] });
        setShowHoldModal(false);
        setHoldRemarks("");
      } else {
        toast.error(response?.message || "Failed to hold lead");
      }
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to hold lead"
      );
    },
  });

  const { mutate: holdLeadWithRemark, isPending: isNcHolding } = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["screener-marketing-allocated-lead"] });
      queryClient.invalidateQueries({ queryKey: ["lead-summary-data", leadId] });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update lead");
      setIsMarkedNotInterested(false);
    },
  });

  const handleConfirmNotInterested = () => {
    if (!currentLeadId) {
      toast.error("Lead ID not available");
      return;
    }

    setIsMarkedNotInterested(true);
    setIsMarkedInterested(false);

    const finalRemark = extraNcRemark?.trim()
      ? `${pendingNcRemark} - ${extraNcRemark.trim()}`
      : pendingNcRemark;

    holdLeadWithRemark({
      id: Number(currentLeadId) || currentLeadId,
      remarks: finalRemark,
      category: "hold",
    });
  };

  const handleHold = () => {
    const panNumber = (data?.pan ?? pan)?.trim();
    if (!panNumber) {
      toast.error("PAN not available");
      return;
    }
    setHoldRemarks("");
    setShowHoldModal(true);
  };

  const submitHold = () => {
    const panNumber = (data?.pan ?? pan)?.trim();
    const reason = holdRemarks.trim();
    if (!panNumber) {
      toast.error("PAN not available");
      return;
    }
    if (!reason) {
      toast.error("Please provide a remark");
      return;
    }
    holdMutation.mutate({ panNumber, reason });
  };

  const bankingLinkMutation = useMutation({
    mutationFn: ({ lead_id, bank_opt }) => generateBankingUrl({ lead_id, bank_opt }),
    onMutate: ({ bank_opt }) => {
      setPendingBankOpt(bank_opt);
    },
    onSuccess: (response) => {
      if (response?.isSuccess === false || response?.result?.success === false) {
        toast.error(response?.message || "Failed to send banking link");
        return;
      }

      showBankingUrlToast(getBankingUrlFromResponse(response));
      setShowBankingLinkOptions(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to send banking link");
    },
    onSettled: () => {
      setPendingBankOpt(null);
    },
  });

  const warnIndicatorActionMutation = useMutation({
    mutationFn: ({ id, action }) => submitWarnIndicatorAction(id, action),
    onMutate: ({ action }) => {
      setPendingWarnAction(action);
    },
    onSuccess: (_, { action }) => {
      toast.success(
        action === "approve"
          ? "Warning indicator approved"
          : "Marked as insufficient data"
      );
      setShowWarnIndicatorModal(false);
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update warning indicator");
    },
    onSettled: () => {
      setPendingWarnAction(null);
    },
  });

  const handleWarnIndicatorAction = (action) => {
    const activeIndicators = normalizeWarnIndicators(data?.warn_indicator);
    const actionableIndicator = activeIndicators.find(isWarnIndicatorActionable);
    const warnIndicatorId = actionableIndicator?.id;
    if (!warnIndicatorId) {
      toast.error("Warning indicator ID not available");
      return;
    }

    warnIndicatorActionMutation.mutate({
      id: warnIndicatorId,
      action,
    });
  };

  const handleSendBankingLink = (bank_opt) => {
    const currentLeadId = data?.lead_id ?? leadId;
    if (!currentLeadId) {
      toast.error("Lead ID not available");
      return;
    }

    bankingLinkMutation.mutate({
      lead_id: Number(currentLeadId) || currentLeadId,
      bank_opt,
    });
  };

  const handleOpenCompleteDetails = () => {
    if (!leadRow) {
      toast.error("Lead details not available");
      return;
    }
    dispatch(
      openDetailModal({
        row: leadRow,
        showReject: canShowAssignedLeadActions,
        showApprove: showApproveButton,
        onReject: rejectMutation,
        role: "Credit-Analyst",
      })
    );
  };

  const paydayLoans = useMemo(() => {
    const raw = staticData?.payday_loans_data?.payday_data;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item) => item && typeof item === "object");
  }, [staticData?.payday_loans_data?.payday_data]);

  const paydaySummary = useMemo(() => {
    const summary = staticData?.payday_loans_data?.summary;
    if (!summary || typeof summary !== "object") return null;
    return summary;
  }, [staticData?.payday_loans_data?.summary]);

  const paydayMatrix = useMemo(() => buildPaydayMatrix(paydayLoans), [paydayLoans]);

  const activeWarnIndicators = useMemo(
    () => normalizeWarnIndicators(data?.warn_indicator),
    [data?.warn_indicator]
  );
  const hasWarnData = activeWarnIndicators.length > 0;
  const warnAlertCount = useMemo(
    () => getWarnListAlertCount(data?.warn_indicator),
    [data?.warn_indicator]
  );

  const metricCards = useMemo(
    () => [
      {
        cardId: "cibil",
        label: "Cibil Score",
        value: staticData?.static_data?.credit_data?.credit_score,
        collectionPct: staticData?.static_data?.credit_data?.credit_score_collection_percentage,
        cases: staticData?.static_data?.credit_data?.credit_score_cases_count,
        ...METRIC_THEMES.cibil,
      },
      {
        cardId: "pincode",
        label: "Pincode",
        value: staticData?.static_data?.pincode?.pincode_value,
        collectionPct: staticData?.static_data?.pincode?.pincode_collection_percentage,
        cases: staticData?.static_data?.pincode?.pincode_cases_count,
        ...METRIC_THEMES.pincode,
      },
      {
        cardId: "city",
        label: "City",
        value: staticData?.static_data?.city?.city_name,
        collectionPct: staticData?.static_data?.city?.city_collection_percentage,
        cases: staticData?.static_data?.city?.city_cases_count,
        ...METRIC_THEMES.city,
      },
      {
        cardId: "domain",
        label: "Company Domain",
        value: staticData?.static_data?.company_domain_data?.company_domain_name,
        collectionPct:
          staticData?.static_data?.company_domain_data?.company_domain_name_collection_percentage,
        cases: staticData?.static_data?.company_domain_data?.company_domain_cases_count,
        ...METRIC_THEMES.domain,
      },
      {
        cardId: "payday",
        label: "Payday Count",
        value: staticData?.static_data?.payday_count?.payday_count_number,
        collectionPct: staticData?.static_data?.payday_count?.payday_count_collection_percentage,
        cases: staticData?.static_data?.payday_count?.payday_cases_count,
        ...METRIC_THEMES.payday,
      },
      {
        cardId: "inquiry",
        label: "Inquiry Past 30 Days",
        value: staticData?.static_data?.inquiry_data?.past30days?.inquiry_count_number,
        collectionPct:
          staticData?.static_data?.inquiry_data?.past30days?.inquiry_count_collection_percentage,
        cases: staticData?.static_data?.inquiry_data?.past30days?.inquiry_cases_count,
        ...METRIC_THEMES.inquiry,
      },
    ],
    [staticData]
  );

  if (!leadId) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-amber-800">Missing lead ID.</p>
        <button
          type="button"
          onClick={handleBackToAssignedLeads}
          className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: NAVY }}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-[89vh] items-center justify-center" style={{ backgroundColor: PAGE_BG }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" style={{ color: NAVY_LIGHT }} />
          <p className="text-sm font-medium text-slate-600">Loading lead summary…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[89vh] items-center justify-center p-6" style={{ backgroundColor: PAGE_BG }}>
        <div className={`${CARD_CLASS} max-w-md p-6 text-center`}>
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-3 text-sm font-medium text-slate-800">Unable to load summary</p>
          <p className="mt-1 text-sm text-slate-500">{error?.message || "Failed to load."}</p>
        </div>
      </div>
    );
  }

  const stageLabel = leadStageMapping[data?.lead_stage] || data?.lead_stage || "N/A";
  const stageMeaning = getLeadStageMeaning(data?.lead_stage);
  const locationSuspiciousValue =
    data?.location_suspicious ??
    data?.["location-suspicious"] ??
    location.state?.lead?.location_suspicious ??
    location.state?.lead?.["location-suspicious"];
  const isLocationSuspicious =
    location.pathname.toLowerCase().includes("/location-suspicious-leads") ||
    locationSuspiciousValue === true ||
    locationSuspiciousValue === 1 ||
    String(locationSuspiciousValue ?? "").toLowerCase() === "true";
  const isQualityCheckerView =
    String(selectedRole || "").toLowerCase() === "quality-checker" ||
    location.pathname.toLowerCase().includes("/quality-checker");
  const locationNameClass =
    isLocationSuspicious && !isQualityCheckerView
      ? "text-orange-600 line-through decoration-orange-600"
      : "";
  const locationBadgeClass = isQualityCheckerView
    ? "shrink-0 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-orange-200"
    : "shrink-0 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-600 line-through decoration-orange-600 ring-1 ring-orange-200";

  return (
    <div className="min-h-[89vh]" style={{ backgroundColor: PAGE_BG }}>
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <nav className="flex min-w-0 items-center gap-2 text-sm">
            <button
              type="button"
              onClick={handleBackToAssignedLeads}
              className="font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              Leads
            </button>
            <span className="text-slate-300">/</span>
            <span className={`truncate font-semibold text-slate-900 ${locationNameClass}`}>
              {formatName(data?.cust_name)}
            </span>
            {isLocationSuspicious ? (
              <span className={locationBadgeClass}>Location suspicious</span>
            ) : null}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => requestSummaryTour()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              aria-label="Take a summary tour"
              title="Summary tour"
            >
              <Compass className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-tour="summary-back"
              onClick={handleBackToAssignedLeads}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </div>
        </div>
      </div>

      {isDummy ? (
        <div className="border-b border-amber-200 bg-amber-50 py-2 text-center text-xs font-medium text-amber-800">
          Preview mode — API returned 404. Showing dummy data.
        </div>
      ) : null}

      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
        {/* Profile card */}
        <div className={CARD_CLASS} data-tour="summary-profile">
          <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start">
            <div className="shrink-0">
              <KycPhotoThumb
                src={profileImageUrl}
                score={faceMatchScore}
                hasError={Boolean(failedImages.profile)}
                onError={() => setFailedImages((prev) => ({ ...prev, profile: true }))}
                onOpen={() => setShowKycPhotosModal(true)}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h1 className={`text-lg font-bold tracking-tight text-slate-900 sm:text-xl ${locationNameClass}`}>
                  {formatName(data?.cust_name)}
                </h1>
                {isLocationSuspicious ? (
                  <span className={locationBadgeClass}>Location suspicious</span>
                ) : null}
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: NAVY }}
                  title={stageMeaning}
                >
                  {stageLabel}
                </span>
                {/* <LeadStageTips currentStage={data?.lead_stage} /> */}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                    data?.is_reloan_case
                      ? "bg-amber-50 text-amber-800 ring-amber-200"
                      : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  }`}
                >
                  {data?.is_reloan_case ? "Reloan" : "Fresh"}
                </span>
                {hasWarnData ? (
                  <button
                    type="button"
                    onClick={() => setShowWarnIndicatorModal(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100"
                    aria-label="View warning indicator"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Alert{warnAlertCount > 0 ? ` (${warnAlertCount})` : ""}
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                <ProfileField label="Customer Name" value={formatName(data?.cust_name)} icon={User} />
                <ProfileField label="Mobile Number" value={data?.mobile_number} icon={Phone} />
                <ProfileField label="Pan No." value={pan || data?.pan} icon={IdCard} />
                <ProfileField
                  label="Lead Stage"
                  value={stageLabel}
                  title={stageMeaning}
                  icon={Flag}
                />
                <ProfileField
                  label="Lead ID"
                  value={data?.lead_no || data?.lead_id}
                  icon={Hash}
                  onCopy={() =>
                    copyLeadProfileSummary({
                      custName: formatName(data?.cust_name),
                      mobileNumber: data?.mobile_number,
                      panNo: pan || data?.pan,
                      leadStage: stageLabel,
                      leadId: data?.lead_no || data?.lead_id,
                    })
                  }
                />
                <EmailEditField
                  variant="light"
                  layout="grid"
                  panNumber={pan || data?.pan}
                  personalEmail={data?.personal_email}
                  officialEmail={data?.official_email}
                  personalIcon={Mail}
                  officialIcon={Mail}
                  onUpdated={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["lead-summary-data", leadId],
                    })
                  }
                />
              </div>

              <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4">
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Address
                </span>
                <div className="min-w-0 flex-1">
                  <ExpandableTruncatedText
                    value={data?.address}
                    className="text-sm text-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* Left column */}
          <div className="min-w-0 space-y-5" data-tour="summary-decision">
            {!data?.is_reloan_case ? (
              <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
                {metricCards.map((card) => (
                  <MetricCard key={card.cardId} {...card} />
                ))}
              </div>
            ) : null}

            {/* <BreDecisionEngineCard /> */}

            <CollapsibleSection title="Loan Eligibility & Decision" icon={Landmark}>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: "Net Salary", value: formatCurrency(data?.net_salary) },
                  {
                    label: "Eligible Amt.",
                    value: formatCurrency(data?.maximum_elegiblity),
                    highlight: true,
                  },
                  { label: "PF %", value: data?.pf != null ? `${data.pf}%` : "—" },
                  { label: "Repay Date", value: data?.repayment_date ?? "—" },
                  { label: "ROI", value: data?.roi != null ? `${data.roi}%` : "—" },
                  { label: "Requested Amt.", value: formatCurrency(data?.requested_loan_amount) },
                ].map(({ label, value, highlight }) => (
                  <StatTile key={label} label={label} value={value} highlight={highlight} />
                ))}
              </div>
            </CollapsibleSection>

            {/* Monthly Income */}
            {staticData?.monthly_income_data?.income_data?.length > 0 && (
              <CollapsibleSection title="Monthly Income Details" icon={Banknote}>
                <div className="relative m-4 mt-0 max-h-80 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Amount", "Date", "Income Type", "Bank Name"].map((h) => (
                          <th
                            key={h}
                            className="sticky top-0 z-20 h-10 border-b border-slate-200 bg-slate-50 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staticData.monthly_income_data.income_data.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 bg-white transition-colors hover:bg-slate-50/60"
                        >
                          <td
                            className={`px-4 py-2.5 align-middle font-semibold ${
                              row.is_abnormal_behaviour_captured
                                ? "text-red-600"
                                : "text-slate-800"
                            }`}
                          >
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="px-4 py-2.5 align-middle text-slate-600">
                            {formatIncomeDate(row)}
                          </td>
                          <td className="px-4 py-2.5 align-middle text-slate-700">
                            {formatIncomeType(row)}
                          </td>
                          <td className="px-4 py-2.5 align-middle text-slate-600">
                            {row.bank_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            )}

            {/* <PaydayLoanStatusCard /> */}

            {/* Payday Loan History */}
            {(paydayLoans.length > 0 || paydaySummary) && (
              <CollapsibleSection title="Payday Loan History" icon={History}>
                {paydaySummary ? <PaydayLoanSummary summary={paydaySummary} /> : null}
                {paydayLoans.length > 0 ? (
                <div className="relative m-4 mt-0 max-h-80 overflow-auto rounded-md border border-slate-100">
                  <table className="w-full min-w-[720px] border-collapse text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th
                          rowSpan={2}
                          className="sticky left-0 top-0 z-30 h-[64px] min-w-[128px] border-r border-slate-200 bg-slate-50 px-3 text-left align-middle font-semibold text-slate-600 shadow-[4px_0_6px_-4px_rgba(15,23,42,0.12)]"
                        >
                          Lender
                        </th>
                        <th
                          colSpan={2}
                          className="sticky top-0 z-20 h-8 border-r border-slate-200 bg-slate-50 px-3 text-center align-middle font-semibold text-slate-600"
                        >
                          Total
                        </th>
                        {paydayMatrix.months.map((m) => (
                          <th
                            key={m}
                            colSpan={2}
                            className="sticky top-0 z-20 h-8 border-r border-slate-200 bg-slate-50 px-3 text-center align-middle font-semibold text-slate-600"
                          >
                            {m}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th className="sticky top-8 z-20 h-8 border-b border-slate-200 bg-slate-50 px-2 text-center align-middle text-[10px] font-medium text-emerald-600">
                          Cr.
                        </th>
                        <th className="sticky top-8 z-20 h-8 border-r border-b border-slate-200 bg-slate-50 px-2 text-center align-middle text-[10px] font-medium text-red-600">
                          Dr.
                        </th>
                        {paydayMatrix.months.map((m) => (
                          <React.Fragment key={m}>
                            <th className="sticky top-8 z-20 h-8 border-b border-slate-200 bg-slate-50 px-2 text-center align-middle text-[10px] font-medium text-emerald-600">
                              Cr.
                            </th>
                            <th className="sticky top-8 z-20 h-8 border-r border-b border-slate-200 bg-slate-50 px-2 text-center align-middle text-[10px] font-medium text-red-600">
                              Dr.
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paydayMatrix.lenders.map((lender) => (
                        <tr key={lender.name} className="border-b border-slate-100 bg-white">
                          <td className="sticky left-0 z-10 min-w-[128px] border-r border-slate-100 bg-white px-3 py-2 align-middle font-semibold text-slate-800 shadow-[4px_0_6px_-4px_rgba(15,23,42,0.12)]">
                            {lender.name}
                          </td>
                          <td className="px-2 py-2 text-center align-middle font-medium text-emerald-600">
                            {formatCurrency(lender.totalCr)}
                          </td>
                          <td className="border-r border-slate-100 px-2 py-2 text-center align-middle font-medium text-red-600">
                            {formatCurrency(lender.totalDr)}
                          </td>
                          {paydayMatrix.months.map((m) => {
                            const cell = lender.byMonth[m] || {};
                            return (
                              <React.Fragment key={m}>
                                <td className="px-2 py-2 text-center align-middle text-slate-700">
                                  <PaydayTxnCell
                                    amount={cell.cr?.amount}
                                    entries={cell.cr?.entries}
                                    variant="cr"
                                  />
                                </td>
                                <td className="border-r border-slate-100 px-2 py-2 text-center align-middle">
                                  <PaydayTxnCell
                                    amount={cell.dr?.amount}
                                    entries={cell.dr?.entries}
                                    seek={cell.dr?.seek}
                                    variant="dr"
                                    emptyLabel="-"
                                  />
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                ) : null}
              </CollapsibleSection>
            )}

            {/* Loan History */}
            {data?.is_reloan_case &&
            (data?.reloan_summary || data?.reloan_data?.length > 0) ? (
              <CollapsibleSection title="Loan History">
                <ReloanSummary summary={data.reloan_summary} />
                {data?.reloan_data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {[
                          "Loan Count",
                          "Loan No.",
                          "Loan Amount",
                          "Disbursal Date",
                          "Repayment Date",
                          "DPD",
                          "Status",
                          "Action",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.reloan_data.map((loan, idx) => (
                        <tr key={idx} className="border-b border-slate-50">
                          <td className="px-3 py-2.5 font-medium text-slate-800">{loan.loan_count}</td>
                          <td className="px-3 py-2.5 text-slate-700">{loan.loan_no}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900">
                            {formatCurrency(loan.loan_amount)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">{loan.disbursal_date}</td>
                          <td className="px-3 py-2.5 text-slate-600">{loan.repayment_date}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`font-semibold ${
                                Number(loan.dpd) > 0 ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {loan.dpd ?? 0}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`text-xs font-semibold ${
                                loan.status === "ACTIVE" ? "text-brand-link" : "text-emerald-600"
                              }`}
                            >
                              {loan.status === "ACTIVE" ? "Activate" : "Closed"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => handleViewReloanLeadSummary(loan)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-brand-link hover:bg-brand-light"
                              aria-label={`View summary for lead ${loan.lead_id ?? loan.loan_no}`}
                              title="View lead summary"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                ) : null}
              </CollapsibleSection>
            ) : null}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4 lg:sticky lg:top-[4.25rem] lg:self-start">
            <div className={CARD_CLASS} data-tour="summary-documents">
              <SectionHeader
                title={`Documents${
                  !isLoadingDocuments && documentsData?.length > 0
                    ? ` (${documentsData.length})`
                    : ""
                }`}
                icon={FolderOpen}
                trailing={<span className="text-xs font-medium text-slate-400">Action</span>}
              />
              <ScrollableDocumentsList>
                {isLoadingDocuments ? (
                  <li className="px-4 py-6 text-center text-sm text-slate-500">
                    Loading documents…
                  </li>
                ) : documentsData?.length > 0 ? (
                  documentsData.map((doc, idx) => (
                    <li
                      key={doc.id ?? `${doc.document_type}-${idx}`}
                      className={`grid grid-cols-[1fr_auto] items-center px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50/60 ${
                        idx < documentsData.length - 1 ? "border-b border-slate-100" : ""
                      }`}
                    >
                      <span className="min-w-0 truncate font-medium">
                        {getDocumentLabel(doc)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        disabled={
                          documentPreview.loading && documentPreview.name === getDocumentLabel(doc)
                        }
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                        aria-label={`View ${getDocumentLabel(doc)}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-6 text-center text-sm text-slate-500">
                    No documents found
                  </li>
                )}
              </ScrollableDocumentsList>
              <div className="border-t border-slate-100 p-3">
                {showUploadSection ? (
                  <InlineUploadSection
                    leadId={leadId}
                    leadStage={data?.lead_stage}
                    isPersonalDetailsFilled={Boolean(data?.is_personal_details_filled)}
                    onClose={() => setShowUploadSection(false)}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ["documents-data", leadId] });
                      queryClient.invalidateQueries({ queryKey: ["lead-summary-data", leadId] });
                      setShowUploadSection(false);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowUploadSection(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: NAVY }}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </button>
                )}
              </div>
            </div>

            <div className={CARD_CLASS} data-tour="summary-actions">
              <SectionHeader title="Actions" icon={ScrollText} />
              <div className="p-3">
              <div className="grid grid-cols-2 gap-2">
                {visiblePrimaryActionButtons.map(({ label, border, text, hover, icon: Icon, disabled, chevron }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={
                      disabled ||
                      (label === "Send Banking Link" && Boolean(pendingBankOpt))
                    }
                    onClick={() => {
                      if (disabled) return;
                      if (label === "View Lead Logs") setShowLeadLogs(true);
                      if (label === "View Address") setShowAddressModal(true);
                      if (label === "Calculate") setShowCalculatorModal(true);
                      if (label === "Complete Details") handleOpenCompleteDetails();
                      if (label === "Send Banking Link") {
                        setShowBankingLinkOptions((v) => !v);
                      }
                    }}
                    className={`flex items-center justify-center gap-1 rounded-md border bg-white px-2 py-2 text-[11px] font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white ${border} ${text} ${disabled ? "" : hover} ${
                      label === "Send Banking Link" && showBankingLinkOptions
                        ? "border-pink-500 bg-pink-50 shadow-sm"
                        : ""
                    }`}
                  >
                    {Icon && <Icon className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{label}</span>
                    {chevron ? (
                      <ChevronDown
                        className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
                          showBankingLinkOptions ? "rotate-180" : ""
                        }`}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
              {showBankingLinkButton && showBankingLinkOptions ? (
                <BankingLinkOptionsPanel
                  pendingOption={pendingBankOpt}
                  onClose={() => {
                    if (pendingBankOpt) return;
                    setShowBankingLinkOptions(false);
                  }}
                  onSelect={handleSendBankingLink}
                />
              ) : null}

              {showAskDocumentButton ? (
                <button
                  type="button"
                  onClick={() => setShowAskDocumentModal(true)}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-violet-400 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-violet-600 transition-colors hover:bg-violet-50"
                >
                  <FilePlus2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">Ask Document from Customer</span>
                </button>
              ) : null}

              {isNCandNRNeeded && !isEffectivelyHold && data?.lead_stage !== "DISBURSED" ? (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingNcRemark("Not interested at all");
                      setExtraNcRemark("");
                      setShowNotInterestedConfirm(true);
                    }}
                    disabled={isNcHolding}
                    className="flex items-center justify-center rounded-md border border-rose-500 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                  >
                    Not Interested at all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingNcRemark("Not interested right now");
                      setExtraNcRemark("");
                      setShowNotInterestedConfirm(true);
                    }}
                    disabled={isNcHolding}
                    className="flex items-center justify-center rounded-md border border-amber-500 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                  >
                    Not Interested right now
                  </button>
                </div>
              ) : null}

              {isNCandNRNeeded && isEffectivelyHold ? (
                <button
                  type="button"
                  onClick={() => setShowInterestedConfirm(true)}
                  disabled={isNcHolding}
                  className="mt-2 flex w-full items-center justify-center rounded-md border border-emerald-500 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                >
                  Interested
                </button>
              ) : null}

              {!hideRejectHoldButtons && canShowAssignedLeadActions ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SECONDARY_ACTION_BUTTONS.map(({ label, border, text, hover, icon: Icon, disabled }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled || (label === "Hold" && holdMutation.isPending)}
                      onClick={() => {
                        if (disabled) return;
                        if (label === "Reject") handleReject();
                        if (label === "Hold") handleHold();
                      }}
                      className={`flex items-center justify-center gap-1 rounded-md border bg-white px-2 py-2 text-[11px] font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white ${border} ${text} ${disabled ? "" : hover}`}
                    >
                      {Icon && <Icon className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {showApproveButton ? (
                <button
                  type="button"
                  onClick={handleLeadApprove}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
              ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showKycPhotosModal ? (
        <KycCompareModal
          profileImageUrl={profileImageUrl}
          aadhaarImageUrl={aadhaarImageUrl}
          faceMatchScore={faceMatchScore}
          customerName={data?.cust_name}
          onClose={() => setShowKycPhotosModal(false)}
        />
      ) : null}

      {showAddressModal && (
        <AddressModal
          addresses={addressData}
          isLoading={isLoadingAddress}
          onClose={() => setShowAddressModal(false)}
        />
      )}

      {showCalculatorModal && (
        <LoanCalculatorModal
          onClose={() => setShowCalculatorModal(false)}
          customerName={formatName(data?.cust_name)}
          pan={pan || data?.pan}
          defaultLoanAmount={
            data?.requested_loan_amount ?? data?.maximum_elegiblity
          }
          defaultPfPercent={data?.pf}
          defaultRoi={data?.roi}
          repaymentDate={data?.repayment_date}
        />
      )}

      {showAskDocumentModal ? (
        <AskDocumentModal
          leadId={currentLeadId}
          onClose={() => setShowAskDocumentModal(false)}
        />
      ) : null}

      {showWarnIndicatorModal && activeWarnIndicators.length > 0 ? (
        <WarnIndicatorModal
          warnIndicators={activeWarnIndicators}
          onClose={() => setShowWarnIndicatorModal(false)}
          onAction={handleWarnIndicatorAction}
          isSubmitting={warnIndicatorActionMutation.isPending}
          pendingAction={pendingWarnAction}
        />
      ) : null}

      {showLeadLogs && (
        <LeadLogsModal
          logs={leadLogs}
          isLoading={isLoadingLeadLogs}
          onClose={() => setShowLeadLogs(false)}
        />
      )}

      <ManualKycApproveModal
        showManualKycApproveModal={showManualKycApproveModal}
        handleModalOutsideClick={handleManualKycModalOutsideClick}
        approvingLead={approvingLead}
        setShowManualKycApproveModal={setShowManualKycApproveModal}
      />

      <ActionModal
        showModal={showApprovalModal}
        handleModalOutsideClick={handleApprovalModalOutsideClick}
        selectedLead={approvingLead}
        selectedRows={new Set()}
        setShowModal={setShowApprovalModal}
        setSelectedLead={setApprovingLead}
        confirmAction={
          isCreditHeadApprovalModal
            ? () => {
                setShowApprovalModal(false);
                setApprovingLead(null);
                setApprovalRemarks("");
                setSalaryConflictLogs([]);
              }
            : isAllocatedApprovalModal
              ? () => {
                  setShowApprovalModal(false);
                  setApprovingLead(null);
                  resetApprovalForm();
                }
              : submitApproval
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
        showSalaryRejection={showSalaryRejection}
        salaryRejectionMessage={salaryRejectionMessage}
        salaryIncome={salaryIncome}
        setSalaryIncome={setSalaryIncome}
        salaryTransactions={salaryTransactions}
        selectedSalaryTransactions={selectedSalaryTransactions}
        onToggleSalaryTransaction={toggleSalaryTransaction}
        isSalaryTransactionSelected={isSalaryTransactionSelected}
        onSubmitSalaryTransactions={handleSubmitSalaryTransactions}
        isSubmittingSalaryTransactions={isSubmittingSalaryTransactions}
        onGetSalary={handleGetSalary}
        isGettingSalary={isGettingSalary}
        onModalClose={resetApprovalForm}
        isInputNeeded={true}
        actionButtonText="Approving..."
        modalTitle={
          isCreditHeadApprovalModal
            ? `Action on Audit Lead ${approvingLead?.lead_no || approvingLead?.lead_id || ""}`
            : isAllocatedApprovalModal
              ? `Approve Audit Lead ${approvingLead?.lead_no || approvingLead?.lead_id || ""}`
              : `Approve Lead ${approvingLead?.lead_no || approvingLead?.lead_id || ""}`
        }
        modalDescription={
          isCreditHeadApprovalModal
            ? "Select an action for this audit lead"
            : isAllocatedApprovalModal
              ? "Are you sure you want to approve this audit lead?"
              : "Are you sure you want to approve this lead? This action cannot be undone."
        }
        modalButtonText={
          isCreditHeadApprovalModal
            ? "Action"
            : isAllocatedApprovalModal
              ? "Approve"
              : approvalLoading
                ? "Approving..."
                : "Approve"
        }
        modalType={approvalModalType}
        onCreditHeadAction={isCreditHeadApprovalModal ? handleCreditHeadActionComplete : undefined}
        salaryConflictLogs={isCreditHeadApprovalModal ? salaryConflictLogs : []}
        onApproveWithVerification={() => {
          queryClient.invalidateQueries({ queryKey: ["allocated-audit-leads"] });
          queryClient.invalidateQueries({ queryKey: ["lead-summary-data", leadId] });
        }}
        onRejectWithVerification={() => {
          queryClient.invalidateQueries({ queryKey: ["allocated-audit-leads"] });
          queryClient.invalidateQueries({ queryKey: ["lead-summary-data", leadId] });
        }}
      />

      <RejectionModal
        showRejectionModal={showRejectionModal}
        handleModalOutsideClick={handleRejectionModalOutsideClick}
        rejectingLead={rejectingLead}
        setShowRejectionModal={setShowRejectionModal}
        submitRejection={submitRejection}
        selectedReason={selectedReason}
        setSelectedReason={setSelectedReason}
        rejectionReasons={REJECTION_REASONS}
        rejectionNotes={rejectionNotes}
        setRejectionNotes={setRejectionNotes}
        customReason={customReason}
        setCustomReason={setCustomReason}
        loadingState={{ [rejectingLead?.id]: rejectLoading }}
        leadID={rejectingLead?.lead_no || rejectingLead?.lead_id}
      />

      <ConfirmationModal
        isOpen={showHoldModal}
        onClose={() => {
          if (holdMutation.isPending) return;
          setShowHoldModal(false);
          setHoldRemarks("");
        }}
        onConfirm={submitHold}
        title="Hold Lead"
        message="Are you sure you want to hold this lead?"
        confirmText={holdMutation.isPending ? "Processing..." : "Hold Lead"}
        cancelText="Cancel"
        remarkLabel="Remarks"
        remarkValue={holdRemarks}
        onRemarkChange={setHoldRemarks}
        remarkPlaceholder="Enter hold remarks (required)"
        remarkRequired
      />

      <ConfirmationModal
        isOpen={showNotInterestedConfirm}
        onClose={() => setShowNotInterestedConfirm(false)}
        onConfirm={handleConfirmNotInterested}
        title="Confirm"
        message="Are you sure you want to mark this lead as not interested?"
        confirmText={isNcHolding ? "Processing..." : "Yes, confirm"}
        cancelText="Cancel"
        remarkLabel="Remark"
        remarkValue={extraNcRemark}
        onRemarkChange={setExtraNcRemark}
        remarkPlaceholder="Add details (required)"
        remarkRequired
      />

      <ConfirmationModal
        isOpen={showInterestedConfirm}
        onClose={() => setShowInterestedConfirm(false)}
        onConfirm={() => {
          if (!currentLeadId) {
            toast.error("Lead ID not available");
            return;
          }
          holdLeadWithRemark({
            id: Number(currentLeadId) || currentLeadId,
            remarks: "Interested",
            category: "unhold",
          });
        }}
        title="Confirm"
        message="Mark this lead as interested?"
        confirmText={isNcHolding ? "Processing..." : "Yes, mark interested"}
        cancelText="Cancel"
      />

      {documentPreview.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={closeDocumentPreview}
          role="presentation"
        >
          <div
            className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={documentPreview.name}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="truncate pr-4 text-base font-semibold text-slate-800">
                {documentPreview.name}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {!documentPreview.loading && documentPreview.url ? (
                  <button
                    type="button"
                    onClick={() => window.open(documentPreview.url, "_blank", "noopener,noreferrer")}
                    className="text-slate-500 hover:text-slate-700"
                    aria-label="Open document in new tab"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closeDocumentPreview}
                  className="text-slate-500 hover:text-slate-700"
                  aria-label="Close document preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {documentPreview.loading ? (
                <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">
                  Loading document...
                </div>
              ) : documentPreview.fileType === "image" ? (
                <img
                  src={documentPreview.url}
                  alt={documentPreview.name}
                  className="mx-auto max-h-[80vh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <iframe
                  src={documentPreview.url}
                  className="h-[80vh] w-full rounded-lg border border-slate-200"
                  title={documentPreview.name}
                />
              )}
            </div>
            {!documentPreview.loading && documentPreview.docId ? (
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => handleValidateDocument(false)}
                disabled={validateDocumentMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-500 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleValidateDocument(true)}
                disabled={validateDocumentMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
            </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryDataPage;
