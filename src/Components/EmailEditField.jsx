import { useState } from "react";
import { Pencil, Check, X, Loader2, Ban } from "lucide-react";
import toast from "react-hot-toast";
import { emailBypassUpdate } from "../services/functions/admin";
import ExpandableTruncatedText from "./ExpandableTruncatedText";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (value) => EMAIL_REGEX.test(String(value).trim());

const EmailEditField = ({
  panNumber,
  personalEmail = "",
  officialEmail = "",
  onUpdated,
  variant = "light",
  layout = "grid",
  personalLabel = "Personal Email",
  officialLabel = "Official Email",
  personalIcon: PersonalIcon,
  officialIcon: OfficialIcon,
  showEmailBlocked = false,
  editSpanClassName = "col-span-2",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personal, setPersonal] = useState(personalEmail ?? "");
  const [official, setOfficial] = useState(officialEmail ?? "");

  const isDark = variant === "dark";
  const isGrid = layout === "grid";
  const valueMarginClass = isGrid ? "mt-0.5" : "mt-1";

  const labelClass = isDark
    ? "text-[10px] font-medium text-blue-200/90"
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";
  const valueClass = isDark
    ? "text-sm font-semibold text-white"
    : "text-sm font-medium text-slate-800";
  const inputClass = isDark
    ? "w-full rounded-md border border-white/30 bg-white/10 px-2 py-1 text-sm text-white placeholder-white/50 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/40"
    : "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
  const personalValueClass = isGrid ? valueClass : `whitespace-pre-line ${valueClass}`;
  const pencilClass = isDark
    ? "shrink-0 text-blue-200/70 hover:text-white"
    : "shrink-0 text-slate-400 hover:text-brand-link";

  const handleEdit = () => {
    setPersonal(personalEmail ?? "");
    setOfficial(officialEmail ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPersonal(personalEmail ?? "");
    setOfficial(officialEmail ?? "");
  };

  const handleSubmit = async () => {
    const trimmedOfficial = official.trim();
    const trimmedPersonal = personal.trim();

    if (!panNumber) {
      toast.error("PAN number is not available for this lead");
      return;
    }
    if (!trimmedOfficial) {
      toast.error("Please enter official email");
      return;
    }
    if (!isValidEmail(trimmedOfficial)) {
      toast.error("Please enter a valid official email");
      return;
    }
    if (trimmedPersonal && !isValidEmail(trimmedPersonal)) {
      toast.error("Please enter a valid personal email");
      return;
    }

    const formData = new FormData();
    formData.append("official_email", trimmedOfficial);
    formData.append("externalRemarks", "Email updated as per request");
    if (trimmedPersonal) {
      formData.append("personal_email", trimmedPersonal);
    }

    setIsSubmitting(true);
    try {
      const response = await emailBypassUpdate(panNumber, formData, true);
      const success =
        response?.success ||
        response?.status === "success" ||
        response?.data?.success;

      if (success) {
        toast.success(
          response?.message || response?.data?.message || "Email updated successfully"
        );
        setIsEditing(false);
        onUpdated?.({
          personal_email: trimmedPersonal,
          official_email: trimmedOfficial,
        });
      } else {
        toast.error(
          response?.message ||
            response?.data?.message ||
            response?.error ||
            "Failed to update email"
        );
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to update email"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderActions = () => (
    <div className="flex items-center gap-2 pt-1">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        <span>{isSubmitting ? "Saving..." : "Submit"}</span>
      </button>
      <button
        type="button"
        onClick={handleCancel}
        disabled={isSubmitting}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
          isDark
            ? "bg-white/15 text-white hover:bg-white/25"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        <X className="h-3 w-3" />
        <span>Cancel</span>
      </button>
    </div>
  );

  if (isEditing) {
    const editContent = (
      <div className="space-y-2">
        <div className="flex flex-col">
          <label className={`flex items-center gap-1 ${labelClass}`}>
            {PersonalIcon ? <PersonalIcon className="h-3 w-3 shrink-0 opacity-90" /> : null}
            {personalLabel}
          </label>
          <input
            type="email"
            value={personal}
            onChange={(e) => setPersonal(e.target.value)}
            placeholder="Enter personal email"
            className={`mt-0.5 ${inputClass}`}
          />
        </div>
        <div className="flex flex-col">
          <label className={`flex items-center gap-1 ${labelClass}`}>
            {OfficialIcon ? <OfficialIcon className="h-3 w-3 shrink-0 opacity-90" /> : null}
            {officialLabel}
          </label>
          <input
            type="email"
            value={official}
            onChange={(e) => setOfficial(e.target.value)}
            placeholder="Enter official email"
            className={`mt-0.5 ${inputClass}`}
          />
        </div>
        {renderActions()}
      </div>
    );

    if (isGrid) {
      return <div className={`min-w-0 ${editSpanClassName}`}>{editContent}</div>;
    }

    return editContent;
  }

  const renderPersonalField = () => (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <p className={`flex items-center gap-1 ${labelClass}`}>
          {PersonalIcon ? <PersonalIcon className="h-3 w-3 shrink-0 opacity-90" /> : null}
          {personalLabel}
        </p>
        <button
          type="button"
          onClick={handleEdit}
          title="Edit emails"
          className={pencilClass}
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
      <div className={`${valueMarginClass} flex items-start gap-1.5`}>
        {isGrid ? (
          <ExpandableTruncatedText
            value={personalEmail}
            className={`flex-1 ${personalValueClass}`}
          />
        ) : (
          <p className={personalValueClass} title={personalEmail || "N/A"}>
            {personalEmail || "N/A"}
          </p>
        )}
      </div>
    </div>
  );

  const renderOfficialField = () => (
    <div className="min-w-0">
      <p className={`flex items-center gap-1 ${labelClass}`}>
        {OfficialIcon ? <OfficialIcon className="h-3 w-3 shrink-0 opacity-90" /> : null}
        {officialLabel}
      </p>
      <div className={`${valueMarginClass} flex items-start gap-1.5`}>
        {isGrid ? (
          <ExpandableTruncatedText
            value={officialEmail}
            className={`flex-1 ${personalValueClass}`}
          />
        ) : (
          <p className={personalValueClass} title={officialEmail || "N/A"}>
            {officialEmail || "N/A"}
          </p>
        )}
        {showEmailBlocked && officialEmail && (
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" title="Email check blocked" />
        )}
      </div>
    </div>
  );

  if (isGrid) {
    return (
      <>
        {renderPersonalField()}
        {renderOfficialField()}
      </>
    );
  }

  return (
    <div className="space-y-3">
      {renderPersonalField()}
      {renderOfficialField()}
    </div>
  );
};

export default EmailEditField;
