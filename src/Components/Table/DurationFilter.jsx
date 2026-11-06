import React from 'react';

const DurationFilter = ({ durationDays, onDurationChange }) => {
  const durations = [
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 45 Days', value: 45 },
    { label: 'Last 60 Days', value: 60 },
    { label: 'Last 90 Days', value: 90 },
    { label: 'Last 180 Days', value: 180 },
  ];

  return (
    <div className="flex items-center space-x-2 px-4">
      <label htmlFor="duration-filter" className="text-gray-700 font-medium">
        Duration:
      </label>
      <select
        id="duration-filter"
        value={durationDays}
        onChange={(e) => onDurationChange(Number(e.target.value))}
        className="text-gray-900 form-select rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring-brand p-2"
      >
        {durations.map((duration) => (
          <option key={duration.value} value={duration.value}>
            {duration.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DurationFilter; 