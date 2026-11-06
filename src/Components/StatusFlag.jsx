import { CheckCircle2, XCircle } from "lucide-react";

const StatusFlag = ({ bre, bsa, kyc }) => {
  return (
    <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2 text-gray-800">Status Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
            {bre ? (
              <XCircle className="text-red-500" size={22} />
            ) : (
              <CheckCircle2 className="text-green-500" size={22} />
            )}
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700">
                BRE Approved
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
            {bsa ? (
              <CheckCircle2 className="text-green-500" size={20} />
            ) : (
              <XCircle className="text-red-500" size={20} />
            )}
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700">
                BSA Completed
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
            {kyc ? (
              <CheckCircle2 className="text-green-500" size={22} />
            ) : (
              <XCircle className="text-red-500" size={22} />
            )}
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700">
                KYC Approved
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatusFlag;
