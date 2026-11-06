import React, { useState } from "react";
import { FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { confirmDisbursal } from "../../services/functions/disbursal";

const ManualDisbursalForm = ({ row, onClose }) => {
  const queryClient = useQueryClient();
  const loanNo = row?.loan_no || "";
  const [utr, setUtr] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: confirmDisbursal,
    onSuccess: () => {
      toast.success("Disbursal confirmed successfully");
      queryClient.invalidateQueries({ queryKey: ["pending-manual-disbursal"] });
      onClose?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to confirm disbursal");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loanNo) {
      toast.error("Loan number is missing for this lead");
      return;
    }
    if (!utr.trim()) {
      toast.error("Please enter UTR number");
      return;
    }
    mutate({
      loan_no: loanNo,
      utr: utr.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-3 sm:p-4">
      <p className="text-sm text-slate-500">
        Confirm loan disbursal with UTR details
      </p>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">
          Loan Number<span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <FileText className="h-4 w-4 text-brand-link" />
          </div>
          <input
            type="text"
            name="loan_no"
            value={loanNo}
            readOnly
            className="block w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 focus:outline-none"
            placeholder="Loan number from pending disbursal"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">
          UTR Number<span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <FileText className="h-4 w-4 text-brand-link" />
          </div>
          <input
            type="text"
            name="utr"
            required
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            disabled={isPending}
            className="block w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light disabled:bg-slate-50"
            placeholder="Enter UTR number"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || !loanNo}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Confirming..." : "Confirm Disbursal"}
      </button>
    </form>
  );
};

export default ManualDisbursalForm;
