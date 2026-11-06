
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../utils/card";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Clock,
  IndianRupee,
  ChevronDown,
  Shield,
  ShieldUser,
  CircleDotDashed,
  CircleCheckBig,
  UserX,
  UserCheck,
  Trash2,
  Ban,
  LineChart as LineChartIcon,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminDashboardDetails,
  getCollectionPerformance,
  getDayWiseDisbursalData,
  getDayWiseOverdueData,
  getPaymentStatusCollectionList,
} from "../../services/functions/admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../utils/dropdown-menu";
import DashboardLayout from "./components/DashboardLayout";
import StatCard from "./components/StatCard";
import DashboardSkeleton from "../../utils/DashboardSkeleton";
import DateRangePicker from "./components/DateRangePicker";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getProfile } from "../../services/functions/user";

// Status colors with more vibrant and modern palette
const STATUS_COLORS = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6"];
const TIME_PERIODS = [
  { label: "Today", value: "Today" },
  { label: "Yesterday", value: "Yesterday" },
  { label: "Date Range", value: "Date Range" },
  { label: "This Week", value: "Weekly" },
  { label: "This Month", value: "Monthly" },
  { label: "Last Month", value: "Last Month" },
  { label: "FY 25", value: "FY 25" },
  { label: "FY 26", value: "FY 26" },
  { label: "This Year", value: "Yearly" },
  { label: "Last Year", value: "Last Year" },
  { label: "Overall", value: "Overall" },
];

const DISBURSAL_TIME_OPTIONS = [
  { label: "This month", value: "This Month" },
  { label: "Last month", value: "Last Month" },
  { label: "Date range", value: "Date Range" },
  { label: "This year", value: "Yearly" },
  { label: "FY 25", value: "FY 25" },
  { label: "FY 26", value: "FY 26" },
  { label: "Last year", value: "Last Year" },
  { label: "Overall", value: "Overall" },
];

