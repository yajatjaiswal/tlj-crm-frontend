import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getProfile } from "../services/functions/user";
import toast from "react-hot-toast";
import { logoutAction } from "../redux/slices/user";

function ProtectedRoute({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const userRoles = useSelector((state) => state.user.allRoles);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      // If not authenticated, don't proceed with API calls
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await getProfile();
        if (!user) {
          throw new Error("Token expired");
        }

        // Skip role check for shared utility routes
        if (
          location.pathname.startsWith('/search-result') ||
          location.pathname.startsWith('/summary-data') ||
          location.pathname === '/profile' ||
          location.pathname === '/apply-leave' ||
          location.pathname === '/lead-information/full-view'
        ) {
          setIsLoading(false);
          return;
        }

        if (userRoles.includes("ADMIN")) {
          setIsLoading(false);
          return;
        }

        const firstSegment = location.pathname.split("/")[1]?.toLowerCase();
        const lowercaseRoles = userRoles.map((role) => role.toLowerCase());
        
        if (firstSegment && !lowercaseRoles.includes(firstSegment)) {
          toast.error("Unauthorized access");
          navigate("/login", { replace: true });
          return;
        }
      } catch (err) {
        if (err.message) {
          toast.error("Session expired. Please log in again");
        }
        dispatch(logoutAction());
        navigate("/login", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [dispatch, navigate, location, userRoles, isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return children;
}

export default ProtectedRoute;
