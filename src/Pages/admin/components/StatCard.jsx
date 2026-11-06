import React, { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "../../../utils/card";

/**
 * Reusable stat card component for dashboard metrics
 * @param {string} title - The title of the stat card
 * @param {string|number} value - The main value to display
 * @param {Component} icon - Icon component to display
 * @param {string} gradient - CSS gradient class for background
 * @param {Function} onClick - Optional click handler
 * @param {string} className - Optional additional CSS classes
 * @param {Object} freshReloanData - Optional fresh/reloan split data
 * @param {Object} counts - Optional counts data for collection amount
 * @param {Object} paymentStatus - Optional payment status breakdown for collections
 */
const StatCard = ({
  title,
  value,
  icon: Icon,
  gradient,
  onClick,
  className = "",
  freshReloanData = null,
  counts = null,
  monthlyBreakdown = null,
  onMonthClick = null,
  onFreshClick = null,
  onReloanClick = null,
  percentage = null,
  paymentStatus = null,
  paymentStatusAmount = null,
  hideMainValue = false,
  onPaymentStatusClick = null,
}) => {
  const [showAllMonths, setShowAllMonths] = useState(false);

  const monthlyRows =
    monthlyBreakdown && Array.isArray(monthlyBreakdown)
      ? monthlyBreakdown.filter(
          (item) => Number(item?.value ?? 0) !== 0
        )
      : [];

  const hasMonthlyBreakdown = monthlyRows.length > 0;

  const MAX_VISIBLE_MONTHS = 4;

  const visibleMonthlyBreakdown = hasMonthlyBreakdown
    ? showAllMonths
      ? monthlyRows
      : monthlyRows.slice(0, MAX_VISIBLE_MONTHS)
    : [];

  return (
    <Card
      className={`flex flex-col justify-center shadow-lg ${gradient} text-white rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 ${className}`}
      onClick={onClick}
    >
      <CardContent className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h2 className="text-lg sm:text-xl font-medium opacity-90">{title}</h2>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        {percentage !== null && !Number.isNaN(percentage) && (
        <div
          className={`w-fit flex items-center gap-1 text-xs sm:text-sm font-semibold px-2 py-1 rounded-full border
                        ${
                          Number(percentage) >= 0
                            ? "bg-emerald-400/15 text-emerald-50 border-emerald-300/30"
                            : "bg-red-400/15 text-red-50 border-red-300/30"
                        }`}
        >
          <span>{Math.abs(Number(percentage)).toFixed(1)}%</span>
        </div>
      )}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        {!hideMainValue &&
          value !== undefined &&
          value !== null &&
          value !== "" && (
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              {value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            </p>
          )}
      </div>


      {/* Fresh/Reloan Split */}
      {freshReloanData && (
        <div className="bg-white/10 rounded-lg space-y-2 sm:space-y-1.5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div
              className="text-center cursor-pointer rounded-md p-2 hover:bg-white/20 transition-colors duration-150 transform active:scale-[1.03]"
              onClick={(e) => {
                e.stopPropagation();
                onFreshClick && onFreshClick();
              }}
            >
              <div className="font-semibold text-base sm:text-sm">
                {title.toLowerCase().includes("amount") ||
                title.toLowerCase().includes("fee") ||
                title.toLowerCase().includes("size") ||
                title.toLowerCase().includes("earning") ||
                title.toLowerCase().includes("gst")
                  ? "₹"
                  : ""}
                {Math.ceil(freshReloanData.fresh).toLocaleString()}
              </div>
              <div className="text-xs font-medium border border-white/30 px-2 py-0.5 rounded-md mt-1 w-fit mx-auto">
                Fresh
              </div>
              <div className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full inline-block mt-1">
                {freshReloanData.percentages.fresh.toFixed(1)}%
              </div>
            </div>
            <div
              className="text-center cursor-pointer rounded-md p-2 hover:bg-white/20 transition-colors duration-150 transform active:scale-[1.03]"
              onClick={(e) => {
                e.stopPropagation();
                onReloanClick && onReloanClick();
              }}
            >
              <div className="font-semibold text-base sm:text-sm">
                {title.toLowerCase().includes("amount") ||
                title.toLowerCase().includes("fee") ||
                title.toLowerCase().includes("size") ||
                title.toLowerCase().includes("earning") ||
                title.toLowerCase().includes("gst")
                  ? "₹"
                  : ""}
                {Math.ceil(freshReloanData.reloan).toLocaleString()}
              </div>
              <div className="text-xs font-medium border border-white/30 px-2 py-0.5 rounded-md mt-1 w-fit mx-auto">
                Reloan
              </div>
              <div className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full inline-block mt-1">
                {freshReloanData.percentages.reloan.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Counts for collection amount */}
      {counts && (
        <div className="pt-2 mt-2 border-t border-white/10">
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:flex sm:justify-between sm:text-left sm:gap-0">
            <span className="font-medium whitespace-nowrap">
              Total: {counts.total}
            </span>
            <span className="font-medium whitespace-nowrap">
              Fresh: {counts.fresh}
            </span>
            <span className="font-medium whitespace-nowrap">
              Reloan: {counts.reloan}
            </span>
          </div>
        </div>
      )}

      {/* Payment status breakdown styled like Fresh/Reloan split */}
      {paymentStatus && paymentStatusAmount ? (
        <div className="bg-white/10 rounded-lg p-3 space-y-3 sm:space-y-3">
          {/* Amounts with adjacent counts */}
          <div className="space-y-2 w-full">
            <div
              className={`flex items-center justify-between text-sm font-semibold ${
                onPaymentStatusClick
                  ? "cursor-pointer rounded-md px-1 -mx-1 hover:bg-white/15 transition-colors"
                  : ""
              }`}
              onClick={(e) => {
                if (!onPaymentStatusClick) return;
                e.stopPropagation();
                onPaymentStatusClick("prepayment");
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="bg-green-500/20 text-green-100 px-2 py-1 rounded-full font-semibold shadow-sm">
                  PP
                </span>
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                  {Number(paymentStatus.prepayment || 0)}
                </span>
                <span>
                  ₹
                  {Math.ceil(Number(
                    paymentStatusAmount.prepaymentAmount || 0
                  )).toLocaleString()}
                </span>
              </div>
            </div>
            <div
              className={`flex items-center justify-between text-sm font-semibold ${
                onPaymentStatusClick
                  ? "cursor-pointer rounded-md px-1 -mx-1 hover:bg-white/15 transition-colors"
                  : ""
              }`}
              onClick={(e) => {
                if (!onPaymentStatusClick) return;
                e.stopPropagation();
                onPaymentStatusClick("dueDate");
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="bg-blue-500/20 text-blue-100 px-2 py-1 rounded-full font-semibold shadow-sm">
                  DD
                </span>
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                  {Number(paymentStatus.dueDate || 0)}
                </span>
                <span>
                  ₹
                  {Math.ceil(Number(
                    paymentStatusAmount.dueDateAmount || 0
                  )).toLocaleString()}
                </span>
              </div>
            </div>
            <div
              className={`flex items-center justify-between text-sm font-semibold ${
                onPaymentStatusClick
                  ? "cursor-pointer rounded-md px-1 -mx-1 hover:bg-white/15 transition-colors"
                  : ""
              }`}
              onClick={(e) => {
                if (!onPaymentStatusClick) return;
                e.stopPropagation();
                onPaymentStatusClick("overdue");
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="bg-red-500/20 text-red-100 px-2 py-1 rounded-full font-semibold shadow-sm">
                  OD
                </span>
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                  {Number(paymentStatus.overdue || 0)}
                </span>
                <span>
                  ₹
                  {Math.ceil(Number(
                    paymentStatusAmount.overdueAmount || 0
                  )).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {paymentStatus && (
            <div className="pt-2 mt-2 border-t border-white/10">
              <div className="grid grid-cols-3 gap-2 text-center text-xs sm:flex sm:justify-between sm:text-left sm:gap-0">
                <span className="font-medium whitespace-nowrap">
                  PP: {Number(paymentStatus.prepayment || 0)}
                </span>
                <span className="font-medium whitespace-nowrap">
                  DD: {Number(paymentStatus.dueDate || 0)}
                </span>
                <span className="font-medium whitespace-nowrap">
                  OD: {Number(paymentStatus.overdue || 0)}
                </span>
              </div>
            </div>
          )}
          {paymentStatusAmount && (
            <div className="pt-2 mt-2 border-t border-white/10">
              <div className="grid grid-cols-3 gap-2 text-center text-xs sm:flex sm:justify-between sm:text-left sm:gap-0">
                <span className="font-medium whitespace-nowrap">
                  PP: ₹
                  {Number(
                    paymentStatusAmount.prepaymentAmount || 0
                  ).toLocaleString()}
                </span>
                <span className="font-medium whitespace-nowrap">
                  DD: ₹
                  {Number(
                    paymentStatusAmount.dueDateAmount || 0
                  ).toLocaleString()}
                </span>
                <span className="font-medium whitespace-nowrap">
                  OD: ₹
                  {Number(
                    paymentStatusAmount.overdueAmount || 0
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Monthly breakdown (e.g., last 3 months for Recovered Amount) */}
      {hasMonthlyBreakdown && (
        <div className="pt-2 mt-2 border-t border-white/10 bg-white/10 rounded-lg p-3">
          <div className="grid grid-cols-1 gap-1">
            {visibleMonthlyBreakdown.map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                className={`flex items-center gap-4 text-sm font-semibold py-1 ${
                  onMonthClick
                    ? "cursor-pointer rounded-md px-1 -mx-1 hover:bg-white/15 transition-colors"
                    : ""
                }`}
                onClick={(e) => {
                  if (!onMonthClick) return;
                  e.stopPropagation();
                  onMonthClick(item);
                }}
              >
                <span className="opacity-90 ">{item.label}</span>
                <span className="font-semibold flex items-center gap-4">
                  {item?.count !== undefined && item?.count !== null && (
                    <span className="font-semibold bg-white/20 px-2 py-0.5 rounded-full text-sm">
                      {Number(item.count || 0)}
                    </span>
                  )}
                  <span>₹{Number(item.value || 0).toLocaleString()}</span>
                </span>
              </div>
            ))}
          </div>
          {monthlyRows.length > MAX_VISIBLE_MONTHS && (
            <button
              type="button"
              className="mt-2 text-xs font-semibold underline underline-offset-2 opacity-90 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setShowAllMonths((prev) => !prev);
              }}
            >
              {showAllMonths
                ? "Show fewer months"
                : `Show all months`}
            </button>
          )}
        </div>
      )}
    </CardContent>
  </Card>
  );
};

export default StatCard;