/** Calendar date YYYY-MM-DD in IST; passes through DD/MM/YY-style strings. */
function formatSanctionDateOnly(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return s;
  const t = new Date(s);
  if (!Number.isFinite(t.getTime())) return s;
  const istOffsetMin = 5.5 * 60;
  const utcMs = t.getTime() + t.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + istOffsetMin * 60000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseSanctionDateSortKey(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const t = new Date(s).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    let year = Number(dmy[3]);
    if (dmy[3].length === 2) year += year >= 70 ? 1900 : 2000;
    const t = new Date(year, month, day).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function toDateOnly(value) {
  if (value == null || value === "") return null;
  const formatted = formatSanctionDateOnly(value);
  if (formatted) return formatted;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function getCurrentISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset * 60000);
}

function formatISTDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const OVERDUE_DAY_WISE_SORTABLE_COLUMNS = {
  repaymentdate: "date",
  dateofrecived: "date",
  dateofreceived: "date",
  repaymentamount: "number",
  receivedamount: "number",
  percentagecollected: "number",
  overduedays: "number",
};

const PAYMENT_STATUS_LABELS = {
  prepayment: "Prepayment (PP)",
  dueDate: "Due Date (DD)",
  overdue: "Overdue (OD)",
};

const PAYMENT_STATUS_SORTABLE_COLUMNS = {
  ...OVERDUE_DAY_WISE_SORTABLE_COLUMNS,
  daysdiff: "number",
};

function getOverdueSortableColumnMeta(key) {
  const normalized = String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return OVERDUE_DAY_WISE_SORTABLE_COLUMNS[normalized] || null;
}

function getOverdueSortValue(row, column, type) {
  const value = row?.[column];
  if (value == null || value === "") return null;

  if (type === "date") {
    const sortKey = parseSanctionDateSortKey(value);
    return sortKey || null;
  }

  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function parseMonthLabelToRange(label) {
  if (!label) return null;
  const match = String(label).trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;

  const monthIndex = new Date(`${match[1]} 1, ${match[2]}`).getMonth();
  const year = Number(match[2]);
  if (!Number.isFinite(monthIndex) || monthIndex < 0 || !Number.isFinite(year)) {
    return null;
  }

  const month = String(monthIndex + 1).padStart(2, "0");
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** True when both ends of a range fall in the current IST calendar month. */
function isDateRangeInCurrentMonth(range) {
  if (!range?.startDate || !range?.endDate) return false;

  const start = formatSanctionDateOnly(range.startDate);
  const end = formatSanctionDateOnly(range.endDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return false;
  }

  const ist = getCurrentISTDate();
  const currentYm = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}`;
  return start.slice(0, 7) === currentYm && end.slice(0, 7) === currentYm;
}

const MONTHLY_TARGET_TIME_PERIODS = new Set(["Today", "Yesterday", "This Week", "Monthly"]);

export default function Dashboard() {
  const navigate = useNavigate();
  const isAdminRole = window.location.pathname.includes("admin");
  const isSalesRole = window.location.pathname.includes("sales-ops");
  const [timePeriod, setTimePeriod] = useState("Today");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [recoveredMonthly, setRecoveredMonthly] = useState([]);
  const [isMyPerformance, setIsMyPerformance] = useState(false);
  const [disbursalTimePeriod, setDisbursalTimePeriod] = useState("This Month");
  const [disbursalDateRange, setDisbursalDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [showDisbursalDatePicker, setShowDisbursalDatePicker] = useState(false);
  const [selectedOverdueMonth, setSelectedOverdueMonth] = useState(null);
  const [overdueDayWiseSort, setOverdueDayWiseSort] = useState({
    column: null,
    order: null,
  });
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(null);
  const [paymentStatusListSort, setPaymentStatusListSort] = useState({
    column: null,
    order: null,
  });

  const selectedOverdueMonthRange = useMemo(
    () => parseMonthLabelToRange(selectedOverdueMonth),
    [selectedOverdueMonth]
  );

  const getOverdueRequestParams = (
    period,
    range,
    selectedMonthValue
  ) => {
    const selectedMonth = toDateOnly(selectedMonthValue);

    if (period === "Date Range") {
      return {
        time: "customDate",
        selectedMonth,
        fromDate: toDateOnly(range.startDate),
        toDate: toDateOnly(range.endDate),
      };
    }

    if (period === "Yesterday") {
      const ist = getCurrentISTDate();
      const yesterday = new Date(ist);
      yesterday.setDate(ist.getDate() - 1);
      const date = formatISTDate(yesterday);
      return {
        time: "customDate",
        selectedMonth,
        fromDate: date,
        toDate: date,
      };
    }

    if (period === "Last Month") {
      const ist = getCurrentISTDate();
      const start = new Date(ist.getFullYear(), ist.getMonth() - 1, 1);
      const end = new Date(ist.getFullYear(), ist.getMonth(), 0);
      return {
        time: "customDate",
        selectedMonth,
        fromDate: formatISTDate(start),
        toDate: formatISTDate(end),
      };
    }

    if (period === "FY 25") {
      return {
        time: "customDate",
        selectedMonth,
        fromDate: "2025-04-01",
        toDate: "2026-03-31",
      };
    }

    if (period === "FY 26") {
      return {
        time: "customDate",
        selectedMonth,
        fromDate: "2026-04-01",
        toDate: "2027-03-31",
      };
    }

    if (period === "Last Year") {
      return {
        time: "customDate",
        selectedMonth,
        fromDate: "2025-06-01",
        toDate: "2025-12-31",
      };
    }

    if (period === "Overall") {
      return {
        time: "customDate",
        selectedMonth,
        fromDate: "2025-06-01",
        toDate: formatISTDate(getCurrentISTDate()),
      };
    }

    if (period === "Today") {
      const today = formatISTDate(getCurrentISTDate());
      return {
        time: "today",
        selectedMonth,
        fromDate: today,
        toDate: today,
      };
    }

    if (period === "Monthly") {
      const ist = getCurrentISTDate();
      const start = new Date(ist.getFullYear(), ist.getMonth(), 1);
      const end = new Date(ist.getFullYear(), ist.getMonth() + 1, 0);
      return {
        time: "monthly",
        selectedMonth,
        fromDate: formatISTDate(start),
        toDate: formatISTDate(end),
      };
    }

    if (period === "Yearly") {
      const ist = getCurrentISTDate();
      const start = new Date(ist.getFullYear(), 0, 1);
      return {
        time: "yearly",
        selectedMonth,
        fromDate: formatISTDate(start),
        toDate: formatISTDate(ist),
      };
    }

    if (period === "Weekly") {
      const ist = getCurrentISTDate();
      const day = ist.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(ist);
      monday.setDate(ist.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        time: "weekly",
        selectedMonth,
        fromDate: formatISTDate(monday),
        toDate: formatISTDate(sunday),
      };
    }

    const today = formatISTDate(getCurrentISTDate());
    return {
      time: period.toLowerCase(),
      selectedMonth,
      fromDate: today,
      toDate: today,
    };
  };

  const { data: overdueDayWiseResponse, isLoading: isOverdueDayWiseLoading } =
    useQuery({
      queryKey: [
        "day-wise-overdue",
        timePeriod,
        dateRange.startDate,
        dateRange.endDate,
        selectedOverdueMonthRange?.startDate,
      ],
      queryFn: () => {
        const params = getOverdueRequestParams(
          timePeriod,
          dateRange,
          selectedOverdueMonthRange?.startDate
        );
        return getDayWiseOverdueData(
          params.time,
          params.selectedMonth,
          params.fromDate,
          params.toDate
        );
      },
      enabled: Boolean(selectedOverdueMonthRange?.startDate),
      staleTime: 60 * 1000,
    });

  const paymentStatusListParams = useMemo(() => {
    if (!selectedPaymentStatus) return null;
    const params = getOverdueRequestParams(timePeriod, dateRange, null);
    if (!params?.fromDate || !params?.toDate) return null;
    return {
      paymentStatus: selectedPaymentStatus,
      fromDate: params.fromDate,
      toDate: params.toDate,
    };
  }, [
    selectedPaymentStatus,
    timePeriod,
    dateRange.startDate,
    dateRange.endDate,
  ]);

  const {
    data: paymentStatusListResponse,
    isLoading: isPaymentStatusListLoading,
  } = useQuery({
    queryKey: [
      "payment-status-collection-list",
      paymentStatusListParams?.paymentStatus,
      paymentStatusListParams?.fromDate,
      paymentStatusListParams?.toDate,
    ],
    queryFn: () =>
      getPaymentStatusCollectionList(
        paymentStatusListParams.paymentStatus,
        paymentStatusListParams.fromDate,
        paymentStatusListParams.toDate
      ),
    enabled: Boolean(paymentStatusListParams?.fromDate),
    staleTime: 60 * 1000,
  });

  const overdueDayWiseBaseRows = useMemo(() => {
    const rows = overdueDayWiseResponse?.data || [];
    return [...rows].sort(
      (a, b) =>
        parseSanctionDateSortKey(
          a?.recovery_date ??
            a?.overdue_date ??
            a?.payment_date ??
            a?.date
        ) -
        parseSanctionDateSortKey(
          b?.recovery_date ??
            b?.overdue_date ??
            b?.payment_date ??
            b?.date
        )
    );
  }, [overdueDayWiseResponse]);

  const overdueDayWiseColumns = useMemo(() => {
    if (!overdueDayWiseBaseRows.length) return [];
    return Object.keys(overdueDayWiseBaseRows[0]);
  }, [overdueDayWiseBaseRows]);

  const formatOverdueCellLabel = (key) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const overdueDayWiseRows = useMemo(() => {
    const { column, order } = overdueDayWiseSort;
    if (!column || !order) return overdueDayWiseBaseRows;

    const sortType = getOverdueSortableColumnMeta(column);
    if (!sortType) return overdueDayWiseBaseRows;

    return [...overdueDayWiseBaseRows].sort((a, b) => {
      const valueA = getOverdueSortValue(a, column, sortType);
      const valueB = getOverdueSortValue(b, column, sortType);

      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return 1;
      if (valueB == null) return -1;

      const comparison = valueA - valueB;
      return order === "asc" ? comparison : -comparison;
    });
  }, [overdueDayWiseBaseRows, overdueDayWiseSort]);

  const formatOverdueCellValue = (key, value) => {
    if (value == null || value === "") return "-";
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.includes("amount") ||
      normalizedKey.includes("amt")
    ) {
      return `₹${Math.ceil(Number(value)).toLocaleString()}`;
    }
    if (normalizedKey.includes("date")) {
      return formatSanctionDateOnly(value);
    }
    if (typeof value === "number") {
      return Number(value).toLocaleString();
    }
    return String(value);
  };

  const handleOverdueDayWiseSort = (column) => {
    if (!getOverdueSortableColumnMeta(column)) return;

    setOverdueDayWiseSort((current) => {
      if (current.column !== column) {
        return { column, order: "asc" };
      }
      if (current.order === "asc") {
        return { column, order: "desc" };
      }
      return { column: null, order: null };
    });
  };

  const handleOverdueMonthClick = (item) => {
    if (!item?.label || item.label === "-") return;
    setOverdueDayWiseSort({ column: null, order: null });
    setSelectedOverdueMonth(item.label);
  };

  const closeOverdueModal = () => {
    setSelectedOverdueMonth(null);
    setOverdueDayWiseSort({ column: null, order: null });
  };

  const paymentStatusListBaseRows = useMemo(() => {
    const rows = paymentStatusListResponse?.data || [];
    return [...rows].sort(
      (a, b) =>
        parseSanctionDateSortKey(b?.date_of_recived) -
        parseSanctionDateSortKey(a?.date_of_recived)
    );
  }, [paymentStatusListResponse]);

  const paymentStatusListColumns = useMemo(() => {
    if (!paymentStatusListBaseRows.length) return [];
    return Object.keys(paymentStatusListBaseRows[0]);
  }, [paymentStatusListBaseRows]);

  const paymentStatusListRows = useMemo(() => {
    const { column, order } = paymentStatusListSort;
    if (!column || !order) return paymentStatusListBaseRows;

    const normalized = String(column || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const sortType = PAYMENT_STATUS_SORTABLE_COLUMNS[normalized] || null;
    if (!sortType) return paymentStatusListBaseRows;

    return [...paymentStatusListBaseRows].sort((a, b) => {
      const valueA = getOverdueSortValue(a, column, sortType);
      const valueB = getOverdueSortValue(b, column, sortType);

      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return 1;
      if (valueB == null) return -1;

      const comparison = valueA - valueB;
      return order === "asc" ? comparison : -comparison;
    });
  }, [paymentStatusListBaseRows, paymentStatusListSort]);

  const handlePaymentStatusClick = (status) => {
    if (!status) return;
    setPaymentStatusListSort({ column: null, order: null });
    setSelectedPaymentStatus(status);
  };

  const closePaymentStatusModal = () => {
    setSelectedPaymentStatus(null);
    setPaymentStatusListSort({ column: null, order: null });
  };

  const handlePaymentStatusListSort = (column) => {
    const normalized = String(column || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (!PAYMENT_STATUS_SORTABLE_COLUMNS[normalized]) return;

    setPaymentStatusListSort((current) => {
      if (current.column !== column) {
        return { column, order: "asc" };
      }
      if (current.order === "asc") {
        return { column, order: "desc" };
      }
      return { column: null, order: null };
    });
  };

  useEffect(() => {
    if (!selectedOverdueMonth && !selectedPaymentStatus) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedOverdueMonth, selectedPaymentStatus]);

  useEffect(() => {
    if (isSalesRole) {
      navigate("/sales-ops/my-performance", { replace: true });
    }
  }, [isSalesRole, navigate]);

  // Helper function to get current time in IST
  const getCurrentIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (istOffset * 60000));
    return istTime;
  };

  // Helper function to format date in IST as YYYY-MM-DD
  const formatDateIST = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to get yesterday's date in IST format
  const getYesterdayIST = () => {
    const istTime = getCurrentIST();
    const yesterdayIST = new Date(istTime);
    yesterdayIST.setDate(istTime.getDate() - 1);
    return formatDateIST(yesterdayIST);
  };

  // Helper function to get last month range in IST format
  const getLastMonthRangeIST = () => {
    const istTime = getCurrentIST();

    // Get first day of last month in IST
    const start = new Date(istTime.getFullYear(), istTime.getMonth() - 1, 1);
    const startStr = formatDateIST(start);

    // Get last day of last month in IST
    const end = new Date(istTime.getFullYear(), istTime.getMonth(), 0);
    const endStr = formatDateIST(end);

    return { startStr, endStr };
  };

  const getThisMonthRangeIST = () => {
    const istTime = getCurrentIST();
    const start = new Date(istTime.getFullYear(), istTime.getMonth(), 1);
    const end = new Date(istTime.getFullYear(), istTime.getMonth() + 1, 0);
    return { startDate: formatDateIST(start), endDate: formatDateIST(end) };
  };

  const getFixedRangeForTimePeriod = (period) => {
    if (period === "FY 25") {
      return { startDate: "2025-04-01", endDate: "2026-03-31" };
    }
    if (period === "FY 26") {
      return { startDate: "2026-04-01", endDate: "2027-03-31" };
    }
    if (period === "Yesterday") {
      const yesterday = getYesterdayIST();
      return { startDate: yesterday, endDate: yesterday };
    }
    if (period === "Last Month") {
      const { startStr, endStr } = getLastMonthRangeIST();
      return { startDate: startStr, endDate: endStr };
    }
    if (period === "Last Year") {
      return { startDate: "2025-06-01", endDate: "2025-12-31" };
    }
    if (period === "Overall") {
      return { startDate: "2025-06-01", endDate: formatDateIST(getCurrentIST()) };
    }
    return null;
  };

  const isCustomDateTimePeriod = (period) => {
    return period === "Date Range" || Boolean(getFixedRangeForTimePeriod(period));
  };

  // Load persisted selection on mount
  // useEffect(() => {
  //   try {
  //     const storedPeriod = localStorage.getItem("dashboardTimePeriod");
  //     const storedRange = localStorage.getItem("dashboardDateRange");
  //     if (storedPeriod) {
  //       setTimePeriod(storedPeriod);
  //     }
  //     if (storedPeriod === "Date Range" && storedRange) {
  //       const parsed = JSON.parse(storedRange);
  //       if (parsed?.startDate && parsed?.endDate) {
  //         setDateRange({ startDate: parsed.startDate, endDate: parsed.endDate });
  //       } else {
  //         setShowDatePicker(true);
  //       }
  //     }
  //   } catch (err) {
  //     // no-op if localStorage is unavailable or JSON parse fails
  //   }
  // }, []);

  // Compute whether the query should be enabled
  const isQueryEnabled =
    (timePeriod !== "Date Range" && timePeriod !== "Last Year" && timePeriod !== "Overall") ||
    Boolean(dateRange.startDate && dateRange.endDate) ||
    timePeriod === "Last Year" ||
    timePeriod === "Overall";

  const { data: profileData } = useQuery({
    queryKey: ["employee-profile"],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const isTeamLead = profileData?.data?.id === profileData?.data?.team_lead;
  const employeeId = profileData?.data?.id;

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: [
      "dashboard-details",
      timePeriod,
      dateRange.startDate,
      dateRange.endDate,
      isMyPerformance,
      employeeId,
    ],
    queryFn: () => {
      const category = isMyPerformance
        ? "INDIVIDUAL_PERFORMANCE"
        : null;
      const currentEmployeeId = isMyPerformance ? employeeId : null;

      if (timePeriod === "Date Range") {
        return getAdminDashboardDetails(
          "customDate",
          dateRange.startDate,
          dateRange.endDate,
          null,
          category,
          currentEmployeeId
        );
      }
      if (timePeriod === "Last Month" || timePeriod === "Yesterday" || timePeriod === "Last Year" || timePeriod === "Overall" || timePeriod === "FY 25" || timePeriod === "FY 26") {
        const fixedRange = getFixedRangeForTimePeriod(timePeriod);
        return getAdminDashboardDetails(
          "customDate",
          fixedRange?.startDate || null,
          fixedRange?.endDate || null,
          null,
          category,
          currentEmployeeId
        );
      }
      return getAdminDashboardDetails(
        timePeriod.toLowerCase(),
        null,
        null,
        null,
        category,
        currentEmployeeId
      );
    },
    refetchInterval: 10000,
    enabled: isQueryEnabled,
  });

  const isDisbursalQueryEnabled =
    disbursalTimePeriod !== "Date Range" ||
    Boolean(disbursalDateRange.startDate && disbursalDateRange.endDate);

  const { data: disbursalChartResponse, isLoading: isDisbursalChartLoading } =
    useQuery({
      queryKey: [
        "day-wise-disbursal",
        disbursalTimePeriod,
        disbursalDateRange.startDate,
        disbursalDateRange.endDate,
      ],
      queryFn: () => {
        if (disbursalTimePeriod === "Date Range") {
          return getDayWiseDisbursalData(
            "customDate",
            disbursalDateRange.startDate,
            disbursalDateRange.endDate
          );
        }
        if (disbursalTimePeriod === "This Month") {
          const { startDate, endDate } = getThisMonthRangeIST();
          return getDayWiseDisbursalData("customDate", startDate, endDate);
        }
        if (disbursalTimePeriod === "Last Month") {
          const { startStr, endStr } = getLastMonthRangeIST();
          return getDayWiseDisbursalData("customDate", startStr, endStr);
        }
        if (disbursalTimePeriod === "Yearly") {
          return getDayWiseDisbursalData("yearly");
        }
        if (
          disbursalTimePeriod === "FY 25" ||
          disbursalTimePeriod === "FY 26" ||
          disbursalTimePeriod === "Last Year" ||
          disbursalTimePeriod === "Overall"
        ) {
          const fixed = getFixedRangeForTimePeriod(disbursalTimePeriod);
          return getDayWiseDisbursalData(
            "customDate",
            fixed?.startDate,
            fixed?.endDate
          );
        }
        return getDayWiseDisbursalData("monthly");
      },
      staleTime: 60 * 1000,
      enabled: isDisbursalQueryEnabled && !isSalesRole,
    });

  const disbursalChartRows = useMemo(() => {
    const rows = disbursalChartResponse?.data || [];
    return [...rows]
      .map((row) => {
        const rawDate = row.disbursal_date;
        return {
          ...row,
          disbursal_date: formatSanctionDateOnly(rawDate),
          total_loan_amount: Number(row.total_loan_amount) || 0,
          sanction_count: Number(row.sanction_count) || 0,
          _sort: parseSanctionDateSortKey(rawDate),
        };
      })
      .sort((a, b) => a._sort - b._sort);
  }, [disbursalChartResponse]);

  const getDisbursalFilterDisplayText = () => {
    if (
      disbursalTimePeriod === "Date Range" &&
      disbursalDateRange.startDate &&
      disbursalDateRange.endDate
    ) {
      return `${disbursalDateRange.startDate} to ${disbursalDateRange.endDate}`;
    }
    if (disbursalTimePeriod === "Yearly") return "This year";
    const opt = DISBURSAL_TIME_OPTIONS.find((o) => o.value === disbursalTimePeriod);
    return opt?.label ?? disbursalTimePeriod;
  };

  const handleDisbursalTimeChange = (value) => {
    setDisbursalTimePeriod(value);
    if (value === "Date Range") {
      setShowDisbursalDatePicker(true);
    } else {
      setDisbursalDateRange({ startDate: null, endDate: null });
    }
  };

  const handleDisbursalDateRangeSelect = (startDate, endDate) => {
    setDisbursalDateRange({ startDate, endDate });
  };

  const disbursalTooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const fmt = (v) => Number(v).toLocaleString();
    const pct = (v) => `${Number(v).toFixed(1)}%`;
    const shortAmt = (v) => {
      const n = Number(v);
      if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)}Cr`;
      if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(2)}L`;
      if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
      return n.toLocaleString();
    };
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      return (
        <div className="max-w-[180px] overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 text-[11px] shadow-lg backdrop-blur-md">
          <div className="bg-gradient-to-r from-[#011c3c] to-[#011c3c] px-2.5 py-1.5">
            <p className="font-semibold text-white">{row.disbursal_date}</p>
          </div>
          <div className="space-y-1 px-2.5 py-2">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Loan Amt</span>
              <span className="font-semibold text-slate-900">₹{shortAmt(row.total_loan_amount)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Sanctions</span>
              <span className="font-semibold text-slate-900">{fmt(row.sanction_count)}</span>
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <div className="flex justify-between gap-2">
              <span className="text-emerald-600">Fresh</span>
              <span className="font-semibold text-slate-900">
                {fmt(row.total_fresh_cases)}{" "}
                <span className="font-normal text-emerald-600">{pct(row.fresh_case_percentage)}</span>
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-emerald-600">Fresh Amt</span>
              <span className="font-semibold text-slate-900">
                ₹{shortAmt(row.total_fresh_loan_amount)}{" "}
                <span className="font-normal text-emerald-600">{pct(row.fresh_loan_amount_percentage)}</span>
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-amber-600">Reloan</span>
              <span className="font-semibold text-slate-900">
                {fmt(row.total_reloan_cases)}{" "}
                <span className="font-normal text-amber-600">{pct(row.reloan_case_percentage)}</span>
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-amber-600">Reloan Amt</span>
              <span className="font-semibold text-slate-900">
                ₹{shortAmt(row.total_reloan_loan_amount)}{" "}
                <span className="font-normal text-amber-600">{pct(row.reloan_loan_amount_percentage)}</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-64 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-md">
        <div className="bg-gradient-to-r from-[#011c3c] to-[#011c3c] px-4 py-2.5">
          <p className="text-sm font-semibold text-white">{row.disbursal_date}</p>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Loan Amount</span>
            <span className="text-sm font-bold text-slate-900">₹{fmt(row.total_loan_amount)}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Sanction Count</span>
            <span className="text-sm font-bold text-slate-900">{fmt(row.sanction_count)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="space-y-2.5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Fresh</p>
            <div>
              <p className="text-[11px] text-slate-500">Count</p>
              <p className="text-sm font-semibold text-slate-900">
                {fmt(row.total_fresh_cases)}
                <span className="ml-1 text-[11px] font-normal text-emerald-600">
                  {pct(row.fresh_case_percentage)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Amount</p>
              <p className="text-sm font-semibold text-slate-900">
                ₹{fmt(row.total_fresh_loan_amount)}
                <span className="ml-1 text-[11px] font-normal text-emerald-600">
                  {pct(row.fresh_loan_amount_percentage)}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-2.5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Reloan</p>
            <div>
              <p className="text-[11px] text-slate-500">Count</p>
              <p className="text-sm font-semibold text-slate-900">
                {fmt(row.total_reloan_cases)}
                <span className="ml-1 text-[11px] font-normal text-amber-600">
                  {pct(row.reloan_case_percentage)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Amount</p>
              <p className="text-sm font-semibold text-slate-900">
                ₹{fmt(row.total_reloan_loan_amount)}
                <span className="ml-1 text-[11px] font-normal text-amber-600">
                  {pct(row.reloan_loan_amount_percentage)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // useEffect(() => {
  //   const fetchLastThreeMonthsRecovered = async () => {
  //     try {
  //       // Compute last three whole calendar months including current month
  //       const results = [];
  //       const now = new Date();
  //       // Use current date to get current month; fetch current month and previous two
  //       for (let i = 0; i < 3; i++) {
  //         const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
  //         const startDate = d.toISOString().split('T')[0];
  //         const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  //         const endDate = end.toISOString().split('T')[0];
  //         const monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  //         const data = await getCollectionPerformance(startDate, endDate);
  //         const totalTillDate = data.reduce((sum, row) => sum + Number(row?.tilldate_received || 0), 0);
  //         results.push({ label: monthLabel, value: totalTillDate });
  //       }
  //       // Reverse to chronological order (oldest to newest)
  //       setRecoveredMonthly(results.reverse());
  //     } catch (err) {
  //       setRecoveredMonthly([]);
  //     }
  //   };
  //   fetchLastThreeMonthsRecovered();
  // }, []);

  const userRoles = useSelector((state) => state.user.allRoles);

  // Memoize derived values to prevent recalculations on re-renders
  const { stats, pieChartData } = useMemo(() => {
    const data = dashboardData || {};

    return {
      stats: {
        // Amount metrics with fresh/reloan split
        amountSanctioned: data.amountSanctioned || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        amountDisbursed: data.amountDisbursed || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        processingFeeCollected: data.processingFeeCollected || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        pendingSanctionAmount: data.pendingSanctionAmount || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        pendingDisbursalAmount: data.pendingDisbursalAmount || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },

        // Application metrics with fresh/reloan split
        applications: data.applications || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        pendingApplications: data.pendingApplications || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        rejectedApplications: data.rejectedApplications || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        breRejectedLeads: data.breRejectedLeads || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        notTakingReloanLeads: data.notTakingReloanLeads || { total: 0 },
        applicationsDisbursed: data.applicationsDisbursed || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },

        // Average metrics with fresh/reloan split
        averageTenure: data.averageTenure || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        averageLoanSize: data.averageLoanSize || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },

        // New metrics
        collectionAmount: data.collectionAmount || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
          counts: { total: 0, fresh: 0, reloan: 0 },
          paymentStatus: { prepayment: 0, dueDate: 0, overdue: 0 },
          paymentStatusAmount: {
            prepaymentAmount: 0,
            dueDateAmount: 0,
            overdueAmount: 0,
          },
          overdueByMonth: [],
        },
        totalEarning: data.totalEarning || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
          breakdown: {
            totalCollection: 0,
            totalDisbursal: 0,
            freshCollection: 0,
            freshDisbursal: 0,
            reloanCollection: 0,
            reloanDisbursal: 0,
          },
        },
        insuranceCollected: data.insuranceCollected || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        gstCollected: data.gstCollected || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        freshCustomerLanding: data.freshCustomerLanding || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        unassignedLeads: data.unassignedLeads || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        assignedLeads: data.assignedLeads || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        disposedLeads: data.disposedLeads || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },

        // Additional metrics (simple values)
        targetAmount: data.additionalMetrics?.target_amount || 0,
        freshTargetAmount: data.additionalMetrics?.fresh_target_amount || 0,
        reloanTargetAmount: data.additionalMetrics?.reloan_target_amount || 0,
        currentMonthSanctionAmount:
          data.additionalMetrics?.currentMonthSanctionAmount ??
          data.amountSanctioned?.total ??
          0,
        currentMonthFreshSanctionAmount:
          data.additionalMetrics?.currentMonthFreshSanctionAmount ??
          data.amountSanctioned?.fresh ??
          0,
        currentMonthReloanSanctionAmount:
          data.additionalMetrics?.currentMonthReloanSanctionAmount ??
          data.amountSanctioned?.reloan ??
          0,
        currentMonthSanctionDateRange:
          data.additionalMetrics?.currentMonthSanctionDateRange || null,
        repaymentAmount: data.repaymentAmount || {
          total: 0,
          fresh: 0,
          reloan: 0,
          percentages: { fresh: 0, reloan: 0 },
        },
        pendingSanctionPfAmount:
          data.additionalMetrics?.pendingSanctionPfAmount || 0,
      },
      pieChartData: [
        {
          name: "Disbursed",
          value: data.applicationsDisbursed?.total || 0,
        },
        {
          name: "Pending",
          value: data.pendingApplications?.total || 0,
        },
        {
          name: "Rejected",
          value: data.rejectedApplications?.total || 0,
        },
      ],
    };
  }, [dashboardData]);

  const repaymentVsDisbursedPercentage = useMemo(() => {
    const disbursedTotal = Number(stats?.amountDisbursed?.total || 0);
    const repaymentTotal = Number(stats?.repaymentAmount?.total || 0);
    if (!disbursedTotal) return null;
    return ((repaymentTotal - disbursedTotal) / disbursedTotal) * 100;
  }, [stats]);

  const processingFeeVsSanctionedPercentage = useMemo(() => {
    const sanctionedTotal = Number(stats?.amountSanctioned?.total || 0);
    const feeTotal = Number(stats?.processingFeeCollected?.total || 0);
    if (!sanctionedTotal) return null;
    return (feeTotal / sanctionedTotal) * 100;
  }, [stats]);

  const showMonthlyTargetBar = useMemo(() => {
    const target = Number(stats?.targetAmount || 0);
    if (!target || !MONTHLY_TARGET_TIME_PERIODS.has(timePeriod)) return false;
    return isDateRangeInCurrentMonth(stats?.currentMonthSanctionDateRange);
  }, [stats, timePeriod]);

  const getTargetTone = (percent) =>
    percent >= 95 ? "green" : percent >= 85 ? "amber" : "red";

  const monthlyTargetProgress = useMemo(() => {
    const target = Number(stats?.targetAmount || 0);
    const freshTarget = Number(stats?.freshTargetAmount || 0);
    const reloanTarget = Number(stats?.reloanTargetAmount || 0);

    // Always use month-to-date from additionalMetrics so Today/Monthly stay in sync
    const current = Number(
      stats?.currentMonthSanctionAmount ?? stats?.amountSanctioned?.total ?? 0
    );
    const freshCurrent = Number(
      stats?.currentMonthFreshSanctionAmount ??
        stats?.amountSanctioned?.fresh ??
        0
    );
    const reloanCurrent = Number(
      stats?.currentMonthReloanSanctionAmount ??
        stats?.amountSanctioned?.reloan ??
        0
    );

    const percent = target > 0 ? (current / target) * 100 : 0;
    const freshPercent =
    freshTarget > 0 ? (freshCurrent / freshTarget) * 100 : 0;
    const reloanPercent =
      reloanTarget > 0 ? (reloanCurrent / reloanTarget) * 100 : 0;

    return {
      target,
      current,
      percent,
      tone: getTargetTone(percent),
      fresh: {
        target: freshTarget,
        current: freshCurrent,
        percent: freshPercent,
        tone: getTargetTone(freshPercent),
      },
      reloan: {
        target: reloanTarget,
        current: reloanCurrent,
        percent: reloanPercent,
        tone: getTargetTone(reloanPercent),
      },
    };
  }, [stats]);

  const monthlyTargetToneStyles = {
    red: {
      accent: "bg-red-500",
      text: "text-red-600",
      soft: "bg-red-50 text-red-700 ring-1 ring-red-200",
      track: "bg-red-100",
      fill: "bg-gradient-to-r from-red-500 to-rose-500",
    },
    amber: {
      accent: "bg-amber-500",
      text: "text-amber-600",
      soft: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      track: "bg-amber-100",
      fill: "bg-gradient-to-r from-amber-400 to-orange-500",
    },
    green: {
      accent: "bg-emerald-500",
      text: "text-emerald-600",
      soft: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
      track: "bg-emerald-100",
      fill: "bg-gradient-to-r from-emerald-500 to-teal-500",
    },
  };

  const monthlyTargetItems = useMemo(
    () => [
      {
        key: "overall",
        label: "Overall",
        current: monthlyTargetProgress.current,
        target: monthlyTargetProgress.target,
        percent: monthlyTargetProgress.percent,
        tone: monthlyTargetProgress.tone,
      },
      {
        key: "fresh",
        label: "Fresh",
        current: monthlyTargetProgress.fresh.current,
        target: monthlyTargetProgress.fresh.target,
        percent: monthlyTargetProgress.fresh.percent,
        tone: monthlyTargetProgress.fresh.tone,
      },
      {
        key: "reloan",
        label: "Reloan",
        current: monthlyTargetProgress.reloan.current,
        target: monthlyTargetProgress.reloan.target,
        percent: monthlyTargetProgress.reloan.percent,
        tone: monthlyTargetProgress.reloan.tone,
      },
    ],
    [monthlyTargetProgress]
  );

  const handleTimePeriodChange = (period) => {
    setTimePeriod(period);
    // try {
    //   localStorage.setItem("dashboardTimePeriod", period);
    // } catch (err) {}
    if (period === "Date Range") {
      setShowDatePicker(true);
    } else {
      setDateRange({ startDate: null, endDate: null });
      // try {
      //   localStorage.removeItem("dashboardDateRange");
      // } catch (err) {}
    }
  };

  const handleDateRangeSelect = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    // try {
    //   localStorage.setItem(
    //     "dashboardDateRange",
    //     JSON.stringify({ startDate, endDate })
    //   );
    // } catch (err) {}
    setShowDatePicker(false);
  };

  const getDashboardFilterContext = () => {
    const fixedRange = getFixedRangeForTimePeriod(timePeriod);
    const isCustomRange = isCustomDateTimePeriod(timePeriod);

    return {
      time: isCustomRange ? "customDate" : timePeriod.toLowerCase(),
      startDate: fixedRange?.startDate || dateRange.startDate,
      endDate: fixedRange?.endDate || dateRange.endDate,
    };
  };

  const handleMyPerformanceClick = async () => {
    try {
      let currentEmployeeId = employeeId;
      if (!currentEmployeeId) {
        const profile = await getProfile();
        currentEmployeeId = profile?.data?.id;
      }

      const { time, startDate, endDate } = getDashboardFilterContext();
      const caseType = "";
      const myPerformanceData = await getAdminDashboardDetails(
        time,
        startDate,
        endDate,
        caseType,
        "INDIVIDUAL_PERFORMANCE",
        currentEmployeeId
      );

      navigate("/sales-ops/my-performance", {
        state: {
          time,
          startDate,
          endDate,
          caseType,
          category: "INDIVIDUAL_PERFORMANCE",
          employee_id: currentEmployeeId,
          myPerformanceData,
        },
      });
    } catch (error) {
      navigate("/sales-ops/my-performance");
    }
  };

  const handleTeamPerformanceClick = async () => {
    try {
      let currentEmployeeId = employeeId;
      if (!currentEmployeeId) {
        const profile = await getProfile();
        currentEmployeeId = profile?.data?.id;
      }

      const teamPerformanceData = await getAdminDashboardDetails(
        "today",
        null,
        null,
        null,
        "TEAM_PERFORMANCE",
        currentEmployeeId
      );

      navigate("/sales-ops/team-performance", {
        state: {
          time: "today",
          category: "TEAM_PERFORMANCE",
          employee_id: currentEmployeeId,
          teamPerformanceData,
        },
      });
    } catch (error) {
      navigate("/sales-ops/team-performance");
    }
  };

  const handlePendingLeadsClick = (caseTypeParam = null) => {
    const baseState = {
      timePeriod: isCustomDateTimePeriod(timePeriod)
        ? "customDate"
        : timePeriod.toLowerCase(),
      startDate:
        getFixedRangeForTimePeriod(timePeriod)?.startDate || dateRange.startDate,
      endDate: getFixedRangeForTimePeriod(timePeriod)?.endDate || dateRange.endDate,
    };

    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam }
      : baseState;

    navigate(
      isAdminRole ? "/admin/pending-leads" : "/sales-ops/pending-leads",
      { state }
    );
  };

  const handleRejectedLeadsClick = (
    caseTypeParam = null,
    dashboardStatusParam = "REJECTED"
  ) => {
    const baseState = {
      timePeriod: isCustomDateTimePeriod(timePeriod)
        ? "customDate"
        : timePeriod.toLowerCase(),
      startDate:
        getFixedRangeForTimePeriod(timePeriod)?.startDate || dateRange.startDate,
      endDate: getFixedRangeForTimePeriod(timePeriod)?.endDate || dateRange.endDate,
    };

    const state = caseTypeParam
      ? {
        ...baseState,
        caseType: caseTypeParam,
        dashboardStatus: dashboardStatusParam,
      }
      : { ...baseState, dashboardStatus: dashboardStatusParam };

    navigate(
      isAdminRole ? "/admin/rejected-leads" : "/sales-ops/rejected-leads",
      { state }
    );
  };

  const handleDisbursedLeadsClick = (caseTypeParam = null) => {
    const baseState = {
      timePeriod: isCustomDateTimePeriod(timePeriod)
        ? "customDate"
        : timePeriod.toLowerCase(),
      startDate:
        getFixedRangeForTimePeriod(timePeriod)?.startDate || dateRange.startDate,
      endDate: getFixedRangeForTimePeriod(timePeriod)?.endDate || dateRange.endDate,
    };

    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam }
      : baseState;

    navigate(
      isAdminRole ? "/admin/disbursed-leads" : "/sales-ops/disbursed-leads",
      {
        state,
      }
    );
  };

  const handleTotalLeadsClick = (caseTypeParam = null) => {
    const baseState = {
      timePeriod: isCustomDateTimePeriod(timePeriod)
        ? "customDate"
        : timePeriod.toLowerCase(),
      startDate:
        getFixedRangeForTimePeriod(timePeriod)?.startDate || dateRange.startDate,
      endDate: getFixedRangeForTimePeriod(timePeriod)?.endDate || dateRange.endDate,
    };

    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam }
      : baseState;

    navigate(isAdminRole ? "/admin/total-leads" : "/sales-ops/total-leads", {
      state,
    });
  };

  const handleNotTakingReloanLeadsClick = (caseTypeParam = null) => {
    const baseState = {
      timePeriod: isCustomDateTimePeriod(timePeriod)
        ? "customDate"
        : timePeriod.toLowerCase(),
      startDate:
        getFixedRangeForTimePeriod(timePeriod)?.startDate || dateRange.startDate,
      endDate: getFixedRangeForTimePeriod(timePeriod)?.endDate || dateRange.endDate,
    };

    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam }
      : baseState;

    navigate(
      isAdminRole
        ? "/admin/not-taking-reloan-leads"
        : "/sales-ops/not-taking-reloan-leads",
      { state }
    );
  };

  const handlePendingSanctionAmountClick = (caseTypeParam = null) => {
    const baseState = {
      timePeriod: isCustomDateTimePeriod(timePeriod)
        ? "customDate"
        : timePeriod.toLowerCase(),
      startDate:
        getFixedRangeForTimePeriod(timePeriod)?.startDate || dateRange.startDate,
      endDate: getFixedRangeForTimePeriod(timePeriod)?.endDate || dateRange.endDate,
    };

    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam }
      : baseState;

    navigate(
      isAdminRole
        ? "/admin/pending-sanction-amount"
        : "/sales-ops/pending-sanction-amount",
      { state }
    );
  };

  const handlePendingDisbursalAmountClick = (caseTypeParam = null) => {
    const baseState = {
      timePeriod: isCustomDateTimePeriod(timePeriod)
        ? "customDate"
        : timePeriod.toLowerCase(),
      startDate:
        getFixedRangeForTimePeriod(timePeriod)?.startDate || dateRange.startDate,
      endDate: getFixedRangeForTimePeriod(timePeriod)?.endDate || dateRange.endDate,
    };

    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam, customType: caseTypeParam }
      : baseState;

    navigate(
      isAdminRole
        ? "/admin/pending-disbursal-amount"
        : "/sales-ops/pending-disbursal-amount",
      { state }
    );
  };

  const handleLoanAmountDistributionClick = (caseTypeParam = null) => {
    const baseState = {
      timePeriod: isCustomDateTimePeriod(timePeriod)
        ? "customDate"
        : timePeriod.toLowerCase(),
      startDate:
        getFixedRangeForTimePeriod(timePeriod)?.startDate || dateRange.startDate,
      endDate: getFixedRangeForTimePeriod(timePeriod)?.endDate || dateRange.endDate,
    };

    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam, customType: caseTypeParam }
      : baseState;

    navigate(
      isAdminRole
        ? "/admin/loan-amount-distribution"
        : "/sales-ops/loan-amount-distribution",
      { state }
    );
  };

  const handleAssignedLeadsClick = (view = null) => {
    navigate("/admin/assigned-leads", {
      state: view ? { view } : {},
    });
  };

  const navigateWithCaseType = (path, caseType) => {
    navigate(path, {
      state: {
        timePeriod: isCustomDateTimePeriod(timePeriod)
          ? "customDate"
          : timePeriod.toLowerCase(),
        startDate:
          getFixedRangeForTimePeriod(timePeriod)?.startDate || dateRange.startDate,
        endDate: getFixedRangeForTimePeriod(timePeriod)?.endDate || dateRange.endDate,
        caseType,
      },
    });
  };

  const getDisplayText = () => {
    if (
      timePeriod === "Date Range" &&
      dateRange.startDate &&
      dateRange.endDate
    ) {
      return `${dateRange.startDate} to ${dateRange.endDate}`;
    }
    if (timePeriod === "Last Year") {
      return "Last Year";
    }
    if (timePeriod === "Overall") {
      return `Overall`;
    }
    return timePeriod;
  };

  const formatCurrencyCompact = (value, decimals = 0) => {
    const num = Number(value || 0);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(decimals)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(decimals)}L`;
    return `₹${num.toLocaleString()}`;
  };

  if (isDashboardLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto min-h-screen max-w-full bg-slate-50 px-4 sm:px-2 lg:px-4">
        {/* Header with Time Period Dropdown */}
        <div className="rounded-2xl bg-slate-50 p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h1 className="min-w-0 shrink-0 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                Dashboard
              </h1>

              {showMonthlyTargetBar && (
                <div className="mx-3 hidden min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
                  <div className="flex items-stretch">
                    <div className="flex shrink-0 flex-col justify-center border-r border-slate-200 bg-white px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Monthly Target
                      </p>
                      <p className="mt-1 text-sm font-semibold tracking-tight text-slate-900">
                        Sanction
                      </p>
                    </div>

                    <div className="grid min-w-0 flex-1 grid-cols-3">
                      {monthlyTargetItems.map((item, index) => (
                        <div
                          key={item.key}
                          className={`relative min-w-0 px-4 py-3 ${
                            index > 0 ? "border-l border-slate-200" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {item.label}
                              </p>
                              <p className="mt-1 truncate text-[13px] font-semibold tabular-nums tracking-tight text-slate-900">
                                {formatCurrencyCompact(item.current, 2)}
                                <span className="mx-1 font-medium text-slate-400">
                                  /
                                </span>
                                <span className="text-slate-600">
                                  {formatCurrencyCompact(item.target)}
                                </span>
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${monthlyTargetToneStyles[item.tone].soft}`}
                            >
                              {item.percent.toFixed(0)}%
                            </span>
                          </div>
                          <div
                            className={`mt-2.5 h-1 w-full overflow-hidden rounded-full ${monthlyTargetToneStyles[item.tone].track}`}
                            role="progressbar"
                            aria-valuenow={Math.round(item.percent)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${item.label} monthly sanction target progress`}
                          >
                            <div
                              className={`h-full rounded-full transition-[width] duration-500 ease-out ${monthlyTargetToneStyles[item.tone].fill}`}
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex min-w-0 shrink-0 items-center gap-2 sm:flex-nowrap sm:justify-end sm:gap-3">
                {!isAdminRole && (
                  <>
                    <button
                      type="button"
                      onClick={handleMyPerformanceClick}
                      className="rounded-xl border px-3 py-2 text-sm shadow-sm transition-all duration-300 sm:px-5 sm:py-2.5 sm:text-base cursor-pointer">
                      My Performance
                    </button>
                    {isTeamLead && (
                        <button
                        type="button"
                        onClick={handleTeamPerformanceClick}
                        className="rounded-xl border border-gray-200/50 bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm transition-all duration-300 hover:bg-white sm:px-5 sm:py-2.5 sm:text-base cursor-pointer"
                        >
                          Team Performance
                        </button>
                      )}
                  </>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm transition-all duration-200 hover:bg-slate-100 cursor-pointer sm:px-4 sm:py-2.5 sm:text-base">
                    <span className="max-w-[110px] truncate text-sm font-medium text-slate-700 sm:max-w-none">
                      {getDisplayText()}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-xl border border-slate-200 bg-white shadow-lg">
                    {TIME_PERIODS.map((period) => (
                      <DropdownMenuItem
                        key={period.value}
                        onClick={() => handleTimePeriodChange(period?.value)}
                        className="cursor-pointer px-4 py-3 text-slate-700 transition-all duration-200 hover:bg-slate-50 font-medium"
                      >
                        {period?.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {showMonthlyTargetBar && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3.5 py-2.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Monthly Target
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      Sanction Progress
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums ${monthlyTargetToneStyles[monthlyTargetProgress.tone].soft}`}
                  >
                    {monthlyTargetProgress.percent.toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {monthlyTargetItems.map((item) => (
                    <div key={item.key} className="relative px-3.5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {item.label}
                        </p>
                        <span
                          className={`text-xs font-semibold tabular-nums ${monthlyTargetToneStyles[item.tone].text}`}
                        >
                          {item.percent.toFixed(0)}%
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrencyCompact(item.current, 2)}
                        <span className="mx-1 font-medium text-slate-400">/</span>
                        <span className="text-slate-600">
                          {formatCurrencyCompact(item.target)}
                        </span>
                      </p>
                      <div
                        className={`mt-2 h-1 w-full overflow-hidden rounded-full ${monthlyTargetToneStyles[item.tone].track}`}
                        role="progressbar"
                        aria-valuenow={Math.round(item.percent)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${item.label} monthly sanction target progress`}
                      >
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ease-out ${monthlyTargetToneStyles[item.tone].fill}`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Total Applications
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {stats?.applications?.total?.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Disbursed Amount
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatCurrencyCompact(stats?.amountDisbursed?.total)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Pending Cases
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {stats?.pendingApplications?.total?.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Collection
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatCurrencyCompact(stats?.collectionAmount?.total)}
              </p>
            </div>
          </div> */}
        </div>

        {/* Main Stats Grid */}
        <style>{`
          @media screen and (width: 1024px) and (height: 591px) {
            .stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          }
        `}</style>
        <div className="stats-grid mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isAdminRole && (
            <StatCard
              title="Amount Sanctioned"
              value={`₹${Math.ceil(
                stats?.amountSanctioned?.total || 0
              ).toLocaleString()}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-green-600 to-emerald-500"
              onClick={() => handleDisbursedLeadsClick()}
              className="cursor-pointer"
              freshReloanData={stats?.amountSanctioned}
              onFreshClick={() => handleDisbursedLeadsClick("fresh")}
              onReloanClick={() => handleDisbursedLeadsClick("reloan")}
            />
          )}
          {isAdminRole && (
            <StatCard
              title="Amount Disbursed"
              value={`₹${stats?.amountDisbursed?.total?.toLocaleString()}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-[#011c3c] to-cyan-700"
              onClick={() => handleDisbursedLeadsClick()}
              className="cursor-pointer"
              freshReloanData={stats?.amountDisbursed}
              onFreshClick={() => handleDisbursedLeadsClick("fresh")}
              onReloanClick={() => handleDisbursedLeadsClick("reloan")}
            />
          )}

          {isAdminRole && (
            <StatCard
              title="Processing Fee Collected"
              value={`₹${stats?.processingFeeCollected?.total?.toLocaleString()}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-yellow-500 to-orange-400"
              onClick={() => handleDisbursedLeadsClick()}
              className="cursor-pointer"
              freshReloanData={stats?.processingFeeCollected}
              onFreshClick={() => handleDisbursedLeadsClick("fresh")}
              onReloanClick={() => handleDisbursedLeadsClick("reloan")}
              percentage={processingFeeVsSanctionedPercentage}
            />
          )}

          {isAdminRole && (
            <StatCard
              title="GST Collected"
              value={`₹${stats?.gstCollected?.total?.toLocaleString()}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-[#011c3c] to-[#024ba1]"

              className="cursor-pointer"
              freshReloanData={stats?.gstCollected}
              onFreshClick={() => handleDisbursedLeadsClick("fresh")}
              onReloanClick={() => handleDisbursedLeadsClick("reloan")}
            />
          )}

          {isAdminRole && (
            <StatCard
              title="Repayment Amount"
              value={`₹${stats?.repaymentAmount?.total?.toLocaleString()}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-teal-700 to-cyan-700"
              freshReloanData={stats?.repaymentAmount}
              percentage={repaymentVsDisbursedPercentage}
              onFreshClick={() => handleDisbursedLeadsClick('fresh')}
              onReloanClick={() => handleDisbursedLeadsClick('reloan')}
            />
          )}

          <StatCard
            title="Pending Sanction Amount"
            value={`₹${Math.ceil(stats?.pendingSanctionAmount?.total || 0).toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-orange-500 to-red-400"
            onClick={() => handlePendingSanctionAmountClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.pendingSanctionAmount}
            onFreshClick={() => handlePendingSanctionAmountClick('fresh')}
            onReloanClick={() => handlePendingSanctionAmountClick('reloan')}
          />

          <StatCard
            title="Pending Disbursal Amount"
            value={`₹${stats?.pendingDisbursalAmount?.total?.toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-amber-500 to-yellow-400"
            onClick={() => handlePendingDisbursalAmountClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.pendingDisbursalAmount}
            onFreshClick={() => handlePendingDisbursalAmountClick('fresh')}
            onReloanClick={() => handlePendingDisbursalAmountClick('reloan')}
          />

          {isAdminRole && (
            <StatCard
              title="Average Loan Size"
              value={`₹${Math.round(stats?.averageLoanSize?.total)}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-cyan-500 to-[#024ba1]"
              // onClick={() => handleLoanAmountDistributionClick()}
              className="cursor-pointer hover:scale-105 transition-transform duration-200"
              freshReloanData={stats?.averageLoanSize}
            />
          )}

          {isAdminRole && (
            <StatCard
              title="Recovered Amount"
              value={`₹${stats?.collectionAmount?.total?.toLocaleString()}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-[#011c3c] to-[#024ba1]"
              className="cursor-pointer hover:scale-105 transition-transform duration-200"
              freshReloanData={stats?.collectionAmount}
              counts={stats?.collectionAmount?.counts}
            // paymentStatus={stats?.collectionAmount?.paymentStatus}
            // monthlyBreakdown={recoveredMonthly}
            />
          )}

          {isAdminRole && (
            <StatCard
              title="Recovered Amount Breakup"
              value={`₹${stats?.collectionAmount?.total?.toLocaleString()}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-[#011c3c] to-[#024ba1]"
              className="hover:scale-105 transition-transform duration-200"
              paymentStatus={stats?.collectionAmount?.paymentStatus}
              paymentStatusAmount={stats?.collectionAmount?.paymentStatusAmount}
              onPaymentStatusClick={handlePaymentStatusClick}
              hideMainValue={false}
            />
          )}

          {isAdminRole && (
            <StatCard
              title="Recovered Overdues Monthwise"
              value={`₹${Math.ceil(Number(
                stats?.collectionAmount?.paymentStatusAmount?.overdueAmount || 0
              ))}`}
              icon={Clock}
              gradient="bg-gradient-to-br from-amber-600 to-red-500"
              className="hover:scale-105 transition-transform duration-200"
              monthlyBreakdown={(stats?.collectionAmount?.overdueByMonth || [])
                .filter((row) => Number(row?.overdueAmount || 0) !== 0)
                .map((row) => ({
                  label: row?.month || "-",
                  value: Number(row?.overdueAmount || 0),
                  count: Number(row?.overdueCount || 0),
                }))}
              onMonthClick={handleOverdueMonthClick}
            />
          )}

          {isAdminRole && (
            <StatCard
              title="Total Earnings"
              value={`₹${stats?.totalEarning?.total?.toLocaleString()}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-[#b38b6d] to-[#7e6651]"
              className="cursor-pointer hover:scale-105 transition-transform duration-200"
              freshReloanData={stats?.totalEarning}
            />
          )}

          <StatCard
            title="Applications"
            value={`${stats?.applications?.total?.toLocaleString()}`}
            icon={ShieldUser}
            gradient="bg-gradient-to-br from-[#011c3c] to-cyan-700"
            onClick={() => handleTotalLeadsClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.applications}
            onFreshClick={() => handleTotalLeadsClick('fresh')}
            onReloanClick={() => handleTotalLeadsClick('reloan')}
          />

          <StatCard
            title="Pending Applications"
            value={stats?.pendingApplications?.total}
            icon={CircleDotDashed}
            gradient="bg-gradient-to-br from-yellow-500 to-orange-400"
            onClick={() => handlePendingLeadsClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.pendingApplications}
            onFreshClick={() => handlePendingLeadsClick('fresh')}
            onReloanClick={() => handlePendingLeadsClick('reloan')}
          />

          <StatCard
            title="Rejected Applications"
            value={`${stats?.rejectedApplications?.total?.toLocaleString()}`}
            icon={ShieldUser}
            gradient="bg-gradient-to-br from-red-700 to-red-500"
            onClick={() => handleRejectedLeadsClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.rejectedApplications}
            onFreshClick={() => handleRejectedLeadsClick('fresh')}
            onReloanClick={() => handleRejectedLeadsClick('reloan')}
          />

          <StatCard
            title="BRE Rejected Leads"
            value={`${stats?.breRejectedLeads?.total?.toLocaleString()}`}
            icon={Shield}
            gradient="bg-gradient-to-br from-stone-700 to-neutral-500"
            onClick={() => handleRejectedLeadsClick(null, "BRE_REJECTED")}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.breRejectedLeads}
            onFreshClick={() =>
              handleRejectedLeadsClick("fresh", "BRE_REJECTED")
            }
            onReloanClick={() =>
              handleRejectedLeadsClick("reloan", "BRE_REJECTED")
            }
          />

          {/* <StatCard
            title="Not Taking Reloan"
            value={`${stats?.notTakingReloanLeads?.total?.toLocaleString() ?? 0}`}
            icon={Ban}
            gradient="bg-gradient-to-br from-rose-800 to-orange-700"
            onClick={() => handleNotTakingReloanLeadsClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={
              stats?.notTakingReloanLeads?.percentages
                ? stats.notTakingReloanLeads
                : null
            }
            onFreshClick={() => handleNotTakingReloanLeadsClick("fresh")}
            onReloanClick={() => handleNotTakingReloanLeadsClick("reloan")}
          /> */}
          <StatCard
            title="Applications Disbursed"
            value={`${stats?.applicationsDisbursed?.total?.toLocaleString()}`}
            icon={CircleCheckBig}
            gradient="bg-gradient-to-br from-green-500 to-teal-400"
            onClick={() => handleDisbursedLeadsClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.applicationsDisbursed}
            onFreshClick={() => handleDisbursedLeadsClick("fresh")}
            onReloanClick={() => handleDisbursedLeadsClick("reloan")}
          />

          {isAdminRole && (
            <StatCard
              title="Fresh Customer Landing"
              value={`${stats?.freshCustomerLanding?.total?.toLocaleString()}`}
              icon={ShieldUser}
              gradient="bg-gradient-to-br from-[#419E98] to-[#B8DDDC]"
              className="cursor-pointer hover:scale-105 transition-transform duration-200"
              freshReloanData={stats?.freshCustomerLanding}
            />
          )}

          {isAdminRole && (
            <StatCard
              title="Average Tenure"
              value={`${Math.round(stats?.averageTenure?.total)} days`}
              icon={Clock}
              gradient="bg-gradient-to-br from-slate-600 to-gray-500"
              freshReloanData={stats?.averageTenure}
            />
          )}

          {/* {isAdminRole && (
            <StatCard
              title="Disposed Leads"
              value={`${stats?.disposedLeads?.total?.toLocaleString()}`}
              icon={Trash2}
              gradient="bg-gradient-to-br from-gray-600 to-slate-500"
              className="cursor-pointer hover:scale-105 transition-transform duration-200"
              freshReloanData={stats?.disposedLeads}
            />
          )} */}

          {isAdminRole && (
            <StatCard
              title="Unassigned Leads"
              value={`${stats?.unassignedLeads?.total?.toLocaleString()}`}
              icon={UserX}
              gradient="bg-gradient-to-br from-[#757F9A] to-[#D7DDE8]"
              className="cursor-pointer hover:scale-105 transition-transform duration-200"
              freshReloanData={stats?.unassignedLeads}
            />
          )}

          {/* {isAdminRole && (
            <StatCard
              title="Assigned Leads"
              value={`${stats?.assignedLeads?.total?.toLocaleString()}`}
              icon={UserCheck}
              gradient="bg-gradient-to-br from-[#011c3c] to-[#024ba1]"
              className="cursor-pointer hover:scale-105 transition-transform duration-200"
              freshReloanData={stats?.assignedLeads}
              onClick={() => handleAssignedLeadsClick()}
              onFreshClick={() => handleAssignedLeadsClick("fresh")}
              onReloanClick={() => handleAssignedLeadsClick("reloan")}
            />
          )} */}

          {/* {isAdminRole && (
            <StatCard
              title="Insurance Collected"
              value={`₹${stats?.insuranceCollected?.total?.toLocaleString()}`}
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-pink-600 to-rose-500"
              className="cursor-pointer"
              freshReloanData={stats?.insuranceCollected}
            />
          )} */}

          {/* <StatCard
            title="Target Amount"
            value={`₹${stats?.targetAmount?.toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-[#011c3c] to-[#024ba1]"
          /> */}

          {/* {isAdminRole && <StatCard
            title="Pending Sanction PF Amount"
            value={`₹${stats?.pendingSanctionPfAmount?.toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-[#011c3c] to-[#024ba1]"
          />} */}
        </div>

        {/* Charts and Additional Stats Section */}
        <div className="">
          {!isSalesRole && (
            <div className="mt-6 lg:col-span-2">
              <Card className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                      <LineChartIcon className="h-5 w-5 shrink-0 text-slate-600" />
                      Day-wise sanction amount
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-sm">
                      Total loan amount by sanction date (hover a point for sanction
                      count)
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm transition-all duration-200 hover:bg-slate-100 cursor-pointer sm:px-4 sm:py-2.5">
                      <span className="max-w-[200px] truncate text-sm font-medium text-slate-700 sm:max-w-none">
                        {getDisbursalFilterDisplayText()}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 rounded-xl border border-slate-200 bg-white shadow-lg"
                    >
                      {DISBURSAL_TIME_OPTIONS.map((opt) => (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={() => handleDisbursalTimeChange(opt.value)}
                          className="cursor-pointer px-4 py-3 font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px] md:h-[400px] w-full">
                    {isDisbursalChartLoading ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">
                        Loading chart…
                      </div>
                    ) : disbursalChartRows.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">
                        No disbursal data for this period.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={disbursalChartRows}
                          margin={{ top: 8, right: 12, left: 4, bottom: 48 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="disbursal_date"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            interval="preserveStartEnd"
                            angle={-35}
                            textAnchor="end"
                            height={56}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            tickFormatter={(v) => formatCurrencyCompact(v)}
                            width={72}
                          />
                          <Tooltip
                            content={disbursalTooltipContent}
                            wrapperStyle={{ zIndex: 20, pointerEvents: "none" }}
                            allowEscapeViewBox={{ x: false, y: false }}
                          />
                          <Line
                            type="monotone"
                            dataKey="total_loan_amount"
                            name="Total loan amount"
                            stroke="#024697"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#024697", strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pie Chart Card */}
          <div className="lg:col-span-2">
            <Card className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-semibold text-slate-900">
                  Status Distribution
                </CardTitle>
                <CardDescription className="text-slate-500 text-sm">
                  Current application status overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] md:h-[400px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={window.innerWidth < 768 ? 60 : 90}
                        outerRadius={window.innerWidth < 768 ? 90 : 120}
                        fill="#8884d8"
                        paddingAngle={6}
                        dataKey="value"
                        label={({ name, percent }) => {
                          const percentage = (percent * 100).toFixed(0);
                          return window.innerWidth < 768
                            ? `${percentage}%`
                            : `${name}: ${percentage}%`;
                        }}
                        labelLine={false}
                      >
                        {pieChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(8px)",
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                          padding: "12px",
                          fontSize: "14px",
                        }}
                      // formatter={(value, name) => [`${name}: ${(value * 100).toFixed(0)}%`, 'Status']}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          fontSize: window.innerWidth < 768 ? "10px" : "12px",
                          paddingTop: "20px",
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Date Range Picker Modal */}
        {showDatePicker && (
          <DateRangePicker
            onDateRangeSelect={handleDateRangeSelect}
            onClose={(datesSelected) => {
              setShowDatePicker(false);
              // If timePeriod is "Date Range" and no dates were selected (closed via X), reset to "Today" to trigger API call
              if (!datesSelected && timePeriod === "Date Range" && (!dateRange.startDate || !dateRange.endDate)) {
                setTimePeriod("Today");
                setDateRange({ startDate: null, endDate: null });
              }
            }}
          />
        )}
        {showDisbursalDatePicker && (
          <DateRangePicker
            onDateRangeSelect={handleDisbursalDateRangeSelect}
            onClose={(datesSelected) => {
              setShowDisbursalDatePicker(false);
              if (
                !datesSelected &&
                disbursalTimePeriod === "Date Range" &&
                (!disbursalDateRange.startDate || !disbursalDateRange.endDate)
              ) {
                setDisbursalTimePeriod("This Month");
                setDisbursalDateRange({ startDate: null, endDate: null });
              }
            }}
          />
        )}

        {selectedOverdueMonth && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeOverdueModal();
            }}
          >
            <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Day-wise Recovered Overdues
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedOverdueMonth}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeOverdueModal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-5">
                {isOverdueDayWiseLoading ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    Loading day-wise data...
                  </div>
                ) : overdueDayWiseRows.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    No day-wise overdue data found for this month.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap w-12">
                            S.No.
                          </th>
                          {overdueDayWiseColumns.map((column) => {
                            const isSortable =
                              Boolean(getOverdueSortableColumnMeta(column));
                            const isActive =
                              overdueDayWiseSort.column === column;
                            return (
                              <th
                                key={column}
                                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap ${
                                  isSortable
                                    ? "cursor-pointer select-none hover:bg-slate-100/80"
                                    : ""
                                }`}
                                onClick={() =>
                                  isSortable && handleOverdueDayWiseSort(column)
                                }
                                aria-sort={
                                  isSortable && isActive
                                    ? overdueDayWiseSort.order === "asc"
                                      ? "ascending"
                                      : "descending"
                                    : undefined
                                }
                              >
                                {isSortable ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <span>
                                      {formatOverdueCellLabel(column)}
                                    </span>
                                    {isActive &&
                                    overdueDayWiseSort.order === "asc" ? (
                                      <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                                    ) : isActive &&
                                      overdueDayWiseSort.order === "desc" ? (
                                      <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                                    ) : (
                                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                    )}
                                  </div>
                                ) : (
                                  formatOverdueCellLabel(column)
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {overdueDayWiseRows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                              {rowIndex + 1}
                            </td>
                            {overdueDayWiseColumns.map((column) => (
                              <td
                                key={`${rowIndex}-${column}`}
                                className="px-4 py-3 text-slate-800 whitespace-nowrap"
                              >
                                {formatOverdueCellValue(column, row[column])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {selectedPaymentStatus && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closePaymentStatusModal();
            }}
          >
            <div className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Recovered Amount —{" "}
                    {PAYMENT_STATUS_LABELS[selectedPaymentStatus] ||
                      selectedPaymentStatus}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {paymentStatusListParams?.fromDate &&
                    paymentStatusListParams?.toDate
                      ? `${paymentStatusListParams.fromDate} to ${paymentStatusListParams.toDate}`
                      : getDisplayText()}
                    {paymentStatusListRows.length
                      ? ` · ${paymentStatusListRows.length} records`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePaymentStatusModal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-5">
                {isPaymentStatusListLoading ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    Loading collection list...
                  </div>
                ) : paymentStatusListRows.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    No collections found for this payment status.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap w-12">
                            S.No.
                          </th>
                          {paymentStatusListColumns.map((column) => {
                            const normalized = String(column || "")
                              .toLowerCase()
                              .replace(/[^a-z0-9]/g, "");
                            const isSortable = Boolean(
                              PAYMENT_STATUS_SORTABLE_COLUMNS[normalized]
                            );
                            const isActive =
                              paymentStatusListSort.column === column;
                            return (
                              <th
                                key={column}
                                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap ${
                                  isSortable
                                    ? "cursor-pointer select-none hover:bg-slate-100/80"
                                    : ""
                                }`}
                                onClick={() =>
                                  isSortable &&
                                  handlePaymentStatusListSort(column)
                                }
                                aria-sort={
                                  isSortable && isActive
                                    ? paymentStatusListSort.order === "asc"
                                      ? "ascending"
                                      : "descending"
                                    : undefined
                                }
                              >
                                {isSortable ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <span>
                                      {formatOverdueCellLabel(column)}
                                    </span>
                                    {isActive &&
                                    paymentStatusListSort.order === "asc" ? (
                                      <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                                    ) : isActive &&
                                      paymentStatusListSort.order ===
                                        "desc" ? (
                                      <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                                    ) : (
                                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                    )}
                                  </div>
                                ) : (
                                  formatOverdueCellLabel(column)
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {paymentStatusListRows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                              {rowIndex + 1}
                            </td>
                            {paymentStatusListColumns.map((column) => (
                              <td
                                key={`${rowIndex}-${column}`}
                                className="px-4 py-3 text-slate-800 whitespace-nowrap"
                              >
                                {formatOverdueCellValue(column, row[column])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
