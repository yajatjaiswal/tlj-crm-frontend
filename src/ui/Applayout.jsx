import { Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AppHeader from "../Components/AppHeader";
import AppSideBar from "../Components/AppSideBar";
import styled from "styled-components";
import { useEffect, useRef, useState } from "react";
import CustomerModal from "../Pages/details-modal/CustomerModal";
import ProductTour from "../Components/ProductTour/ProductTour";
import { closeDetailModal } from "../redux/slices/detailModal";
import {
  TOUR_END_EVENT,
  TOUR_PREPARE_EVENT,
  TOUR_START_EVENT,
} from "../utils/productTour";

const StyledAppLayout = styled.div`
  display: grid;
  grid-template-columns: ${(props) =>
    props.hideSidebar
      ? "1fr"
      : `${props.isCollapsed ? "4.25rem" : "16.75rem"} 1fr`};
  grid-template-rows: auto 1fr;
  min-height: 100vh;
  transition: grid-template-columns 0.3s ease-in-out;
  background: #f3f8f5;

  & > aside {
    grid-column: 1 / 2;
    grid-row: 1 / -1;
  }

  & > header {
    grid-column: ${(props) => (props.hideSidebar ? "1 / 2" : "2 / 3")};
    grid-row: 1 / 2;
    position: sticky;
    top: 0;
    z-index: 40;
  }

  & > main {
    grid-column: ${(props) => (props.hideSidebar ? "1 / 2" : "2 / 3")};
    grid-row: 2 / 3;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;

    & > header {
      grid-column: 1 / 2;
      grid-row: 1 / 2;
      position: sticky;
      top: 0;
      z-index: 40;
    }

    & > main {
      grid-column: 1 / 2;
      grid-row: 2 / 3;
    }

    & > aside {
      position: fixed;
      left: ${(props) => (props.isCollapsed ? "-100%" : "0")};
      top: 0;
      bottom: 0;
      z-index: 1000;
      transition: left 0.3s ease-in-out;
    }
  }
`;

const Main = styled.main`
  background:
    radial-gradient(circle at 12% 0%, rgba(237, 91, 54, 0.08), transparent 32%),
    radial-gradient(circle at 88% 0%, rgba(11, 137, 45, 0.05), transparent 28%),
    #f3f8f5;
  overflow-y: auto;
  // padding: 0.5rem 0.5rem 0.5rem;
  padding: 0rem;

  @media (max-width: 768px) {
    padding: 0.35rem;
    // padding-top: 2rem; /* Add space for the mobile toggle button */
  }
`;

const Overlay = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: ${props => props.isCollapsed ? 'none' : 'block'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
`;

function AppLayout() {
  const location = useLocation();
  const { isOpen } = useSelector((state) => state["detail-modal"]);
  const selectedRole = useSelector((state) => state.user.selectedRole);
  const dispatch = useDispatch();
  const hideSidebar = location.pathname.startsWith("/search-result");
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const isAdmin = (selectedRole || "").toLowerCase() === "admin";
    return isMobile || isAdmin; // default collapsed on mobile or for admin
  });
  const isCollapsedRef = useRef(isCollapsed);
  const sidebarBeforeTour = useRef(null);
  const tourActiveRef = useRef(false);
  isCollapsedRef.current = isCollapsed;

  useEffect(() => {
    const handleResize = () => {
      if (tourActiveRef.current) return;
      // On mobile, always force collapsed; on desktop, don't override user's preference
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (tourActiveRef.current) return;
    // When role changes, set default: admin collapsed on desktop; mobile remains collapsed
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed((selectedRole || "").toLowerCase() === "admin");
    }
  }, [selectedRole]);

  useEffect(() => {
    const markTourActive = () => {
      tourActiveRef.current = true;
    };
    const openSidebarForTour = (event) => {
      if (!event.detail?.expandSidebar && event.detail?.id !== "sidebar") return;
      if (sidebarBeforeTour.current == null) {
        sidebarBeforeTour.current = isCollapsedRef.current;
      }
      setIsCollapsed(false);
    };
    const restoreSidebar = () => {
      tourActiveRef.current = false;
      if (sidebarBeforeTour.current == null) return;
      setIsCollapsed(sidebarBeforeTour.current);
      sidebarBeforeTour.current = null;
    };
    window.addEventListener(TOUR_START_EVENT, markTourActive);
    window.addEventListener(TOUR_PREPARE_EVENT, openSidebarForTour);
    window.addEventListener(TOUR_END_EVENT, restoreSidebar);
    return () => {
      window.removeEventListener(TOUR_START_EVENT, markTourActive);
      window.removeEventListener(TOUR_PREPARE_EVENT, openSidebarForTour);
      window.removeEventListener(TOUR_END_EVENT, restoreSidebar);
    };
  }, []);

  return (
    <>
      <StyledAppLayout isCollapsed={isCollapsed} hideSidebar={hideSidebar}>
        <AppHeader
          isSidebarCollapsed={isCollapsed}
          hideSidebar={hideSidebar}
        />
        {!hideSidebar && (
          <AppSideBar
            onToggle={() => setIsCollapsed((prev) => !prev)}
            isCollapsed={isCollapsed}
          />
        )}
        {!hideSidebar && (
          <Overlay
            isCollapsed={isCollapsed}
            onClick={() => setIsCollapsed(true)}
          />
        )}
        <Main data-tour="workspace">
          <Outlet />
          {isOpen && (
            <CustomerModal
              isOpen={isOpen}
              onClose={() => dispatch(closeDetailModal())}
            />
          )}
        </Main>
      </StyledAppLayout>
      <ProductTour />
    </>
  );
}

export default AppLayout;