import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for managing pagination state with protection against API overrides
 * @param {number} initialPage - Initial page number
 * @param {string} searchQuery - Search query for resetting page
 * @returns {object} Pagination state and handlers
 */
export const usePaginationState = (initialPage = 1, searchQuery = '') => {
  const getPaginationStorageKey = () => {
    if (typeof window === "undefined") return null;
    return `pagination:${window.location.pathname}`;
  };

  const getInitialPage = () => {
    if (typeof window === "undefined") return initialPage;
    const key = getPaginationStorageKey();
    if (!key) return initialPage;
    const savedPage = Number(window.sessionStorage.getItem(key));
    return savedPage > 0 ? savedPage : initialPage;
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const isUserAction = useRef(false);
  const lastUserPage = useRef(getInitialPage());
  const hasMounted = useRef(false);

  // Reset page to 1 when search query changes
  useEffect(() => {
    // Skip initial mount so restored page isn't overwritten.
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    setCurrentPage(1);
    isUserAction.current = false;
    const key = getPaginationStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, "1");
    }
  }, [searchQuery]);

  // Handle page change with user action tracking
  const handlePageChange = (newPage) => {
    isUserAction.current = true;
    lastUserPage.current = newPage;
    setCurrentPage(newPage);
    const key = getPaginationStorageKey();
    if (key && typeof window !== "undefined") {
      window.sessionStorage.setItem(key, String(newPage));
    }
    
    // Reset user action flag after a delay
    setTimeout(() => {
      isUserAction.current = false;
    }, 1000);
  };

  // Sync with API response only if it's not a user action
  const syncWithApiResponse = (apiPage) => {
    if (apiPage && !isUserAction.current) {
      setCurrentPage(apiPage);
      const key = getPaginationStorageKey();
      if (key && typeof window !== "undefined") {
        window.sessionStorage.setItem(key, String(apiPage));
      }
    }
  };

  return {
    currentPage,
    setCurrentPage: handlePageChange,
    syncWithApiResponse,
    isUserAction: isUserAction.current
  };
};
