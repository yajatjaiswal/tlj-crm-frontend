import styled from "styled-components";
import { FaUserCheck, FaClipboardList } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import {
  X,
  Users,
  CheckCircle,
  XCircle,
  UserCheck,
  Briefcase,
  X as XIcon,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  ArrowDownRight,
  CircleCheckBig,
  CreditCard,
  RotateCcw,
  RotateCw,
  Shield,
  MapPin,
  User,
  Calendar,
  BarChart,
  Repeat,
  Terminal,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { setRole } from "../redux/slices/user";
import { useIsTeamLead } from "../hooks/useIsTeamLead";
import { isGeofenceWhitelistPermissionEmail } from "../constants/permissionEmails";

const roles = {
  admin: [
    {
      path: "admin/action-pan",
      label: "Action Pan",
      icon: <Shield />,
    },
    {
      path: "admin/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard />,
    },
    { path: "admin/add-employee", label: "Add Employee", icon: <Users /> },
    {
      path: "admin/geofence-whitelist",
      label: "Geofence Whitelist",
      icon: <MapPin />,
      requiresGeofenceWhitelistEmail: true,
    },
    {
      path: "admin/dev-tab",
      label: "Dev Tab",
      icon: <Terminal />,
    },
  ],
  "sales-ops": [
    {
      path: "sales-ops/my-performance",
      label: "Dashboard",
      icon: <LayoutDashboard />,
    },
    {
      path: "sales-ops/action-pan",
      label: "Action Pan",
      icon: <Shield />,
    },
    {
      path: "sales-ops/marketing-leads",
      label: "Marketing Leads",
      icon: <Briefcase />,
    },
    { path: "sales-ops/partial", label: "Partial Leads", icon: <Users /> },
    {
      path: "sales-ops/allocated-marketing",
      label: "Assigned Marketing",
      icon: <Briefcase />,
    },
    {
      path: "sales-ops/allocated-partial",
      label: "Assigned Partial",
      icon: <UserCheck />,
    },
    // { path: "screener/non-contactable", label: "Non Contactable", icon: <RotateCcw /> },
    // { path: "screener/non-responsive", label: "Non Responsive", icon: <RotateCw /> },
    // {
    //   path: "sales-ops/repayment-leads",
    //   label: "Repayment Leads",
    //   icon: <FaUserCheck />,
    // },
    {
      path: "sales-ops/today-recovery-leads",
      label: "Today's Recovery Leads",
      icon: <BarChart />,
    },
    {
      path: "sales-ops/assigned-recovery-leads",
      label: "Assigned Recovery Leads",
      icon: <RotateCcw />,
    },
    {
      path: "sales-ops/priority-reloan",
      label: "Priority Reloan",
      icon: <Repeat />,
    },
    {
      path: "sales-ops/not-taken-reloan",
      label: "Not Taken Reloan",
      icon: <RotateCw />,
    },
    {
      path: "sales-ops/assigned-not-taken-reloan",
      label: "Assigned Not Taken Reloan",
      icon: <UserCheck />,
    },
    {
      path: "sales-ops/completed",
      label: "Completed",
      icon: <CheckCircle />,
    },
    { path: "sales-ops/rejected", label: "Rejected", icon: <XCircle /> },
    {
      path: "sales-ops/unserviceable-pin-code-leads",
      label: "Unserviceable PinCode Leads",
      icon: <MapPin />,
    },
    // {
    //   path: "sales-ops/disposed-leads",
    //   label: "Disposed Leads",
    //   icon: <XCircle />,
    // },
  ],
  "credit-head": [
    {
      path: "credit-head/action-pan",
      label: "Action Pan",
      icon: <Shield />,
    },
    {
      path: "credit-head/unassigned-audit-leads",
      label: "Audit Leads",
      icon: <UserCheck />,
    },
    {
      path: "credit-head/assigned-audit-leads",
      label: "Assigned Audit Leads",
      icon: <ArrowDownRight />,
    },
    {
      path: "credit-head/approved-audit-leads",
      label: "Approved Audit Leads",
      icon: <CheckCircle />,
    },
    {
      path: "credit-head/rejected-audit-leads", 
      label: "Rejected Audit Leads",
      icon: <X />,
    },
  ],
  "credit-analyst": [
    {
      path: "credit-analyst/action-pan",
      label: "Action Pan",
      icon: <Shield />,
    },
    {
      path: "credit-analyst/bre-rejected-app",
      label: "BRE Rejected Application",
      icon: <FaUserCheck />,
    },
    {
      path: "credit-analyst/allocated-application",
      label: "Assigned Application",
      icon: <ArrowDownRight />,
    },
    // {
    //   path: "credit-analyst/non-contactable-bre-re",
    //   label: "Non Contactable BRE Re",
    //   icon: <RotateCcw />,
    // },
    // {
    //   path: "credit-analyst/non-responsive-bre-re",
    //   label: "Non Responsive BRE Re",
    //   icon: <RotateCw />,
    // },
    {
      path: "credit-analyst/approved-application",
      label: "Approved Application",
      icon: <CircleCheckBig />,
    },
    {
      path: "credit-analyst/rejected-application",
      label: "Rejected Application",
      icon: <X />,
    },
    {
      path: "credit-analyst/audit-leads",
      label: "Audit Leads",
      icon: <UserCheck />,
    },
    {
      path: "credit-analyst/allocated-leads-audit",
      label: "Allocated Audit Leads",
      icon: <ArrowDownRight />,
    },
    {
      path: "credit-analyst/approved-leads-audit",
      label: "Approved Audit Leads",
      icon: <CheckCircle />,
    },
    {
      path: "credit-analyst/rejected-leads-audit",
      label: "Rejected Audit Leads",
      icon: <X />,
    }
  ],
  "disbursal-head": [
    {
      path: "disbursal-head/action-pan",
      label: "Action Pan",
      icon: <Shield />,
    },
    {
      path: "disbursal-head/disbursed",
      label: "Disbursed",
      icon: <FaUserCheck />,
    },
    {
      path: "disbursal-head/confirmation-pending-disbursal",
      label: "Confirmation Pending Disbursal",
      icon: <CreditCard />,
    },
  ],
  "quality-checker": [
    {
      path: "quality-checker/location-suspicious-leads",
      label: "Location Suspicious Leads",
      icon: <MapPin />,
    },
    {
      path: "quality-checker/approved-location-leads",
      label: "Approved Location Leads",
      icon: <CheckCircle />,
    },
    {
      path: "quality-checker/rejected-leads",
      label: "Rejected Leads",
      icon: <XCircle />,
    },
  ],
  marketing: [
    {
      path: "marketing/action-pan",
      label: "Action Pan",
      icon: <Shield />,
    },
    {
      path: "marketing",
      label: "Marketing",
      icon: <LayoutDashboard />,
    },
  ],
  profile: [
    // {
    //   path: "profile",
    //   label: "Profile",
    //   icon: <User size={20} />,
    // },
    {
      path: "apply-leave",
      label: "Apply Leave",
      icon: <Calendar size={20} />,
    }
  ],
};

const StyledSideBar = styled.aside`
  background: #1A1A1A;
  padding: 0 0 1rem 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  grid-row: 1/-1;
  text-align: center;
  display: flex;
  gap: 1rem;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  max-height: 100vh;
  width: ${(props) => (props.isMinimized ? "4.25rem" : "16.75rem")};
  transition: all 0.3s ease;
  overflow: hidden;
  box-shadow: 8px 0 24px rgba(26, 26, 26, 0.28);
  position: sticky;
  top: 0;

  @media (max-width: 768px) {
    width: 18rem;
    transform: translateX(${props => props.isMinimized ? '-100%' : '0'});
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 1000;
  }
`;

const MenuItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex-grow: 1;
  padding: 0.85rem 0.55rem;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.08);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.28);
    border-radius: 2px;
  }
