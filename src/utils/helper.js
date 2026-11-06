export const capitalize = (str) =>
  str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
    
    /**
     * Async handler wrapper to catch errors in async functions
     * @param {Function} fn - Async function to wrap
     * @returns {Function} - Wrapped function that handles errors
     */
    export const asyncHandler = (fn) => {
      return async (...args) => {
        try {
          return await fn(...args);
        } catch (error) {
          throw error;
        }
      };
    };