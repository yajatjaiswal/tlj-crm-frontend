import React from "react";
import {
  MessageSquare,
  Calendar as CalendarIcon,
  Clock,
  Tag,
  ChevronDown,
  Send,
  X,
} from "lucide-react";
import Calendar from "../Calendar/Calendar";
import SvgLoader from "../../ui/SvgLoader";
import TimePickerClock from "./TimePickerClock";
import { createPortal } from "react-dom";

const QUICK_COMMENT_OPTIONS = ["Follow up", "Call back", "No Response", "In-Progress", "Low Salary", "Not Interested"];

const CommentForm = ({
  formRef,
  commentTextareaRef,
  formData,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  error,
  disablePastDates,
  currentTime12,
  isTodaySelected,
  currentActualTime12,
  isTimePickerOpen,
  onToggleTimePicker,
  timePickerButtonRef,
  timePickerRef,
  timePickerPosition,
  onTimeSelect,
  onTimeApply,
  onScheduledDateChange,
}) => {
  const handleQuickCommentSelect = (text) => {
    const currentValue = formData.comment || "";
    const separator =
      currentValue.length === 0 || /\s$/.test(currentValue) ? "" : " ";
    const nextValue = `${currentValue}${separator}${text}`.trimStart();
    onChange({
      target: { name: "comment", value: nextValue },
    });
    if (commentTextareaRef?.current) {
      commentTextareaRef.current.focus();
    }
  };

  return (
    <div className="relative overflow-hidden">
      <form ref={formRef} className="space-y-6" onSubmit={onSubmit}>
        <div className="group">
          <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 shadow-sm">
              <MessageSquare size={14} className="text-brand-link" />
            </div>
            <span>Comment</span>
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="relative">
            <textarea
              ref={commentTextareaRef}
              name="comment"
              value={formData.comment}
              onChange={onChange}
              className="mt-2 w-full rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-300 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10 focus:shadow-lg resize-none"
              rows={5}
              placeholder="Write a clear and detailed comment. This will help your team stay informed about important updates or actions needed for this lead."
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-medium bg-white/80 px-2 py-0.5 rounded">
              {formData.comment.length} characters
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Quick add
            </span>
            {QUICK_COMMENT_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => handleQuickCommentSelect(option)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 transition-all duration-200 hover:border-brand hover:text-brand-link hover:bg-brand/5 cursor-pointer"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="group">
            <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-light shadow-sm">
                <CalendarIcon size={14} className="text-brand-link" />
              </div>
              <span>Schedule Date</span>
            </label>
            <div className="mt-2 space-y-3">
              <Calendar
                value={formData.scheduled_date}
                onChange={onScheduledDateChange}
                placeholder="Select schedule date"
                className="w-full"
                disablePastDates={disablePastDates}
              />
            </div>
          </div>

          <div
            className={`group transition-opacity duration-200 ${
              !formData.scheduled_date ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <label className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-light shadow-sm">
                <Clock size={14} className="text-brand-link" />
              </div>
              <span>Schedule Time</span>
            </label>
            <div className="mt-2">
              <div className="relative">
                <button
                  ref={timePickerButtonRef}
                  type="button"
                  onClick={() => formData.scheduled_date && onToggleTimePicker()}
                  className={`w-full flex items-center justify-between px-3 py-2.5 pl-12 pr-3 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand hover:border-brand transition-colors text-sm ${
                    formData.scheduled_date ? "cursor-pointer" : "cursor-not-allowed"
                  } ${
                    isTimePickerOpen
                      ? "border-brand ring-2 ring-brand"
                      : formData.scheduled_time
                      ? "text-gray-900"
                      : "text-gray-500"
                  }`}
                >
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 transition-colors">
                    <Clock
                      size={18}
                      className={`${
                        formData.scheduled_time || isTimePickerOpen
                          ? "text-brand-link"
                          : "text-gray-400"
                      }`}
                    />
                  </div>
                  <span className={formData.scheduled_time ? "text-gray-900" : "text-gray-500"}>
                    {formData.scheduled_time
                      ? `${currentTime12.hour}:${currentTime12.minute} ${currentTime12.period}`
                      : formData.scheduled_date
                      ? "Select time"
                      : "Select date first"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${
                      isTimePickerOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isTimePickerOpen && formData.scheduled_date && (
                  <TimePickerClock
                    currentTime12={currentTime12}
                    onTimeSelect={onTimeSelect}
                    onApply={onTimeApply}
                    timePickerRef={timePickerRef}
                    position={timePickerPosition}
                    isTodaySelected={isTodaySelected}
                    currentActualTime12={currentActualTime12}
                  />
                )}
              </div>
              {!formData.scheduled_date && (
                <p className="mt-2 text-xs text-gray-400">Select a schedule date to enable time.</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 px-4 py-3.5 text-sm text-red-700 shadow-sm">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
              <X size={16} className="text-red-600" />
            </div>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            disabled={submitting}
          >
            <X size={16} />
            Cancel
          </button>
          <button
            type="submit"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand via-brand-hover to-brand-hover px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-all duration-300 hover:shadow-xl hover:shadow-brand/40 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 cursor-pointer"
            disabled={submitting}
          >
            {submitting ? (
              <SvgLoader />
            ) : (
              <>
                <Send size={16} className="transition-transform group-hover:translate-x-1" />
                Apply Comment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;

