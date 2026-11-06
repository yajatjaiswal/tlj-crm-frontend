import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveBreRejectedLead,
  getBreRejectedAssignedLeads,
  getSalaryManualApprove,
  rejectBreRejectedLead,
  setSalaryTransactionById,
  getLeadByNBFC,
} from "../../services/functions/credit-analyst";
import { toggleDisposeLead } from "../../services/functions/screener";
import toast from "react-hot-toast";
import ErrorBoundary from "../../Components/ErrorBoundary";
import ErrorFallback from "../../Components/ErrorFallback";
import {
  ErrorState,
} from "../../Components/ErrorStates/ErrorAndEmptyStates";
import TableHeader from "../../Components/Table/TableHeader";
import LeadExpandedRow from "../../Components/Table/LeadExpandedRow";
import LeadRow from "../../Components/Table/LeadRow";
import Pagination from "../../Components/Pagination/Pagination";
import ActionModal from "../../Components/Modals/ActionModal";
import RejectionModal from "../../Components/Modals/RejectionModal";
import SearchField from "../../Components/Table/SearchField";
import CompanyFilter from "../../Components/Table/CompanyFilter";
import DurationFilter from "../../Components/Table/DurationFilter";
import FilterButton from "../../Components/Table/FilterButton";
import ReloanToggle from "../../Components/Table/ReloanToggle";
import FilterModal from "../../Components/Modals/FilterModal";
import { getStatusOptions } from "../../utils/statusOptions";
import { usePaginationState } from "../../hooks/usePaginationState";
import { UserCircle, X } from "lucide-react";
import {
  getYesterdayIST,
  getLastMonthRangeIST,
  getLastWeekRangeIST,
} from "../../utils/istDateUtils";
import { openDetailModal } from "../../redux/slices/detailModal";

// Error boundary wrapper component
const AssignedLeadsWithErrorBoundary = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <AssignedLeads />
  </ErrorBoundary>
);

const EMPTY_SALARY_INCOME = [
  { amount: "", date: "" },
  { amount: "", date: "" },
  { amount: "", date: "" },
];

