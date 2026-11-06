import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Clock,
  IndianRupee,
  Shield,
  ShieldUser,
  CircleDotDashed,
  CircleCheckBig,
  UserX,
  ChevronDown,
} from "lucide-react";
import DashboardLayout from "../admin/components/DashboardLayout";
import DashboardSkeleton from "../../utils/DashboardSkeleton";
import StatCard from "../admin/components/StatCard";
import DateRangePicker from "../admin/components/DateRangePicker";
import MonthlyTargetBar from "../admin/components/MonthlyTargetBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../utils/dropdown-menu";
import { getAdminDashboardDetails } from "../../services/functions/admin";
import { getProfile } from "../../services/functions/user";
import {
  getCurrentIST,
  formatDateIST,
  getYesterdayIST,
  getLastMonthRangeIST,
} from "../../utils/istDateUtils";

const TIME_PERIODS = [
  { label: "Today", value: "Today" },
  { label: "Yesterday", value: "Yesterday" },
  { label: "Date Range", value: "Date Range" },
  { label: "This Week", value: "Weekly" },
  { label: "This Month", value: "Monthly" },
  { label: "Last Month", value: "Last Month" },
  { label: "This Year", value: "Yearly" },
  { label: "Last Year", value: "Last Year" },
  { label: "Overall", value: "Overall" },
];

