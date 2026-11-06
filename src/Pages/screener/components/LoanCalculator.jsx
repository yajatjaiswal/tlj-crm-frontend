import React, { useEffect, useMemo, useState } from "react";
import { Calculator, Copy, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Calendar from "../../../Components/Calendar/Calendar";
import { calculateLoanDetails } from "../../../utils/calculateLoanDetails";
import { SANCTION_CONFIG } from "../../../constants/constants.js";

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
};

const formatDateDisplay = (dateString) => {
  if (!dateString) return "—";
  const date = parseRepaymentDate(dateString);
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseRepaymentDate = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [d, m, y] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [d, m, y] = value.split("/").map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeToYmd = (raw) => {
  const date = parseRepaymentDate(raw);
  if (!date) return "";
  return toYmd(date);
};

const tenureFromRepaymentDate = (repaymentDate) => {
  const repayment = parseRepaymentDate(repaymentDate);
  if (!repayment) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  repayment.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((repayment.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 0) return "";
  return String(diffDays);
};

const dateFromTenure = (tenureDays) => {
  const days = Number(tenureDays);
  if (!Number.isFinite(days) || days <= 0) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() + days);
  return toYmd(today);
};

const sanitizeFilenamePart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

const buildCalculatorDetailsText = ({
  customerName,
  pan,
  repaymentDate,
  result,
}) => {
  const lines = [
    `Customer: ${customerName || "—"}`,
    `PAN: ${pan || "—"}`,
    `Loan Amount: ${formatCurrency(result.loanAmount)}`,
    `Repayment Date: ${formatDateDisplay(repaymentDate)}`,
    `Tenure: ${result.tenureDays} days`,
    `PF %: ${result.pfPercent}%`,
    `ROI: ${result.roi}%`,
    `PF Amount: ${formatCurrency(result.pfAmount)}`,
    `Insurance: ${formatCurrency(result.insurance)}`,
    `GST: ${formatCurrency(result.gst)}`,
    `Total Admin Fees: ${formatCurrency(result.totalAdminFees)}`,
    `Net Disbursal: ${formatCurrency(result.netDisbursal)}`,
    `Interest Amount: ${formatCurrency(result.interestAmount)}`,
    `Repayment Amount: ${formatCurrency(result.repaymentAmount)}`,
    `Net Admin Fee: ${formatCurrency(result.netAdminFee)}`,
    `APR: ${result.apr}%`,
  ];
  return lines.join("\n");
};

const roundRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

/** Draw calculator output card directly to canvas (avoids html2canvas oklch + tainted canvas issues). */
const renderCalculatorOutputCanvas = ({
  customerName,
  pan,
  repaymentDate,
  result,
  scale = 2,
}) => {
  const rows = [
    { label: "Loan Amount", value: formatCurrency(result.loanAmount) },
    { label: "Repayment Date", value: formatDateDisplay(repaymentDate) },
    { label: "Tenure", value: `${result.tenureDays} days` },
    { label: "PF %", value: `${result.pfPercent}%` },
    { label: "ROI", value: `${result.roi}%` },
    { label: "PF Amount", value: formatCurrency(result.pfAmount) },
    { label: "Insurance", value: formatCurrency(result.insurance) },
    { label: "GST", value: formatCurrency(result.gst) },
    { label: "Total Admin Fees", value: formatCurrency(result.totalAdminFees) },
    {
      label: "Net Disbursal",
      value: formatCurrency(result.netDisbursal),
      highlight: true,
    },
    { label: "Interest Amount", value: formatCurrency(result.interestAmount) },
    {
      label: "Repayment Amount",
      value: formatCurrency(result.repaymentAmount),
      highlight: true,
    },
    { label: "Net Admin Fee", value: formatCurrency(result.netAdminFee) },
    { label: "APR", value: `${result.apr}%` },
  ];

  const width = 420;
  const paddingX = 16;
  const paddingY = 14;
  const headerHeight = 58;
  const rowHeight = 34;
  const height = paddingY * 2 + headerHeight + rows.length * rowHeight + 8;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // Card background
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0.5, 0.5, width - 1, height - 1, 10);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Header
  const name = customerName || "Customer";
  const panText = pan || "PAN unavailable";
  ctx.fillStyle = "#0f172a";
  ctx.font = "600 14px Inter, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name, paddingX, paddingY + 18);

  ctx.fillStyle = "#64748b";
  ctx.font = "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(panText, paddingX, paddingY + 36);

  // OUTPUT badge
  const badgeLabel = "OUTPUT";
  ctx.font = "700 10px Inter, system-ui, -apple-system, sans-serif";
  const badgeWidth = ctx.measureText(badgeLabel).width + 16;
  const badgeHeight = 22;
  const badgeX = width - paddingX - badgeWidth;
  const badgeY = paddingY + 8;
  ctx.fillStyle = "#f8fafc";
  roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 6);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.stroke();
  ctx.fillStyle = "#475569";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeLabel, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 0.5);

  // Header divider
  const dividerY = paddingY + headerHeight - 8;
  ctx.beginPath();
  ctx.moveTo(paddingX, dividerY);
  ctx.lineTo(width - paddingX, dividerY);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rows
  let y = dividerY + 4;
  rows.forEach((row, index) => {
    y += rowHeight;
    ctx.fillStyle = "#64748b";
    ctx.font = "500 12px Inter, system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(row.label, paddingX, y - rowHeight / 2);

    ctx.fillStyle = row.highlight ? "#059669" : "#0f172a";
    ctx.font = "600 13px Inter, system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(row.value, width - paddingX, y - rowHeight / 2);

    if (index < rows.length - 1) {
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  return canvas;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

const ResultRow = ({ label, value, highlight = false }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
    <span className="text-xs font-medium text-slate-500">{label}</span>
    <span
      className={`text-sm font-semibold tabular-nums ${
        highlight ? "text-emerald-600" : "text-slate-900"
      }`}
    >
      {value}
    </span>
  </div>
);

const LoanCalculator = ({
  customerName,
  pan,
  defaultLoanAmount,
  defaultPfPercent,
  defaultRoi,
  repaymentDate,
}) => {
  const initialRepaymentDate = normalizeToYmd(repaymentDate);
  const initialTenure =
    tenureFromRepaymentDate(initialRepaymentDate) || "15";

  const [loanAmount, setLoanAmount] = useState(
    defaultLoanAmount != null && defaultLoanAmount !== ""
      ? String(defaultLoanAmount)
      : "",
  );
  const [selectedRepaymentDate, setSelectedRepaymentDate] = useState(
    initialRepaymentDate,
  );
  const [tenureDays, setTenureDays] = useState(initialTenure);
  const [pfPercent, setPfPercent] = useState(
    defaultPfPercent != null && defaultPfPercent !== ""
      ? String(defaultPfPercent)
      : "10",
  );
  const [roi, setRoi] = useState(
    defaultRoi != null && defaultRoi !== ""
      ? String(defaultRoi)
      : String(SANCTION_CONFIG.ROI),
  );
  const [optInsurance, setOptInsurance] = useState(false);
  const [isSavingScreenshot, setIsSavingScreenshot] = useState(false);
  const [isCopyingDetails, setIsCopyingDetails] = useState(false);

  useEffect(() => {
    if (defaultLoanAmount != null && defaultLoanAmount !== "") {
      setLoanAmount(String(defaultLoanAmount));
    }
  }, [defaultLoanAmount]);

  useEffect(() => {
    if (defaultPfPercent != null && defaultPfPercent !== "") {
      setPfPercent(String(defaultPfPercent));
    }
  }, [defaultPfPercent]);

  useEffect(() => {
    if (defaultRoi != null && defaultRoi !== "") {
      setRoi(String(defaultRoi));
    }
  }, [defaultRoi]);

  useEffect(() => {
    const nextDate = normalizeToYmd(repaymentDate);
    if (!nextDate) return;
    setSelectedRepaymentDate(nextDate);
    const nextTenure = tenureFromRepaymentDate(nextDate);
    if (nextTenure) setTenureDays(nextTenure);
  }, [repaymentDate]);

  const handleRepaymentDateChange = (date) => {
    setSelectedRepaymentDate(date);
    const nextTenure = tenureFromRepaymentDate(date);
    if (nextTenure) {
      setTenureDays(nextTenure);
    } else {
      setTenureDays("");
    }
  };

  const handleTenureChange = (value) => {
    setTenureDays(value);
    const nextDate = dateFromTenure(value);
    if (nextDate) setSelectedRepaymentDate(nextDate);
  };

  const result = useMemo(() => {
    const amount = Number(loanAmount);
    const tenure = Number(tenureDays);
    const pf = Number(pfPercent);
    const rate = Number(roi);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(tenure) ||
      tenure <= 0 ||
      !Number.isFinite(pf) ||
      pf < 0 ||
      !Number.isFinite(rate) ||
      rate < 0
    ) {
      return null;
    }

    return calculateLoanDetails(amount, tenure, pf, optInsurance, rate);
  }, [loanAmount, tenureDays, pfPercent, roi, optInsurance]);

  const handleCopyDetails = async () => {
    if (!result) {
      toast.error("Enter valid calculator values before copying");
      return;
    }

    setIsCopyingDetails(true);
    try {
      const text = buildCalculatorDetailsText({
        customerName,
        pan,
        repaymentDate: selectedRepaymentDate,
        result,
      });
      await navigator.clipboard.writeText(text);
      toast.success("Calculator details copied");
    } catch (error) {
      console.error("Error copying calculator details:", error);
      toast.error("Failed to copy details");
    } finally {
      setIsCopyingDetails(false);
    }
  };

  const handleSaveScreenshot = async () => {
    if (!result) {
      toast.error("Enter valid calculator values before saving");
      return;
    }

    setIsSavingScreenshot(true);
    try {
      const canvas = renderCalculatorOutputCanvas({
        customerName,
        pan,
        repaymentDate: selectedRepaymentDate,
        result,
        scale: 2,
      });

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (resultBlob) => {
            if (resultBlob) resolve(resultBlob);
            else reject(new Error("Failed to create image blob"));
          },
          "image/png",
        );
      });

      const panPart = sanitizeFilenamePart(pan) || "customer";
      const namePart = sanitizeFilenamePart(customerName);
      const filename = `loan-calculator-${namePart ? `${namePart}-` : ""}${panPart}-${toYmd(new Date())}.png`;

      const link = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      link.download = filename;
      link.href = objectUrl;
      link.click();
      URL.revokeObjectURL(objectUrl);

      let copied = false;
      if (navigator.clipboard?.write && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          copied = true;
        } catch (clipboardError) {
          console.warn("Clipboard image copy failed:", clipboardError);
        }
      }

      toast.success(
        copied
          ? "Calculator output saved and copied"
          : "Calculator output saved",
      );
    } catch (error) {
      console.error("Error capturing calculator screenshot:", error);
      toast.error("Failed to save screenshot");
    } finally {
      setIsSavingScreenshot(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200">
          <Calculator className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Loan Calculator</h3>
          <p className="truncate text-xs text-slate-500">
            Estimate fees, disbursal &amp; repayment for this customer
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Customer
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {customerName || "—"}
            </p>
            <p className="mt-0.5 font-mono text-xs tracking-wide text-slate-600">
              PAN: {pan || "—"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Loan Amount</span>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="e.g. 15000"
              />
            </label>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Repayment Date</span>
              <Calendar
                value={selectedRepaymentDate}
                onChange={handleRepaymentDateChange}
                disablePastDates
                placeholder="Select repayment date"
              />
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Tenure (days)</span>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={tenureDays}
                onChange={(e) => handleTenureChange(e.target.value)}
                placeholder="e.g. 20"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">PF %</span>
              <input
                type="number"
                min="0"
                step="0.1"
                className={inputClass}
                value={pfPercent}
                onChange={(e) => setPfPercent(e.target.value)}
                placeholder="e.g. 10"
              />
            </label>
            <label className="col-span-2 block space-y-1 sm:col-span-1">
              <span className="text-xs font-medium text-slate-600">ROI (% / day)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                className={inputClass}
                value={roi}
                onChange={(e) => setRoi(e.target.value)}
                placeholder="e.g. 1"
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <input
              type="checkbox"
              checked={optInsurance}
              onChange={(e) => setOptInsurance(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-400"
            />
            <span className="text-sm text-slate-700">Opt for insurance</span>
          </label>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {customerName || "Customer"}
                </p>
                <p className="font-mono text-[11px] text-slate-500">
                  {pan || "PAN unavailable"}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                Output
              </span>
            </div>

            {result ? (
              <div>
                <ResultRow label="Loan Amount" value={formatCurrency(result.loanAmount)} />
                <ResultRow
                  label="Repayment Date"
                  value={formatDateDisplay(selectedRepaymentDate)}
                />
                <ResultRow label="Tenure" value={`${result.tenureDays} days`} />
                <ResultRow label="PF %" value={`${result.pfPercent}%`} />
                <ResultRow label="ROI" value={`${result.roi}%`} />
                <ResultRow label="PF Amount" value={formatCurrency(result.pfAmount)} />
                <ResultRow label="Insurance" value={formatCurrency(result.insurance)} />
                <ResultRow label="GST" value={formatCurrency(result.gst)} />
                <ResultRow
                  label="Total Admin Fees"
                  value={formatCurrency(result.totalAdminFees)}
                />
                <ResultRow
                  label="Net Disbursal"
                  value={formatCurrency(result.netDisbursal)}
                  highlight
                />
                <ResultRow
                  label="Interest Amount"
                  value={formatCurrency(result.interestAmount)}
                />
                <ResultRow
                  label="Repayment Amount"
                  value={formatCurrency(result.repaymentAmount)}
                  highlight
                />
                <ResultRow label="Net Admin Fee" value={formatCurrency(result.netAdminFee)} />
                <ResultRow label="APR" value={`${result.apr}%`} />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Enter a valid loan amount and tenure to see results.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyDetails}
              disabled={!result || isCopyingDetails}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand bg-white px-3 py-2.5 text-sm font-semibold text-brand-link shadow-sm transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCopyingDetails ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSaveScreenshot}
              disabled={!result || isSavingScreenshot}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingScreenshot ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanCalculator;
