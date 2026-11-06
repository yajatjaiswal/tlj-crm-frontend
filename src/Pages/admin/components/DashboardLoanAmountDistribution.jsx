import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardLeads } from "../../../services/functions/admin";
import { toast } from "react-hot-toast";
import ErrorBoundary from "../../../Components/ErrorBoundary";
import ErrorFallback from "../../../Components/ErrorFallback";
import LeadsLoading from "../../../Components/Loading/LeadsLoading";
import {
  EmptyState,
  ErrorState,
} from "../../../Components/ErrorStates/ErrorAndEmptyStates";
import { useLocation, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  IndianRupee,
  Target,
  Activity,
  Zap
} from "lucide-react";

// Error boundary wrapper component
const DashboardLoanAmountDistributionWithErrorBoundary = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <DashboardLoanAmountDistribution />
    </ErrorBoundary>
  );
};

function DashboardLoanAmountDistribution() {
  const [selectedFilter, setSelectedFilter] = useState("overall");
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const timePeriod = location.state?.timePeriod || "Today";
  const startDate = location.state?.startDate || null;
  const endDate = location.state?.endDate || null;

  const {
    data: distributionData,
    isPending: isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["admin-loan-amount-distribution", timePeriod, startDate, endDate, selectedFilter],
    queryFn: () =>
      getDashboardLeads("LOAN_AMOUNT_DISTRIBUTION", 1, 100, timePeriod, startDate, endDate, selectedFilter),
    staleTime: 0,
    gcTime: 0,
    onError: (error) => {
      console.error("Error fetching distribution data:", error);
      setError("Failed to load distribution data. Please try again later.");
      toast.error("Failed to load distribution data");
    },
  });

  const data = useMemo(() => distributionData?.data || [], [distributionData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!data.length) return null;
    
    const totalLoans = data.reduce((sum, item) => sum + item.total_loans, 0);
    const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);
    const avgLoanSize = totalAmount / totalLoans;
    
    // Find the most popular range
    const mostPopularRange = data.reduce((max, item) => 
      item.total_loans > max.total_loans ? item : max, data[0]);
    
    // Calculate fresh vs reloan breakdown
    const freshLoans = data.filter(item => !item.is_reloan_case);
    const reloanLoans = data.filter(item => item.is_reloan_case);
    
    return {
      totalLoans,
      totalAmount,
      avgLoanSize,
      mostPopularRange,
      freshCount: freshLoans.reduce((sum, item) => sum + item.total_loans, 0),
      reloanCount: reloanLoans.reduce((sum, item) => sum + item.total_loans, 0),
      freshAmount: freshLoans.reduce((sum, item) => sum + item.total_amount, 0),
      reloanAmount: reloanLoans.reduce((sum, item) => sum + item.total_amount, 0)
    };
  }, [data]);

  // Group data by loan range
  const groupedData = useMemo(() => {
    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.loan_range]) {
        grouped[item.loan_range] = {
          loan_range: item.loan_range,
          fresh: { total_loans: 0, total_amount: 0 },
          reloan: { total_loans: 0, total_amount: 0 },
          combined: { total_loans: 0, total_amount: 0 }
        };
      }
      
      if (item.is_reloan_case) {
        grouped[item.loan_range].reloan = {
          total_loans: item.total_loans,
          total_amount: item.total_amount,
          percentage_by_count: item.percentage_by_count,
          percentage_by_amount: item.percentage_by_amount
        };
      } else {
        grouped[item.loan_range].fresh = {
          total_loans: item.total_loans,
          total_amount: item.total_amount,
          percentage_by_count: item.percentage_by_count,
          percentage_by_amount: item.percentage_by_amount
        };
      }
      
      grouped[item.loan_range].combined.total_loans += item.total_loans;
      grouped[item.loan_range].combined.total_amount += item.total_amount;
    });
    
    return Object.values(grouped).sort((a, b) => {
      const getRangeValue = (range) => {
        const [min, max] = range.split('-').map(v => parseInt(v.replace('k', '000')));
        return min;
      };
      return getRangeValue(a.loan_range) - getRangeValue(b.loan_range);
    });
  }, [data]);

  if (isLoading) return <LeadsLoading />;

  if (fetchError || error) {
    return <ErrorState error={error} />;
  }

  if (data.length === 0) {
    return <EmptyState tableName={"Loan Amount Distribution"} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-extra-light to-brand-light px-0 sm:px-6 py-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-br from-brand-dark to-brand-dark rounded-2xl shadow-lg">
              <BarChart3 className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Loan Amount Distribution</h1>
              {/* <p className="text-gray-600 mt-1">Comprehensive analysis of loan distribution patterns</p> */}
            </div>
          </div>
          <button
            onClick={() =>
              navigate(
                location.pathname.includes("/sales-ops/")
                  ? "/sales-ops/dashboard"
                  : "/admin/dashboard"
              )
            }
            className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 text-gray-700 font-medium"
          >
            ← Back
          </button>
        </div>

        {/* Filter Tabs */}
        {/* <div className="mb-8">
          <div className="flex space-x-2 bg-white/60 backdrop-blur-sm rounded-xl p-2 border border-gray-200/50">
            {[
              { key: "overall", label: "Overall", icon: Activity },
              { key: "fresh", label: "Fresh Loans", icon: Target },
              { key: "reloan", label: "Reloans", icon: Zap }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedFilter(key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  selectedFilter === key
                    ? "bg-gradient-to-r from-brand-dark to-brand-dark text-white shadow-lg"
                    : "text-gray-600 hover:bg-white/80 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div> */}

        {/* Summary Cards */}
        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-brand to-brand-hover rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-brand-dark/70 text-sm font-medium">Total Loans</p>
                  <p className="text-3xl font-bold mt-2">{summaryStats.totalLoans.toLocaleString()}</p>
                </div>
                <Users className="text-brand-dark/50" size={32} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Amount</p>
                  <p className="text-3xl font-bold mt-2">₹{summaryStats.totalAmount.toLocaleString()}</p>
                </div>
                <IndianRupee className="text-green-200" size={32} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-brand to-brand-hover rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-brand-dark/70 text-sm font-medium">Average Loan Size</p>
                  <p className="text-3xl font-bold mt-2">₹{Math.round(summaryStats.avgLoanSize).toLocaleString()}</p>
                </div>
                <TrendingUp className="text-brand-dark/50" size={32} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Most Popular Range</p>
                  <p className="text-2xl font-bold mt-2">{summaryStats.mostPopularRange.loan_range}</p>
                  <p className="text-orange-200 text-sm">{summaryStats.mostPopularRange.total_loans} loans</p>
                </div>
                <Target className="text-orange-200" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Fresh vs Reloan Breakdown */}
        {summaryStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="text-green-600" size={20} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Fresh Loans</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Count</span>
                  <span className="text-2xl font-bold text-green-600">{summaryStats.freshCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount</span>
                  <span className="text-xl font-semibold text-gray-900">₹{summaryStats.freshAmount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(summaryStats.freshCount / summaryStats.totalLoans) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-brand-light rounded-lg">
                  <Zap className="text-brand-link" size={20} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Reloans</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Count</span>
                  <span className="text-2xl font-bold text-brand-link">{summaryStats.reloanCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount</span>
                  <span className="text-xl font-semibold text-gray-900">₹{summaryStats.reloanAmount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-brand to-brand-hover h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(summaryStats.reloanCount / summaryStats.totalLoans) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Distribution Cards */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Loan Range Distribution</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {groupedData.map((range, index) => (
              <div key={range.loan_range} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-xl ${
                      index % 4 === 0 ? 'bg-gradient-to-br from-brand to-brand-hover' :
                      index % 4 === 1 ? 'bg-gradient-to-br from-green-500 to-teal-500' :
                      index % 4 === 2 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                      'bg-gradient-to-br from-brand-dark to-cyan-700'
                    } text-white`}>
                      <IndianRupee size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{range.loan_range}</h3>
                      <p className="text-gray-600 text-sm">Loan Range</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Combined Stats */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Total</span>
                      <span className="text-lg font-bold text-gray-900">{range.combined.total_loans}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Amount</span>
                      <span className="text-lg font-semibold text-gray-800">₹{range.combined.total_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Fresh Loans */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Fresh</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{range.fresh.total_loans}</span>
                      <span className="font-semibold text-gray-900">₹{range.fresh.total_amount.toLocaleString()}</span>
                    </div>
                    {/* {range.fresh.percentage_by_count && (
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{range.fresh.percentage_by_count.toFixed(1)}% by count</span>
                        <span>{range.fresh.percentage_by_amount.toFixed(1)}% by amount</span>
                      </div>
                    )} */}
                  </div>

                  {/* Reloans */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-brand rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Reloan</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{range.reloan.total_loans}</span>
                      <span className="font-semibold text-gray-900">₹{range.reloan.total_amount.toLocaleString()}</span>
                    </div>
                    {/* {range.reloan.percentage_by_count && (
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{range.reloan.percentage_by_count.toFixed(1)}% by count</span>
                        <span>{range.reloan.percentage_by_amount.toFixed(1)}% by amount</span>
                      </div>
                    )} */}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Fresh</span>
                      <span>Reloan</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="flex h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600"
                          style={{ width: `${(range.fresh.total_loans / range.combined.total_loans) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-gradient-to-r from-brand to-brand-hover"
                          style={{ width: `${(range.reloan.total_loans / range.combined.total_loans) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardLoanAmountDistributionWithErrorBoundary;
