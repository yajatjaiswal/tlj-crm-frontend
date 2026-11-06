import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllEmployees } from "../../services/functions/admin";
import Calendar from "../Calendar/Calendar";

const FilterModal = ({
  isOpen,
  onClose,
  onApply,
  currentFilters = [],
  showAssignee,
  showSource,
  showLoanAmount,
  showStatus,
  showCasetype,
  showStartDate,
  showEndDate,
  showTimePeriod,
  showOutcome,
  showPaymentType,
  showIsActive,
  statusOptions = [],
  timePeriodOptions: timePeriodOptionsProp,
  outcomeOptions: outcomeOptionsProp,
}) => {
  const [filters, setFilters] = useState([{ field: "", value: "" }]);
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState({});
  const [isValueDropdownOpen, setIsValueDropdownOpen] = useState({});
  const modalRef = useRef(null);

  // Available filter fields - conditionally show based on props
  const filterFields = [
    ...(showAssignee ? [{ value: "assignee", label: "Assignee" }] : []),
    ...(showSource ? [{ value: "source", label: "Source" }] : []),
    ...(showLoanAmount ? [{ value: "loan_amount", label: "Loan Amount" }] : []),
    ...(showStatus ? [{ value: "status", label: "Status" }] : []),
    ...(showCasetype ? [{ value: "caseType", label: "Case Type" }] : []),
    ...(showTimePeriod ? [{ value: "timePeriod", label: "Time Period" }] : []),
    ...(showOutcome ? [{ value: "outcome", label: "Outcome" }] : []),
    ...(showPaymentType ? [{ value: "payment_type", label: "Payment Type" }] : []),
    ...(showIsActive ? [{ value: "is_active", label: "Active Status" }] : []),
    // Only show date fields if timePeriod is not enabled
    ...(!showTimePeriod && showStartDate && showEndDate ? [{ value: "dateRange", label: "Date Range" }] : []),
    ...(!showTimePeriod && showStartDate && !showEndDate ? [{ value: "startDate", label: "Start Date" }] : []),
    ...(!showTimePeriod && showEndDate && !showStartDate ? [{ value: "endDate", label: "End Date" }] : []),
  ];

  // Loan amount options
  const loanAmountOptions = [
    { value: "5000-10000", label: "₹5000 - ₹10,000" },
    { value: "10000-20000", label: "₹10,000 - ₹20,000" },
    { value: "20000-30000", label: "₹20,000 - ₹30,000" },
    { value: "30000-40000", label: "₹30,000 - ₹40,000" },
    { value: "40000-50000", label: "₹40,000 - ₹50,000" },
    { value: "50000-60000", label: "₹50,000 - ₹60,000" },
    { value: "60000-70000", label: "₹60,000 - ₹70,000" },
    { value: "70000-80000", label: "₹70,000 - ₹80,000" },
    { value: "80000-90000", label: "₹80,000 - ₹90,000" },
    { value: "90000-100000", label: "₹90,000 - ₹1,00,000" },
    { value: "100000-110000", label: "₹1,00,000 - ₹1,10,000" },
    { value: "110000-120000", label: "₹1,10,000 - ₹1,20,000" },
    { value: "120000-125000", label: "₹1,20,000 - ₹1,25,000" },
    { value: "125000+", label: "₹1,25,000+" },
  ];


  // Source options
  const sourceOptions = [
    { value: "GREEN", label: "Green" },
    { value: "GOCREDIT", label: "GoCredit" },
    { value: "HEXA", label: "Hexa" },
    { value: "GOOGLE", label: "Google" },
    { value: "EXTERNAL_SOURCE_8", label: "Organic" },
    { value: "BLINKR LOAN", label: "Bamboo Tree" },
    { value: "MARKETING", label: "Google Landing" },
    { value: "EXTERNAL_SOURCE", label: "Organic Old" },
    { value: "EXTERNAL_SOURCE_2", label: "Organic 2" },
    { value: "EXTERNAL_SOURCE_3", label: "Organic 3" },
    { value: "VALUELEAF", label: "Valueleaf" },


    // { value: "FACEBOOK", label: "Facebook" }
  ];

  // Case type options
  const casetypeOptions = [
    { value: "fresh", label: "Fresh" },
    { value: "reloan", label: "Reloan" },
  ];

  const outcomeOptions = outcomeOptionsProp || [
    { value: "checker", label: "Rejected by checker" },
    { value: "elsewhere", label: "Rejected elsewhere" },
  ];

  const paymentTypeOptions = [
    { value: "sdr", label: "SDR" },
    { value: "prepayment", label: "Prepayment" },
    { value: "due_date", label: "Due Date" },
    { value: "overdue", label: "Overdue" },
  ];

  const isActiveOptions = [
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
  ];

  // Time period options
  const timePeriodOptions = timePeriodOptionsProp || [
    { value: "Date Range", label: "Date Range" },
    { value: "Today", label: "Today" },
    { value: "Yesterday", label: "Yesterday" },
    { value: "This Week", label: "This Week" },
    { value: "Last Week", label: "Last Week" },
    { value: "This Month", label: "This Month" },
    { value: "Last Month", label: "Last Month" },
    { value: "This Year", label: "This Year" },
  ];
  const orderByOptions = [
    { value: "updated_at", label: "Updated At" },
    { value: "created_at", label: "Created At" },
  ];

  // Fetch employees when "Assignee" field is selected
  // API is called when user clicks on "Assignee" option
  const hasAssigneeField = filters.some(
    (filter) => filter.field === "assignee"
  );
  const shouldFetchEmployees = isOpen && showAssignee && hasAssigneeField;

  const {
    data: employees = [],
    isLoading: isLoadingEmployees,
    error: employeesError,
  } = useQuery({
    queryKey: ["employees"],
    queryFn: getAllEmployees,
    enabled: shouldFetchEmployees,
    staleTime: 0,
    gcTime: 0,
  });


  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (currentFilters && currentFilters.length > 0) {
        const orderByFilter = currentFilters.find((f) => f.field === "order_by");
        const normalizedCurrentFilters = currentFilters.filter(
          (f) => f.field !== "order_by"
        );

        if (normalizedCurrentFilters.length === 0) {
          setFilters([{ field: "", value: "" }]);
          return;
        }

        // Check if we have timePeriod="Date Range" with startDate and endDate - combine them
        const timePeriodFilter = normalizedCurrentFilters.find(
          (f) => f.field === "timePeriod" && f.value === "Date Range"
        );
        const startDateFilter = normalizedCurrentFilters.find(
          (f) => f.field === "startDate"
        );
        const endDateFilter = normalizedCurrentFilters.find(
          (f) => f.field === "endDate"
        );

        if (timePeriodFilter && startDateFilter && endDateFilter && showTimePeriod) {
          // Combine into timePeriod filter with date range object
          const otherFilters = normalizedCurrentFilters.filter(
            f => f.field !== "timePeriod" && f.field !== "startDate" && f.field !== "endDate"
          );
          const dateRangeTimePeriodFilter = {
            field: "timePeriod",
            value: {
              startDate: startDateFilter.value,
              endDate: endDateFilter.value,
            },
            orderBy: orderByFilter?.value || "created_at",
            label: `Time Period: Date Range`,
          };
          setFilters([...otherFilters, dateRangeTimePeriodFilter]);
        } else if (startDateFilter && endDateFilter && showStartDate && showEndDate && !showTimePeriod) {
          // Combine into dateRange filter (only if timePeriod is not enabled)
          const otherFilters = normalizedCurrentFilters.filter(
            f => f.field !== "startDate" && f.field !== "endDate"
          );
          const dateRangeFilter = {
            field: "dateRange",
            value: {
              startDate: startDateFilter.value,
              endDate: endDateFilter.value,
            },
            label: `Date Range: ${startDateFilter.value} to ${endDateFilter.value}`,
          };
          setFilters([...otherFilters, dateRangeFilter]);
        } else {
          setFilters(
            normalizedCurrentFilters.map((filter) =>
              filter.field === "timePeriod"
                ? {
                    ...filter,
                    orderBy: orderByFilter?.value || filter.orderBy || "created_at",
                  }
                : filter
            )
          );
        }
      } else {
        setFilters([{ field: "", value: "" }]);
      }
    } else {
      setFilters([{ field: "", value: "" }]);
      setIsFieldDropdownOpen({});
      setIsValueDropdownOpen({});
    }
  }, [isOpen, currentFilters, showStartDate, showEndDate, showTimePeriod]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on calendar popup (rendered via portal)
      const calendarPopup = document.querySelector('[data-calendar-popup]');
      if (calendarPopup && calendarPopup.contains(event.target)) {
        return;
      }
      
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleFieldSelect = (field, filterIndex) => {
    const updatedFilters = [...filters];
    // Initialize dateRange with empty object, timePeriod "Date Range" with empty object, other fields with empty string
    const initialValue =
      field === "dateRange" || field === "timePeriod" ? {} : "";
    updatedFilters[filterIndex] = {
      ...updatedFilters[filterIndex],
      field,
      value: initialValue,
      ...(field === "timePeriod" ? { orderBy: "created_at" } : { orderBy: undefined }),
    };
    setFilters(updatedFilters);
    setIsFieldDropdownOpen({ ...isFieldDropdownOpen, [filterIndex]: false });
    setIsValueDropdownOpen({ ...isValueDropdownOpen, [filterIndex]: false });
  };

  const handleValueSelect = (value, filterIndex) => {
    const updatedFilters = [...filters];
    // If selecting "Date Range" for timePeriod, initialize with empty date range object
    if (updatedFilters[filterIndex].field === "timePeriod" && value === "Date Range") {
      updatedFilters[filterIndex] = { 
        ...updatedFilters[filterIndex], 
        value: { startDate: "", endDate: "" },
        orderBy: updatedFilters[filterIndex].orderBy || "created_at",
      };
    } else {
      updatedFilters[filterIndex] = {
        ...updatedFilters[filterIndex],
        value,
        ...(updatedFilters[filterIndex].field === "timePeriod"
          ? { orderBy: updatedFilters[filterIndex].orderBy || "created_at" }
          : {}),
      };
    }
    setFilters(updatedFilters);
    setIsValueDropdownOpen({ ...isValueDropdownOpen, [filterIndex]: false });
  };

  const handleOrderBySelect = (orderBy, filterIndex) => {
    const updatedFilters = [...filters];
    updatedFilters[filterIndex] = {
      ...updatedFilters[filterIndex],
      orderBy,
    };
    setFilters(updatedFilters);
  };

  const handleApply = () => {
    const validFilters = filters.filter((filter) => {
      if (!filter.field) return false;
      if (filter.field === "dateRange") {
        // For date range, both dates must be present
        return filter.value && filter.value.startDate && filter.value.endDate;
      }
      if (filter.field === "timePeriod") {
        // If timePeriod is an object (Date Range), both dates must be present
        if (typeof filter.value === 'object' && filter.value.startDate !== undefined) {
          return filter.value.startDate && filter.value.endDate;
        }
        // For other time periods, just check if value exists
        return filter.value;
      }
      return filter.value;
    });

    if (validFilters.length > 0) {
      const processedFilters = [];
      
      validFilters.forEach((filter) => {
        if (filter.field === "dateRange") {
          // Split date range into separate startDate and endDate filters
          processedFilters.push({
            field: "startDate",
            value: filter.value.startDate,
            label: `Start Date: ${filter.value.startDate}`,
          });
          processedFilters.push({
            field: "endDate",
            value: filter.value.endDate,
            label: `End Date: ${filter.value.endDate}`,
          });
        } else if (filter.field === "timePeriod") {
          const orderByValue = filter.orderBy || "created_at";
          const orderByLabel =
            orderByOptions.find((option) => option.value === orderByValue)?.label ||
            orderByValue;

          // For timePeriod, handle Date Range specially
          if (typeof filter.value === 'object' && filter.value.startDate !== undefined) {
            // Date Range selected - split into timePeriod and date filters
            processedFilters.push({
              field: "timePeriod",
              value: "Date Range",
              label: `Time Period: Date Range`,
            });
            processedFilters.push({
              field: "startDate",
              value: filter.value.startDate,
              label: `Start Date: ${filter.value.startDate}`,
            });
            processedFilters.push({
              field: "endDate",
              value: filter.value.endDate,
              label: `End Date: ${filter.value.endDate}`,
            });
            processedFilters.push({
              field: "order_by",
              value: orderByValue,
              label: `Order By: ${orderByLabel}`,
            });
          } else {
            // Other time periods
            const selectedOption = timePeriodOptions.find(
              (opt) => opt.value === filter.value
            );
            processedFilters.push({
              field: filter.field,
              value: filter.value,
              label: `Time Period: ${selectedOption ? selectedOption.label : filter.value}`,
            });
            processedFilters.push({
              field: "order_by",
              value: orderByValue,
              label: `Order By: ${orderByLabel}`,
            });
          }
        } else {
          let displayLabel = filter.value;

          // For assignee field, show the employee name instead of ID
          if (filter.field === "assignee") {
            const selectedEmployee = employees.find(
              (emp) => emp.id === filter.value
            );
            displayLabel = selectedEmployee
              ? selectedEmployee.full_name
              : filter.value;
          } else if (isDateField(filter.field)) {
            // For date fields, use the date value as display label
            displayLabel = filter.value;
          } else {
            // For other fields, use the option label
            const selectedOption = getValueOptions(filter.field).find(
              (opt) => opt.value === filter.value
            );
            displayLabel = selectedOption ? selectedOption.label : filter.value;
          }

          processedFilters.push({
            field: filter.field,
            value: filter.value,
            label: `${
              filterFields.find((f) => f.value === filter.field)?.label
            }: ${displayLabel}`,
          });
        }
      });

      onApply(processedFilters);
      onClose();
    }
  };

  const handleClear = () => {
    setFilters([{ field: "", value: "" }]);
    onApply([]); // Clear filters
    onClose();
  };

  const addMoreFilter = () => {
    setFilters([...filters, { field: "", value: "" }]);
  };

  const removeFilter = (filterIndex) => {
    if (filters.length > 1) {
      const updatedFilters = filters.filter(
        (_, index) => index !== filterIndex
      );
      setFilters(updatedFilters);
    }
  };

  const getAvailableFields = (currentFilterIndex) => {
    const usedFields = filters
      .map((filter, index) =>
        index !== currentFilterIndex ? filter.field : null
      )
      .filter(Boolean);
    return filterFields.filter((field) => !usedFields.includes(field.value));
  };

  const getValueOptions = (field) => {
    switch (field) {
      case "loan_amount":
        return loanAmountOptions;
      case "status":
        return statusOptions;
      case "assignee":
        return employees.map((emp) => ({
          value: emp.id, // Use employees.id as requested
          label: emp.full_name,
        }));
      case "source":
        return sourceOptions;
      case "caseType":
        return casetypeOptions;
      case "outcome":
        return outcomeOptions;
      case "timePeriod":
        return timePeriodOptions;
      case "payment_type":
        return paymentTypeOptions;
      case "is_active":
        return isActiveOptions;
      case "dateRange":
      case "startDate":
      case "endDate":
        return []; // Date fields use input, not dropdown
      default:
        return [];
    }
  };

  const isDateField = (field) => {
    return field === "dateRange" || field === "startDate" || field === "endDate";
  };

  const isTimePeriodField = (field) => {
    return field === "timePeriod";
  };

  const handleDateChange = (date, filterIndex, dateType = null) => {
    const updatedFilters = [...filters];
    if (updatedFilters[filterIndex].field === "dateRange" || 
        (updatedFilters[filterIndex].field === "timePeriod" && 
         typeof updatedFilters[filterIndex].value === 'object')) {
      // For date range or timePeriod with Date Range, store as object with startDate and endDate
      const currentValue = updatedFilters[filterIndex].value || {};
      updatedFilters[filterIndex] = {
        ...updatedFilters[filterIndex],
        value: {
          ...currentValue,
          [dateType]: date,
        },
      };
    } else {
      // For single date fields
      updatedFilters[filterIndex] = {
        ...updatedFilters[filterIndex],
        value: date,
      };
    }
    setFilters(updatedFilters);
  };

  if (!isOpen) return null;

  const canAddMoreFilters = filters.length < filterFields.length;
  const hasValidFilters = filters.some((filter) => {
    if (!filter.field) return false;
    if (filter.field === "dateRange") {
      return filter.value && filter.value.startDate && filter.value.endDate;
    }
    if (filter.field === "timePeriod" && typeof filter.value === 'object' && filter.value.startDate !== undefined) {
      return filter.value.startDate && filter.value.endDate;
    }
    return filter.value;
  });

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Filter Leads"
      className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[60vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between p-3 border-b border-gray-200 bg-white z-10">
        <h3 className="text-sm font-semibold text-gray-900">Filter Leads</h3>
        <button
          onClick={onClose}
          aria-label="Close filter modal"
          className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      
      <div className="p-3 space-y-4">
        {filters.map((filter, filterIndex) => {
          const availableFields = getAvailableFields(filterIndex);
          const valueOptions = getValueOptions(filter.field);
          return (
            <div
              key={filterIndex}
              className="border border-gray-200 rounded-lg p-3 space-y-3"
            >
              {/* Filter Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Filter {filterIndex + 1}
                </span>
                {filters.length > 1 && (
                  <button
                    onClick={() => removeFilter(filterIndex)}
                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              {/* Field Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Field
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setIsFieldDropdownOpen({
                        ...isFieldDropdownOpen,
                        [filterIndex]: !isFieldDropdownOpen[filterIndex],
                      })
                    }
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <span className="block truncate text-gray-800">
                      {filter.field
                        ? filterFields.find((f) => f.value === filter.field)
                            ?.label
                        : "Select a field"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {isFieldDropdownOpen[filterIndex] && (
                    <div className="mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                      {availableFields.map((field) => (
                        <button
                          key={field.value}
                          onClick={() =>
                            handleFieldSelect(field.value, filterIndex)
                          }
                          className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-brand-light hover:text-brand-link"
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Value Selection */}
              {filter.field && (
                <div>
                  {isTimePeriodField(filter.field) && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order By
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {orderByOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              handleOrderBySelect(option.value, filterIndex)
                            }
                            className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                              (filter.orderBy || "created_at") === option.value
                                ? "border-brand-hover bg-brand-light text-brand-link"
                                : "border-gray-300 text-gray-700 hover:border-brand/50 hover:text-brand-link"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter Value
                  </label>

                  {/* Show calendar for date fields */}
                  {isDateField(filter.field) ? (
                    filter.field === "dateRange" ? (
                      <div className="space-y-3">
                        <Calendar
                          label="Start Date"
                          value={filter.value?.startDate || ""}
                          onChange={(date) =>
                            handleDateChange(date, filterIndex, "startDate")
                          }
                          maxDate={filter.value?.endDate || undefined}
                          placeholder="Select start date"
                        />
                        <Calendar
                          label="End Date"
                          value={filter.value?.endDate || ""}
                          onChange={(date) =>
                            handleDateChange(date, filterIndex, "endDate")
                          }
                          minDate={filter.value?.startDate || undefined}
                          placeholder="Select end date"
                        />
                      </div>
                    ) : (
                      <Calendar
                        value={filter.value || ""}
                        onChange={(date) =>
                          handleDateChange(date, filterIndex)
                        }
                        placeholder="Select date"
                      />
                    )
                  ) : isTimePeriodField(filter.field) ? (
                    /* Always show dropdown for time period, and show calendar below if Date Range is selected */
                    <div className="space-y-3">
                      {/* Time Period Dropdown - Always visible */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setIsValueDropdownOpen({
                              ...isValueDropdownOpen,
                              [filterIndex]: !isValueDropdownOpen[filterIndex],
                            })
                          }
                          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand"
                        >
                          <span className="block truncate text-gray-800">
                            {filter.value && typeof filter.value === 'object' && filter.value.startDate !== undefined
                              ? "Date Range"
                              : filter.value && typeof filter.value === 'string'
                              ? timePeriodOptions.find((v) => v.value === filter.value)
                                  ?.label
                              : "Select a time period"}
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>

                        {isValueDropdownOpen[filterIndex] && (
                          <div className="mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none z-50">
                            {timePeriodOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() =>
                                  handleValueSelect(option.value, filterIndex)
                                }
                                className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-brand-light hover:text-brand-link"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Show calendar fields below dropdown if Date Range is selected */}
                      {filter.value && typeof filter.value === 'object' && filter.value.startDate !== undefined && (
                        <div className="space-y-3">
                          <Calendar
                            label="Start Date"
                            value={filter.value?.startDate || ""}
                            onChange={(date) =>
                              handleDateChange(date, filterIndex, "startDate")
                            }
                            maxDate={filter.value?.endDate || undefined}
                            placeholder="Select start date"
                          />
                          <Calendar
                            label="End Date"
                            value={filter.value?.endDate || ""}
                            onChange={(date) =>
                              handleDateChange(date, filterIndex, "endDate")
                            }
                            minDate={filter.value?.startDate || undefined}
                            placeholder="Select end date"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Show dropdown for other fields */
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setIsValueDropdownOpen({
                            ...isValueDropdownOpen,
                            [filterIndex]: !isValueDropdownOpen[filterIndex],
                          })
                        }
                        disabled={!valueOptions.length}
                        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="block truncate text-gray-800">
                          {filter.value
                            ? valueOptions.find((v) => v.value === filter.value)
                                ?.label
                            : "Select a value"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </button>

                      {isValueDropdownOpen[filterIndex] &&
                        valueOptions.length > 0 && (
                          <div className="mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                            {isLoadingEmployees && filter.field === "assignee" ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                <span className="text-sm text-gray-500">
                                  Loading employees...
                                </span>
                              </div>
                            ) : employeesError && filter.field === "assignee" ? (
                              <div className="p-3 text-center">
                                <p className="text-sm text-red-600">
                                  Failed to load employees. Please try again.
                                </p>
                              </div>
                            ) : (
                              valueOptions.map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() =>
                                    handleValueSelect(option.value, filterIndex)
                                  }
                                  className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-brand-light hover:text-brand-link"
                                >
                                  {filter.field === "assignee" ? (
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">
                                        {option.label}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        ID: {option.value}
                                      </span>
                                    </div>
                                  ) : (
                                    option.label
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add More Filter Button */}
        {canAddMoreFilters && (
          <button
            onClick={addMoreFilter}
            className="w-full flex items-center justify-center px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-brand hover:text-brand-link transition-colors"
          >
            + Add More Filter
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 p-3 border-t border-gray-200 bg-white">
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
        >
          Clear
        </button>
        <button
          onClick={handleApply}
          disabled={!hasValidFilters}
          className="px-3 py-1.5 text-xs font-medium text-white bg-brand border border-transparent rounded-md hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default FilterModal;
