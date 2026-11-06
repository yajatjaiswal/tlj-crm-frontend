import { CheckCircle, X } from "lucide-react";
import SvgLoader from "../../ui/SvgLoader";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { approveManualKyc } from "../../services/functions/screener";

const ManualKycApproveModal = ({
    showManualKycApproveModal,
    handleModalOutsideClick,
    approvingLead,
    setShowManualKycApproveModal
}) => {
    const [loading, setLoading] = useState(false);
    const [approvalNotes, setApprovalNotes] = useState("");

    const handleApprove = async () => {
        try {
            setLoading(true);
            await approveManualKyc(approvingLead.id, approvalNotes);
            toast.success("KYC approved successfully");
            setShowManualKycApproveModal(false);
            setApprovalNotes("");
            window.location.reload();

        } catch (error) {
            toast.error(error.message || "Failed to approve KYC");
        } finally {
            setLoading(false);
        }
    };

    if (!showManualKycApproveModal) return null;

    return (
        <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={handleModalOutsideClick}
        >
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 max-w-md w-full mx-4 shadow-xl border border-gray-200 animate-fade-in">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-green-100 rounded-lg">
                        <CheckCircle className="text-green-600" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">
                        Approve Manual KYC {approvingLead?.lead_no}
                    </h3>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                        Approval Notes
                    </label>
                    <textarea
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="w-full p-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400"
                        rows={4}
                        placeholder="Enter any notes about the KYC approval..."
                    />
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        onClick={() => setShowManualKycApproveModal(false)}
                        className="px-6 py-3 text-white bg-gray-700 hover:bg-gray-600 rounded-xl transition-all duration-300 hover:scale-105 font-medium cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApprove}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 hover:scale-105 font-medium shadow-lg shadow-green-500/20 cursor-pointer"
                    >
                        {loading ? <SvgLoader /> : <CheckCircle size={20} />}
                        {loading ? "Approving..." : "Approve KYC"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualKycApproveModal; 