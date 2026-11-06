import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import Modal from "../../Pages/details-modal/Modal";
import { axiosInstance } from "../../services/api";
import { formatDate, formatDateTime } from "../../utils/formatDate";
import { normalizeComment } from "../../utils/commentUtils";
import { convertTo12Hour, convertTo24Hour } from "../../utils/time";
import CommentHistorySection from "./CommentHistorySection";
import CommentForm from "./CommentForm";

const CommentModal = ({
  isOpen,
  onClose,
  leadId,
  comments = [],
  onCommentAdded,
  mode = "history",
  commentCount,
}) => {
  const user = useSelector((state) => state.user);
  const [formData, setFormData] = useState({
    comment: "",
    scheduled_date: "",
    scheduled_time: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [timePickerPosition, setTimePickerPosition] = useState({ top: 0, left: 0 });
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState({ top: 0, left: 0 });
  const [showOtherStatusInput, setShowOtherStatusInput] = useState(false);
  const commentTextareaRef = useRef(null);
  const resetForm = useCallback(() => {
    setFormData({
      comment: "",
      scheduled_date: "",
      scheduled_time: "",
    });
    setError("");
    setShowOtherStatusInput(false);
    setIsStatusDropdownOpen(false);
  }, []);

  const handleOpenAddComment = useCallback(() => {
    resetForm();
    setIsAddModalOpen(true);
  }, [resetForm]);

  const handleCloseAddModal = useCallback(() => setIsAddModalOpen(false), []);

  const handleFormCancel = useCallback(() => {
    if (mode === "add") {
      onClose();
    } else {
      setIsAddModalOpen(false);
    }
  }, [mode, onClose]);

  const handleScheduledDateChange = useCallback((dateStr) => {
    setFormData((prev) => ({ ...prev, scheduled_date: dateStr }));
  }, []);

  const handleToggleTimePicker = useCallback(() => {
    setIsTimePickerOpen((prev) => !prev);
  }, []);

  const handleToggleStatusDropdown = useCallback(() => {
    setIsStatusDropdownOpen((prev) => !prev);
  }, []);

  const handleBackToStatusOptions = useCallback(() => {
    setShowOtherStatusInput(false);
  }, []);

  const formRef = useRef(null);
  const timePickerRef = useRef(null);
  const timePickerButtonRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const statusButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setIsAddModalOpen(false);
    }
  }, [isOpen, mode, resetForm]);

  // Autofocus and keyboard shortcut for add comment modal
  useEffect(() => {
    if ((isOpen && mode === "add") || isAddModalOpen) {
      // Focus the textarea after a short delay to ensure modal is rendered
      const timer = setTimeout(() => {
        if (commentTextareaRef.current) {
          commentTextareaRef.current.focus();
        }
      }, 100);

      // Keyboard shortcut handler: Cmd+Enter (Mac) or Ctrl+Enter (Windows)
      const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          if (formRef.current && !submitting) {
            formRef.current.requestSubmit();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, mode, isAddModalOpen, submitting]);

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const aDate = new Date(a?.comment_date || a?.created_at || 0);
      const bDate = new Date(b?.comment_date || b?.created_at || 0);
      return bDate - aDate;
    });
  }, [comments]);

  const totalComments = commentCount ?? sortedComments.length;

  const latestComment = sortedComments[0];

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Calculate time picker position
  const calculateTimePickerPosition = useCallback(() => {
    if (isTimePickerOpen && timePickerButtonRef.current) {
      const buttonRect = timePickerButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 400; // Approximate dropdown width
      const dropdownHeight = 300; // Approximate dropdown height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spacing = 8;

      let top = buttonRect.bottom + spacing;
      let left = buttonRect.left;

      // Check if dropdown would overflow right edge
      if (left + dropdownWidth > viewportWidth) {
        left = buttonRect.right - dropdownWidth;
        if (left < 0) {
          left = Math.max(8, (viewportWidth - dropdownWidth) / 2);
        }
      }

      // Check if dropdown would overflow left edge
      if (left < 0) {
        left = 8;
      }

      // Check if dropdown would overflow bottom edge
      if (top + dropdownHeight > viewportHeight) {
        top = buttonRect.top - dropdownHeight - spacing;
        if (top < 0) {
          top = 8;
        }
      }

      setTimePickerPosition({ top, left });
    }
  }, [isTimePickerOpen]);

  // Handle click outside time picker and calculate position
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        timePickerButtonRef.current &&
        !timePickerButtonRef.current.contains(event.target) &&
        timePickerRef.current &&
        !timePickerRef.current.contains(event.target)
      ) {
        setIsTimePickerOpen(false);
      }
    };

    if (isTimePickerOpen) {
      calculateTimePickerPosition();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", calculateTimePickerPosition);
      window.addEventListener("scroll", calculateTimePickerPosition, true);
      
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", calculateTimePickerPosition);
        window.removeEventListener("scroll", calculateTimePickerPosition, true);
      };
    }
  }, [isTimePickerOpen, calculateTimePickerPosition]);

  // Get current time in 12-hour format
  const currentTime12 = useMemo(() => {
    return convertTo12Hour(formData.scheduled_time);
  }, [formData.scheduled_time]);

  // Check if selected date is today and get current time for disabling past times
  const isTodaySelected = useMemo(() => {
    if (!formData.scheduled_date) return false;
    const today = new Date();
    // Normalize dates to local date strings for comparison (handles timezone issues)
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const selectedDate = new Date(formData.scheduled_date + "T00:00:00"); // Ensure local timezone
    const selectedStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    return todayStr === selectedStr;
  }, [formData.scheduled_date]);

  // Get current time in 12-hour format for disabling past times
  // Recalculate every minute to ensure accuracy
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    const hours24 = now.getHours();
    const minutes = now.getMinutes();
    const time24 = `${String(hours24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return convertTo12Hour(time24);
  });

  useEffect(() => {
    if (!isTodaySelected) return;
    
    const updateTime = () => {
      const now = new Date();
      const hours24 = now.getHours();
      const minutes = now.getMinutes();
      const time24 = `${String(hours24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      setCurrentTime(convertTo12Hour(time24));
    };

    // Update immediately
    updateTime();
    
    // Update every second when today is selected to ensure accurate time comparison
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [isTodaySelected]);

  const currentActualTime12 = isTodaySelected ? currentTime : null;

  // Handle time selection (updates state without closing)
  const handleTimeSelect = useCallback((hour, minute, period) => {
    const time24 = convertTo24Hour(hour, minute, period);
    setFormData((prev) => ({ ...prev, scheduled_time: time24 }));
  }, []);

  // Handle time picker submit (closes the modal)
  const handleTimeSubmit = useCallback(() => {
    setIsTimePickerOpen(false);
  }, []);

  // Predefined status options
  const statusOptions = [
    "Call back",
    "Follow up",
  ];

  // Calculate status dropdown position
  const calculateStatusDropdownPosition = useCallback(() => {
    if (isStatusDropdownOpen && statusButtonRef.current) {
      const buttonRect = statusButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 300;
      const maxDropdownHeight = 300;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 2; // Minimal gap between button and dropdown (2px)

      let left = buttonRect.left;

      if (left + dropdownWidth > viewportWidth) {
        left = buttonRect.right - dropdownWidth;
        if (left < 0) {
          left = Math.max(8, (viewportWidth - dropdownWidth) / 2);
        }
      }

      if (left < 0) {
        left = 8;
      }

      // Always position dropdown above the button with minimal gap (2px)
      // Position dropdown so its bottom edge is just above the button's top edge
      // We'll use a reasonable estimate for dropdown height
      const itemHeight = 38; // Height per item (py-2 = 8px + text ~30px)
      const containerPadding = 24; // Top and bottom padding (p-3 = 12px each)
      const borderWidth = 4; // Border width (border-2 = 2px each side)
      const estimatedDropdownHeight = Math.min(
        maxDropdownHeight,
        (statusOptions.length - 4) * itemHeight + containerPadding + borderWidth
      );
      
      // Position dropdown directly above button with minimal gap
      let top = buttonRect.top - estimatedDropdownHeight - gap;
      
      // If dropdown would go above viewport, adjust to fit within viewport
      if (top < 8) {
        top = 8;
        // If dropdown would overlap button, position below as fallback
        if (top + estimatedDropdownHeight > buttonRect.top - gap) {
          top = buttonRect.bottom + gap;
          if (top + estimatedDropdownHeight > viewportHeight) {
            top = Math.max(8, viewportHeight - estimatedDropdownHeight - gap);
          }
        }
      }

      setStatusDropdownPosition({ top, left });
    }
  }, [isStatusDropdownOpen]);

  // Handle click outside status dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        statusButtonRef.current &&
        !statusButtonRef.current.contains(event.target) &&
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target)
      ) {
        setIsStatusDropdownOpen(false);
        setShowOtherStatusInput(false);
      }
    };

    if (isStatusDropdownOpen) {
      calculateStatusDropdownPosition();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", calculateStatusDropdownPosition);
      window.addEventListener("scroll", calculateStatusDropdownPosition, true);
      
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", calculateStatusDropdownPosition);
        window.removeEventListener("scroll", calculateStatusDropdownPosition, true);
      };
    }
  }, [isStatusDropdownOpen, calculateStatusDropdownPosition]);

  // Handle status selection
  const handleStatusSelect = useCallback((status) => {
    if (status === "Other") {
      setShowOtherStatusInput(true);
    } else {
      setIsStatusDropdownOpen(false);
      setShowOtherStatusInput(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.comment.trim()) {
      setError("Comment is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    // Combine date and time into ISO format
    let scheduledDateISO = null;
    if (formData.scheduled_date) {
      const timeStr = formData.scheduled_time || "00:00";
      const [hours, minutes] = timeStr.split(":");
      const dateTime = new Date(`${formData.scheduled_date}T${hours}:${minutes}:00`);
      scheduledDateISO = dateTime.toISOString();
    }

    const payload = {
      comment: formData.comment.trim(),
      scheduled_date: scheduledDateISO,
    };

    try {
      const response = await axiosInstance.post(
        `/lead/add-comment/${leadId}`,
        payload
      );
      const responseData = response?.data?.data || response?.data;
      const newComment = normalizeComment(
        responseData,
        { ...payload, comment_date: new Date().toISOString() },
        leadId
      );
      const newCommentWithUser = {
        ...newComment,
        emp:
          newComment.emp ||
          {
            f_name: user?.f_name || "",
            l_name: user?.l_name || "",
          },
        emp_id:
          newComment.emp_id ||
          user?.emp_id ||
          user?.employee_id ||
          user?.emp_code ||
          user?.user_name ||
          "",
      };
      setSubmitting(false);
      if (mode === "add") {
        onClose();
      } else {
        setIsAddModalOpen(false);
        // Don't close the comment history modal, only close the nested add comment modal
      }
      onCommentAdded?.(newCommentWithUser);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to add comment. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  };

// Format scheduled date with time
const formatScheduledDateTime = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return formatDate(dateString);
    
    // Check if time is present (not just date)
    const hasTime = dateString.includes("T") && dateString.length > 10;
    
    if (hasTime) {
      // Format with date and time
      const dateStr = date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const timeStr = date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${dateStr}, ${timeStr}`;
    } else {
      // Only date, no time
      return formatDate(dateString);
    }
  } catch (e) {
    return formatDate(dateString);
  }
};

  const disablePastDates = mode === "add" || isAddModalOpen;

  const commentFormProps = {
    formRef,
    commentTextareaRef,
    formData,
    onChange: handleChange,
    onSubmit: handleSubmit,
    onCancel: handleFormCancel,
    submitting,
    error,
    disablePastDates,
    currentTime12,
    isTodaySelected,
    currentActualTime12,
    isTimePickerOpen,
    onToggleTimePicker: handleToggleTimePicker,
    timePickerButtonRef,
    timePickerRef,
    timePickerPosition,
    onTimeSelect: handleTimeSelect,
    onTimeApply: handleTimeSubmit,
    isStatusDropdownOpen,
    onToggleStatusDropdown: handleToggleStatusDropdown,
    statusButtonRef,
    statusDropdownRef,
    statusDropdownPosition,
    statusOptions,
    onStatusSelect: handleStatusSelect,
    showOtherStatusInput,
    onBackToStatusOptions: handleBackToStatusOptions,
    onScheduledDateChange: handleScheduledDateChange,
  };

  const renderForm = () => <CommentForm {...commentFormProps} />;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Add Comment" : "Comments"}
      showTitle={true}
      size={mode === "add" ? "small" : "medium"}
    >
      {mode === "add" ? (
        <CommentForm {...commentFormProps} />
      ) : (
        <CommentHistorySection
          sortedComments={sortedComments}
          onAddCommentClick={handleOpenAddComment}
          isAddModalOpen={isAddModalOpen}
          onCloseAddModal={handleCloseAddModal}
          renderForm={renderForm}
          formatDateTime={formatDateTime}
          formatScheduledDateTime={formatScheduledDateTime}
          commentCount={totalComments}
        />
      )}
    </Modal>
  );
};

export default CommentModal;

