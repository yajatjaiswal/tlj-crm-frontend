import React, { useEffect, useRef, useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  LayoutDashboard,
  ClipboardList,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signIn } from "../services/functions/user";
import { useDispatch } from "react-redux";
import { loginAction } from "../redux/slices/user";
import toast from "react-hot-toast";
import SvgLoader from "../ui/SvgLoader";
import BrandWordmark from "../Components/BrandWordmark";

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60_000,
};

const getBrowserCoordinates = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      GEO_OPTIONS
    );
  });

const reverseGeocodeLocation = async ({ latitude, longitude }) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch {
    return null;
  }
};

const resolveSignInLocation = async (existingLocation) => {
  const hasCoordinates =
    existingLocation?.latitude != null && existingLocation?.longitude != null;
  const coordinates = hasCoordinates
    ? existingLocation
    : await getBrowserCoordinates();

  if (!coordinates) {
    return { latitude: null, longitude: null, location: null };
  }

  const location =
    existingLocation?.location ?? (await reverseGeocodeLocation(coordinates));

  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    location: location || `${coordinates.latitude}, ${coordinates.longitude}`,
  };
};

const fieldClass = (hasError) =>
  `w-full rounded-xl border bg-white py-3.5 pl-11 pr-3 text-base text-brand-dark placeholder:text-zinc-400 outline-none transition lg:py-3 lg:text-sm [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#ffffff] ${
    hasError
      ? "border-red-400 ring-2 ring-red-500/30"
      : "border-zinc-300 hover:border-zinc-400 focus:border-brand focus:ring-[3px] focus:ring-brand/20"
  }`;

const highlights = [
  {
    icon: LayoutDashboard,
    title: "Lead pipeline",
    text: "Track applications from intake through disbursal.",
  },
  {
    icon: ClipboardList,
    title: "Screening & review",
    text: "Work credit, documents, and decisions in one place.",
  },
  {
    icon: Users,
    title: "Team operations",
    text: "Coordinate roles, assignments, and daily workload.",
  },
];

