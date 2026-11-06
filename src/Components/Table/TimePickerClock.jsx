import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlarmClock } from "lucide-react";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"];

const TimePickerClock = ({
  currentTime12,
  onTimeSelect,
  onApply,
  timePickerRef,
  position,
  isTodaySelected,
  currentActualTime12,
}) => {
  if (!position) return null;

  const [isAnalogMode, setIsAnalogMode] = useState(false);
  const [analogStage, setAnalogStage] = useState("hour");

  useEffect(() => {
    if (!isAnalogMode) {
      setAnalogStage("hour");
    }
  }, [isAnalogMode]);

  // Helper function to check if a time option should be disabled
  const isTimeDisabled = (hour, minute, period) => {
    if (!isTodaySelected || !currentActualTime12) return false;

    // Ensure all values are numbers for comparison
    const currentHour = Number(currentActualTime12.hour);
    const currentMinute = Number(currentActualTime12.minute);
    const currentPeriod = currentActualTime12.period;

    // Convert to 24-hour for comparison
    const getHour24 = (h, p) => {
      const hourNum = Number(h);
      if (p === "PM" && hourNum !== 12) return hourNum + 12;
      if (p === "AM" && hourNum === 12) return 0;
      return hourNum;
    };

    const selectedHour = Number(hour);
    const selectedMinute = Number(minute);
    const selectedHour24 = getHour24(selectedHour, period);
    const currentHour24 = getHour24(currentHour, currentPeriod);

    // If periods don't match and we're comparing same hour in different periods, handle specially
    // For example, 11 AM vs 11 PM - they're different times
    if (period !== currentPeriod) {
      // If selected is AM and current is PM, selected is in the past
      if (period === "AM" && currentPeriod === "PM") return true;
      // If selected is PM and current is AM, selected is in the future (unless it's next day, but we're only checking today)
      if (period === "PM" && currentPeriod === "AM") return false;
    }

    // If selected hour is in the past, disable it
    if (selectedHour24 < currentHour24) {
      return true;
    }

    // If selected hour is in the future, enable it
    if (selectedHour24 > currentHour24) {
      return false;
    }

    // Same hour and same period, check minutes - only disable if selected minute is strictly less than current
    // This allows selecting the current minute and all future minutes
    if (selectedHour24 === currentHour24 && period === currentPeriod) {
      // Only disable if the selected minute is strictly less than current minute
      // Example: if current is 11:26 AM, then 11:30 AM, 11:45 AM should be enabled (30 > 26, 45 > 26)
      // Example: if current is 11:26 AM, then 11:15 AM should be disabled (15 < 26)
      // We use < (not <=) so that if current is 11:26, then 11:26 and later are enabled
      const selectedMinuteNum = Number(selectedMinute);
      const currentMinuteNum = Number(currentMinute);
      const isPast = selectedMinuteNum < currentMinuteNum;
      return isPast;
    }

    return false;
  };

  const hourHasValidMinutes = (hour, period) => {
    return MINUTES.some((minute) => !isTimeDisabled(hour, minute, period));
  };

  const hasValidTimeForPeriod = (period) => {
    return HOURS.some((hour) => hourHasValidMinutes(hour, period));
  };

  const amHasTime = hasValidTimeForPeriod("AM");
  const pmHasTime = hasValidTimeForPeriod("PM");
  const canUseMinuteStage = hourHasValidMinutes(currentTime12.hour, currentTime12.period);

  // Auto switch to PM when AM has no available slots
  useEffect(() => {
    if (
      isTodaySelected &&
      currentActualTime12 &&
      !amHasTime &&
      currentTime12.period === "AM" &&
      pmHasTime
    ) {
      const fallbackHour =
        HOURS.find((hour) => hourHasValidMinutes(hour, "PM")) || 12;
      const fallbackMinute =
        MINUTES.find((minute) => !isTimeDisabled(fallbackHour, minute, "PM")) ||
        "00";
      onTimeSelect(fallbackHour, fallbackMinute, "PM");
    }
  }, [
    amHasTime,
    pmHasTime,
    currentActualTime12,
    currentTime12.period,
    isTodaySelected,
    onTimeSelect,
  ]);

  const selectedMinuteValue = Number(currentTime12.minute);

  const hourHandAngle = useMemo(() => {
    const hour = currentTime12.hour % 12 || 12;
    return (hour + selectedMinuteValue / 60) * 30;
  }, [currentTime12.hour, selectedMinuteValue]);

  const minuteHandAngle = useMemo(() => {
    return (selectedMinuteValue / 60) * 360;
  }, [selectedMinuteValue]);

  const getPositionStyle = (index, total, radius) => {
    const angle = (Math.PI / 2) - (index * ((2 * Math.PI) / total));
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return {
      transform: `translate(calc(-50% + ${x}px), calc(-50% - ${y}px))`,
    };
  };

  return createPortal(
    <div
      ref={timePickerRef}
      onClick={(e) => e.stopPropagation()}
      className="fixed bg-white border-2 border-gray-200 rounded-2xl shadow-2xl z-[10000] w-[400px] max-w-[calc(100vw-16px)]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxHeight: "calc(100vh - 16px)",
        overflowY: "auto",
      }}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Time Picker
          </p>
          {/* <button
            type="button"
            onClick={() => setIsAnalogMode((prev) => !prev)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              isAnalogMode
                ? "border-brand text-brand-link bg-brand/10"
                : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand-link"
            }`}
          >
            <AlarmClock size={14} />
            {isAnalogMode ? "Hide analog" : "Analog clock"}
          </button> */}
        </div>

        {/* {isAnalogMode && (
          <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-brand-light p-4 shadow-inner">
            <div className="flex items-center justify-center gap-2 mb-4">
              {["hour", "minute"].map((stage) => {
                const disabled = stage === "minute" && !canUseMinuteStage;
                return (
                  <button
                    key={stage}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setAnalogStage(stage)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
                      analogStage === stage
                        ? "bg-brand text-white shadow"
                        : "bg-white text-gray-500 border border-gray-200"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {stage === "hour" ? "Select Hour" : "Select Minute"}
                  </button>
                );
              })}
            </div>
            <div className="relative mx-auto h-64 w-64">
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-gray-100 shadow-inner" />
              <div className="absolute inset-6 rounded-full bg-white shadow-lg" />
              <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
              <div
                className="absolute left-1/2 top-1/2 w-1 bg-brand"
                style={{
                  height: "65px",
                  transform: `translate(-50%, -100%) rotate(${hourHandAngle}deg)`,
                  transformOrigin: "50% 100%",
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 w-0.5 bg-brand/40"
                style={{
                  height: "90px",
                  transform: `translate(-50%, -100%) rotate(${minuteHandAngle}deg)`,
                  transformOrigin: "50% 100%",
                }}
              />
              {HOURS.map((hour, index) => {
                const disabled =
                  isTodaySelected && currentActualTime12
                    ? !hourHasValidMinutes(hour, currentTime12.period)
                    : false;
                const isActive = currentTime12.hour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={disabled || analogStage !== "hour"}
                    onClick={() =>
                      onTimeSelect(
                        hour,
                        currentTime12.minute,
                        currentTime12.period
                      )
                    }
                    className={`absolute left-1/2 top-1/2 h-10 w-10 rounded-full text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-brand text-white shadow-lg scale-105"
                        : "bg-white text-gray-600 shadow"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    style={getPositionStyle(index, 12, 90)}
                  >
                    {hour}
                  </button>
                );
              })}
              {MINUTES.map((minute, index) => {
                const minuteValue = Number(minute);
                const disabled = isTimeDisabled(
                  currentTime12.hour,
                  minute,
                  currentTime12.period
                );
                const isActive = currentTime12.minute === minute;
                return (
                  <button
                    key={minute}
                    type="button"
                    disabled={disabled || analogStage !== "minute"}
                    onClick={() =>
                      onTimeSelect(
                        currentTime12.hour,
                        minute,
                        currentTime12.period
                      )
                    }
                    className={`absolute left-1/2 top-1/2 h-6 w-6 rounded-full text-[10px] font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-brand text-white shadow-md"
                        : "bg-white text-gray-500 shadow"
                    } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                    style={getPositionStyle(index, MINUTES.length, 55)}
                  >
                    {minuteValue}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-center text-xs font-medium text-gray-600">
              {analogStage === "hour"
                ? "Tap on the hour markers to update the selection."
                : canUseMinuteStage
                ? "Tap on the minute markers to refine the time."
                : "Select an available hour to choose minutes."}
            </p>
          </div>
        )} */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Hour
          </label>
          <div className="grid grid-cols-6 gap-2">
            {HOURS.map((hour) => {
              const isSelected = currentTime12.hour === hour;
              const selectedPeriod = currentTime12.period;
              const isDisabled =
                isTodaySelected && currentActualTime12
                  ? !hourHasValidMinutes(hour, selectedPeriod)
                  : false;

              return (
                <button
                  key={hour}
                  type="button"
                  onClick={() =>
                    !isDisabled &&
                    onTimeSelect(hour, currentTime12.minute, selectedPeriod)
                  }
                  disabled={isDisabled}
                  className={`px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                      : isSelected
                      ? "bg-brand text-white shadow-md scale-105 cursor-pointer"
                      : "text-gray-700 hover:bg-brand-light hover:text-brand-link cursor-pointer"
                  }`}
                >
                  {hour}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Minute
          </label>
          <div className="grid grid-cols-4 gap-2">
            {MINUTES.map((minute) => {
              const isSelected = currentTime12.minute === minute;
              // Use the isTimeDisabled helper which properly compares against actual current time
              const isDisabled = isTimeDisabled(
                currentTime12.hour,
                minute,
                currentTime12.period
              );

              return (
                <button
                  key={minute}
                  type="button"
                  onClick={() =>
                    !isDisabled &&
                    onTimeSelect(currentTime12.hour, minute, currentTime12.period)
                  }
                  disabled={isDisabled}
                  className={`px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                      : isSelected
                      ? "bg-brand text-white shadow-md scale-105 cursor-pointer"
                      : "text-gray-700 hover:bg-brand-light hover:text-brand-link cursor-pointer"
                  }`}
                >
                  {minute}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Period
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PERIODS.map((period) => {
              const isSelected = currentTime12.period === period;
              const hasTime = period === "AM" ? amHasTime : pmHasTime;

              return (
                <button
                  key={period}
                  type="button"
                  onClick={() =>
                    hasTime &&
                    onTimeSelect(
                      currentTime12.hour,
                      currentTime12.minute,
                      period
                    )
                  }
                  disabled={!hasTime}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    !hasTime
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50 border border-gray-200"
                      : isSelected
                      ? "bg-brand text-white shadow-md scale-105 cursor-pointer"
                      : "text-gray-700 hover:bg-brand-light hover:text-brand-link border border-gray-200 cursor-pointer"
                  }`}
                >
                  {period}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onApply}
            className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-hover px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all duration-200 hover:shadow-lg hover:shadow-brand/35 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Apply Time
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TimePickerClock;

