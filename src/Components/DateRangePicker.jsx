import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";

const DateRangePicker = ({ from, to, onFromChange, onToChange, label, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectionState, setSelectionState] = useState("from"); // "from" or "to"
  const buttonRef = useRef(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });

  // Initialize calendar to selected date or today
  useEffect(() => {
    const dateToUse = selectionState === "from" ? from : to;
    if (dateToUse) {
      const date = new Date(dateToUse);
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  }, [from, to, selectionState]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const calendarPopup = document.querySelector('[data-date-range-popup]');
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        calendarPopup &&
        !calendarPopup.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getMonthName = (monthIndex) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return months[monthIndex];
  };

  const navigateMonth = (direction) => {
    if (direction === "prev") {
      // Allow navigating to past months
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      // Allow navigating to future months
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const formatDateString = (year, month, day) => {
    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return `${year}-${monthStr}-${dayStr}`;
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(currentYear, currentMonth, day);
      days.push({ day, dateStr });
    }
    return days;
  };

  const getTodayString = () => {
    const today = new Date();
    return formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const isDateDisabled = (dateStr) => {
    // Only disable 'to' date if it's before 'from' date
    if (selectionState === "to" && from && dateStr < from) return true;
    return false;
  };

  const handleDateSelect = (dateStr) => {
    if (isDateDisabled(dateStr)) return;

    if (selectionState === "from") {
      onFromChange(dateStr);
      setSelectionState("to");
      // Don't close calendar, wait for second selection
    } else if (selectionState === "to") {
      if (dateStr < from) {
        // Show error, don't set
        return;
      }
      // Allow same date (from === to)
      onToChange(dateStr);
      setIsOpen(false);
      setSelectionState("from");
    }
  };

  const calculatePosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const calendarWidth = 320;
      const calendarHeight = 400;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spacing = 8;

      let top = buttonRect.bottom + spacing;
      let left = buttonRect.left;

      if (left + calendarWidth > viewportWidth) {
        left = buttonRect.right - calendarWidth;
        if (left < 0) {
          left = Math.max(8, (viewportWidth - calendarWidth) / 2);
        }
      }

      if (left < 0) left = 8;

      if (top + calendarHeight > viewportHeight) {
        top = buttonRect.top - calendarHeight - spacing;
        if (top < 0) top = 8;
      }

      if (window.innerWidth < 640) {
        left = Math.max(8, (viewportWidth - calendarWidth) / 2);
        left = Math.min(left, viewportWidth - calendarWidth - 8);
      }

      setCalendarPosition({ top, left });
    }
  }, [isOpen]);

  useEffect(() => {
    calculatePosition();
    const handleResize = () => calculatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", calculatePosition, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", calculatePosition, true);
    };
  }, [isOpen, calculatePosition]);

  const displayValue = () => {
    if (from && to) {
      return `${formatDateForDisplay(from)} - ${formatDateForDisplay(to)}`;
    }
    if (from) {
      return `${formatDateForDisplay(from)} - Select end date`;
    }
    return "Select dates";
  };

  const today = getTodayString();
  const calendarDays = generateCalendarDays();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!from) {
              setSelectionState("from");
            } else if (!to) {
              setSelectionState("to");
            }
          }}
          className={`w-full flex items-center justify-between px-3 py-2 border rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand hover:border-brand transition-colors ${
            error ? "border-red-300" : "border-gray-300"
          }`}
        >
          <span className="flex items-center gap-2 text-gray-800">
            <CalendarIcon className="w-4 h-4 text-brand-link" />
            {displayValue()}
          </span>
          <div className="flex items-center gap-1">
            {(from || to) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFromChange("");
                  onToChange("");
                  setSelectionState("from");
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Clear dates"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
            <ChevronRight
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          </div>
        </button>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen &&
        createPortal(
          <div
            data-date-range-popup
            onClick={(e) => e.stopPropagation()}
            className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999] p-4 w-[320px] max-w-[calc(100vw-16px)]"
            style={{
              top: `${calendarPosition.top}px`,
              left: `${calendarPosition.left}px`,
              maxHeight: "calc(100vh - 16px)",
              overflowY: "auto",
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-800">
                {getMonthName(currentMonth)} {currentYear}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth("prev")}
                  className="p-1.5 rounded-lg transition-colors hover:bg-brand-light text-brand-link cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateMonth("next")}
                  className="p-1.5 rounded-lg transition-colors hover:bg-brand-light text-brand-link cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-2 text-xs text-gray-600">
              {selectionState === "from"
                ? "Select start date"
                : "Select end date"}
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="p-1.5 text-center text-xs font-semibold text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayData, idx) => {
                if (!dayData) {
                  return <div key={`empty-${idx}`} className="p-2"></div>;
                }

                const { day, dateStr } = dayData;
                const isFrom = dateStr === from;
                const isTo = dateStr === to;
                const isInRange = from && to && dateStr >= from && dateStr <= to;
                const isToday = dateStr === today;
                const isDisabled = isDateDisabled(dateStr);

                return (
                  <button
                    key={dateStr}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateSelect(dateStr);
                    }}
                    disabled={isDisabled}
                    className={`p-2 text-xs rounded-lg transition-all duration-200 font-medium ${
                      isFrom || isTo
                        ? "bg-brand text-white shadow-md hover:bg-brand-hover"
                        : isInRange
                        ? "bg-brand-light text-brand-link"
                        : isDisabled
                        ? "text-gray-300 cursor-not-allowed bg-gray-50"
                        : isToday
                        ? "bg-brand-light text-brand-link hover:bg-brand-light"
                        : "text-gray-700 hover:bg-brand-light hover:text-brand-link"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-brand rounded-full"></span>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-brand-light rounded-full"></span>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DateRangePicker;
