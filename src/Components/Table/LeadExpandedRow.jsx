import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserCircle,
  CreditCard,
  Network,
  IndianRupee,
  CalendarX,
  CalendarRange,
  X,
  XCircle,
  ArrowUpRight,
  Upload,
  ReceiptText,
  Trash2,
  RotateCcw,
  Eye,
  FileText
} from "lucide-react";
import { useDispatch } from "react-redux";
import { buildSummaryDataSearchParams } from "../../utils/auditLead";
import { openDetailModal } from "../../redux/slices/detailModal";
import StatusFlag from "../StatusFlag";
import { formatDate } from "../../utils/formatDate";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import SvgLoader from "../../ui/SvgLoader";
import { uploadAddtionalDocument } from "../../services/functions/credit-analyst";
import AuditSummary from "../Modals/AuditSummary";
import { getAuditSummary } from "../../services/functions/credit-analyst";
import { holdNewLeadWithRemark } from "../../services/functions/lead-details";
import ConfirmationModal from "../ConfirmationModal";
const getSummaryBasePath = (pathname) => {
  if (pathname.includes("/sales-ops/allocated-marketing")) {
    return "/sales-ops/allocated-marketing";
  }
  if (pathname.includes("/sales-ops/allocated-partial")) {
    return "/sales-ops/allocated-partial";
  }
  if (pathname.includes("/sales-ops/completed")) {
    return "/sales-ops/completed";
  }
  if (pathname.includes("/sales-ops/rejected")) {
    return "/sales-ops/rejected";
  }
  if (pathname.includes("/sales-ops/priority-reloan")) {
    return "/sales-ops/priority-reloan";
  }
  if (pathname.includes("/sales-ops/not-taken-reloan")) {
    return "/sales-ops/not-taken-reloan";
  }
  if (pathname.includes("/credit-analyst/allocated-application")) {
    return "/credit-analyst/allocated-application";
  }
  if (pathname.includes("/credit-analyst/approved-application")) {
    return "/credit-analyst/approved-application";
  }
  if (pathname.includes("/credit-analyst/rejected-application")) {
    return "/credit-analyst/rejected-application";
  }
  if (pathname.includes("/credit-analyst/allocated-leads-audit")) {
    return "/credit-analyst/allocated-leads-audit";
  }
  if (pathname.includes("/credit-analyst/approved-leads-audit")) {
    return "/credit-analyst/approved-leads-audit";
  }
  if (pathname.includes("/credit-analyst/rejected-leads-audit")) {
    return "/credit-analyst/rejected-leads-audit";
  }
  if (pathname.includes("/credit-head/assigned-audit-leads")) {
    return "/credit-head/assigned-audit-leads";
  }
  if (pathname.includes("/credit-head/approved-audit-leads")) {
    return "/credit-head/approved-audit-leads";
  }
  if (pathname.includes("/search-result")) {
    return "/search-result";
  }
  if (pathname.includes("/admin/disbursed-leads")) {
    return "/admin/disbursed-leads";
  }
  if (pathname.includes("/sales-ops/disbursed-leads")) {
    return "/sales-ops/disbursed-leads";
  }
  if (pathname.includes("/admin/pending-sanction-amount")) {
    return "/admin/pending-sanction-amount";
  }
  if (pathname.includes("/sales-ops/pending-sanction-amount")) {
    return "/sales-ops/pending-sanction-amount";
  }
  if (pathname.includes("/admin/pending-leads")) {
    return "/admin/pending-leads";
  }
  if (pathname.includes("/sales-ops/pending-leads")) {
    return "/sales-ops/pending-leads";
  }
  if (pathname.includes("/admin/total-leads")) {
    return "/admin/total-leads";
  }
  if (pathname.includes("/sales-ops/total-leads")) {
    return "/sales-ops/total-leads";
  }
  if (pathname.includes("/admin/rejected-leads")) {
    return "/admin/rejected-leads";
  }
  if (pathname.includes("/sales-ops/rejected-leads")) {
    return "/sales-ops/rejected-leads";
  }
  if (pathname.includes("/quality-checker/rejected-leads")) {
    return "/quality-checker/rejected-leads";
  }
  if (pathname.includes("/quality-checker/approved-location-leads")) {
    return "/quality-checker/approved-location-leads";
  }
  if (pathname.includes("/quality-checker/location-suspicious-leads")) {
    return "/quality-checker/location-suspicious-leads";
  }
  return null;
};

