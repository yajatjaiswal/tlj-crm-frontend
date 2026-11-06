import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditSummary } from "../../services/functions/credit-analyst";
import { X } from "lucide-react";

const sectionClass = "mb-6 bg-white rounded-xl shadow p-4 border border-gray-100";

const AuditSummary = ({ auditId, open, onClose }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-summary", auditId],
    queryFn: () => getAuditSummary(auditId),
    enabled: open && !!auditId,
    staleTime: 0,
    gcTime: 0,
    retry: 1
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full max-w-4xl mx-auto bg-gray-50 rounded-xl shadow-lg animate-fadeInUp">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
          onClick={onClose}
        >
          <X size={24} />
        </button>
        <div className="p-8 overflow-y-auto max-h-[90vh]">
          <h2 className="text-2xl font-bold mb-4 text-brand-link">Audit Lead Summary</h2>
          {isLoading && <div className="py-10 text-center text-gray-500">Loading summary...</div>}
          {error && <div className="py-10 text-center text-red-500">Failed to load summary.</div>}
          {data && data.data && (
            <div>
              {/* Company Info */}
              <div className={sectionClass}>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">Company Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="font-medium text-gray-600">Company Name:</span> <span className="text-gray-700">{data.data.company_name || "-"}</span></div>
                  <div><span className="font-medium text-gray-600">GST No:</span> <span className="text-gray-700">{data.data.gst_no || "-"}</span></div>
                  <div><span className="font-medium text-gray-600">PAN:</span> <span className="text-gray-700">{data.data.pan || "-"}</span></div>
                  <div><span className="font-medium text-gray-600">Company Email:</span> <span className="text-gray-700">{data.data.company_email || "-"}</span></div>
                  <div><span className="font-medium text-gray-600">LinkedIn:</span> {data.data.linkedin_url ? <a href={data.data.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-link underline">View</a> : <span className="text-gray-700">-</span>}</div>
                  <div><span className="font-medium text-gray-600">Website:</span> {data.data.website_url ? <a href={data.data.website_url} target="_blank" rel="noopener noreferrer" className="text-brand-link underline">View</a> : <span className="text-gray-700">-</span>}</div>
                </div>
              </div>
              {/* Verification Status */}
              <div className={sectionClass}>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">Verification Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="font-medium text-gray-600">LinkedIn Verified:</span> <span className="text-gray-700">{data.data.is_linkedin_verify ? "Yes" : "No"}</span></div>
                  <div><span className="font-medium text-gray-600">Website Verified:</span> <span className="text-gray-700">{data.data.is_website_verify ? "Yes" : "No"}</span></div>
                  <div><span className="font-medium text-gray-600">Company Verified:</span> <span className="text-gray-700">{data.data.is_company_verify ? "Yes" : "No"}</span></div>
                  <div><span className="font-medium text-gray-600">BSA Run:</span> <span className="text-gray-700">{data.data.is_bsa_run ? "Yes" : "No"}</span></div>
                  <div><span className="font-medium text-gray-600">Status:</span> <span className="text-gray-700">{data.data.status || "-"}</span></div>
                  <div><span className="font-medium text-gray-600">Created At:</span> <span className="text-gray-700">{data.data.created_at ? new Date(data.data.created_at).toLocaleString() : "-"}</span></div>
                  <div><span className="font-medium text-gray-600">Updated At:</span> <span className="text-gray-700">{data.data.updated_at ? new Date(data.data.updated_at).toLocaleString() : "-"}</span></div>
                </div>
              </div>
              {/* Remarks / Comments */}
              <div className={sectionClass}>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">Remarks / Comments</h3>
                <div className="text-gray-700 whitespace-pre-line">{data.data.remarks || "-"}</div>
              </div>
              {/* Optional Fields */}
              {data.data.company_name_in_banking && data.data.company_name_in_banking.length > 0 && (
                <div className={sectionClass}>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Company Name in Banking</h3>
                  <ul className="list-disc pl-5 text-gray-700">
                    {data.data.company_name_in_banking.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.data.company_gst_details && (
                <div className={sectionClass}>
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">GST Details</h3>
                  {(() => {
                    const gst = data.data.company_gst_details;
                    const result = gst.api_response?.result;
                    const details = result?.gstnDetailed || {};
                    const filingStatus = result?.filingStatus || [];
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div><span className="font-medium text-gray-600">GSTIN:</span> <span className="text-gray-700">{result?.gstin || '-'}</span></div>
                          <div><span className="font-medium text-gray-600">Status:</span> <span className="text-gray-700">{details.gstinStatus || '-'}</span></div>
                          <div><span className="font-medium text-gray-600">Legal Name:</span> <span className="text-gray-700">{details.legalNameOfBusiness || '-'}</span></div>
                          <div><span className="font-medium text-gray-600">Trade Name:</span> <span className="text-gray-700">{details.tradeNameOfBusiness || '-'}</span></div>
                          <div><span className="font-medium text-gray-600">Registration Date:</span> <span className="text-gray-700">{details.registrationDate || '-'}</span></div>
                          <div><span className="font-medium text-gray-600">Constitution:</span> <span className="text-gray-700">{details.constitutionOfBusiness || '-'}</span></div>
                          <div><span className="font-medium text-gray-600">State Jurisdiction:</span> <span className="text-gray-700">{details.stateJurisdiction || '-'}</span></div>
                          <div><span className="font-medium text-gray-600">Centre Jurisdiction:</span> <span className="text-gray-700">{details.centreJurisdiction || '-'}</span></div>
                        </div>
                        <div className="mb-2">
                          <span className="font-medium text-gray-600">Directors:</span> <span className="text-gray-700">{Array.isArray(details.directorNames) && details.directorNames.length > 0 ? details.directorNames.join(', ') : '-'}</span>
                        </div>
                        <div className="mb-2">
                          <span className="font-medium text-gray-600">Principal Place Address:</span> <span className="text-gray-700">{details.principalPlaceAddress?.address || '-'}</span>
                        </div>
                        <div className="mb-2">
                          <span className="font-medium text-gray-600">Nature of Business:</span> <span className="text-gray-700">{Array.isArray(details.natureOfBusinessActivities) && details.natureOfBusinessActivities.length > 0 ? details.natureOfBusinessActivities.join(', ') : '-'}</span>
                        </div>
                        {/* Filing Status Table */}
                        {Array.isArray(filingStatus) && filingStatus.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-gray-800 mb-2">GST Filing Status</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full border text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-2 py-1 border text-gray-700">GST Type</th>
                                    <th className="px-2 py-1 border text-gray-700">Status</th>
                                    <th className="px-2 py-1 border text-gray-700">Year</th>
                                    <th className="px-2 py-1 border text-gray-700">Month</th>
                                    <th className="px-2 py-1 border text-gray-700">Date of Filing</th>
                                    <th className="px-2 py-1 border text-gray-700">Method</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filingStatus.map((f, idx) => (
                                    <tr key={idx} className="even:bg-gray-50">
                                      <td className="px-2 py-1 border text-gray-700">{f.gstType || '-'}</td>
                                      <td className="px-2 py-1 border text-gray-700">{f.gstStatus || '-'}</td>
                                      <td className="px-2 py-1 border text-gray-700">{f.filingYear || '-'}</td>
                                      <td className="px-2 py-1 border text-gray-700">{f.monthOfFiling || '-'}</td>
                                      <td className="px-2 py-1 border text-gray-700">{f.dateOfFiling || '-'}</td>
                                      <td className="px-2 py-1 border text-gray-700">{f.methodOfFilling || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {/* KYC & Approval Details Section */}
              <div className={sectionClass}>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">KYC & Approval Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="font-medium text-gray-600">KYC Approved:</span> <span className="text-gray-700">{data.data.is_kyc_approved ? "Yes" : "No"}</span></div>
                  <div><span className="font-medium text-gray-600">KYC Rejection Remarks:</span> <span className="text-gray-700">{data.data.kyc_rejection_remarks || '-'}</span></div>
                  <div><span className="font-medium text-gray-600">Residence Address:</span> <span className="text-gray-700">{data.data.residence_address || '-'}</span></div>
                  <div><span className="font-medium text-gray-600">Residence Pincode:</span> <span className="text-gray-700">{data.data.residence_pincode || '-'}</span></div>
                  <div><span className="font-medium text-gray-600">Residence State:</span> <span className="text-gray-700">{data.data.residence_state || '-'}</span></div>
                  <div><span className="font-medium text-gray-600">Residence City:</span> <span className="text-gray-700">{data.data.residence_city || '-'}</span></div>
                  <div><span className="font-medium text-gray-600">Loan Amount:</span> <span className="text-gray-700">{data.data.loan_amount || '-'}</span></div>
                  <div><span className="font-medium text-gray-600">Credit Employee Name:</span> <span className="text-gray-700">{data.data.credit_employee_name || '-'}</span></div>
                  <div><span className="font-medium text-gray-600">Credit Head Name:</span> <span className="text-gray-700">{data.data.credit_head_name || '-'}</span></div>
                  <div><span className="font-medium text-gray-600">Approved By:</span> <span className="text-gray-700">{data.data.approved_by_name || '-'}</span></div>
                  <div><span className="font-medium text-gray-600">Rejected By:</span> <span className="text-gray-700">{data.data.rejected_by_name || '-'}</span></div>
                </div>
              </div>
              {/* Add more optional/advanced fields as needed */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditSummary; 