const AssignedLeads = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [rejectingLead, setRejectingLead] = useState(null);
  const [approvingLead, setApprovingLead] = useState(null);
  const [calculatedLoanAmount, setCalculatedLoanAmount] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [branchName, setBranchName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [salaryDate, setSalaryDate] = useState(undefined);
  const [loadingState, setLoadingState] = useState({});
  const [error, setError] = useState(null);
  const [showSalaryRejection, setShowSalaryRejection] = useState(false);
  const [salaryRejectionMessage, setSalaryRejectionMessage] = useState("");
  const [salaryIncome, setSalaryIncome] = useState(EMPTY_SALARY_INCOME);
  const [salaryTransactions, setSalaryTransactions] = useState([]);
  const [selectedSalaryTransactions, setSelectedSalaryTransactions] = useState([]);
  
  // Filter states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [source, setSource] = useState(null);
  const [loanAmount, setLoanAmount] = useState(null);
  const [status, setStatus] = useState(null);
  const [caseType, setCaseType] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [timePeriod, setTimePeriod] = useState(null);
  const [orderBy, setOrderBy] = useState(null);
  const isReloanSelected = caseType === "reloan";

  const hasHydratedFiltersRef = useRef(false);
  const getFiltersStorageKey = () => {
    if (typeof window === "undefined") return null;
    return `filters:${window.location.pathname}`;
  };

  // Hydrate filters so they persist after full page view navigation.
  useEffect(() => {
    const key = getFiltersStorageKey();
    if (!key) {
      hasHydratedFiltersRef.current = true;
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setActiveFilter(parsed?.activeFilter || []);
      setEmployeeId(parsed?.employeeId ?? null);
      setSource(parsed?.source ?? null);
      setLoanAmount(parsed?.loanAmount ?? null);
      setStatus(parsed?.status ?? null);
      setCaseType(parsed?.caseType ?? null);
      setStartDate(parsed?.startDate ?? null);
      setEndDate(parsed?.endDate ?? null);
      setTimePeriod(parsed?.timePeriod ?? null);
      setOrderBy(parsed?.orderBy ?? null);
    } catch (e) {
      // ignore corrupted storage
    } finally {
      hasHydratedFiltersRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedFiltersRef.current) return;
    const key = getFiltersStorageKey();
    if (!key) return;
    const payload = {
      activeFilter,
      employeeId,
      source,
      loanAmount,
      status,
      caseType,
      startDate,
      endDate,
      timePeriod,
      orderBy,
    };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  }, [
    activeFilter,
    employeeId,
    source,
    loanAmount,
    status,
    caseType,
    startDate,
    endDate,
    timePeriod,
    orderBy,
  ]);

  const queryClient = useQueryClient();

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [expandedRow, setExpandedRow] = useState(null);
  const getSearchStorageKey = () => {
    if (typeof window === "undefined") return null;
    return `search:${window.location.pathname}`;
  };
  const getInitialSearchQuery = () => {
    if (typeof window === "undefined") return "";
    const key = getSearchStorageKey();
    if (!key) return "";
    return window.sessionStorage.getItem(key) || "";
  };
  const [searchQuery, setSearchQuery] = useState(getInitialSearchQuery);
  const rejectionReasons = [
    "Inappropriate Documentation",
    "Income Below Threshold",
    "High Credit Risk Profile",
    "Invalid Contact Information",
    "Suspicious Activity",
    "Not Interested",
    "Other",
  ];
  const [durationDays, setDurationDays] = useState(40);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedCompany, setSelectedCompany] = useState("");
  const [isReloanToggleAvailable, setIsReloanToggleAvailable] = useState(true);
  const companies = ["Solomon"]; // Add more companies as needed

  useEffect(() => {
    // Reloan toggle only applies to the non-company leads API.
    setIsReloanToggleAvailable(!selectedCompany);
  }, [selectedCompany]);

  useEffect(() => {
    if (!timePeriod) return;
    if (timePeriod === "Yesterday") {
      const yesterdayStr = getYesterdayIST();
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (timePeriod === "Last Month") {
      const { startStr, endStr } = getLastMonthRangeIST();
      setStartDate(startStr);
      setEndDate(endStr);
    } else if (timePeriod === "Last Week") {
      const { startStr, endStr } = getLastWeekRangeIST();
      setStartDate(startStr);
      setEndDate(endStr);
    } else if (timePeriod === "Date Range") {
      // Dates set when user applies filter from FilterModal
    } else {
      setStartDate(null);
      setEndDate(null);
    }
  }, [timePeriod]);

  const getFormattedTime = useMemo(() => {
    if (timePeriod) {
      if (timePeriod === "Date Range") {
        if (startDate && endDate) return "customDate";
        return null;
      }
      if (
        timePeriod === "Yesterday" ||
        timePeriod === "Last Month" ||
        timePeriod === "Last Week"
      ) {
        if (startDate && endDate) return "customDate";
        return null;
      }
      if (timePeriod === "Today") return "today";
      if (timePeriod === "This Week") return "weekly";
      if (timePeriod === "This Month") return "monthly";
      if (timePeriod === "This Year") return "yearly";
      return timePeriod.toLowerCase();
    }
    if (startDate && endDate) return "customDate";
    return null;
  }, [timePeriod, startDate, endDate]);

  // Use pagination hook
  const { currentPage, setCurrentPage, syncWithApiResponse } = usePaginationState(1, searchQuery);

  // Query for company-specific leads
  const {
    data: companyLeads,
    isPending: isCompanyLeadsLoading,
    error: companyLeadsError,
    refetch: refetchCompanyLeads,
  } = useQuery({
    queryKey: [
      "company-leads",
      selectedCompany,
      currentPage,
      itemsPerPage,
      durationDays,
      employeeId,
      source,
      loanAmount,
      status,
      caseType,
    ],
    queryFn: () =>
      getLeadByNBFC({
        company_name: selectedCompany,
        page: currentPage,
        limit: itemsPerPage,
        intervalDays: durationDays,
        employee_id: employeeId,
        source: source,
        loan_amount: loanAmount,
        lead_stage: status,
      }),
    enabled: !!selectedCompany,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching company leads:", error);
      setError("Failed to load company leads. Please try again later.");
      toast.error("Failed to load company leads");
    },
  });

  // Query for all leads
  const {
    data: breRejectedAssignedLeads,
    isPending: isBreLeadsLoading,
    error: breLeadsError,
    refetch: refetchBreLeads,
  } = useQuery({
    queryKey: [
      "bre-rejected-allocated-leads",
      currentPage,
      itemsPerPage,
      searchQuery,
      employeeId,
      source,
      loanAmount,
      status,
      caseType,
      startDate,
      endDate,
      timePeriod,
      orderBy,
      getFormattedTime,
    ],
    queryFn: () =>
      getBreRejectedAssignedLeads({
        page: currentPage,
        limit: itemsPerPage,
        search_text: searchQuery || undefined,
        employee_id: employeeId,
        source: source,
        loan_amount: loanAmount,
        lead_stage: status,
        case_type: caseType,
        startDate,
        endDate,
        time: getFormattedTime,
        order_by: orderBy,
      }),
    enabled: !selectedCompany,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching leads:", error);
      setError("Failed to load leads. Please try again later.");
      toast.error("Failed to load leads");
    },
  });

  // Determine which data to use and format it correctly
  const displayData = useMemo(() => {
    if (selectedCompany && companyLeads) {
      // Filter leads with lead_stage BRE_REJECT
      const filteredLeads = companyLeads.data.filter(
        (lead) => lead.lead_stage === "BRE_REJECT"
      );
      return {
        leads: filteredLeads,
        pagination: {
          total: filteredLeads.length, // Update total count to reflect filtered leads
          perPage: companyLeads.perPage,
          currentPage: companyLeads.page,
        },
      };
    }
    return breRejectedAssignedLeads;
  }, [selectedCompany, companyLeads, breRejectedAssignedLeads]);

  const isLoading = selectedCompany ? isCompanyLeadsLoading : isBreLeadsLoading;
  const fetchError = selectedCompany ? companyLeadsError : breLeadsError;

  useEffect(() => {
    if (fetchError) {
      setError("Failed to load leads. Please try again later.");
    }
  }, [fetchError]);

  // Sync current page with API response pagination when available
  useEffect(() => {
    if (displayData?.pagination?.currentPage) {
      syncWithApiResponse(displayData.pagination.currentPage);
    }
  }, [displayData?.pagination?.currentPage, syncWithApiResponse]);

  useEffect(() => {
    const key = getSearchStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, searchQuery || "");
    }
  }, [searchQuery]);

  useEffect(() => {
    if (displayData?.leads) {
      // For company leads, filtering is done in displayData
      // For regular leads, filter here if needed
      const leads = selectedCompany
        ? displayData.leads
        : displayData.leads.filter((lead) => lead.lead_stage === "BRE_REJECT");
      setData(leads);
      setFilteredData(leads);
      setError(null);
    }
  }, [displayData, selectedCompany]);

  // Reject Lead with error handling
  const mutateRejectBreRejectedLead = useMutation({
    mutationFn: ({ id, remarks }) => rejectBreRejectedLead({ id, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["bre-rejected-allocated-leads"],
      });
      queryClient.invalidateQueries({
        queryKey: ["reject-bre-rejected-lead"],
      });
      queryClient.invalidateQueries({
        queryKey: ["company-leads"],
      });
      toast.success("Lead rejected successfully");
      setShowRejectionModal(false);
      setSelectedReason("");
      setRejectionNotes("");
      setCustomReason("");
      setRejectingLead(null);
      setError(null);
    },
    onError: (error) => {
      console.error("Error rejecting lead:", error);
      setError("Failed to reject lead. Please try again.");
      toast.error("Failed to reject lead");
      setLoadingState((prev) => ({ ...prev, [rejectingLead?.id]: false }));
    },
  });

  // Dispose Lead mutation
  const disposeLeadMutation = useMutation({
    mutationFn: toggleDisposeLead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["bre-rejected-allocated-leads"],
      });
      queryClient.invalidateQueries({
        queryKey: ["company-leads"],
      });
      toast.success("Lead disposed successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to dispose lead");
    },
  });

  const resetApprovalForm = () => {
    setCalculatedLoanAmount("");
    setMonthlyIncome("");
    setApprovalRemarks("");
    setBranchName("");
    setBankAccountNo("");
    setIfscCode("");
    setSalaryDate(undefined);
    setError(null);
    setShowSalaryRejection(false);
    setSalaryRejectionMessage("");
    setSalaryIncome(EMPTY_SALARY_INCOME);
    setSalaryTransactions([]);
    setSelectedSalaryTransactions([]);
  };

  // Approve Lead with error handling
  const { mutate: mutateApproveBreRejectedLead } = useMutation({
    mutationKey: ["approve-bre-rejected-lead"],
    mutationFn: approveBreRejectedLead,
    onSuccess: () => {
      queryClient.invalidateQueries(["bre-rejected-allocated-leads"]);
      toast.success("Lead approved successfully");
      resetApprovalForm();
      setShowApprovalModal(false);
      setApprovingLead(null);
      window.location.reload();
    },
    onError: (error) => {
      console.error("Error approving lead:", error);
      const errorMessage = error.message || "Failed to approve lead. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      setLoadingState((prev) => ({ ...prev, [approvingLead?.id]: false }));

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
    onSuccess: (data) => {
      const transactions = Array.isArray(data?.data) ? data.data : [];
      setSalaryTransactions(transactions);
      setSelectedSalaryTransactions([]);
      toast.success(
        transactions.length > 0
          ? `Found ${transactions.length} salary transaction(s)`
          : data?.message || "Salary fetched successfully"
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
      onSuccess: (data) => {
        toast.success(data?.message || "Salary transactions submitted successfully");
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

  const handleRowClick = (user) => {
    try {
      setExpandedRow(expandedRow === user.id ? null : user.id);
    } catch (err) {
      console.error("Error expanding row:", err);
      setError(
        "Error occurred while expanding lead details. Please try again."
      );
    }
  };

    const handleDetailsClick = (lead) => {
    if (Number(lead?.version) === 2 && lead?.pan) {
      const leadId = lead.lead_id || lead.id;
      navigate(
        `/credit-analyst/allocated-application/summary-data/${lead.pan}?leadId=${leadId}`
      );
      return;
    }

    dispatch(
      openDetailModal({
        row: lead,
        showReject: true,
        onReject: mutateRejectBreRejectedLead,
        showApprove: true,
        onApprove: (leadToApprove) =>
          handleSingleApprove(leadToApprove, { stopPropagation: () => { } }),
        role: "Credit-Analyst",
      })
    );
  };

  const handleSingleApprove = (lead, e) => {
    e.stopPropagation();
    try {
      resetApprovalForm();
      setApprovingLead(lead);
      setShowApprovalModal(true);
    } catch (err) {
      console.error("Error in approval process:", err);
      setError("Error occurred while initiating approval. Please try again.");
    }
  };

  const handleReject = (lead) => {
    try {
      setRejectingLead(lead);
      setSelectedReason("");
      setCustomReason("");
      setRejectionNotes("");
      setShowRejectionModal(true);
    } catch (err) {
      console.error("Error in rejection process:", err);
      setError("Error occurred while initiating rejection. Please try again.");
    }
  };

  const submitRejection = () => {
    try {
      setLoadingState((prev) => ({ ...prev, [rejectingLead?.id]: true }));
      const finalReason =
        selectedReason === "Other" ? customReason.trim() : selectedReason;

      if (!finalReason) {
        toast.error("Please provide a rejection reason");
        setLoadingState((prev) => ({ ...prev, [rejectingLead?.id]: false }));
        return;
      }

      if (!rejectingLead?.id) {
        toast.error("Invalid lead selected");
        setLoadingState((prev) => ({ ...prev, [rejectingLead?.id]: false }));
        return;
      }
      const remarks = ` ${finalReason} ${rejectionNotes ? ` - ${rejectionNotes}` : ""
        }`.trim();
      mutateRejectBreRejectedLead.mutate({
        id: rejectingLead?.id,
        remarks,
      });
    } catch (err) {
      console.error("Error submitting rejection:", err);
      setError("Error occurred while submitting rejection. Please try again.");
      setLoadingState((prev) => ({ ...prev, [rejectingLead?.id]: false }));
    }
  };

  const submitApproval = () => {
    try {
      setLoadingState((prev) => ({ ...prev, [approvingLead?.id]: true }));
      if (!approvingLead?.id) {
        toast.error("Invalid lead selected");
        setLoadingState((prev) => ({ ...prev, [approvingLead?.id]: false }));
        return;
      }
      if (!calculatedLoanAmount) {
        toast.error("Please enter the calculated loan amount");
        setLoadingState((prev) => ({ ...prev, [approvingLead?.id]: false }));
        return;
      }

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
    } catch (err) {
      console.error("Error submitting approval:", err);
      setError("Error occurred while submitting approval. Please try again.");
      setLoadingState((prev) => ({ ...prev, [approvingLead?.id]: false }));
    }
  };

  const handleModalOutsideClick = (e) => {
    try {
      if (e.target === e.currentTarget) {
        setShowRejectionModal(false);
        setShowApprovalModal(false);
        setRejectingLead(null);
        setApprovingLead(null);
        setSelectedReason("");
        setCustomReason("");
        setRejectionNotes("");
        resetApprovalForm();
      }
    } catch (err) {
      console.error("Error handling modal click:", err);
      setError("Error occurred while handling modal. Please try again.");
    }
  };

  // Filter handlers
  const handleFilterApply = (filters) => {
    setCurrentPage(1);
    setActiveFilter(filters);
    
    // Reset all filter states
    setEmployeeId(null);
    setSource(null);
    setLoanAmount(null);
    setStatus(null);
    setCaseType(null);
    setStartDate(null);
    setEndDate(null);
    setTimePeriod(null);
    setOrderBy(null);
    // Apply filters based on the received filter array
    filters.forEach((filter) => {
      switch (filter.field) {
        case "assignee":
          setEmployeeId(filter.value);
          break;
        case "source":
          setSource(filter.value);
          break;
        case "loan_amount":
          setLoanAmount(filter.value);
          break;
        case "status":
          setStatus(filter.value);
          break;
        case "caseType":
          setCaseType(filter.value);
          break;
        case "startDate":
          setStartDate(filter.value);
          break;
        case "endDate":
          setEndDate(filter.value);
          break;
        case "timePeriod":
          setTimePeriod(filter.value);
          break;
        case "order_by":
          setOrderBy(filter.value);
          break;
        default:
          break;
      }
    });

    setIsFilterModalOpen(false);
  };

  const handleFilterClear = () => {
    setCurrentPage(1);
    setActiveFilter([]);
    setEmployeeId(null);
    setSource(null);
    setLoanAmount(null);
    setStatus(null);
    setCaseType(null);
    setStartDate(null);
    setEndDate(null);
    setTimePeriod(null);
    setOrderBy(null);
    setIsFilterModalOpen(false);
  };

  const handleReloanToggle = () => {
    // Case type only applies to the non-company leads API.
    if (!isReloanToggleAvailable) return;

    const nextSelected = !isReloanSelected;
    const nextCaseType = nextSelected ? "reloan" : null;

    setCaseType(nextCaseType);
    setActiveFilter((prevFilters) => {
      const safePrev = prevFilters || [];
      const otherFilters = safePrev.filter((f) => f.field !== "caseType");
      return nextSelected
        ? [
            ...otherFilters,
            {
              field: "caseType",
              value: "reloan",
              label: "Case Type: Reloan",
            },
          ]
        : otherFilters;
    });
    setCurrentPage(1);
  };

  const filterChipMetas = useMemo(() => {
    const metas = [];

    if (timePeriod) {
      if (timePeriod === "Date Range" && startDate && endDate) {
        metas.push({
          kind: "date-range",
          value: "Date Range",
          label: `Date range: ${startDate} – ${endDate}`,
        });
      } else {
        metas.push({
          kind: "timePeriod",
          value: timePeriod,
          label: `Time Period: ${timePeriod}`,
        });
      }
    }

    if (status) {
      const statusOptions = getStatusOptions("partial-leads") || [];
      const matched = statusOptions.find(
        (o) => String(o.value) === String(status)
      );
      metas.push({
        kind: "status",
        value: status,
        label: matched ? `Status: ${matched.label}` : `Status: ${status}`,
      });
    }

    if (caseType) {
      const mapped =
        caseType === "reloan"
          ? "Reloan"
          : caseType === "fresh"
            ? "Fresh"
            : caseType;
      metas.push({
        kind: "caseType",
        value: caseType,
        label: `Case Type: ${mapped}`,
      });
    }

    if (employeeId) {
      const af = (activeFilter || []).find(
        (f) => f.field === "assignee" && String(f.value) === String(employeeId)
      );
      metas.push({
        kind: "assignee",
        value: employeeId,
        label: af?.label || `Assignee: ${employeeId}`,
      });
    }
    if (source) {
      const af = (activeFilter || []).find(
        (f) => f.field === "source" && String(f.value) === String(source)
      );
      metas.push({
        kind: "source",
        value: source,
        label: af?.label || `Source: ${source}`,
      });
    }
    if (loanAmount) {
      const af = (activeFilter || []).find(
        (f) =>
          f.field === "loan_amount" && String(f.value) === String(loanAmount)
      );
      metas.push({
        kind: "loan_amount",
        value: loanAmount,
        label: af?.label || `Loan Amount: ${loanAmount}`,
      });
    }

    return metas;
  }, [
    timePeriod,
    startDate,
    endDate,
    status,
    caseType,
    employeeId,
    source,
    loanAmount,
    activeFilter,
  ]);

  const handleRemoveFilterChip = (meta) => {
    setCurrentPage(1);

    setActiveFilter((prev) => {
      const safePrev = prev || [];
      switch (meta.kind) {
        case "date-range":
          return safePrev.filter(
            (f) =>
              !(
                (f.field === "timePeriod" && f.value === "Date Range") ||
                f.field === "startDate" ||
                f.field === "endDate" ||
                f.field === "order_by"
              )
          );
        case "timePeriod":
          return safePrev.filter(
            (f) =>
              !(
                f.field === "timePeriod" &&
                String(f.value) === String(meta.value)
              )
              && f.field !== "order_by"
          );
        case "status":
          return safePrev.filter(
            (f) =>
              !(
                f.field === "status" && String(f.value) === String(meta.value)
              )
          );
        case "caseType":
          return safePrev.filter(
            (f) =>
              !(
                f.field === "caseType" &&
                String(f.value) === String(meta.value)
              )
          );
        case "assignee":
          return safePrev.filter(
            (f) =>
              !(
                f.field === "assignee" &&
                String(f.value) === String(meta.value)
              )
          );
        case "source":
          return safePrev.filter(
            (f) =>
              !(
                f.field === "source" && String(f.value) === String(meta.value)
              )
          );
        case "loan_amount":
          return safePrev.filter(
            (f) =>
              !(
                f.field === "loan_amount" &&
                String(f.value) === String(meta.value)
              )
          );
        default:
          return safePrev;
      }
    });

    switch (meta.kind) {
      case "date-range":
      case "timePeriod":
        setTimePeriod(null);
        setOrderBy(null);
        setStartDate(null);
        setEndDate(null);
        break;
      case "status":
        setStatus(null);
        break;
      case "caseType":
        setCaseType(null);
        break;
      case "assignee":
        setEmployeeId(null);
        break;
      case "source":
        setSource(null);
        break;
      case "loan_amount":
        setLoanAmount(null);
        break;
      default:
        break;
    }
  };

  return (
    <div className="h-[89vh] overflow-hidden rounded-xl bg-slate-50">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg shadow-gray-200 overflow-hidden">
          <div className="flex-shrink-0 border-b border-slate-200 bg-white/70 p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-brand/10 border border-brand/40 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-brand-link" />
                </div>
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  {selectedCompany
                    ? `${selectedCompany} Leads`
                    : "BRE Rejected Assigned Leads"}
                </h1>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                <div className="assigned-leads-search-wrap min-w-0 flex-1 sm:min-w-[360px] sm:max-w-[520px] sm:flex-none">
                  <SearchField
                    onSearch={(value) => {
                      setSearchQuery(value);
                    }}
                    defaultValue={searchQuery}
                  />
                </div>

                <div className="relative flex-shrink-0 flex flex-col items-end gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <ReloanToggle
                      checked={isReloanSelected}
                      onToggle={handleReloanToggle}
                      disabled={!isReloanToggleAvailable}
                      show={isReloanToggleAvailable}
                    />
                    <FilterButton
                      onFilter={() => setIsFilterModalOpen(true)}
                      hasActiveFilter={activeFilter.length > 0}
                    />
                    <FilterModal
                      isOpen={isFilterModalOpen}
                      onClose={() => setIsFilterModalOpen(false)}
                      onApply={handleFilterApply}
                      currentFilters={activeFilter || []}
                      showAssignee={true}
                      showSource={true}
                      showLoanAmount={true}
                      showStatus={true}
                      showCasetype={true}
                      showTimePeriod={true}
                      statusOptions={getStatusOptions("partial-leads")}
                    />
                  </div>

                  {filterChipMetas.length > 0 && (
                    <div className="flex max-w-[min(100%,26rem)] flex-wrap items-center justify-end gap-1.5">
                      {filterChipMetas.map((meta, idx) => (
                        <div
                          key={`${meta.kind}-${idx}-${meta.label}`}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand/40 bg-brand-light/90 py-0.5 pl-2 pr-1 text-[11px] font-medium text-brand-link shadow-sm"
                        >
                          <span className="max-w-[11rem] truncate sm:max-w-[15rem]">
                            {meta.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFilterChip(meta)}
                            className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-brand-link transition-colors hover:bg-brand-light/80 hover:text-brand-dark"
                            aria-label={`Remove filter ${meta.label}`}
                          >
                            <X className="h-3 w-3" strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {isLoading ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">Loading assigned leads...</p>
                </div>
              </div>
            ) : (error || fetchError) ? (
              <div className="h-full overflow-y-auto p-6">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    {error || "Failed to load leads. Please try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      if (selectedCompany) {
                        refetchCompanyLeads();
                      } else {
                        refetchBreLeads();
                      }
                    }}
                    className="mt-3 inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : displayData?.leads?.length > 0 ? (
              <div className="h-full overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/70">
                    <TableHeader
                      showSource={true}
                      showCommentColumn={true}
                      showStatus={true}
                      showSalary={true}
                      showSalaryDate={true}
                      showCreatedAt={true}
                    />
                  </thead>
                  <tbody>
                    {displayData?.leads?.map((row) => (
                      <React.Fragment key={row.id}>
                        <LeadRow
                          row={row}
                          expandedRow={expandedRow}
                          loadingStates={loadingState}
                          selectedRows={new Set()}
                          handleRowClick={handleRowClick}
                          onDetailsClick={handleDetailsClick}
                          enableRowExpandOnClick={true}
                          isActionButtonNeeded={true}
                          isSelectButtonNeeded={false}
                          handleSingleAction={handleSingleApprove}
                          actionButtonText="Approving..."
                          modalButtonText="Approve"
                          showSource={true}
                          showCommentColumn={true}
                          showStatus={true}
                          showSalary={true}
                          showSalaryDate={true}
                          showCreatedAt={true}
                        />
                        {expandedRow === row.id && (
                          <LeadExpandedRow
                            row={row}
                            handleReject={handleReject}
                            loadingState={loadingState}
                            mutateRejectLead={mutateRejectBreRejectedLead}
                            isRejectionNeeded={true}
                            isUploadAddtionalDocumentNeeded={true}
                            isNCandNRNeeded={true}
                            role="Credit-Analyst"
                            showReject={true}
                            leadID={row.lead_no}
                            isDisposeNeeded={false}
                            disposeLeadMutation={disposeLeadMutation}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <p className="text-sm font-medium text-slate-500">No assigned leads found.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-2 py-2 sm:px-4">
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              isLoading={isLoading}
              pagination={displayData?.pagination}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
            />
          </div>

        </div>

        <RejectionModal
          showRejectionModal={showRejectionModal}
          handleModalOutsideClick={handleModalOutsideClick}
          rejectingLead={rejectingLead}
          setShowRejectionModal={setShowRejectionModal}
          submitRejection={submitRejection}
          selectedReason={selectedReason}
          setSelectedReason={setSelectedReason}
          rejectionReasons={rejectionReasons}
          rejectionNotes={rejectionNotes}
          setRejectionNotes={setRejectionNotes}
          customReason={customReason}
          setCustomReason={setCustomReason}
          loadingState={loadingState}
          leadID={rejectingLead?.lead_no}
        />

        <ActionModal
          showModal={showApprovalModal}
          handleModalOutsideClick={handleModalOutsideClick}
          selectedLead={approvingLead}
          selectedRows={""}
          setShowModal={setShowApprovalModal}
          setSelectedLead={setApprovingLead}
          confirmAction={submitApproval}
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
          modalTitle={`Approve Lead ${approvingLead?.lead_no}`}
          modalDescription="Are you sure you want to approve this lead? This action cannot be undone."
          modalButtonText="Approve"
          modalType="bre-rejected"
        />
      </div>
    </div>
  );
};

export default AssignedLeadsWithErrorBoundary;