export default function MyPerformance() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeTimePeriod = location.state?.time || "today";
  const normalizedTimePeriod =
    routeTimePeriod === "customDate"
      ? "Date Range"
      : routeTimePeriod.charAt(0).toUpperCase() + routeTimePeriod.slice(1);
  const [timePeriod, setTimePeriod] = useState(
    normalizedTimePeriod
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: location.state?.startDate || null,
    endDate: location.state?.endDate || null,
  });
  const [employeeId, setEmployeeId] = useState(location.state?.employee_id || null);
  const [responseData, setResponseData] = useState(location.state?.myPerformanceData || null);
  const [isLoading, setIsLoading] = useState(!location.state?.myPerformanceData);
  const payload = responseData?.data || responseData || {};

  useEffect(() => {
    const resolveEmployeeId = async () => {
      if (employeeId) return;
      try {
        const profile = await getProfile();
        setEmployeeId(profile?.data?.id || null);
      } catch (error) {
        setEmployeeId(null);
      }
    };
    resolveEmployeeId();
  }, [employeeId]);

  const isQueryEnabled =
    (timePeriod !== "Date Range" &&
      timePeriod !== "Last Year" &&
      timePeriod !== "Overall") ||
    Boolean(dateRange.startDate && dateRange.endDate) ||
    timePeriod === "Last Year" ||
    timePeriod === "Overall";

  useEffect(() => {
    const fetchMyPerformance = async () => {
      if (!employeeId || !isQueryEnabled) return;
      setIsLoading(true);
      try {
        if (timePeriod === "Date Range") {
          const data = await getAdminDashboardDetails(
            "customDate",
            dateRange.startDate,
            dateRange.endDate,
            null,
            "INDIVIDUAL_PERFORMANCE",
            employeeId
          );
          setResponseData(data);
          return;
        }
        if (timePeriod === "Last Month") {
          const { startStr, endStr } = getLastMonthRangeIST();
          const data = await getAdminDashboardDetails(
            "customDate",
            startStr,
            endStr,
            null,
            "INDIVIDUAL_PERFORMANCE",
            employeeId
          );
          setResponseData(data);
          return;
        }
        if (timePeriod === "Yesterday") {
          const yesterdayStr = getYesterdayIST();
          const data = await getAdminDashboardDetails(
            "customDate",
            yesterdayStr,
            yesterdayStr,
            null,
            "INDIVIDUAL_PERFORMANCE",
            employeeId
          );
          setResponseData(data);
          return;
        }
        if (timePeriod === "Last Year") {
          const data = await getAdminDashboardDetails(
            "customDate",
            "2025-06-01",
            "2025-12-31",
            null,
            "INDIVIDUAL_PERFORMANCE",
            employeeId
          );
          setResponseData(data);
          return;
        }
        if (timePeriod === "Overall") {
          const todayStr = formatDateIST(getCurrentIST());
          const data = await getAdminDashboardDetails(
            "customDate",
            "2025-06-01",
            todayStr,
            null,
            "INDIVIDUAL_PERFORMANCE",
            employeeId
          );
          setResponseData(data);
          return;
        }
        const data = await getAdminDashboardDetails(
          timePeriod.toLowerCase(),
          null,
          null,
          null,
          "INDIVIDUAL_PERFORMANCE",
          employeeId
        );
        setResponseData(data);
      } catch (error) {
        // keep old data on fetch failure
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyPerformance();
  }, [timePeriod, dateRange.startDate, dateRange.endDate, employeeId, isQueryEnabled]);

  const handleTimePeriodChange = (period) => {
    setTimePeriod(period);
    if (period === "Date Range") {
      setShowDatePicker(true);
    } else {
      setDateRange({ startDate: null, endDate: null });
    }
  };

  const handleDateRangeSelect = (startDate, endDate) => {
    setDateRange({ startDate, endDate });
    setShowDatePicker(false);
  };

  const getFilterState = () => ({
    timePeriod:
      timePeriod === "Date Range" ||
      timePeriod === "Yesterday" ||
      timePeriod === "Last Month" ||
      timePeriod === "Last Year" ||
      timePeriod === "Overall"
        ? "customDate"
        : timePeriod.toLowerCase(),
    startDate:
      timePeriod === "Yesterday"
        ? getYesterdayIST()
        : timePeriod === "Last Month"
          ? getLastMonthRangeIST().startStr
          : timePeriod === "Last Year"
            ? "2025-06-01"
            : timePeriod === "Overall"
              ? "2025-06-01"
              : dateRange.startDate,
    endDate:
      timePeriod === "Yesterday"
        ? getYesterdayIST()
        : timePeriod === "Last Month"
          ? getLastMonthRangeIST().endStr
          : timePeriod === "Last Year"
            ? "2025-12-31"
            : timePeriod === "Overall"
              ? formatDateIST(getCurrentIST())
              : dateRange.endDate,
    category: "INDIVIDUAL_PERFORMANCE",
    employee_id: employeeId,
  });

  const handlePendingLeadsClick = (caseTypeParam = null) => {
    const baseState = getFilterState();
    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam }
      : baseState;
    navigate("/sales-ops/pending-leads", { state });
  };

  const handleRejectedLeadsClick = (
    caseTypeParam = null,
    dashboardStatusParam = "REJECTED"
  ) => {
    const baseState = getFilterState();
    const state = caseTypeParam
      ? {
          ...baseState,
          caseType: caseTypeParam,
          dashboardStatus: dashboardStatusParam,
        }
      : { ...baseState, dashboardStatus: dashboardStatusParam };
    navigate("/sales-ops/rejected-leads", { state });
  };

  const handleDisbursedLeadsClick = (caseTypeParam = null) => {
    const baseState = getFilterState();
    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam }
      : baseState;
    navigate("/sales-ops/disbursed-leads", { state });
  };

  const handleTotalLeadsClick = (caseTypeParam = null) => {
    const baseState = getFilterState();
    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam }
      : baseState;
    navigate("/sales-ops/total-leads", { state });
  };

  const handlePendingSanctionAmountClick = (caseTypeParam = null) => {
    const baseState = getFilterState();
    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam }
      : baseState;
    navigate("/sales-ops/pending-sanction-amount", { state });
  };

  const handlePendingDisbursalAmountClick = (caseTypeParam = null) => {
    const baseState = getFilterState();
    const state = caseTypeParam
      ? { ...baseState, caseType: caseTypeParam, customType: caseTypeParam }
      : baseState;
    navigate("/sales-ops/pending-disbursal-amount", { state });
  };

  const getDisplayText = () => {
    if (
      timePeriod === "Date Range" &&
      dateRange.startDate &&
      dateRange.endDate
    ) {
      return `${dateRange.startDate} to ${dateRange.endDate}`;
    }
    if (timePeriod === "customDate") {
      return "Date Range";
    }
    if (typeof timePeriod === "string") {
      return timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1);
    }
    return "Today";
  };

  const stats = useMemo(
    () => ({
      amountSanctioned: payload.amountSanctioned || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      amountDisbursed: payload.amountDisbursed || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      processingFeeCollected: payload.processingFeeCollected || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      pendingSanctionAmount: payload.pendingSanctionAmount || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      pendingDisbursalAmount: payload.pendingDisbursalAmount || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      applications: payload.applications || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      pendingApplications: payload.pendingApplications || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      rejectedApplications: payload.rejectedApplications || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      breRejectedLeads: payload.breRejectedLeads || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      applicationsDisbursed: payload.applicationsDisbursed || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      averageTenure: payload.averageTenure || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      averageLoanSize: payload.averageLoanSize || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      collectionAmount: payload.collectionAmount || {
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
      totalEarning: payload.totalEarning || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      unassignedLeads: payload.unassignedLeads || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      freshCustomerLanding: payload.freshCustomerLanding || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      repaymentAmount: payload.repaymentAmount || {
        total: 0,
        fresh: 0,
        reloan: 0,
        percentages: { fresh: 0, reloan: 0 },
      },
      additionalMetrics: payload.additionalMetrics || null,
    }),
    [payload]
  );

  const processingFeeVsSanctionedPercentage = useMemo(() => {
    const sanctionedTotal = Number(stats?.amountSanctioned?.total || 0);
    const feeTotal = Number(stats?.processingFeeCollected?.total || 0);
    if (!sanctionedTotal) return null;
    return (feeTotal / sanctionedTotal) * 100;
  }, [stats]);

  const repaymentVsDisbursedPercentage = useMemo(() => {
    const disbursedTotal = Number(stats?.amountDisbursed?.total || 0);
    const repaymentTotal = Number(stats?.repaymentAmount?.total || 0);
    if (!disbursedTotal) return null;
    return ((repaymentTotal - disbursedTotal) / disbursedTotal) * 100;
  }, [stats]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!responseData) {
    return (
      <DashboardLayout>
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen py-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            Unable to load performance data. Please try again.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="min-w-0 shrink-0 text-3xl font-bold tracking-tight text-gray-900">
              My Performance
            </h1>
            <div className="flex min-w-0 shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:bg-white transition-all duration-300 cursor-pointer hover:shadow-md"
              >
                Back
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:bg-white transition-all duration-300 cursor-pointer hover:shadow-md">
                  <span className="text-gray-700 font-medium">
                    {getDisplayText()}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100/50">
                  {TIME_PERIODS.map((period) => (
                    <DropdownMenuItem
                      key={period.value}
                      onClick={() => handleTimePeriodChange(period?.value)}
                      className="px-4 py-3 text-gray-700 hover:bg-gray-50/80 cursor-pointer transition-all duration-200 font-medium"
                    >
                      {period?.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <MonthlyTargetBar
            variant="full"
            timePeriod={timePeriod}
            additionalMetrics={stats.additionalMetrics}
            amountSanctioned={stats.amountSanctioned}
          />
        </div>

        <style>{`
          @media screen and (width: 1024px) and (height: 591px) {
            .stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          }
        `}</style>
        <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
          <StatCard
            title="Amount Sanctioned"
            value={`₹${Math.ceil(stats?.amountSanctioned?.total || 0).toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-green-600 to-emerald-500"
            onClick={() => handleDisbursedLeadsClick()}
            className="cursor-pointer"
            freshReloanData={stats?.amountSanctioned}
            onFreshClick={() => handleDisbursedLeadsClick("fresh")}
            onReloanClick={() => handleDisbursedLeadsClick("reloan")}
          />
          {/* <StatCard
            title="Amount Disbursed"
            value={`₹${stats?.amountDisbursed?.total?.toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-brand-dark to-cyan-700"
            onClick={() => handleDisbursedLeadsClick()}
            className="cursor-pointer"
            freshReloanData={stats?.amountDisbursed}
            onFreshClick={() => handleDisbursedLeadsClick("fresh")}
            onReloanClick={() => handleDisbursedLeadsClick("reloan")}
          /> */}
          {/* <StatCard
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
          /> */}
          {/* <StatCard
            title="Repayment Amount"
            value={`₹${stats?.repaymentAmount?.total?.toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-teal-700 to-cyan-700"
            freshReloanData={stats?.repaymentAmount}
            percentage={repaymentVsDisbursedPercentage}
          /> */}
          <StatCard
            title="Pending Sanction Amount"
            value={`₹${Math.ceil(stats?.pendingSanctionAmount?.total || 0).toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-orange-500 to-red-400"
            onClick={() => handlePendingSanctionAmountClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.pendingSanctionAmount}
          />
          {/* <StatCard
            title="Pending Disbursal Amount"
            value={`₹${stats?.pendingDisbursalAmount?.total?.toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-amber-500 to-yellow-400"
            onClick={() => handlePendingDisbursalAmountClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.pendingDisbursalAmount}
          /> */}
          {/* <StatCard
            title="Average Loan Size"
            value={`₹${Math.round(stats?.averageLoanSize?.total)}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-cyan-500 to-brand-muted"
            freshReloanData={stats?.averageLoanSize}
          /> */}
          {/* <StatCard
            title="Recovered Amount"
            value={`₹${stats?.collectionAmount?.total?.toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-brand-dark to-brand-muted"
            freshReloanData={stats?.collectionAmount}
            counts={stats?.collectionAmount?.counts}
          /> */}
          {/* <StatCard
            title="Recovered Amount Breakup"
            value={`₹${stats?.collectionAmount?.total?.toLocaleString()}`}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-brand-dark to-brand-muted"
            paymentStatus={stats?.collectionAmount?.paymentStatus}
            paymentStatusAmount={stats?.collectionAmount?.paymentStatusAmount}
            hideMainValue={false}
          /> */}
          {/* <StatCard
            title="Recovered Overdues Monthwise"
            value={`₹${Math.ceil(
              Number(
                stats?.collectionAmount?.paymentStatusAmount?.overdueAmount || 0
              )
            )}`}
            icon={Clock}
            gradient="bg-gradient-to-br from-amber-600 to-red-500"
            monthlyBreakdown={(stats?.collectionAmount?.overdueByMonth || []).map(
              (row) => ({
                label: row?.month || "-",
                value: Number(row?.overdueAmount || 0),
                count: Number(row?.overdueCount || 0),
              })
            )}
          /> */}
          <StatCard
            title="Applications"
            value={`${stats?.applications?.total?.toLocaleString()}`}
            icon={ShieldUser}
            gradient="bg-gradient-to-br from-brand-dark to-cyan-700"
            onClick={() => handleTotalLeadsClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.applications}
            onReloanClick={() => handleTotalLeadsClick("reloan")}
          />
          <StatCard
            title="Pending Applications"
            value={stats?.pendingApplications?.total}
            icon={CircleDotDashed}
            gradient="bg-gradient-to-br from-yellow-500 to-orange-400"
            onClick={() => handlePendingLeadsClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.pendingApplications}
            onReloanClick={() => handlePendingLeadsClick("reloan")}
          />
          <StatCard
            title="Rejected Applications"
            value={`${stats?.rejectedApplications?.total?.toLocaleString()}`}
            icon={ShieldUser}
            gradient="bg-gradient-to-br from-red-700 to-red-500"
            onClick={() => handleRejectedLeadsClick()}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
            freshReloanData={stats?.rejectedApplications}
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
          {/* <StatCard
            title="Fresh Customer Landing"
            value={`${stats?.freshCustomerLanding?.total?.toLocaleString()}`}
            icon={ShieldUser}
            gradient="bg-gradient-to-br from-[#419E98] to-[#B8DDDC]"
            freshReloanData={stats?.freshCustomerLanding}
          /> */}
          {/* <StatCard
            title="Average Tenure"
            value={`${Math.round(stats?.averageTenure?.total)} days`}
            icon={Clock}
            gradient="bg-gradient-to-br from-slate-600 to-gray-500"
            freshReloanData={stats?.averageTenure}
          /> */}
          {/* <StatCard
            title="Unassigned Leads"
            value={`${stats?.unassignedLeads?.total?.toLocaleString()}`}
            icon={UserX}
            gradient="bg-gradient-to-br from-[#757F9A] to-[#D7DDE8]"
            freshReloanData={stats?.unassignedLeads}
          /> */}
        </div>
        {showDatePicker && (
          <DateRangePicker
            onDateRangeSelect={handleDateRangeSelect}
            onClose={(datesSelected) => {
              setShowDatePicker(false);
              if (
                !datesSelected &&
                timePeriod === "Date Range" &&
                (!dateRange.startDate || !dateRange.endDate)
              ) {
                setTimePeriod("Today");
                setDateRange({ startDate: null, endDate: null });
              }
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
