import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Check, MessageSquarePlus, Eye, Copy } from "lucide-react";
import toast from "react-hot-toast";
import SvgLoader from "../../ui/SvgLoader";
import Modal from "../../Pages/details-modal/Modal";
import ManualDisbursalForm from "../../Pages/disbursal/ManualDisbursalForm";
import { getLeadStageMeaning, leadStageMapping } from "../../utils/leadStageMapping";
import CommentModal from "./CommentModal";

const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/** Calendar days from salary_date to today (positive if salary date is in the past). */
const tenureDaysFromSalaryDate = (isoString) => {
  if (!isoString) return null;
  const dateStr = String(isoString).split("T")[0];
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const salaryDay = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  salaryDay.setHours(0, 0, 0, 0);
  return Math.round((salaryDay - today) / 86400000);
};

const formatDateOnly = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const copyText = async (text, label) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(String(text));
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
};

const CopyableValue = ({ value, label }) => {
  if (!value) return "N/A";

  return (
    <div className="flex items-center gap-2">
      <span>{value}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          copyText(value, label);
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-link"
        title={`Copy ${label}`}
        aria-label={`Copy ${label}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const LeadRow = ({
  row,
  expandedRow,
  selectedRows,
  loadingStates,
  handleRowClick,
  isActionButtonNeeded,
  isSelectButtonNeeded,
  toggleSelection,
  handleSingleAction,
  modalButtonText,
  actionButtonLabel,
  actionButtonClassName,
  showStatus,
  isDetailedViewNeeded = true,
  showEmail,
  isManualDisbursal,
  showLoanAmount,
  showAssignee,
  showPendingDisbursalAmount,
  showSource,
  showRetryCount = false,
  showCommentColumn = false,
  showPincode = false,
  showSalary = false,
  showSalaryDate = false,
  showCreatedAt = false,
  showLoanNo = false,
  showDateReceived = false,
  showCopyMobile = false,
  showCopyLoanNo = false,
  showActions = true,
  enableRowExpandOnClick = false,
  onDetailsClick,
  searchResultLayout = false,
}) => {
  const tenureDaysFromToday = tenureDaysFromSalaryDate(row?.fixed_salary_date);
  const isTenureRedRow =
    tenureDaysFromToday != null &&
    tenureDaysFromToday >= 11 &&
    tenureDaysFromToday <= 15;

    // email auto blocked
  const isSeverity666 = Number(row?.severity_code) === 666;
  // idk why this is here
  const isSeverity660 = Number(row?.severity_code) === 660;
  // external source 2
  const isSeverity650 = Number(row?.severity_code) === 650;
  const locationSuspiciousValue =
    row?.location_suspicious ?? row?.["location-suspicious"];
  const isLocationSuspicious =
    locationSuspiciousValue === true ||
    locationSuspiciousValue === 1 ||
    String(locationSuspiciousValue).toLowerCase() === "true";
  const selectedRole = useSelector((state) => state.user.selectedRole);
  const isQualityCheckerRole =
    String(selectedRole || "").toLowerCase() === "quality-checker" ||
    (typeof window !== "undefined" &&
      window.location.pathname.toLowerCase().includes("/quality-checker"));
  const showLocationStrike = isLocationSuspicious && !isQualityCheckerRole;

  const [showManualDisbursalModal, setShowManualDisbursalModal] =
    useState(false);

  const handleManualDisbursalClick = (e) => {
    e.stopPropagation();
    setShowManualDisbursalModal(true);
  };

  const [isMarkedNotInterested, setIsMarkedNotInterested] = useState(false);
  const [isMarkedInterested, setIsMarkedInterested] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [comments, setComments] = useState(row?.lead_comments || []);
  const [commentModalMode, setCommentModalMode] = useState("history");
  const [commentCount, setCommentCount] = useState(
    row.commentCount ?? (row.lead_comments?.length || 0)
  );

  const leadId = row?.lead_id || row.id;

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.id === row.id) {
        setIsMarkedNotInterested(true);
      }
    };
    const interestedHandler = (e) => {
      if (e?.detail?.id === row.id) {
        setIsMarkedNotInterested(false);
        setIsMarkedInterested(true);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("lead-marked-not-interested", handler);
      window.addEventListener("lead-marked-interested", interestedHandler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("lead-marked-not-interested", handler);
        window.removeEventListener("lead-marked-interested", interestedHandler);
      }
    };
  }, [row.id]);

  useEffect(() => {
    setComments(row.lead_comments || []);
  }, [row.lead_comments]);

  useEffect(() => {
    setCommentCount(row.commentCount ?? (row.lead_comments?.length || 0));
  }, [row.commentCount, row.lead_comments]);

  const isEffectivelyHold =
    (row.is_hold || isMarkedNotInterested) && !isMarkedInterested;

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const aDate = new Date(a?.comment_date || a?.created_at || 0);
      const bDate = new Date(b?.comment_date || b?.created_at || 0);
      return bDate - aDate;
    });
  }, [comments]);

  const latestComment = sortedComments[0];

  const truncateText = (text, maxLength = 40) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const handleCommentModalOpen = (e, mode = "history") => {
    e?.stopPropagation?.();
    setCommentModalMode(mode);
    setIsCommentModalOpen(true);
  };

  const handleCommentModalClose = () => {
    setIsCommentModalOpen(false);
  };

  const handleCommentAdded = (newComment) => {
    setComments((prev) => [newComment, ...prev]);
    setCommentCount((prev) => prev + 1);
  };

  const latestCommentTimestamp = latestComment
    ? formatDateTime(latestComment.comment_date || latestComment.created_at)
    : "";

  const monthlySalary =
    row.salary ?? row.monthly_salary ?? row.monthly_income ?? null;
  const salaryDate =
    row.salary_date ?? row.next_salary_date ?? row.expected_salary_date ?? null;
  const appliedDateTime =
    row.created_at ?? row.applied_at ?? row.application_date ?? null;
  const severityRowClass = isSeverity666
    ? "bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-orange-200 transition-all duration-200 [&_td]:border-neutral-700 [&_td]:text-orange-200"
    : "";
  const stageChipClass = isSeverity666
    ? "bg-orange-950/40 text-orange-200 border border-orange-800/70"
    : "bg-slate-100 text-slate-700";
  const reloanChipClass = isSeverity666
    ? "bg-orange-900/40 text-orange-200 border border-orange-700/70"
    : "bg-brand-light text-brand-link";
  const holdChipClass = isSeverity666
    ? "bg-orange-900/40 text-orange-200 border border-orange-700/70"
    : "bg-amber-100 text-amber-800";
  const commentActionBtnClass = isSeverity666
    ? "border-orange-800/70 bg-neutral-800 text-orange-200 hover:bg-neutral-700"
    : "border-slate-200 text-brand-link hover:bg-slate-50";
  const detailActionBtnClass = isSeverity666
    ? "bg-neutral-800 text-orange-200 hover:bg-neutral-700 border-orange-800/70"
    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200";
  const primaryInnerTextClass = isSeverity666 ? "text-orange-200" : "text-slate-700";
  const secondaryTextClass = isSeverity666 ? "text-orange-300" : "text-slate-500";
  const emptyTextClass = isSeverity666 ? "text-orange-400" : "text-slate-400";
  
  const isSalesOpsPartialRoute =
    typeof window !== "undefined" &&
    window.location.pathname.includes("sales-ops/partial");

  const isSalesOpsAllocatedPartialRoute =
    typeof window !== "undefined" &&
    window.location.pathname.includes("sales-ops/allocated-partial");

  return (
    <>
      <tr
        className={`group border-b border-slate-100 ${showLocationStrike
          ? "bg-orange-100 text-orange-600 line-through decoration-orange-600 hover:bg-orange-200/90 transition-all duration-200 [&_td]:text-orange-600 [&_td]:line-through [&_td]:decoration-orange-600"
          : isSeverity666
          ? severityRowClass
          : isSeverity660
            ? "bg-orange-100 hover:bg-orange-200/90 transition-all duration-200"
            : isSeverity650
              ? "bg-green-100 hover:bg-green-200/90 transition-all duration-200"
            : isEffectivelyHold
            ? "bg-amber-50 hover:bg-amber-100/70 transition-all duration-200"
            : isTenureRedRow
              ? "bg-red-200 hover:bg-red-300 hover:shadow-md hover:shadow-red-300/50 transition-all duration-200"
              : expandedRow === row.id
                ? "bg-slate-100/80"
                : "odd:bg-white even:bg-slate-50/45 hover:bg-brand-light/70"
          } ${enableRowExpandOnClick ? "cursor-pointer" : ""}`}
        onClick={enableRowExpandOnClick ? () => handleRowClick(row) : undefined}
      >
        {isSelectButtonNeeded ? (
          <td
            className="p-2 border-r border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center
                    ${
                      selectedRows.has(row.id)
                        ? "bg-brand border-brand-hover"
                        : "border-gray-300 hover:border-brand-hover"
                    }`}
              onClick={() => toggleSelection?.(row.id)}
            >
              {selectedRows.has(row.id) && (
                <Check size={14} className="text-brand-dark" />
              )}
            </div>
          </td>
        ) : null}
        <td className={`px-4 py-3.5 text-sm font-medium text-slate-700 border-r border-slate-100`}>
          {row.lead_no || ((isSalesOpsPartialRoute || isSalesOpsAllocatedPartialRoute) ? "Marketing" : "N/A")}
        </td>
        <td className={`px-4 py-3.5 text-sm font-medium text-slate-800 border-r border-slate-100`}>
          {row.full_name
            ? row.full_name
              .split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join(" ")
            : "N/A"}
        </td>

        <td className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}>
          {showCopyMobile ? (
            <CopyableValue value={row.mobile} label="Mobile" />
          ) : (
            row.mobile || "N/A"
          )}
        </td>
        <td className={`px-4 py-3.5 text-sm font-medium text-slate-700 border-r border-slate-100`}>
          {row.pan || "N/A"}
        </td>
        {showLoanNo && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}>
            {showCopyLoanNo ? (
              <CopyableValue value={row.loan_no} label="Loan No" />
            ) : (
              row.loan_no || "N/A"
            )}
          </td>
        )}
        {showDateReceived && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}>
            {formatDateTime(row.date_of_recived || row.date_of_received) || "N/A"}
          </td>
        )}
        {/* <td className={`px-4 py-3.5 text-sm font-medium text-slate-700 border-r border-slate-100`}>
          {row.credit_score ?? "N/A"}
        </td> */}
        {showEmail && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}>
            {row.personal_email || "N/A"}
          </td>
        )}
        {showLoanAmount && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 font-medium border-r border-slate-100`}>
            ₹{row.loan_amount?.toLocaleString() || "N/A"}
          </td>
        )}
        {showPendingDisbursalAmount && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 font-medium border-r border-slate-100`}>
            ₹{row.pending_disbursal_amount?.toLocaleString() || "N/A"}
          </td>
        )}
        {showStatus && (
          <td
            className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100 ${
              searchResultLayout ? "min-w-[10rem] max-w-[18rem] align-top" : ""
            }`}
          >
            <div
              className={
                searchResultLayout
                  ? "flex flex-wrap items-center gap-1.5"
                  : "contents"
              }
            >
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${stageChipClass} ${
                  searchResultLayout ? "whitespace-normal text-left" : ""
                }`}
                // title={getLeadStageMeaning(row.lead_stage)}
              >
                {leadStageMapping[row.lead_stage] || row.lead_stage}
              </span>
              {row.is_reloan_case && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex shrink-0 ${reloanChipClass} ${
                    searchResultLayout ? "" : "ml-1.5"
                  }`}
                >
                  (Reloan)
                  {/* (Reloan {row.loan_count}) */}
                </span>
              )}
              {isEffectivelyHold && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full inline-flex shrink-0 ${holdChipClass} ${
                    searchResultLayout ? "" : "ml-2"
                  }`}
                  title={
                    row.hold_remarks ||
                    row.remarks ||
                    "Lead marked as not interested"
                  }
                >
                  Not Interested
                </span>
              )}
            </div>
          </td>
        )}
        {showAssignee && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}>
            {row?.emp_full_name ? (
              <div>
                <div
                  className={`font-medium ${
                    isSeverity666 ? "text-orange-200" : "text-slate-800"
                  }`}
                >
                  {row.emp_full_name
                    .split(" ")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    )
                    .join(" ")}
                </div>
                {row?.emp_id && (
                  <div className={`text-xs ${secondaryTextClass}`}>
                    ID: {row.emp_id}{" "}
                    {/* {row?.allocated_at
                      ? "at " +
                        formatDate(row.allocated_at, { showTime: true })
                          .replace("Date: ", "")
                          .replace("Time: ", "")
                          .replace(/:\d{2}/, "")
                      : ""} */}
                  </div>
                )}
              </div>
            ) : (
              "N/A"
            )}
          </td>
        )}
        {showSource && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}>
            {row.source
              ? row.source === "MARKETING"
                ? "Google Landing"
                : row.source === "EXTERNAL_SOURCE_8"
                  ? "Organic"
                  : row.source === "EXTERNAL_SOURCE"
                    ? "Organic Old"
                    : row.source === "EXTERNAL_SOURCE_2"
                      ? "Organic 2"
                      : row.source === "EXTERNAL_SOURCE_3"
                        ? "Organic 3"
                        : row.source === "BLINKR LOAN"
                          ? "Bamboo Tree"
                  : row.source
                .split(" ")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join(" ")
              : "N/A"}
          </td>
        )}
        {showRetryCount && (
          <td className={`px-4 py-3 text-sm text-gray-800`}>
            {row.retry_count ?? row.retryCount ?? "N/A"}
          </td>
        )}
        {showPincode && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}>
            {row.pincode || "N/A"}
          </td>
        )}
        {/* {showSalary && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 font-medium border-r border-slate-100`}>
            {monthlySalary
              ? `₹${Number(monthlySalary).toLocaleString()}`
              : "N/A"}
          </td>
        )}
        {showSalaryDate && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}>
            {salaryDate ? formatDateOnly(salaryDate) : "N/A"}
          </td>
        )}
        {showCreatedAt && (
          <td className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}>
            {appliedDateTime ? formatDateTime(appliedDateTime) : "N/A"}
          </td>
        )} */}
        {showCommentColumn && (
          <td
            className={`px-4 py-3.5 text-sm text-slate-700 border-r border-slate-100`}
            onClick={(e) => {
              e.stopPropagation();
              handleCommentModalOpen();
            }}
          >
            {latestComment ? (
              <div className="cursor-pointer">
                <div className={primaryInnerTextClass}>
                  {truncateText(latestComment.comment, 40)}
                </div>
                <div className={`text-xs ${secondaryTextClass}`}>
                  {latestCommentTimestamp}
                </div>
              </div>
            ) : (
              <span className={emptyTextClass}>No comments</span>
            )}
          </td>
        )}
        {showActions && (
          <td
            className={`px-3 py-4 flex gap-2 sticky right-0 z-9 border-l border-slate-200 transition-colors ${showLocationStrike
              ? "bg-orange-100 group-hover:bg-orange-200/90 !text-inherit !no-underline [&_*]:!no-underline"
              : isEffectivelyHold
              ? "bg-amber-50 group-hover:bg-amber-100/70"
              : isTenureRedRow
                ? "bg-red-200 group-hover:bg-red-300"
                : isSeverity666
                  ? "bg-neutral-900 group-hover:bg-neutral-800 border-neutral-700"
                  : isSeverity660
                    ? "bg-orange-100 group-hover:bg-orange-200/90"
                  : isSeverity650
                    ? "bg-green-100 group-hover:bg-green-200/90"
                : expandedRow === row.id
                  ? "bg-slate-100/80"
                  : "bg-inherit group-hover:bg-brand-light/70"
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {showCommentColumn && (
              <button
                onClick={(e) => handleCommentModalOpen(e, "add")}
                className={`h-9 w-9 p-0 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${commentActionBtnClass}`}
                title="View/Add comments"
              >
                <MessageSquarePlus size={18} />
              </button>
            )}
            {isActionButtonNeeded && (
              <button
                onClick={(e) => handleSingleAction(row, e)}
                className={
                  actionButtonClassName ||
                  "px-4 py-2 text-sm bg-brand hover:bg-brand-hover text-white rounded-lg transition-colors cursor-pointer w-24 flex items-center justify-center font-medium"
                }
                disabled={loadingStates[row.id]}
              >
                {actionButtonLabel ? (
                  actionButtonLabel
                ) : row.lead_stage === "REJECT_AADHAR_KYC" &&
                  !window.location.pathname.includes("sales-ops/partial") ? (
                  "Approve"
                ) : loadingStates[row.id] ? (
                  <SvgLoader />
                ) : (
                  modalButtonText
                )}
              </button>
            )}
            {isManualDisbursal && (
              <button
                onClick={handleManualDisbursalClick}
                className={`px-4 py-2 text-sm bg-brand hover:bg-brand-hover text-white rounded-lg transition-colors cursor-pointer w-40 flex items-center justify-center font-medium`}
                disabled={loadingStates[row.id]}
              >
                {loadingStates[row.id] ? <SvgLoader /> : "Confirm Disbursal"}
              </button>
            )}
            {isDetailedViewNeeded && (
              <button
                onClick={() =>
                  onDetailsClick ? onDetailsClick(row) : handleRowClick(row)
                }
                className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 font-medium cursor-pointer border ${detailActionBtnClass}`}
                title="Details"
                aria-label="Details"
              >
                <Eye className="h-4 w-4 mx-auto" />
              </button>
            )}
          </td>
        )}
      </tr>

      {/* Confirm Disbursal Modal */}
      <Modal
        isOpen={showManualDisbursalModal}
        onClose={() => setShowManualDisbursalModal(false)}
        title="Confirm Disbursal"
        showTitle={true}
        size="small"
        compactHeader
      >
        <ManualDisbursalForm
          row={row}
          onClose={() => setShowManualDisbursalModal(false)}
        />
      </Modal>
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={handleCommentModalClose}
        leadId={leadId}
        comments={sortedComments}
        onCommentAdded={handleCommentAdded}
        mode={commentModalMode}
        commentCount={commentCount}
      />
    </>
  );
};

export default LeadRow;