const LeadExpandedRow = ({ row, isDarkMode, handleReject, isLeadRejected, mutateRejectLead, isRejectionNeeded,
  showReject, isUploadAddtionalDocumentNeeded, isNCandNRNeeded, role, isDisposeNeeded, disposeLeadMutation, isUndisposeNeeded, undisposeLeadMutation, enablePreviewMode = false, isViewSummaryNeeded = true }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [additionalDocument, setAdditionalDocument] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [documentPreviews, setDocumentPreviews] = useState([]);
  const [documentName, setDocumentName] = useState("");
  const [documentRemark, setDocumentRemark] = useState("");
  const [isDocumentSectionOpen, setIsDocumentSectionOpen] = useState(false);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, url: null, type: null, name: "" });
  const previewsRef = useRef([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmInterested, setShowConfirmInterested] = useState(false);
  const [pendingRemark, setPendingRemark] = useState("");
  const [extraRemark, setExtraRemark] = useState("");
  const [isMarkedNotInterested, setIsMarkedNotInterested] = useState(false);
  const [isMarkedInterested, setIsMarkedInterested] = useState(false);
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [disposeReason, setDisposeReason] = useState("");
  const [showUndisposeModal, setShowUndisposeModal] = useState(false);
  const [undisposeReason, setUndisposeReason] = useState("");

  const summaryBasePath = useMemo(
    () => getSummaryBasePath(location.pathname),
    [location.pathname]
  );

  const showViewSummaryButton =
    isViewSummaryNeeded &&
    summaryBasePath &&
    row?.pan &&
    Number(row?.version) === 2;

  const handleViewSummary = useCallback(() => {
    const pan = row?.pan;
    const leadId = row?.lead_id || row?.id;
    if (!pan || !leadId) {
      toast.error("PAN or Lead ID not available");
      return;
    }
    if (!summaryBasePath) {
      toast.error("Summary view is not available on this page");
      return;
    }
    const params = buildSummaryDataSearchParams(row);
    navigate(`${summaryBasePath}/summary-data/${pan}?${params.toString()}`);
  }, [navigate, row, summaryBasePath]);

  const { mutate: uploadDocument, isPending } = useMutation({
    mutationFn: uploadAddtionalDocument,
    onSuccess: () => {
      toast.success("Documents uploaded successfully");
      // Clean up all preview URLs
      documentPreviews.forEach(preview => {
        if (preview?.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
      setSelectedDocuments([]);
      setDocumentPreviews([]);
      previewsRef.current = [];
      setAdditionalDocument("");
      setDocumentName("");
      setDocumentRemark("");
    },
    onError: (error) => {
      toast.error("Failed to upload document");
      console.error(error);
    }
  })

  // Hold/Unhold Lead actions
  const { mutate: holdLeadWithRemark, isPending: isHolding } = useMutation({
    mutationFn: holdNewLeadWithRemark,
    onSuccess: (_data, variables) => {
      const isUnhold = variables?.category === "unhold";
      if (isUnhold) {
        toast.success("Lead marked as interested");
        setShowConfirmInterested(false);
        setIsMarkedNotInterested(false);
        setIsMarkedInterested(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("lead-marked-interested", { detail: { id: row.id } })
          );
        }
      } else {
        toast.success("Lead marked as not interested");
        setShowConfirm(false);
        setIsMarkedNotInterested(true);
        setIsMarkedInterested(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("lead-marked-not-interested", { detail: { id: row.id } })
          );
        }
      }
    },
    onError: (error) => {
      toast.error("Failed to update lead");
      console.error(error);
      // revert optimistic update if any
      setIsMarkedNotInterested(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("lead-marked-interested", { detail: { id: row.id } })
        );
      }
    }
  });

  const handleConfirmHold = () => {
    // optimistic UI: mark as not interested immediately
    setIsMarkedNotInterested(true);
    setIsMarkedInterested(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("lead-marked-not-interested", { detail: { id: row.id } })
      );
    }
    const finalRemark = extraRemark?.trim()
      ? `${pendingRemark} - ${extraRemark.trim()}`
      : pendingRemark;
    holdLeadWithRemark({ id: row.id, remarks: finalRemark, category: "hold" });
  };

  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files);
    const maxFileSize = 10 * 1024 * 1024;
    const validFiles = [];
    const newPreviews = [];

    files.forEach(file => {
      if (file.size > maxFileSize) {
        toast.error(`${file.name} is larger than 10MB`);
        return;
      }
      validFiles.push(file);
      // Create preview URL for the file only if preview mode is enabled
      if (enablePreviewMode) {
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push({
          url: previewUrl,
          type: file.type,
          name: file.name
        });
      }
    });

    if (validFiles.length > 0) {
      setSelectedDocuments(prev => [...prev, ...validFiles]);
      if (enablePreviewMode && newPreviews.length > 0) {
        setDocumentPreviews(prev => {
          const updated = [...prev, ...newPreviews];
          previewsRef.current = updated;
          return updated;
        });
      }
    }
    e.target.value = "";
  }

  const removeDocument = (index) => {
    // Clean up the preview URL before removing
    const previewToRemove = documentPreviews[index];
    if (previewToRemove?.url) {
      URL.revokeObjectURL(previewToRemove.url);
    }
    setSelectedDocuments(prev => prev.filter((_, i) => i !== index));
    setDocumentPreviews(prev => {
      const updated = prev.filter((_, i) => i !== index);
      previewsRef.current = updated;
      return updated;
    });
  }

  // Clean up all preview URLs when component unmounts
  useEffect(() => {
    return () => {
      previewsRef.current.forEach(preview => {
        if (preview?.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, []);

  const isImageFile = (fileType) => {
    return fileType?.startsWith('image/');
  };

  const isPdfFile = (fileType) => {
    return fileType === 'application/pdf';
  };

  const openPreview = (preview, index) => {
    setPreviewModal({
      isOpen: true,
      url: preview.url,
      type: preview.type,
      name: preview.name
    });
  };

  const handleDocumentNameChange = (e) => {
    e.preventDefault();
    setDocumentName(e.target.value);
  }

  const handleUploadDocument = () => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select at least one document");
      return;
    }
    if (additionalDocument.length === 0) {
      toast.error("Please select a document type");
      return;
    }
    if (additionalDocument === "otherBill" && documentName.length === 0) {
      toast.error("Please enter a document name");
      return;
    }

    const documentType = additionalDocument !== "otherBill" ? additionalDocument : documentName;

    // Upload each document
    selectedDocuments.forEach((document, index) => {
      const payload = {
        lead_id: row.id,
        file_type: documentType,
        file: document,
        remarks: documentRemark
      };

      // Add document_name if it's a custom document type
      if (additionalDocument === "other-Bill" && documentName) {
        payload.document_name = documentName;
      }

      uploadDocument(payload);
    });
  }

  const isEffectivelyHold = (row.is_hold || isMarkedNotInterested) && !isMarkedInterested;

  return (
    <>
      <tr className={` ${isEffectivelyHold ? 'bg-yellow-50' : ''} border-b border-gray-100'}`}>
        <td colSpan="10" className={`px-2 sm:px-6 py-3 sm:py-4 ${isEffectivelyHold ? 'bg-yellow-50' : 'bg-gray-50'}'`}>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">Customer Snapshot</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 min-h-[70px]">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <ReceiptText className="text-slate-500" size={14} />
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Credit Score</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{row?.credit_score || "Not Available"}</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 min-h-[70px]">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <CreditCard className="text-slate-500" size={14} />
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Aadhaar Number</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 break-all leading-tight">{row.aadhaar || "Not Available"}</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 min-h-[70px]">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <IndianRupee className="text-slate-500" size={14} />
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Monthly Salary</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{row.monthlySalary || row.monthly_income || "Not Available"}</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 min-h-[70px]">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <CalendarX className="text-slate-500" size={14} />
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Applied Date & Time</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{formatDate(row.created_at, { showTime: true }) || "Not Available"}</p>
                </div>

                <div className="relative bg-gradient-to-br from-brand-light to-brand-light p-2 sm:p-3 rounded-xl shadow-lg border-2 border-brand">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-brand-light rounded-full shadow p-1 border border-brand">
                      <CalendarRange className="text-brand-link" size={22} />
                    </span>
                    <p className="text-base font-bold text-brand-link tracking-wide drop-shadow">Salary Date</p>
                  </div>
                  <p className={`text-lg font-semibold ${row?.fixed_salary_date ? "text-brand-link" : row?.salary_date ? "text-brand-link" : "text-gray-400 italic"} transition-all duration-200`}>
                    {row?.fixed_salary_date ? formatDate(row.fixed_salary_date) : row?.salary_date ? formatDate(row.salary_date) : "Not Available"}
                  </p>
                  {/* {row?.fixed_salary_date && (
                <span className="absolute top-2 right-2 bg-white border border-brand/50 rounded-full px-2 py-0.5 text-xs text-brand-link font-medium shadow-sm">
                  📅
                </span>
              )} */}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">Review Actions</div>
                <div className="hidden sm:block text-[11px] text-slate-500">Quick lead workflow</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* View Complete Details Button */}
                  <button
                    onClick={() =>
                      dispatch(openDetailModal({
                        row,
                        showReject,
                        showApprove: true,
                        onReject: mutateRejectLead,
                        role: role
                      }))
                    }
                    className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs sm:text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-colors shadow-sm"
                  >
                    View Complete Details <ArrowUpRight className="ml-2" size={14} />
                  </button>
                  {showViewSummaryButton && (
                    <button
                      type="button"
                      onClick={handleViewSummary}
                      className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs sm:text-sm font-semibold bg-brand text-white hover:bg-brand-hover transition-colors shadow-sm"
                    >
                      View Summary <FileText className="ml-2" size={14} />
                    </button>
                  )}
                  {/* Summary Button (only for audit leads with audit_id) */}
                  {row.audit_id && (
                    <button
                      onClick={() => {
                        console.log("Summary button clicked for audit_id:", row.audit_id);
                        setShowSummary(true);
                      }}
                      className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs sm:text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-sm"
                    >
                      Summary
                    </button>
                  )}
                  {/* Reject Lead Button */}
                  {isRejectionNeeded && (
                    <button
                      onClick={() => handleReject(row)}
                      className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-xs sm:text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                    >
                      <X className="mr-2" size={16} />
                      Reject Lead
                    </button>
                  )}

                  {/* Not Interested / Interested Buttons */}
                  {isNCandNRNeeded && !isEffectivelyHold && (
                    <>
                      <button
                        onClick={() => {
                          setPendingRemark("Not interested at all");
                          setExtraRemark("");
                          setShowConfirm(true);
                        }}
                        disabled={isHolding}
                        className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-xs sm:text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Not Interested at all
                      </button>
                      <button
                        onClick={() => {
                          setPendingRemark("Not interested right now");
                          setExtraRemark("");
                          setShowConfirm(true);
                        }}
                        disabled={isHolding}
                        className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-xs sm:text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Not Interested right now
                      </button>
                    </>
                  )}

                  {isNCandNRNeeded && isEffectivelyHold && (
                    <button
                      onClick={() => {
                        setShowConfirmInterested(true);
                      }}
                      disabled={isHolding}
                      className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-xs sm:text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Interested
                    </button>
                  )}

                  {/* Dispose Lead Button */}
                  {isDisposeNeeded && (
                    <button
                      onClick={() => setShowDisposeModal(true)}
                      disabled={disposeLeadMutation?.isPending}
                      className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-xs sm:text-sm font-semibold bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="mr-2" size={16} />
                      Dispose Lead
                    </button>
                  )}

                  {/* Undispose Lead Button */}
                  {isUndisposeNeeded && (
                    <button
                      onClick={() => setShowUndisposeModal(true)}
                      disabled={undisposeLeadMutation?.isPending}
                      className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-xs sm:text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="mr-2" size={16} />
                      Undispose Lead
                    </button>
                  )}
                </div>
              </div>

              {isUploadAddtionalDocumentNeeded && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 p-1.5">
                  <button
                    onClick={() => setIsDocumentSectionOpen(!isDocumentSectionOpen)}
                    className="w-full flex items-center justify-between cursor-pointer px-2.5 py-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-light border border-brand/25">
                        <Upload className="w-3.5 h-3.5 text-brand-link" />
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800">Upload Additional Documents</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isDocumentSectionOpen ? 'rotate-180' : ''
                        }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDocumentSectionOpen && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                      {/* <div className="mb-2">
                    <h2 className="text-base font-semibold text-gray-800">Upload Additional Documents</h2>
                    <p className="text-xs text-gray-600">Upload supporting documents for the lead (Optional)</p>
                  </div> */}

                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          <div className="relative group">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Document Type<span className="text-red-700">*</span></label>
                            <select
                              className="h-9 w-full cursor-pointer rounded-lg border border-slate-300 px-2 text-sm text-gray-800 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
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
                                className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
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
                              className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </div>
                        )}

                        <div className="relative group">
                          <input
                            type="file"
                            id="additionalDocument"
                            onChange={handleDocumentChange}
                            className="hidden"
                            multiple
                            accept=".jpg,.jpeg,.png,.pdf"
                          />
                          <label
                            htmlFor="additionalDocument"
                            className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-3 py-3 hover:bg-slate-100/70 transition-all duration-200"
                          >
                            <div className="text-center w-full">
                              <div className="mb-1 flex justify-center">
                                <Upload className="h-5 w-5 text-gray-400" />
                              </div>
                              {selectedDocuments.length > 0 ? (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-gray-700">Selected Documents ({selectedDocuments.length})</p>
                                  <div className="max-h-44 overflow-y-auto space-y-2">
                                    {selectedDocuments.map((doc, index) => {
                                      const preview = enablePreviewMode ? documentPreviews[index] : null;
                                      const isImage = isImageFile(preview?.type);
                                      const isPdf = isPdfFile(preview?.type);

                                      return (
                                        <div key={index} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-600 truncate flex-1 text-xs font-medium">{doc.name}</span>
                                            <div className="flex items-center gap-2 ml-2">
                                              {enablePreviewMode && preview && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    openPreview(preview, index);
                                                  }}
                                                  className="text-brand-link hover:text-brand-link transition-colors"
                                                  title="Preview document"
                                                >
                                                  <Eye className="w-4 h-4" />
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  removeDocument(index);
                                                }}
                                                className="text-red-500 hover:text-red-700 transition-colors"
                                                title="Remove document"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                          {enablePreviewMode && preview && (
                                            <div className="mt-2">
                                              {isImage ? (
                                                <div
                                                  className="w-full h-32 rounded border border-gray-300 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    openPreview(preview, index);
                                                  }}
                                                >
                                                  <img
                                                    src={preview.url}
                                                    alt={preview.name}
                                                    className="w-full h-full object-contain"
                                                  />
                                                </div>
                                              ) : isPdf ? (
                                                <div
                                                  className="w-full h-32 rounded border border-gray-300 bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    openPreview(preview, index);
                                                  }}
                                                >
                                                  <div className="text-center">
                                                    <FileText className="w-8 h-8 text-gray-500 mx-auto mb-1" />
                                                    <p className="text-xs text-gray-600">PDF Document</p>
                                                    <p className="text-xs text-gray-500">Click to preview</p>
                                                  </div>
                                                </div>
                                              ) : null}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
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
                            disabled={isPending}
                            className={`
                          relative inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-white
                          transition-all duration-200 cursor-pointer
                          ${selectedDocuments.length > 0 && !isPending
                                ? "bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover shadow-sm"
                                : "bg-gray-400 cursor-not-allowed"
                              }
                        `}
                          >
                            {isPending ? (
                              <div className="flex items-center">
                                <SvgLoader />
                                <span className="ml-2">Uploading...</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload {selectedDocuments.length > 1 ? `${selectedDocuments.length} Documents` : 'Document'}
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
          {/* Audit Summary Modal/Drawer */}
          {showSummary && row.audit_id && (
            <AuditSummary
              auditId={row.audit_id}
              open={showSummary}
              onClose={() => setShowSummary(false)}
            />
          )}

          {/* Status Flags */}
          {/* <StatusFlag
            bre={row.is_bre_reject} bsa={row.is_bsa_complete} kyc={row.is_kyc_approved}
          /> */}

          {/* Hold (Not Interested) Details */}
          {isEffectivelyHold && (
            <div className={`mt-8 bg-yellow-50 rounded-xl border border-yellow-200 p-4`}>
              <h3 className={`text-xl font-semibold text-yellow-800 mb-2`}>
                Lead marked as not interested
              </h3>
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Remarks:</span> {row.hold_remarks || row.remarks || pendingRemark || "Not provided"}
              </p>
            </div>
          )}


          {/* Rejection Details */}
          {isLeadRejected && <div className={`mt-8 ${isDarkMode ? 'bg-brand-dark-secondary/50' : 'bg-gray-100'} rounded-xl border ${isDarkMode ? 'border-brand/20' : 'border-gray-200'} p-4`}>
            <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-brand-link' : 'text-gray-800'} mb-6`}>
              Rejection Details
            </h3>
            <div className="space-y-4 flex gap-10">
              <div className="p-2 bg-red-50 rounded-xl border border-red-100 w-[50%]">
                <div className="flex items-start gap-3">
                  <XCircle className="text-red-500 mt-0.5" size={30} />
                  <div>
                    <h4 className="text-sm font-medium text-red-800 mb-1">
                      Rejection Reason
                    </h4>
                    <p className="text-sm text-red-700">
                      {row.rejection_remarks || "No specific reason provided"}
                    </p>
                  </div>
                </div>
              </div>
              <div className={`p-2 ${isDarkMode ? 'bg-brand-dark/50' : 'bg-gray-50'} rounded-xl w-[50%] h-16`}>
                <div className="flex items-start gap-3">
                  <CalendarX className={isDarkMode ? "text-brand-link" : "text-gray-800"} size={30} />
                  <div>
                    <h4 className={`text-sm font-medium ${isDarkMode ? 'text-brand-link' : 'text-gray-800'} mb-1`}>
                      Rejected On
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-white/90' : 'text-gray-800'}`}>
                      {new Date(row.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>}
        </td>
      </tr>
      {/* Audit Summary Modal/Drawer - rendered outside table structure */}
      {showSummary && row.audit_id && (
        <AuditSummary
          auditId={row.audit_id}
          open={showSummary}
          onClose={() => setShowSummary(false)}
        />
      )}
      {/* Confirmation Modal for Not Interested actions */}
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmHold}
        title="Confirm"
        message="Are you sure you want to mark this lead as not interested?"
        confirmText={isHolding ? "Processing..." : "Yes, confirm"}
        cancelText="Cancel"
        remarkLabel="Remark"
        remarkValue={extraRemark}
        onRemarkChange={setExtraRemark}
        remarkPlaceholder="Add details (required)"
        remarkRequired={true}
      />
      {/* Confirmation Modal for Interested (unhold) action */}
      <ConfirmationModal
        isOpen={showConfirmInterested}
        onClose={() => setShowConfirmInterested(false)}
        onConfirm={() =>
          holdLeadWithRemark({ id: row.id, remarks: "Interested", category: "unhold" })
        }
        title="Confirm"
        message="Mark this lead as interested?"
        confirmText={isHolding ? "Processing..." : "Yes, mark interested"}
        cancelText="Cancel"
      />
      {/* Confirmation Modal for Dispose Lead action */}
      <ConfirmationModal
        isOpen={showDisposeModal}
        onClose={() => {
          setShowDisposeModal(false);
          setDisposeReason("");
        }}
        onConfirm={() => {
          if (!disposeReason.trim()) {
            toast.error("Please provide a reason for disposing the lead");
            return;
          }
          disposeLeadMutation?.mutate({ id: row.id, reason: disposeReason, is_disposed: true });
          setShowDisposeModal(false);
          setDisposeReason("");
        }}
        title="Dispose Lead"
        message="Are you sure you want to dispose this lead?"
        confirmText={disposeLeadMutation?.isPending ? "Processing..." : "Yes, dispose"}
        cancelText="Cancel"
        remarkLabel="Reason"
        remarkValue={disposeReason}
        onRemarkChange={setDisposeReason}
        remarkPlaceholder="Enter reason for disposing (required)"
        remarkRequired={true}
      />
      {/* Confirmation Modal for Undispose Lead action */}
      <ConfirmationModal
        isOpen={showUndisposeModal}
        onClose={() => {
          setShowUndisposeModal(false);
          setUndisposeReason("");
        }}
        onConfirm={() => {
          if (!undisposeReason.trim()) {
            toast.error("Please provide a reason for undisposing the lead");
            return;
          }
          undisposeLeadMutation?.mutate({ id: row.id, reason: undisposeReason, is_disposed: false });
          setShowUndisposeModal(false);
          setUndisposeReason("");
        }}
        title="Undispose Lead"
        message="Are you sure you want to undispose this lead?"
        confirmText={undisposeLeadMutation?.isPending ? "Processing..." : "Yes, undispose"}
        cancelText="Cancel"
        remarkLabel="Reason"
        remarkValue={undisposeReason}
        onRemarkChange={setUndisposeReason}
        remarkPlaceholder="Enter reason for undisposing (required)"
        remarkRequired={true}
      />
      {/* Document Preview Modal */}
      {enablePreviewMode && previewModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-2 sm:p-4"
          onClick={() => setPreviewModal({ isOpen: false, url: null, type: null, name: "" })}
        >
          <div
            className="relative bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 truncate flex-1 mr-4">
                {previewModal.name}
              </h3>
              <button
                onClick={() => setPreviewModal({ isOpen: false, url: null, type: null, name: "" })}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(95vh-80px)]">
              {isImageFile(previewModal.type) ? (
                <img
                  src={previewModal.url}
                  alt={previewModal.name}
                  className="max-w-full h-auto mx-auto rounded-lg"
                />
              ) : isPdfFile(previewModal.type) ? (
                <iframe
                  src={previewModal.url}
                  className="w-full h-[85vh] border border-gray-300 rounded-lg"
                  title={previewModal.name}
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Preview not available for this file type</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadExpandedRow; 