`;

const SidebarItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: #FFFFFF;
  font-size: 0.92rem;
  border-radius: 10px;
  margin: 0 6px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  white-space: nowrap;

  justify-content: ${(props) => (props.$isMinimized ? "center" : "flex-start")};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 3px;
    background: #ed5b36;
    transform: scaleY(0);
    transition: transform 0.2s ease;
  }

  &.active {
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    font-weight: 600;

    &::before {
      transform: scaleY(1);
    }
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    transform: translateX(2px);
  }

  span {
    display: ${(props) => (props.$isMinimized ? "none" : "inline")};
  }

  svg {
    min-width: 20px;
    min-height: 20px;
  }

  @media (max-width: 768px) {
    padding: 10px 12px;
    font-size: 0.9rem;
    
    span {
      display: inline;
    }
  }
`;

const ToggleButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .logo-container {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    flex: 1;
  }

  .logo-name {
    display: none;
    flex-direction: column;
    white-space: nowrap;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #ffffff;
    line-height: 1.15;
    text-align: left;
  }

  .logo-fast {
    color: #ed5b36;
  }

  .logo-loan {
    color: #0b892d;
  }

  @media (min-width: 769px) {
    .logo-name {
      display: flex;
    }
  }

  img {
    width: auto;
    max-width: 9.75rem;
    height: 2.35rem;
    object-fit: contain;
    background: #ffffff;
    border-radius: 0.55rem;
    padding: 0.15rem 0.35rem;
    flex-shrink: 0;
  }

  svg {
    transition: transform 0.3s ease;
    &:hover {
      transform: scale(1.1);
    }
    height: 2.5rem;
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    
    img {
      width: auto;
      max-width: 9.75rem;
      height: 2.15rem;
    }

    .logo-name {
      display: none;
    }

    svg {
      height: 2.4rem;
    }
  }
