import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { logoutAction, setRole } from "../redux/slices/user";
import { useNavigate } from "react-router-dom";
import { React, useState, useEffect, useCallback, useRef } from "react";
import { capitalize } from "../utils/helper";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout, changePassword } from "../services/functions/user";
import { globalSearch } from "../services/functions/admin";
import {
  Lock,
  LogOut,
  Eye,
  EyeOff,
  AlertCircle,
  Search,
  X,
  User,
  Sparkles,
  Compass,
} from "lucide-react";
import SvgLoader from "../ui/SvgLoader";
import debounce from "lodash/debounce";
import { getLeadStageMeaning, leadStageMapping } from "../utils/leadStageMapping";
import UserMenuDropdown from "./UserMenuDropdown";
import DomainAnalyticsSummary from "./Search/DomainAnalyticsSummary";
import WhatsNewModal from "./Modals/WhatsNewModal";
import {
  getUnreadWhatsNewItems,
  getWhatsNewItemsForRoles,
  markWhatsNewItemsSeen,
} from "../utils/whatsNew";
import {
  TOUR_END_EVENT,
  isProductTourSeen,
  requestProductTour,
} from "../utils/productTour";

const StyledHeader = styled.header`
  background: #ffffff;
  border-bottom: 1px solid #E5E7EB;
  box-shadow: 0 8px 24px rgba(26, 26, 26, 0.06);
  display: grid;
  grid-template-columns: 1fr minmax(0, 600px) 1fr;
  align-items: center;
  gap: 1.1rem;
  padding: 0.22rem 0.95rem;
  min-height: 3.5rem;
  z-index: 20;

  @media (max-width: 768px) {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    /* Leave room for fixed mobile sidebar toggle when sidebar exists */
    padding: 0.5rem 0.75rem;
    padding-left: ${(props) =>
      props.$reserveToggleSpace ? "calc(40px + 0.75rem + 0.5rem)" : "0.75rem"};
    box-sizing: border-box;
    max-width: 100%;
    overflow: visible;
    position: relative;
    z-index: 50;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 72px;
  justify-self: start;
  visibility: ${(props) => (props.$visible ? "visible" : "hidden")};

  img {
    height: 2.65rem;
    width: auto;
    max-width: 11.5rem;
    object-fit: contain;
    border-radius: 0.5rem;
    flex-shrink: 0;
  }

  .logo-name {
    display: none;
    white-space: nowrap;
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #1A1A1A;
    line-height: 1.1;

    .logo-fast {
      color: #ed5b36;
    }

    .logo-loan {
      color: #0b892d;
    }
  }

  @media (min-width: 769px) {
    .logo-name {
      display: inline;
    }
  }

  @media (max-width: 768px) {
    display: ${(props) => (props.$visible ? "flex" : "none")};
    visibility: visible;
    flex: 0 0 auto;
    min-width: 0;
    width: auto;
    max-width: 42%;
    padding-left: 0;
    margin-bottom: 0;

    img {
      height: 1.85rem;
      max-width: 100%;
    }

    .logo-name {
      display: none;
    }
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  width: 100%;
  min-width: 0;
  position: relative;
  overflow: visible;
  @media (max-width: 768px) {
    flex: 1 1 0;
    justify-self: stretch;
    padding-left: 0;
    padding-right: 0;
    width: auto;
    max-width: none;
    min-width: 0;
    box-sizing: border-box;
    align-items: center;
    min-height: 40px;
  }
`;

const SearchBox = styled.div`
  position: relative;
  width: 100%;
  max-width: 600px;
  background: #f8fafc;
  border: 1px solid
    ${(props) => (props.$isFocused ? "#066039" : "#E5E7EB")};
  border-radius: 0.85rem;
  box-shadow: ${(props) =>
    props.$isFocused
      ? "0 0 0 3px rgba(6, 96, 57, 0.16)"
      : "0 1px 2px rgba(26, 26, 26, 0.04)"};
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 0.65rem;
  transition: all 0.2s ease;
  @media (max-width: 768px) {
    max-width: 100%;
    width: 100%;
    height: 40px;
    padding: 0 0.5rem;
    box-sizing: border-box;
    border-radius: 9999px;
    border-color: #e2e8f0;
    background: #f1f5f9;
  }
`;

const StyledInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  height: 100%;
  padding: 0 4.6rem 0 0.95rem;
  font-size: 0.95rem;
  color: #0f172a;
  border-radius: 0.75rem;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    outline: none;
  }
  @media (max-width: 768px) {
    font-size: 0.875rem;
    min-width: 0;
    padding: 0 4.35rem 0 0.65rem;
    border-radius: 9999px;
  }
`;

const SearchIcon = styled(Search)`
  color: #94a3b8;
  width: 1rem;
  height: 1rem;
`;

const SearchActionButton = styled.button`
  position: absolute;
  right: 0.45rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;

  &:hover {
    background: #e7f3ed;
    color: #066039;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 2.3rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 9px;

  &:hover {
    background: #e7f3ed;
    color: #066039;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  justify-self: end;
  @media (max-width: 768px) {
    flex: 1 1 100%;
    justify-self: stretch;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0;
    padding-top: 0.5rem;
    border-top: 1px solid #e2e8f0;
    padding-left: 0;
    padding-right: 0;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
`;

const RoleSelect = styled.select`
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  height: 38px;
  padding: 0 2.1rem 0 0.9rem;
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%231A1A1A'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.8rem center;
  background-size: 1.15rem;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(6, 96, 57, 0.16);
    border-color: #066039;
  }
  @media (max-width: 768px) {
    font-size: 0.8125rem;
    padding: 0 1.85rem 0 0.7rem;
    min-width: 0;
    flex: 1 1 0%;
    max-width: 100%;
    height: 40px;
    border-radius: 9999px;
  }
`;

const UserBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #ffffff;
  border-radius: 9999px;
  height: 38px;
  padding: 0 0.65rem 0 0.45rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
  max-width: 100%;

  span {
    line-height: 1;
  }

  @media (max-width: 768px) {
    flex-shrink: 0;
    max-width: min(10.5rem, 38vw);
  }
`;

const UserInitials = styled.div`
  width: 1.95rem;
  height: 1.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 1.95rem;
  background: linear-gradient(180deg, #1A1A1A 0%, #066039 100%);
  border: 1px solid #1A1A1A;
  color: #ffffff;
  font-weight: 800;
  font-size: 0.95rem;
  border-radius: 9999px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
`;

function AppHeader({ isSidebarCollapsed, hideSidebar = false }) {
  const SEARCH_QUERY_STORAGE_KEY = "global-lead-search-query";
  const searchInputRef = useRef(null);
  const [showLogout, setShowLogout] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [domainAnalytics, setDomainAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [unreadWhatsNewCount, setUnreadWhatsNewCount] = useState(0);
  const hasAutoOpenedWhatsNew = useRef(false);
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const whatsNewItems = getWhatsNewItemsForRoles(user?.allRoles);

  const handleRoleChange = (e) => {
    const newRole = e.target.value.toLowerCase();
    dispatch(setRole(newRole));

    let rolePath = "/";
    if (newRole === "admin") rolePath = "/admin/dashboard";
    if (newRole === "sales-ops") rolePath = "/sales-ops/allocated-partial";
    if (newRole === "credit-head")
      rolePath = "/credit-head/unassigned-audit-leads";
    if (newRole === "credit-analyst")
      rolePath = "/credit-analyst/allocated-application";
    if (newRole === "disbursal-head") rolePath = "/disbursal-head/disbursed";
    if (newRole === "marketing") rolePath = "/marketing";
    if (newRole === "quality-checker")
      rolePath = "/quality-checker/location-suspicious-leads";
    navigate(rolePath, { replace: true });
  };

  const getCurrentRoleFromPath = () => {
    const path = window.location.pathname;
    const segments = path.split("/");
    if (segments.length > 1) {
      const roleFromPath = segments[1].toLowerCase();
      if (roleFromPath !== user.role?.toLowerCase()) {
        dispatch(setRole(roleFromPath));
      }
      return roleFromPath;
    }
    return user.role?.toLowerCase() || "";
  };

  useEffect(() => {
    getCurrentRoleFromPath();
  }, [window.location.pathname]);

  useEffect(() => {
    const unread = getUnreadWhatsNewItems(user?.allRoles);
    setUnreadWhatsNewCount(unread.length);
    if (
      !hasAutoOpenedWhatsNew.current &&
      unread.length > 0 &&
      isProductTourSeen(
        window.location.pathname.split("/")[1]?.toLowerCase() || ""
      )
    ) {
      hasAutoOpenedWhatsNew.current = true;
      setShowWhatsNew(true);
    }
  }, [user?.allRoles]);

  useEffect(() => {
    const openWhatsNewAfterTour = (event) => {
      if (event.detail?.tour === "lead" || event.detail?.tour === "summary") return;
      const unread = getUnreadWhatsNewItems(user?.allRoles);
      setUnreadWhatsNewCount(unread.length);
      if (!hasAutoOpenedWhatsNew.current && unread.length > 0) {
        hasAutoOpenedWhatsNew.current = true;
        setShowWhatsNew(true);
      }
    };
    window.addEventListener(TOUR_END_EVENT, openWhatsNewAfterTour);
    return () => window.removeEventListener(TOUR_END_EVENT, openWhatsNewAfterTour);
  }, [user?.allRoles]);

  const handleCloseWhatsNew = () => {
    markWhatsNewItemsSeen(whatsNewItems);
    setUnreadWhatsNewCount(0);
    setShowWhatsNew(false);
  };

  const queryClient = useQueryClient();

  const { mutate: handleLogout, isPending: isLoggingOut } = useMutation({
    mutationKey: ["user"],
    mutationFn: logout,
    onSuccess: () => {
      toast.success("Logged out successfully");
      localStorage.removeItem("token");
      queryClient.removeQueries("user");
      dispatch(logoutAction());
    },
    onError: (err) => {
      toast.error(err);
    },
  });

  const {
    mutate: handleChangePasswordMutation,
    isPending: isChangingPassword,
  } = useMutation({
    mutationKey: ["user"],
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Password changed successfully");
      setShowChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });


  const handleChangePasswordOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleLogoutConfirmOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowLogoutConfirm(false);
    }
  };

  const handleChangePassword = () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!user.email) {
      toast.error("Email not found. Please log in again.");
      return;
    }
    handleChangePasswordMutation({ email: user.email, newPassword });
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim() || query.length < 3) {
        setResults([]);
        setDomainAnalytics(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { results: data, domainAnalytics: analytics } =
          await globalSearch(query);
        setResults(data);
        setDomainAnalytics(analytics);
      } catch (err) {
        setError("Failed to fetch search results");
        setResults([]);
        setDomainAnalytics(null);
        toast.error("Search failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    const savedQuery = sessionStorage.getItem(SEARCH_QUERY_STORAGE_KEY);
    if (savedQuery) {
      setSearchQuery(savedQuery);
    }
  }, []);

  useEffect(() => {
    if (searchQuery) {
      sessionStorage.setItem(SEARCH_QUERY_STORAGE_KEY, searchQuery);
    } else {
      sessionStorage.removeItem(SEARCH_QUERY_STORAGE_KEY);
    }
  }, [searchQuery]);

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearch && !event.target.closest("[data-search-container]")) {
        setShowSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearch]);

  const handleSearchResultClick = (result) => {
    setShowSearch(false);
    navigate(`/search-result/${result.id}`, { state: { lead: result } });
  };

  /** Enter / search icon: open full results page with every match (not dropdown pick). */
  const navigateToSearchResultsPage = async () => {
    const query = searchQuery.trim();
    if (!query) {
      toast.error("Enter a search term");
      return;
    }
    if (query.length < 3) {
      toast.error("Please enter at least 3 characters");
      return;
    }
    setShowSearch(false);
    setIsLoading(true);
    setError(null);
    try {
      const { results: list, domainAnalytics: analytics } =
        await globalSearch(query);
      setResults(list);
      setDomainAnalytics(analytics);
      navigate("/search-result", {
        state: { results: list, query, domainAnalytics: analytics },
      });
    } catch {
      toast.error("Search failed. Please try again.");
      setError("Failed to fetch search results");
      setResults([]);
      setDomainAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateToSearchResultsPage();
    }
  };

  const handleSearchIconClick = () => {
    navigateToSearchResultsPage();
  };

  const userMenuItems = [
    {
      label: "Profile",
      icon: User,
      // onClick: () => navigate("/profile"),
      onClick: () => {
        navigate("/apply-leave");
      },
    },
    {
      label:
        unreadWhatsNewCount > 0
          ? `What's new (${unreadWhatsNewCount})`
          : "What's new",
      icon: Sparkles,
      onClick: () => setShowWhatsNew(true),
    },
    {
      label: "Take a tour",
      icon: Compass,
      onClick: () => requestProductTour(),
    },
    {
      label: "Change Password",
      icon: Lock,
      onClick: () => setShowChangePassword(true),
    },
    {
      label: "Logout",
      icon: LogOut,
      onClick: (e) => {
        e.stopPropagation();
        setShowLogoutConfirm(true);
      },
      className: "text-red-600",
      disabled: isLoggingOut,
      closeOnClick: false,
    },
  ];

  const showHeaderLogo = hideSidebar || isSidebarCollapsed;
  const isQualityCheckerView =
    getCurrentRoleFromPath() === "quality-checker" ||
    window.location.pathname.startsWith("/quality-checker");

  return (
    <StyledHeader $reserveToggleSpace={!hideSidebar && isSidebarCollapsed}>
      <HeaderLeft $visible={showHeaderLogo} $hideSidebar={hideSidebar}>
        {showHeaderLogo ? (
          <>
            <img src="/images/product-logo.png" alt="The Loan Junction" />
          </>
        ) : null}
      </HeaderLeft>
      <SearchContainer data-search-container $hideSidebar={hideSidebar}>
        {isQualityCheckerView ? null : (
        <>
        <SearchBox $isFocused={isInputFocused} data-tour="global-search">
          <SearchActionButton
            type="button"
            aria-label="Search leads"
            onClick={handleSearchIconClick}
          >
            <SearchIcon />
          </SearchActionButton>
          <StyledInput
            type="text"
            placeholder="PAN, Mobile, Name, Domain…"
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              setSearchQuery(value);
              if (value === "") {
                setShowSearch(false);
                setResults([]);
                setDomainAnalytics(null);
              } else {
                setShowSearch(true);
                if (value.length >= 3) {
                  debouncedSearch(value);
                } else {
                  setResults([]);
                  setDomainAnalytics(null);
                }
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            ref={searchInputRef}
          />
          {searchQuery && (
            <ClearButton
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                setSearchQuery("");
                setShowSearch(false);
                setResults([]);
                setDomainAnalytics(null);
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus();
                });
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </ClearButton>
          )}
        </SearchBox>
        {/* Search Results Dropdown */}
        {showSearch && searchQuery && (
          <div
            className="absolute left-0 right-0 top-full z-[60] mt-1.5 flex max-h-[min(70vh,520px)] w-full max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_22px_50px_-12px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/[0.06] sm:left-auto sm:right-auto sm:z-50 sm:mt-2 sm:max-h-none sm:max-w-[38rem] sm:shadow-2xl sm:ring-0"
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-slate-50/80 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">
                  Lead Search
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:hidden">
                  Enter or tap <span className="font-medium text-slate-600">search</span> for full list
                </p>
                <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                  Press Enter or tap search to see all results
                </p>
              </div>
              <p className="shrink-0 rounded-full border border-slate-200/90 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm sm:px-2.5 sm:py-1 sm:text-xs">
                {results?.length || 0} result{results?.length === 1 ? "" : "s"}
              </p>
            </div>
            {domainAnalytics ? (
              <DomainAnalyticsSummary analytics={domainAnalytics} />
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {searchQuery.length < 3 ? (
                <div className="text-center text-gray-500 py-3 sm:py-4 text-sm">
                  Please enter at least 3 characters to search
                </div>
              ) : isLoading ? (
                <div className="flex justify-center py-3 sm:py-4">
                  <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-500 py-3 sm:py-4 text-sm">
                  {error}
                </div>
              ) : results.length === 0 ? (
                <div className="text-center text-gray-500 py-3 sm:py-4 text-sm">
                  No matching records found.
                </div>
              ) : (
                <div className="space-y-2 pr-0.5 sm:max-h-[420px] sm:overflow-y-auto">
                  {results.map((result) => (
                    <button
                      type="button"
                      key={result.id}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-all hover:border-brand/40 hover:bg-brand-light/40"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {result.full_name
                              ? result.full_name
                                  .split(" ")
                                  .map(
                                    (word) =>
                                      word.charAt(0).toUpperCase() +
                                      word.slice(1).toLowerCase()
                                  )
                                  .join(" ")
                              : "N/A"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Lead #{result.lead_no || "--"}
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                          title={getLeadStageMeaning(result.lead_stage)}
                        >
                          {leadStageMapping[result.lead_stage] || "Unknown"}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <p className="truncate">
                          <span className="text-slate-400">PAN:</span>{" "}
                          {result.pan || "--"}
                        </p>
                        <p className="truncate">
                          <span className="text-slate-400">Mobile:</span>{" "}
                          {result.mobile || "--"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </>
        )}
      </SearchContainer>
      <HeaderRight $hideSidebar={hideSidebar}>
        <button
          type="button"
          onClick={() => setShowWhatsNew(true)}
          className="relative inline-flex h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-brand shadow-sm transition-colors hover:bg-brand-soft"
          aria-label="What's new"
          title="What's new"
          data-tour="whats-new"
        >
          <Sparkles size={16} />
          <span className="text-xs font-semibold whitespace-nowrap">
            What&apos;s New
          </span>
          {unreadWhatsNewCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadWhatsNewCount > 9 ? "9+" : unreadWhatsNewCount}
            </span>
          ) : null}
        </button>
        <RoleSelect
          data-tour="role-switch"
          value={getCurrentRoleFromPath()}
          onChange={handleRoleChange}
        >
          {user?.allRoles.includes("ADMIN") ? (
            <>
              <option value="admin">Admin</option>
              <option value="sales-ops">Sales Team</option>
              <option value="credit-head">Credit Head</option>
              <option value="credit-analyst">Credit Team</option>
              <option value="disbursal-head">Disbursed Team</option>
              <option value="marketing">Marketing</option>
            </>
          ) : (
            user?.allRoles.map((item) => (
              <option key={item} value={item.toLowerCase()}>
                {capitalize(item)}
              </option>
            ))
          )}
        </RoleSelect>
        <UserBlock
          data-tour="user-menu"
          onClick={() => setShowLogout((prev) => !prev)}
          style={{ cursor: "pointer" }}
        >
          <span className="truncate text-slate-700 font-semibold text-sm sm:text-base">
            {user?.f_name || "Alias"}
          </span>
          <UserInitials>
            {user.f_name && user.l_name
              ? `${user.f_name} ${user.l_name}`
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              : "A"}
          </UserInitials>
        </UserBlock>
        <UserMenuDropdown
          isOpen={showLogout}
          onClose={() => setShowLogout(false)}
          items={userMenuItems}
        />
      </HeaderRight>

      <WhatsNewModal
        isOpen={showWhatsNew}
        onClose={handleCloseWhatsNew}
        items={whatsNewItems}
        unreadCount={unreadWhatsNewCount}
      />

      {/* Change Password Modal */}
      {showChangePassword && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center z-50"
          onClick={handleChangePasswordOutsideClick}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            {/* <AlertCircle className="text-yellow-500" size={24} />
            <h2 className="text-xl font-semibold mb-4"></h2> */}
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-yellow-500" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">
                Change Password
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand pr-10"
                    placeholder="Enter new password"
                    autoComplete='new-password'
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={handleChangePasswordOutsideClick}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="px-4 py-2 bg-brand text-white rounded-xl hover:bg-brand-hover transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? <SvgLoader /> : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center z-50"
          onClick={handleLogoutConfirmOutsideClick}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-yellow-500" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Logout
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout? This will end your current
              session.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isLoggingOut ? (
                  <div className="flex items-center">
                    <SvgLoader />
                    <span className="ml-2">Logging out...</span>
                  </div>
                ) : (
                  "Logout"
                )}
                {!isLoggingOut && <LogOut size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </StyledHeader>
  );
}

export default AppHeader;
