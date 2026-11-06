import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  remarkLabel,
  remarkValue,
  onRemarkChange,
  remarkPlaceholder,
  remarkRequired = false,
}) => {
  const [hasInteractedWithRemark, setHasInteractedWithRemark] = useState(false);
  const remarkInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setHasInteractedWithRemark(false);
      requestAnimationFrame(() => {
        if (remarkInputRef.current) {
          remarkInputRef.current.focus();
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = remarkRequired && !((remarkValue || "").trim());
  const handleShortcutSubmit = (event) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === "Enter" &&
      typeof onConfirm === "function"
    ) {
      event.preventDefault();
      if (!isConfirmDisabled) {
        onConfirm();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50"
      onClick={(event) => {
        if (event.target === event.currentTarget && typeof onClose === "function") {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-yellow-500" size={24} />
              <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-gray-600 mb-4">{message}</p>

          {typeof onRemarkChange === "function" && (
            <div className="mb-6">
              {remarkLabel && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {remarkLabel}
                  {remarkRequired && <span className="text-red-600"> *</span>}
                </label>
              )}
              <textarea
                ref={remarkInputRef}
                value={remarkValue || ""}
                onChange={(e) => {
                  setHasInteractedWithRemark(true);
                  if (typeof onRemarkChange === "function") {
                    onRemarkChange(e.target.value);
                  }
                }}
                onKeyDown={handleShortcutSubmit}
                placeholder={remarkPlaceholder || "Type your remark (optional)"}
                className={`w-full min-h-[80px] p-3 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 ${
                  isConfirmDisabled && hasInteractedWithRemark
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-brand"
                }`}
              />
              {isConfirmDisabled && hasInteractedWithRemark && (
                <p className="mt-1 text-xs text-red-600">Remark is required.</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              className={`px-4 py-2 rounded-lg transition-color ${
                isConfirmDisabled
                  ? "bg-brand/40 text-white/60 cursor-not-allowed"
                  : "bg-brand text-white hover:bg-brand-hover cursor-pointer"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
