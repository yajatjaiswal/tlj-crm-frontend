import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "../services/functions/user";
import { User, Mail, Shield } from "lucide-react";
import SvgLoader from "../ui/SvgLoader";


function Profile() {
  const user = useSelector((state) => state.user);
  const [profileData, setProfileData] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    retry: 1,
  });

  useEffect(() => {
    if (data) {
      setProfileData(data);
    }
  }, [data]);

  const getInitials = () => {
    const firstName = user.f_name || profileData?.f_name || "";
    const lastName = user.l_name || profileData?.l_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getFullName = () => {
    const firstName = user.f_name || profileData?.f_name || "";
    const lastName = user.l_name || profileData?.l_name || "";
    return `${firstName} ${lastName}`.trim() || "User";
  };

  const getEmail = () => {
    return user.email || profileData?.email || "Not available";
  };

  const getRoles = () => {
    return user.allRoles || profileData?.roles || [];
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto my-8 px-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <SvgLoader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto my-8 px-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-center">
          Failed to load profile. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 px-8">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white text-3xl font-semibold">
            {getInitials()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {getFullName()}
            </h1>
            <p className="text-base text-gray-500">{getEmail()}</p>
          </div>
        </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Profile Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand-link flex-shrink-0">
                  <User size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">First Name</p>
                  <p className="text-base font-medium text-gray-900">
                    {user.f_name || profileData?.f_name || "Not available"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand-link flex-shrink-0">
                  <User size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Last Name</p>
                  <p className="text-base font-medium text-gray-900">
                    {user.l_name || profileData?.l_name || "Not available"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand-link flex-shrink-0">
                  <Mail size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Email Address</p>
                  <p className="text-base font-medium text-gray-900">
                    {getEmail()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand-link flex-shrink-0">
                  <Shield size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Roles</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {getRoles().length > 0 ? (
                      getRoles().map((role, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-brand-light text-brand-link rounded-md text-sm font-medium"
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <p className="text-base font-medium text-gray-900">
                        No roles assigned
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

export default Profile;
