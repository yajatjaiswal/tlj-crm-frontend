import { useQuery } from "@tanstack/react-query";
import { getProfile } from "../services/functions/user";

export function useIsTeamLead() {
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["employee-profile"],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const isTeamLead =
    profileData?.data?.id != null &&
    profileData?.data?.id === profileData?.data?.team_lead;

  return { isTeamLead, isLoading, profileData };
}