`;

const MobileToggleButton = styled.button`
  display: none;
  position: fixed;
  top: 0.5rem;
  left: 0.75rem;
  z-index: 49;
  background: #1A1A1A;
  border: none;
  color: white;
  padding: 0.5rem;
  border-radius: 0.75rem;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(26, 26, 26, 0.4);

  @media (max-width: 768px) {
    display: block;
  }

  svg {
    width: 24px;
    height: 24px;
  }
`;

function AppSideBar({ onToggle, isCollapsed: isMinimized }) {
  const userRole = useSelector((state) => state.user.selectedRole);
  const userEmail = useSelector((state) => state.user.email);
  const dispatch = useDispatch();
  const location = useLocation();
  const { isTeamLead } = useIsTeamLead();
  const canManageGeofenceWhitelist =
    isGeofenceWhitelistPermissionEmail(userEmail);

  useEffect(() => {
    const path = location.pathname;
    const segments = path.split("/");
    if (segments.length > 1) {
      const roleFromPath = segments[1].toLowerCase();
      // Don't change role if on profile/apply-leave routes
      if (roleFromPath === "profile" || roleFromPath === "apply-leave") {
        return;
      }
      if (roleFromPath !== userRole?.toLowerCase()) {
        dispatch(setRole(roleFromPath));
      }
    }
  }, [location.pathname, userRole, dispatch]);

  // Show profile menu items when on profile/apply-leave routes
  const isProfileRoute = location.pathname === "/profile" || location.pathname === "/apply-leave";
  const menuItems = useMemo(() => {
    if (isProfileRoute) return roles["profile"] || [];

    const roleItems = (roles[userRole?.toLowerCase()] || []).filter(
      (item) =>
        !item.requiresGeofenceWhitelistEmail || canManageGeofenceWhitelist
    );
    if (userRole?.toLowerCase() !== "sales-ops") return roleItems;

    const dashboardPath = isTeamLead
      ? "sales-ops/team-performance"
      : "sales-ops/my-performance";

    return roleItems.map((item) =>
      item.path === "sales-ops/my-performance"
        ? { ...item, path: dashboardPath }
        : item
    );
  }, [isProfileRoute, userRole, isTeamLead, canManageGeofenceWhitelist]);

  const isSalesOpsDashboardActive = (pathname) =>
    pathname.includes("/sales-ops/my-performance") ||
    pathname.includes("/sales-ops/team-performance") ||
    pathname.includes("/sales-ops/dashboard");

  return (
    <>
      {isMinimized && (
        <MobileToggleButton onClick={onToggle}>
          <ChevronsRight className="text-white" />
        </MobileToggleButton>
      )}
      <StyledSideBar isMinimized={isMinimized} data-tour="sidebar">
        <ToggleButton $isMinimized={isMinimized} onClick={onToggle}>
          {!isMinimized && (
            <div className="logo-container">
              <img src="/images/product-logo.png" alt="The Loan Junction" />
            </div>
          )}
          {isMinimized ? <ChevronsRight className="text-white" /> : <ChevronsLeft className="text-white" />}
        </ToggleButton>
        <MenuItems>
          {menuItems.map((item) => (
            <SidebarItem
              key={item.path}
              to={item.path}
              data-tour={
                item.path === "sales-ops/my-performance" ||
                item.path === "sales-ops/team-performance"
                  ? "nav:sales-ops/dashboard"
                  : `nav:${item.path}`
              }
              $isMinimized={isMinimized}
              isActive={
                item.label === "Dashboard" && userRole?.toLowerCase() === "sales-ops"
                  ? () => isSalesOpsDashboardActive(location.pathname)
                  : undefined
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </SidebarItem>
          ))}
        </MenuItems>
        {!isMinimized ? (
          <SettingsButton $isMinimized={isMinimized}>
            <img 
              src="/images/nbfc-logo.png" 
              alt="Jindal Logo"
              onClick={() => {
                window.open(import.meta.env.VITE_NBFC_LOGO_URL, "_blank");
              }}
              className="cursor-pointer"
            />
          </SettingsButton>
        ) : null}
      </StyledSideBar>
    </>
  );
}

const SettingsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin: 0 8px;
  color: #6B7280;
  background: #FFFFFF;
  border: none;
  border-radius: 10px;
  transition: all 0.3s ease;
  font-size: 0.95rem;

  img {
    width: 100%;
    height: auto;
    max-height: 30px;
    object-fit: contain;
  }

  @media (max-width: 768px) {
    padding: 10px 12px;
    margin: 0 4px;
    
    img {
      max-height: 24px;
    }
  }
`;

export default AppSideBar;