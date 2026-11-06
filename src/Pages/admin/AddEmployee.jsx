import React, { useState } from "react";
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { addNewEmployee } from "../../services/functions/admin";
import toast from "react-hot-toast";
import SvgLoader from "../../ui/SvgLoader";

const AddEmployee = () => {
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const roles = [
    "SALES-OPS",
    "CREDIT-ANALYST",
    "DISBURSAL-HEAD",
    "ADMIN",
    "MARKETING",
    "QUALITY-CHECKER"
  ];

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  const mobileRegex = /^[0-9]{10}$/;
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  const validateForm = (data) => {
    const newErrors = {};

    if (!data.f_name.trim()) {
      newErrors.f_name = "First name is required";
    }

    if (!data.l_name.trim()) {
      newErrors.l_name = "Last name is required";
    }

    if (!data.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(data.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!data.password) {
      newErrors.password = "Password is required";
    } else if (!passwordRegex.test(data.password)) {
      newErrors.password =
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character";
    }

    if (!data.mobile) {
      newErrors.mobile = "Mobile number is required";
    } else if (!mobileRegex.test(data.mobile)) {
      newErrors.mobile = "Please enter a valid 10-digit mobile number";
    }

    if (!data.gender) {
      newErrors.gender = "Gender is required";
    }

    if (selectedRoles.length === 0) {
      newErrors.roles = "Please select at least one role";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRoleChange = (role) => {
    if (role === "ADMIN") {
      setSelectedRoles(selectedRoles.includes("ADMIN") ? [] : ["ADMIN"]);
      return;
    }

    if (selectedRoles.includes("ADMIN")) return;

    if (role === "QUALITY-CHECKER") {
      setSelectedRoles(
        selectedRoles.includes("QUALITY-CHECKER") ? [] : ["QUALITY-CHECKER"]
      );
      return;
    }

    if (selectedRoles.includes("QUALITY-CHECKER")) return;

    setSelectedRoles((prevRoles) =>
      prevRoles.includes(role)
        ? prevRoles.filter((r) => r !== role)
        : [...prevRoles, role]
    );
  };

  const { mutate: addEmployee, isPending: isLoading } = useMutation({
    mutationFn: addNewEmployee,
    onSuccess: () => {
      toast.success("Employee created successfully!");
      setSelectedRoles([]);
      setErrors({});
      document.getElementById("employeeForm").reset();
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "An error occurred while creating employee"
      );
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.roleNames = selectedRoles;

    if (!validateForm(data)) {
      return;
    }

    addEmployee(data);
  };

  const handleInputChange = (e) => {
    const { name } = e.target;
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-brand-dark px-8 py-10">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-3 rounded-full">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Add New Employee</h2>
                <p className="mt-2 text-white text-lg">
                  Create a new employee account with appropriate roles and permissions
                </p>
              </div>
            </div>
          </div>

          <form
            id="employeeForm"
            onSubmit={handleSubmit}
            className="p-8 space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  First Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-brand-link group-hover:text-brand-link transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="f_name"
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${errors.f_name ? "border-red-500" : "border-gray-300"
                      } text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent`}
                    placeholder="Enter first name"
                    required
                  />
                  {errors.f_name && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.f_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.f_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Last Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-brand-link group-hover:text-brand-link transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="l_name"
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${errors.l_name ? "border-red-500" : "border-gray-300"
                      } text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent`}
                    placeholder="Enter last name"
                  // required
                  />
                  {errors.l_name && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>

                {errors.l_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.l_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-brand-link group-hover:text-brand-link transition-colors" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${errors.email ? "border-red-500" : "border-gray-300"
                      } text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent`}
                    placeholder="Enter email address"
                    required
                  />
                  {errors.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-brand-link group-hover:text-brand-link transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-10 py-3 border ${errors.password ? "border-red-500" : "border-gray-300"
                      } text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all duration-200`}
                    placeholder="Enter password"
                    required
                  />
                  <div
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-brand-link transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-brand-link" />
                    ) : (
                      <Eye className="h-5 w-5 text-brand-link" />
                    )}
                  </div>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Gender
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-brand-link group-hover:text-brand-link transition-colors" />
                  </div>
                  <select
                    name="gender"
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 border cursor-pointer ${errors.gender ? "border-red-500" : "border-gray-300"
                      } text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all duration-200 appearance-none bg-white`}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                  {errors.gender && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.gender && (
                  <p className="text-sm text-red-500 mt-1">{errors.gender}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Mobile
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-brand-link group-hover:text-brand-link transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="mobile"
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${errors.mobile ? "border-red-500" : "border-gray-300"
                      } text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all duration-200`}
                    placeholder="Enter mobile number"
                    // required
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9e]/g, "");
                    }}
                  />
                  {errors.mobile && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.mobile && (
                  <p className="text-sm text-red-500 mt-1">{errors.mobile}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                Select Roles
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {roles
                  .filter(
                    (role) =>
                      !(selectedRoles.includes("ADMIN") && role === "QUALITY-CHECKER")
                  )
                  .map((role) => {
                  const isSelected = selectedRoles.includes(role);
                  const isLocked =
                    (selectedRoles.includes("ADMIN") && role !== "ADMIN") ||
                    (selectedRoles.includes("QUALITY-CHECKER") &&
                      role !== "QUALITY-CHECKER");
                  const isRadio = role === "QUALITY-CHECKER";

                  return (
                  <div
                    key={role}
                    className={`text-gray-800 relative rounded-xl p-4 border-2 transition-all duration-200 ${isSelected
                      ? "border-brand bg-brand-light shadow-md"
                      : "border-gray-200 hover:border-brand/50 hover:shadow-sm"
                      } ${isLocked
                        ? "opacity-50 cursor-not-allowed pointer-events-none"
                        : "cursor-pointer"
                      }`}
                    onClick={() => handleRoleChange(role)}
                  >
                    <input
                      type={isRadio ? "radio" : "checkbox"}
                      name={isRadio ? "exclusive-role" : undefined}
                      className="text-gray-800 absolute opacity-0 w-0 h-0"
                      checked={isSelected}
                      onChange={() => { }}
                    />
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-5 h-5 border-2 flex items-center justify-center transition-colors duration-200 ${
                          isRadio ? "rounded-full" : "rounded"
                        } ${isSelected
                          ? "bg-brand border-brand"
                          : "border-gray-300"
                          }`}
                      >
                        {isSelected && (
                          isRadio ? (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          ) : (
                            <Check className="w-3 h-3 text-brand-dark" />
                          )
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {role.charAt(0) + role.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
              {errors.roles && (
                <p className="text-sm text-red-500 mt-1">{errors.roles}</p>
              )}
            </div>

            {selectedRoles.length > 0 && (
              <div className="bg-brand-light p-4 rounded-xl border border-brand/25">
                <p className="text-sm font-medium text-brand-link">
                  Selected Roles:
                </p>
                <p className="text-sm text-brand-link mt-1">
                  {selectedRoles.join(", ")}
                </p>
              </div>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className={`cursor-pointer w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${isLoading
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-brand text-white hover:bg-brand-hover hover:shadow-lg transform hover:-translate-y-0.5"
                  }`}
              >
                {isLoading ? (
                  <SvgLoader />
                ) : (
                  "Create Employee"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEmployee;
