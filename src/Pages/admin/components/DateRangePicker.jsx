import React, { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import Calendar from '../../../Components/Calendar/Calendar';

const DateRangePicker = ({ onDateRangeSelect, onClose }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    if (startDate && endDate) {
      onDateRangeSelect(startDate, endDate);
      onClose(true); // Pass true to indicate dates were selected
    }
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
  };

  const isApplyDisabled = !startDate || !endDate;

  return (
    <div className="fixed inset-0 min-h-full w-full bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full mx-4 mt-50 sm:mt-30 shadow-2xl border border-gray-200/50 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-light rounded-lg">
              <CalendarIcon className="h-5 w-5 text-brand-link" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Select Date Range</h3>
          </div>
          <button
            onClick={() => onClose(false)} // Pass false to indicate no dates were selected
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Calendar
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              maxDate={endDate || undefined}
              placeholder="Select start date"
            />
          </div>

          <div>
            <Calendar
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              minDate={startDate || undefined}
              placeholder="Select end date"
            />
          </div>

          {startDate && endDate && (
            <div className="p-3 bg-brand-light rounded-lg border border-brand/40">
              <p className="text-sm text-brand-link">
                <span className="font-medium">Selected Range:</span> {startDate} to {endDate}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            disabled={isApplyDisabled}
            className="flex-1 px-4 py-2.5 text-white bg-brand hover:bg-brand-hover disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker; 