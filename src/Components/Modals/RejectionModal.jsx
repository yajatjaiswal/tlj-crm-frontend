import { AlertCircle, X } from "lucide-react";
import SvgLoader from "../../ui/SvgLoader";

const RejectionModal = ({
    isDarkMode,
    showRejectionModal,
    handleModalOutsideClick,
    rejectingLead,
    setShowRejectionModal,
    submitRejection,
    selectedReason,
    setSelectedReason,
    rejectionNotes,
    setRejectionNotes,
    rejectionReasons,
    loadingState,
    leadID,
    customReason,
    setCustomReason
}) =>{
    const handleReasonChange = (e) => {
      const value = e.target.value;
      setSelectedReason(value);
      if (value !== "Other") {
        setCustomReason("");
      }
    };

    if(!showRejectionModal) return null;
    return(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={handleModalOutsideClick}
          >
            <div className={`${isDarkMode ? 'bg-brand-dark-secondary/90' : 'bg-white/90'} backdrop-blur-sm rounded-xl p-8 max-w-md w-full mx-4 shadow-xl border ${isDarkMode ? 'border-brand/20' : 'border-gray-200'} animate-fade-in`}>
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 ${isDarkMode ? 'bg-brand/10' : 'bg-brand-light'} rounded-lg`}>
                  <AlertCircle className={isDarkMode ? "text-brand-link" : "text-gray-800"} size={24} />
                </div>
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-brand-link' : 'text-gray-800'}`}>
                  Reject Lead {" "} {leadID}
                  </h3>
              </div>
              
              <div className="mb-4">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-brand-link' : 'text-gray-800'} mb-2`}>
                  Rejection Reason<span className="text-red-700">*</span>
                </label>
                <select
                  value={selectedReason}
                  onChange={handleReasonChange}
                  className={`w-full p-3 ${isDarkMode ? 'bg-brand-dark/50 text-brand-dark' : 'bg-gray-50 text-gray-900'} border ${isDarkMode ? 'border-brand/20' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-brand' : 'focus:ring-brand'} focus:border-transparent cursor-pointer`}
                >
                  <option value="">Select a reason</option>
                  {rejectionReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
              {selectedReason === "Other" && (
                <div className="mb-4">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-brand-link' : 'text-gray-800'} mb-2`}>
                    Custom Rejection Reason<span className="text-red-700">*</span>
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className={`w-full p-3 ${isDarkMode ? 'bg-brand-dark/50 text-brand-dark' : 'bg-gray-50 text-gray-900'} border ${isDarkMode ? 'border-brand/20' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-brand' : 'focus:ring-brand'} focus:border-transparent ${isDarkMode ? 'placeholder:text-white/50' : 'placeholder:text-gray-400'}`}
                    placeholder="Type the rejection reason"
                  />
                </div>
              )}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-brand-link' : 'text-gray-800'} mb-2`}>
                  Additional Notes
                </label>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  className={`w-full p-3 ${isDarkMode ? 'bg-brand-dark/50 text-brand-dark' : 'bg-gray-50 text-gray-900'} border ${isDarkMode ? 'border-brand/20' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-brand' : 'focus:ring-brand'} focus:border-transparent ${isDarkMode ? 'placeholder:text-white/50' : 'placeholder:text-gray-400'}`}
                  rows={4}
                  placeholder="Enter any additional notes..."
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className={`px-6 py-3 ${isDarkMode ? 'text-brand-dark/80 bg-brand-dark/50 hover:bg-brand-dark' : 'text-white bg-gray-700 hover:bg-gray-600'} rounded-xl transition-all duration-300 hover:scale-105 font-medium cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  onClick={submitRejection}
                  className="flex px-3 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 hover:scale-105 font-medium shadow-lg shadow-red-500/20 cursor-pointer"
                >
                  <X/>
                  {loadingState[rejectingLead?.id] ? <SvgLoader/> : "Reject Lead"}
                </button>
              </div>
            </div>
          </div>
    )
}

export default RejectionModal;