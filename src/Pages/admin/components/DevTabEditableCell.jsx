import React, { useEffect, useRef } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { fieldHint, toInputValue } from "../../../utils/devTabFields";

const CONTROL_CLASS =
  "w-full min-w-[7.5rem] text-xs text-gray-900 bg-white border border-[#382c8e] rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-[#382c8e]";

function DevTabEditableCell({
  value,
  displayValue,
  spec,
  isEditable,
  isEditing,
  status,
  onStartEdit,
  onCommit,
  onCancel,
}) {
  const inputRef = useRef(null);
  const committedRef = useRef(false);
  const draftRef = useRef("");
  const [draft, setDraft] = React.useState("");

  useEffect(() => {
    if (!isEditing) return;
    committedRef.current = false;
    const next = toInputValue(value, spec);
    draftRef.current = next;
    setDraft(next);
    const frame = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      try {
        el.select();
      } catch {
        // date / datetime-local inputs throw on select()
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isEditing, value, spec]);

  const updateDraft = (next) => {
    draftRef.current = next;
    setDraft(next);
  };

  const commit = (nextAction) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(draftRef.current, nextAction);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commit("close");
    } else if (event.key === "Escape") {
      event.preventDefault();
      committedRef.current = true;
      onCancel();
    } else if (event.key === "Tab") {
      event.preventDefault();
      commit(event.shiftKey ? "prev" : "next");
    }
  };

  const handleBlur = () => {
    if (!committedRef.current) commit("close");
  };

  const enumOptions = spec?.options || [];
  const extraOption =
    spec?.type === "enum" && draft && !enumOptions.includes(draft) ? [draft] : [];

  if (isEditing && isEditable && spec) {
    const common = {
      ref: inputRef,
      className: CONTROL_CLASS,
      value: draft,
      title: fieldHint(spec) || spec.label || spec.name,
      onChange: (event) => updateDraft(event.target.value),
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
    };

    let widget;
    if (spec.type === "boolean") {
      widget = (
        <select {...common}>
          {spec.nullable !== false && <option value="">—</option>}
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    } else if (spec.type === "enum") {
      widget = (
        <select {...common}>
          {spec.nullable !== false && <option value="">—</option>}
          {[...extraOption, ...enumOptions].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    } else if (spec.type === "date") {
      widget = <input type="date" {...common} />;
    } else if (spec.type === "datetime") {
      widget = <input type="datetime-local" {...common} />;
    } else if (spec.type === "int" || spec.type === "decimal") {
      widget = <input type="text" inputMode="decimal" {...common} />;
    } else if (spec.type === "text" || spec.type === "json") {
      widget = (
        <textarea
          {...common}
          rows={spec.type === "json" ? 4 : 2}
          maxLength={spec.max_length || undefined}
          className={`${CONTROL_CLASS} min-w-[14rem]`}
        />
      );
    } else {
      widget = (
        <input
          type="text"
          maxLength={spec.max_length || undefined}
          {...common}
        />
      );
    }

    return <div className="min-w-[8rem] p-0.5">{widget}</div>;
  }

  const isSaving = status?.type === "saving";
  const isSaved = status?.type === "saved";
  const isError = status?.type === "error";
  const errorMessage = status?.message;

  return (
    <div
      role={isEditable ? "button" : undefined}
      tabIndex={isEditable ? 0 : undefined}
      onClick={() => {
        if (isEditable) onStartEdit();
      }}
      onKeyDown={(event) => {
        if (!isEditable) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onStartEdit();
        }
      }}
      title={isError ? errorMessage : undefined}
      className={`relative min-h-[1.75rem] max-w-[16rem] truncate px-2 py-1 text-[11px] ${
        isEditable ? "cursor-text hover:bg-[#eeedf6]" : "text-gray-500"
      } ${isError ? "bg-red-50 text-red-800" : ""}`}
    >
      <span className="pr-4">{displayValue}</span>
      {isSaving && (
        <Loader2
          size={11}
          className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin text-[#382c8e]"
        />
      )}
      {isSaved && (
        <Check
          size={12}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-green-600"
        />
      )}
      {isError && (
        <AlertTriangle
          size={11}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-red-600"
        />
      )}
    </div>
  );
}

export default DevTabEditableCell;