const SignIn = () => {
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locationRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const prefetchLocation = async () => {
      const location = await resolveSignInLocation(null);
      if (!cancelled) {
        locationRef.current = location;
      }
    };

    prefetchLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
      general: "",
    };
    let isValid = true;

    if (!formData.email) {
      newErrors.email = "Email is required";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const { mutate: mutateLogin, isPending: isMutating } = useMutation({
    mutationFn: signIn,
    onSuccess: (data) => {
      toast.success("Logged in successfully");
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      queryClient.setQueryData("user", data);
      const roles = data.employee.roles;

      const { f_name, l_name, email } = data.employee;
      dispatch(loginAction({ roles, f_name, l_name, email: email || formData.email }));
      const landingRole = String(roles[0] || "").toLowerCase();
      navigate(
        landingRole === "quality-checker"
          ? "/quality-checker/location-suspicious-leads"
          : `/${landingRole}`
      );
    },
    onError: (error) => {
      setIsSubmitting(false);
      if (error.response) {
        const errorMessage = error.response.data.message || "An error occurred";
        setErrors((prev) => ({ ...prev, general: errorMessage }));
        toast.error(errorMessage);
      } else if (error.request) {
        setErrors((prev) => ({
          ...prev,
          general: "Network error. Please check your connection.",
        }));
        toast.error("Network error. Please check your connection.");
      } else {
        setErrors((prev) => ({
          ...prev,
          general: "An unexpected error occurred",
        }));
        toast.error("An unexpected error occurred");
      }
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: "",
      general: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const locationPayload = await resolveSignInLocation(locationRef.current);
    locationRef.current = locationPayload;

    mutateLogin({
      ...formData,
      ...locationPayload,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#1A1A1A] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:bg-white">
      <section className="relative hidden overflow-hidden bg-[#1A1A1A] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-brand via-accent to-brand-success" />
        <div className="pointer-events-none absolute -left-24 top-10 size-80 rounded-full bg-brand/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-4rem] right-[-3rem] size-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-16 left-16 h-24 w-48 rounded-full bg-brand-success/20 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-12">
          <button
            type="button"
            className="w-fit rounded-xl bg-white p-2 shadow-sm transition hover:scale-[1.02]"
            onClick={() => window.open(import.meta.env.VITE_NBFC_LOGO_URL, "_blank")}
          >
            <img
              src="./images/nbfc-logo.png"
              alt="Jindal Fincap Limited"
              className="h-11 w-auto object-contain"
            />
          </button>

          <div className="max-w-lg">
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              <span className="h-px w-6 bg-brand" />
              Internal CRM
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight xl:text-5xl">
              Welcome to{" "}
              <span className="mt-2 block">
                <BrandWordmark className="text-white" />
              </span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-zinc-300">
              Sign in to manage leads, screening, and team operations from one
              secure workspace.
            </p>
            <p className="mt-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              <span className="h-px w-8 bg-brand" />
              Every loan journey meets here
              <span className="h-px w-8 bg-brand-success" />
            </p>
          </div>
        </div>

        <ul className="relative z-10 mt-12 space-y-4">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
                <Icon size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-sm text-zinc-400">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative px-5 pb-8 pt-5 text-white lg:hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
          <div className="absolute -left-16 top-4 size-40 rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-0 top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            className="rounded-xl bg-white p-1.5 shadow-sm"
            onClick={() => window.open(import.meta.env.VITE_NBFC_LOGO_URL, "_blank")}
          >
            <img
              src="./images/nbfc-logo.png"
              alt="Jindal Fincap Limited"
              className="h-8 w-auto object-contain"
            />
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Internal CRM
          </span>
        </div>
        <div className="relative z-10 mt-6 pb-6">
          <h1 className="text-[1.65rem] font-semibold leading-snug">
            Welcome to{" "}
            <span className="mt-1 block">
              <BrandWordmark className="text-white" />
            </span>
          </h1>
          <p className="mt-2 max-w-[18rem] text-sm leading-5 text-zinc-400">
            Sign in to manage leads, screening, and team operations.
          </p>
        </div>
      </section>

      <section className="relative z-10 flex flex-1 flex-col rounded-t-[1.75rem] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 sm:px-8 lg:min-h-screen lg:rounded-none lg:bg-[#f8fafc] lg:px-12 lg:py-0">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-start lg:justify-center">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:gap-5">
            <div className="text-center lg:text-left">
              <img
                src="./images/product-logo.png"
                alt="The Loan Junction"
                className="mx-auto h-16 w-auto cursor-pointer rounded-xl object-contain lg:mx-0 lg:h-[4.5rem]"
                onClick={() => window.open(import.meta.env.VITE_PRODUCT_LOGO_URL, "_blank")}
              />
              <h2 className="mt-4 text-xl font-semibold text-brand-dark lg:mt-6 lg:text-2xl">
                Sign in
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Use your authenticated The Loan Junction credentials.
              </p>
            </div>

            {errors.general && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-brand-dark">
                Email<span className="text-red-500"> *</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={fieldClass(Boolean(errors.email))}
                  placeholder={`alias@${String(import.meta.env.VITE_PRODUCT_LOGO_URL || "")
                    .split("//")
                    .pop()
                    .replace(/^www\./, "")}`}
                />
              </div>
              {errors.email && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle size={14} />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-brand-dark">
                Password<span className="text-red-500"> *</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`${fieldClass(Boolean(errors.password))} pr-11`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-zinc-500 transition hover:text-brand-dark"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle size={14} />
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgetpassword"
                className="text-sm font-medium text-brand-dark underline-offset-2 transition hover:text-brand hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isMutating}
              className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 lg:min-h-0 lg:py-3 lg:text-sm"
            >
              {isSubmitting || isMutating ? (
                <span className="flex items-center gap-2">
                  <SvgLoader /> Signing in...
                </span>
              ) : (
                <>
                  Sign in
                  <LogIn size={17} />
                </>
              )}
            </button>

            <p className="text-center text-xs text-zinc-500">
              <span className="text-red-500">*</span> Kindly login using your
              authenticated credentials.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
};

export default SignIn;
