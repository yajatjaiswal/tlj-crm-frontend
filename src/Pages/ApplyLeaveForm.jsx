import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { applyLeave } from "../services/functions/user";
import toast from "react-hot-toast";
import DateRangePicker from "../Components/DateRangePicker";
import { ChevronDown, Heart, Coffee, Calendar, FileText, Clock, Sun, Sunset } from "lucide-react";

function ApplyLeaveForm() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [leaveMode, setLeaveMode] = useState([]);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [isLeaveTypeOpen, setIsLeaveTypeOpen] = useState(false);
  const leaveTypeRef = useRef(null);

  // Calculate days based on from, to, and leaveMode
  const days = useMemo(() => {
    if (!from || !to) return 0;

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const baseDays = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

    // Case A: Single date (from === to)
    if (from === to) {
      // If no leave mode selected, return 0 (can't calculate without knowing full/half day)
      if (leaveMode.length === 0) return 0;
      
      let total = 0;
      if (leaveMode.includes("full_day")) {
        total = 1;
      } else {
        if (leaveMode.includes("first_half")) total += 0.5;
        if (leaveMode.includes("second_half")) total += 0.5;
      }
      return Math.min(total, 1); // Cap at 1 for single day
    }

    // Case B: Range (from !== to)
    // Start with base days (all full days)
    let totalDays = baseDays;
    
    // Subtract 0.5 days for each half-day selection
    if (leaveMode.includes("first_half")) {
      totalDays -= 0.5;
    }
    if (leaveMode.includes("second_half")) {
      totalDays -= 0.5;
    }
    
    // Ensure days don't go below 0
    return Math.max(totalDays, 0);
  }, [from, to, leaveMode]);

  // Handle from date change - clear to if new from is selected
  const handleFromChange = (dateStr) => {
    setFrom(dateStr);
    // Always clear to when from changes (force re-selection)
    if (to) {
      setTo("");
      setLeaveMode([]);
    }
    setErrors((prev) => ({ ...prev, from: "", to: "" }));
  };

  // Handle to date change
  const handleToChange = (dateStr) => {
    if (dateStr && from && dateStr < from) {
      setErrors((prev) => ({
        ...prev,
        to: "End date cannot be before start date",
      }));
      return;
    }
    setTo(dateStr);
    setErrors((prev) => ({ ...prev, to: "" }));
  };

  // Update leaveMode when dates change
  useEffect(() => {
    if (from && to) {
      if (from !== to) {
        // Range: remove full_day if selected
        if (leaveMode.includes("full_day")) {
          setLeaveMode((prev) => prev.filter((mode) => mode !== "full_day"));
        }
      }
    } else {
      // If dates are cleared, clear leaveMode
      setLeaveMode([]);
    }
  }, [from, to]);

  // Close leave type dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (leaveTypeRef.current && !leaveTypeRef.current.contains(event.target)) {
        setIsLeaveTypeOpen(false);
      }
    };

    if (isLeaveTypeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isLeaveTypeOpen]);

  const leaveTypeOptions = [
    {
      value: "sick_leave",
      label: "Sick Leave",
      icon: Heart,
      color: "text-red-600",
      bgColor: "bg-red-50",
      hoverColor: "hover:bg-red-100",
    },
    {
      value: "casual_leave",
      label: "Casual Leave",
      icon: Coffee,
      color: "text-brand-link",
      bgColor: "bg-brand-light",
      hoverColor: "hover:bg-brand-light",
    },
  ];

  const selectedLeaveType = leaveTypeOptions.find((opt) => opt.value === leaveType);

  // Determine which leave modes to show
  const availableModes = useMemo(() => {
    if (!from || !to) return [];
    if (from === to) {
      // Single date: show all three as radio (but we'll use checkboxes)
      return ["full_day", "second_half", "first_half"];
    } else {
      // Range: show only first_half and second_half
      return ["second_half", "first_half"];
    }
  }, [from, to]);

  // Handle leave mode change
  const handleLeaveModeChange = (mode) => {
    if (from === to) {
      // Single date: radio behavior (only one can be selected)
      setLeaveMode([mode]);
    } else {
      // Range: checkbox behavior (multiple can be selected)
      setLeaveMode((prev) =>
        prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
      );
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!from) {
      newErrors.from = "Start date is required";
    }
    
    if (!to) {
      newErrors.to = "End date is required";
    } else if (to && from && to < from) {
      newErrors.to = "End date cannot be before start date";
    }
    
    if (!leaveType) newErrors.leaveType = "Leave type is required";
    // Only require leave mode for single date (radio mode), not for date range (checkbox mode)
    if (from === to && leaveMode.length === 0) {
      newErrors.leaveMode = "Please select at least one leave mode";
    }
    if (!reason.trim()) newErrors.reason = "Reason is required";
    if (days <= 0) newErrors.days = "Days must be greater than 0";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const { mutate: submitLeave, isPending } = useMutation({
    mutationFn: applyLeave,
    onSuccess: () => {
      toast.success("Leave application submitted successfully!");
      // Reset form
      setFrom("");
      setTo("");
      setLeaveType("");
      setLeaveMode([]);
      setReason("");
      setErrors({});
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit leave application");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    // Convert leaveMode to string for single date (radio mode)
    // For date range (checkbox mode): if no selection, send "full_day" as string, otherwise send array
    let leaveModeValue;
    if (from === to) {
      // Single date: send as string
      leaveModeValue = leaveMode[0];
    } else {
      // Date range: if no checkboxes selected, send "full_day" as string, otherwise send array
      leaveModeValue = leaveMode.length === 0 ? "full_day" : leaveMode;
    }

    const leaveData = {
      from,
      to,
      leave_type: leaveType,
      leave_mode: leaveModeValue,
      reason: reason.trim(),
      days: days,
    };

    submitLeave(leaveData);
  };

  return (
    <div className="max-w-2xl mx-auto sm:mt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Apply Leave</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Selection */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-brand-link" />
              <label className="text-sm font-medium text-gray-900">
                Date Range <span className="text-red-500">*</span>
              </label>
            </div>
            <DateRangePicker
              from={from}
              to={to}
              onFromChange={handleFromChange}
              onToChange={handleToChange}
              error={errors.from || errors.to}
            />
          </div>

          {/* Leave Type */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-brand-link" />
              <label className="text-sm font-medium text-gray-900">
                Leave Type <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="relative" ref={leaveTypeRef}>
            <button
              type="button"
              onClick={() => setIsLeaveTypeOpen(!isLeaveTypeOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-lg shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all ${
                errors.leaveType
                  ? "border-red-300"
                  : "border-gray-300 hover:border-brand"
              } ${selectedLeaveType ? "text-gray-900" : "text-gray-500"}`}
            >
              <div className="flex items-center gap-3">
                {selectedLeaveType ? (
                  <>
                    <div
                      className={`p-2 rounded-lg ${selectedLeaveType.bgColor}`}
                    >
                      <selectedLeaveType.icon
                        className={`w-4 h-4 ${selectedLeaveType.color}`}
                      />
                    </div>
                    <span className="font-medium">{selectedLeaveType.label}</span>
                  </>
                ) : (
                  <span>Select leave type</span>
                )}
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isLeaveTypeOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isLeaveTypeOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {leaveTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = leaveType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setLeaveType(option.value);
                        setIsLeaveTypeOpen(false);
                        setErrors((prev) => ({ ...prev, leaveType: "" }));
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? `${option.bgColor} ${option.color} font-medium`
                          : "text-gray-700 hover:bg-gray-50"
                      } ${option.hoverColor}`}
                    >
                      <div
                        className={`p-1.5 rounded-md ${
                          isSelected ? option.bgColor : "bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            isSelected ? option.color : "text-gray-600"
                          }`}
                        />
                      </div>
                      <span className="text-sm">{option.label}</span>
                      {isSelected && (
                        <span className="ml-auto text-brand-link text-sm">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.leaveType && (
              <p className="mt-1 text-sm text-red-600">{errors.leaveType}</p>
            )}
            </div>
          </div>

          {/* Leave Mode */}
          {from && to && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-brand-link" />
                <label className="text-sm font-medium text-gray-900">
                  Leave Mode {from === to && <span className="text-red-500">*</span>}
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {availableModes.map((mode) => {
                  const modeLabels = {
                    full_day: "Full Day",
                    second_half: "Second Half",
                    first_half: "First Half",
                  };

                  const modeIcons = {
                    full_day: Clock,
                    first_half: Sun,
                    second_half: Sunset,
                  };

                  const modeColors = {
                    full_day: {
                      bg: "bg-brand-light",
                      border: "border-brand",
                      text: "text-brand-link",
                      icon: "text-brand-link",
                      hover: "hover:border-brand hover:bg-brand-light/70",
                    },
                    first_half: {
                      bg: "bg-amber-50",
                      border: "border-amber-500",
                      text: "text-amber-700",
                      icon: "text-amber-600",
                      hover: "hover:border-amber-400 hover:bg-amber-50/70",
                    },
                    second_half: {
                      bg: "bg-orange-50",
                      border: "border-orange-500",
                      text: "text-orange-700",
                      icon: "text-orange-600",
                      hover: "hover:border-orange-400 hover:bg-orange-50/70",
                    },
                  };

                  const isChecked = leaveMode.includes(mode);
                  const isRadio = from === to;
                  const Icon = modeIcons[mode];
                  const colors = modeColors[mode];

                  return (
                    <label
                      key={mode}
                      className={`relative flex flex-col items-center justify-center gap-2 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                        isChecked
                          ? `${colors.border} ${colors.bg} ${colors.text} shadow-sm`
                          : `border-gray-200 bg-white text-gray-700 ${colors.hover}`
                      }`}
                    >
                      <input
                        type={isRadio ? "radio" : "checkbox"}
                        name={isRadio ? "leaveMode" : undefined}
                        checked={isChecked}
                        onChange={() => handleLeaveModeChange(mode)}
                        className="sr-only"
                      />
                      {/* Custom Checkbox/Radio Indicator */}
                      <div className="absolute top-2 right-2">
                        {isRadio ? (
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isChecked
                                ? `${colors.border} ${colors.bg}`
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isChecked && (
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${colors.bg.replace("50", "600")}`}
                              />
                            )}
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isChecked
                                ? `${colors.border} ${colors.bg}`
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isChecked && (
                              <svg
                                className={`w-3.5 h-3.5 ${colors.text.replace("700", "600")}`}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className={`p-2 rounded-lg transition-colors ${
                          isChecked ? colors.bg : "bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 transition-colors ${
                            isChecked ? colors.icon : "text-gray-500"
                          }`}
                        />
                      </div>
                      <span className="text-sm font-semibold text-center">
                        {modeLabels[mode]}
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.leaveMode && (
                <p className="mt-2 text-sm text-red-600">{errors.leaveMode}</p>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-gray-700 placeholder-gray-400 resize-none text-sm"
              placeholder="Enter reason for leave"
            />
            {errors.reason && (
              <p className="mt-1.5 text-sm text-red-600">{errors.reason}</p>
            )}
          </div>

          {/* Days (Read-only) */}
          <div className="bg-gradient-to-r from-brand-extra-light to-brand-light p-4 rounded-lg border border-brand/40 shadow-sm">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Total Days
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm">
                <span className="text-xl font-bold text-brand-link">
                  {days > 0 ? days.toFixed(1) : "0"}
                </span>
                <span className="text-xs text-gray-500 ml-2">days</span>
              </div>
            </div>
            {errors.days && (
              <p className="mt-1.5 text-sm text-red-600">{errors.days}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-brand text-white rounded-lg font-medium text-sm shadow-md hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-brand-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>
    </div>
  );
}

export default ApplyLeaveForm;
