import React, { useEffect, useRef, useState } from "react";

function DevTabReasonPrompt({ pendingChange, onConfirm, onDiscard }) {
  const [reason, setReason] = useState("");
  const inputRef = useRef(null);
  const trimmed = reason.trim();
  const canConfirm = trimmed.length >= 5;

  useEffect(() => {
    setReason("");
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [pendingChange]);

  if (!pendingChange) return null;

  const fieldLabel =
    pendingChange.spec?.label || pendingChange.field || "field";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="devtab-reason-title"
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h2
          id="devtab-reason-title"
          className="text-base font-semibold text-gray-900"
        >
          Why this change?
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Every write is audited. The first save of a session needs a reason of
          at least 5 characters; later saves reuse it.
        </p>

        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800">
          <span className="font-semibold text-[#382c8e]">{fieldLabel}</span>
          <span className="mx-2 text-gray-400">:</span>
          <span className="text-red-600 line-through">
            {pendingChange.displayOld ?? "—"}
          </span>
          <span className="mx-2 text-gray-400">→</span>
          <span className="text-green-700">{pendingChange.displayNew ?? "—"}</span>
        </div>

        <label className="mt-4 block text-xs font-medium text-gray-700">
          Reason
          <textarea
            ref={inputRef}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && canConfirm) {
                event.preventDefault();
                onConfirm(trimmed);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onDiscard();
              }
            }}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#382c8e] focus:ring-1 focus:ring-[#382c8e]"
            placeholder="e.g. Corrected pincode from KYC documents"
          />
        </label>
        {trimmed.length > 0 && trimmed.length < 5 && (
          <p className="mt-1 text-[11px] text-red-600">
            Reason must be at least 5 characters.
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Discard change
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(trimmed)}
            className="cursor-pointer rounded-md bg-[#382c8e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#220e83] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save with this reason
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          Discarding closes this prompt and the typed cell value is not
          recoverable.
        </p>
      </div>
    </div>
  );
}

export default DevTabReasonPrompt;
