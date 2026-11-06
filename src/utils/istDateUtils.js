/**
 * IST (Indian Standard Time) Date Utility Functions
 * These functions help work with dates in IST timezone (UTC+5:30)
 */

/**
 * Get current time in IST
 * @returns {Date} Current date and time in IST
 */
export const getCurrentIST = () => {
  const now = new Date();
  const istOffset = 5.5 * 60; // IST is UTC+5:30
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (istOffset * 60000));
  return istTime;
};

/**
 * Format date in IST as YYYY-MM-DD
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export const formatDateIST = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get yesterday's date in IST format
 * @returns {string} Yesterday's date in YYYY-MM-DD format
 */
export const getYesterdayIST = () => {
  const istTime = getCurrentIST();
  const yesterdayIST = new Date(istTime);
  yesterdayIST.setDate(istTime.getDate() - 1);
  return formatDateIST(yesterdayIST);
};

/**
 * Get last month date range in IST format
 * @returns {{startStr: string, endStr: string}} Object with start and end dates of last month
 */
export const getLastMonthRangeIST = () => {
  const istTime = getCurrentIST();
  
  // Get first day of last month in IST
  const start = new Date(istTime.getFullYear(), istTime.getMonth() - 1, 1);
  const startStr = formatDateIST(start);
  
  // Get last day of last month in IST
  const end = new Date(istTime.getFullYear(), istTime.getMonth(), 0);
  const endStr = formatDateIST(end);
  
  return { startStr, endStr };
};

/**
 * Get this week date range in IST format (Monday to Sunday)
 * @returns {{startStr: string, endStr: string}} Object with start (Monday) and end (Sunday) dates of current week
 */
export const getThisWeekRangeIST = () => {
  const istTime = getCurrentIST();
  const dayOfWeek = istTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = istTime.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(istTime);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startStr: formatDateIST(monday), endStr: formatDateIST(sunday) };
};

/**
 * Get last week date range in IST format (Monday to Sunday)
 * @returns {{startStr: string, endStr: string}} Object with start (Monday) and end (Sunday) dates of last week
 */
export const getLastWeekRangeIST = () => {
  const istTime = getCurrentIST();
  const dayOfWeek = istTime.getDay();
  const diff = istTime.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // This Monday
  const lastMonday = new Date(istTime);
  lastMonday.setDate(diff - 7); // Last Monday
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  return { startStr: formatDateIST(lastMonday), endStr: formatDateIST(lastSunday) };
};

/**
 * Legacy function for backward compatibility
 * @returns {{startStr: string, endStr: string}} Same as getLastMonthRangeIST
 */
export const getLastMonthRange = () => {
  return getLastMonthRangeIST();
};

