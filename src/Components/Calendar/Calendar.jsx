import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

const Calendar = ({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date",
  label,
  className = "",
  disablePastDates = false, // New prop: if true, disable past dates and allow future dates
  allowedDates = null, // Array of YYYY-MM-DD strings; if set, only these dates are enabled
  initialVisibleDate = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const calendarRef = useRef(null);

  // Initialize calendar to selected date or a provided visible date
  useEffect(() => {
    const baseDate = value || initialVisibleDate;
    if (baseDate) {
      const date = new Date(baseDate);
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  }, [value, initialVisibleDate]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both the button and the calendar popup
      const calendarPopup = document.querySelector('[data-calendar-popup]');
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
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[monthIndex];
  };

  const navigateMonth = (direction) => {
    const todayDate = new Date();
    const todayYear = todayDate.getFullYear();
    const todayMonth = todayDate.getMonth();
    
    if (direction === "prev") {
      // When allowedDates is set, allow free navigation
      if (!allowedDates && disablePastDates) {
        // When past dates are disabled, prevent going before current month
        if (currentYear < todayYear || (currentYear === todayYear && currentMonth <= todayMonth)) {
          return; // Don't navigate to past months
        }
      }
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (!allowedDates && !disablePastDates) {
        // Prevent navigating to future months when past dates are enabled
      if (currentYear > todayYear || (currentYear === todayYear && currentMonth >= todayMonth)) {
        return; // Don't navigate to future months
        }
      }
      
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateString = (year, month, day) => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(currentYear, currentMonth, day);
      days.push({ day, dateStr });
    }

    return days;
  };

  // Get today's date in YYYY-MM-DD format (local timezone)
  const getTodayString = () => {
    const today = new Date();
    return formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const isDateDisabled = (dateStr) => {
    // If allowedDates is provided, only those specific dates are enabled
    if (allowedDates !== null) {
      return !allowedDates.includes(dateStr);
    }

    const today = getTodayString();
    
    if (disablePastDates) {
      // Disable past dates (allow today and future dates)
      if (dateStr < today) return true;
      // Check minDate constraint (should be today or later)
      if (minDate && dateStr < minDate) return true;
      // Check maxDate constraint
      if (maxDate && dateStr > maxDate) return true;
    } else {
      // Original behavior: disable future dates (allow past and today)
    if (dateStr > today) return true;
    // Check minDate constraint
    if (minDate && dateStr < minDate) return true;
    // Check maxDate constraint (if provided, but don't allow future dates beyond today)
    if (maxDate && dateStr > maxDate) return true;
    }
    return false;
  };

  const handleDateSelect = (dateStr) => {
    if (!isDateDisabled(dateStr)) {
      onChange(dateStr);
      setIsOpen(false);
    }
  };

  const today = getTodayString();
  const todayDate = new Date();
  const isCurrentMonth = currentYear === todayDate.getFullYear() && currentMonth === todayDate.getMonth();
  const selectedDate = value;
  const calendarDays = generateCalendarDays();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buttonRef = useRef(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0, transform: '' });

  // Calculate calendar position when it opens or window resizes
  const calculatePosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const calendarWidth = 320; // Calendar width
      const calendarHeight = 400; // Approximate calendar height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spacing = 8;
      
      let top = buttonRect.bottom + spacing;
      let left = buttonRect.left;
      let transform = '';
      
      // Check if calendar would overflow right edge
      if (left + calendarWidth > viewportWidth) {
        // Try to align to right edge of button
        left = buttonRect.right - calendarWidth;
        // If still overflows, center it or align to viewport edge
        if (left < 0) {
          left = Math.max(8, (viewportWidth - calendarWidth) / 2);
        }
      }
      
      // Check if calendar would overflow left edge
      if (left < 0) {
        left = 8;
      }
      
      // Check if calendar would overflow bottom edge
      if (top + calendarHeight > viewportHeight) {
        // Position above the button instead
        top = buttonRect.top - calendarHeight - spacing;
        // If still doesn't fit above, position at top of viewport
        if (top < 0) {
          top = 8;
          // If calendar is too tall, make it scrollable
        }
      }
      
      // On mobile, center the calendar horizontally if it's too wide
      if (viewportWidth < 640) { // sm breakpoint
        left = Math.max(8, (viewportWidth - calendarWidth) / 2);
        // Ensure it doesn't go off screen
        left = Math.min(left, viewportWidth - calendarWidth - 8);
      }
      
      setCalendarPosition({
        top,
        left,
        transform,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    calculatePosition();
    
    // Recalculate on window resize
    const handleResize = () => {
      calculatePosition();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', calculatePosition, true);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, calculatePosition]);

  return (
    <div ref={calendarRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand hover:border-brand transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 text-gray-800">
          <CalendarIcon className="w-4 h-4 text-brand-link" />
          {selectedDate ? formatDateForDisplay(selectedDate) : placeholder}
        </span>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </button>

      {isOpen && createPortal(
        <div 
          data-calendar-popup
          onClick={(e) => e.stopPropagation()}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999] p-4 w-[320px] max-w-[calc(100vw-16px)]"
          style={{
            top: `${calendarPosition.top}px`,
            left: `${calendarPosition.left}px`,
            maxHeight: 'calc(100vh - 16px)',
            overflowY: 'auto',
            transform: calendarPosition.transform || 'none',
          }}
        >
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-800">
              {getMonthName(currentMonth)} {currentYear}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth("prev")}
                disabled={!allowedDates && disablePastDates && isCurrentMonth}
                className={`p-1.5 rounded-lg transition-colors ${
                  !allowedDates && disablePastDates && isCurrentMonth
                    ? "text-gray-300 cursor-not-allowed"
                    : "hover:bg-brand-light text-brand-link cursor-pointer"
                }`}
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigateMonth("next")}
                disabled={!allowedDates && !disablePastDates && isCurrentMonth}
                className={`p-1.5 rounded-lg transition-colors ${
                  !allowedDates && !disablePastDates && isCurrentMonth
                    ? "text-gray-300 cursor-not-allowed"
                    : "hover:bg-brand-light text-brand-link cursor-pointer"
                }`}
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Week Day Headers */}
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

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayData, idx) => {
              if (!dayData) {
                return <div key={`empty-${idx}`} className="p-2"></div>;
              }

              const { day, dateStr } = dayData;
              const isSelected = selectedDate === dateStr;
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
                    isSelected
                      ? "bg-brand text-white shadow-md hover:bg-brand-hover cursor-pointer"
                      : isDisabled
                      ? "text-gray-300 cursor-not-allowed bg-gray-50"
                      : isToday
                      ? "bg-brand-light text-brand-link hover:bg-brand-light cursor-pointer"
                      : "text-gray-700 hover:bg-brand-light hover:text-brand-link cursor-pointer"
                  }`}
                  aria-label={`Select ${dateStr}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Calendar Footer */}
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

export default Calendar;

