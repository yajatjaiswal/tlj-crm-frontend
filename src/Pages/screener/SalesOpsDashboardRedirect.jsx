import { Navigate } from "react-router-dom";
import { useIsTeamLead } from "../../hooks/useIsTeamLead";

export default function SalesOpsDashboardRedirect() {
  const { isTeamLead, isLoading } = useIsTeamLead();

  if (isLoading) return null;

  return (
    <Navigate
      to={isTeamLead ? "team-performance" : "my-performance"}
      replace
    />
  );
}
